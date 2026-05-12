import Anthropic from '@anthropic-ai/sdk';
import { PDFDocument } from 'pdf-lib';
import { preparePostRequest } from './lib/http.js';
import { supabase } from './lib/supabase.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
export const maxDuration = 60;

function mergeExtractions(results) {
  const merged = {};
  for (const result of results) {
    for (const [key, value] of Object.entries(result || {})) {
      if (value !== null && value !== undefined && value !== '' && !merged[key]) merged[key] = value;
    }
  }
  return merged;
}

function normalizeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function numberOrNull(value) {
  const n = parseFloat(value);
  return Number.isNaN(n) ? null : n;
}

function compact(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== null && value !== undefined && value !== ''));
}

async function splitPdfIfNeeded(base64Data) {
  const pdfBytes = Buffer.from(base64Data, 'base64');
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const totalPages = pdfDoc.getPageCount();
  if (totalPages <= 100) return [base64Data];
  const chunks = [];
  let start = 0;
  while (start < totalPages) {
    const end = Math.min(start + 90, totalPages);
    const chunkDoc = await PDFDocument.create();
    const pageIndices = Array.from({ length: end - start }, (_, i) => start + i);
    const copiedPages = await chunkDoc.copyPages(pdfDoc, pageIndices);
    copiedPages.forEach(p => chunkDoc.addPage(p));
    const chunkBytes = await chunkDoc.save();
    chunks.push(Buffer.from(chunkBytes).toString('base64'));
    if (end >= totalPages) break;
    start = end - 1;
  }
  return chunks;
}

function applyLoanTermsSummaryFallback(loanData, text) {
  if (!text) return loanData;
  const out = { ...loanData };
  const find = (label) => {
    const pattern = new RegExp(`${label}\\s*[:\\-]?\\s*([^\\n\\r]+)`, 'i');
    return text.match(pattern)?.[1]?.trim();
  };
  out.unpaid_principal ||= find('Loan Amount')?.replace(/[$,]/g, '');
  out.interest_rate ||= find('Interest Rate')?.match(/[\d.]+/)?.[0];
  out.loan_type ||= find('Loan Type');
  out.next_payment_due_date ||= find('First Payment Date');
  out.maturity_date ||= find('Maturity Date');
  out.property_address ||= find('Collateral');
  return out;
}

export default async function handler(req, res) {
  if (preparePostRequest(req, res)) return;

  try {
    const { loanIdInternal, newDocUrls = [] } = req.body;
    if (!loanIdInternal || !Array.isArray(newDocUrls) || newDocUrls.length === 0) {
      return res.status(400).json({ error: 'Missing loan or document URLs' });
    }

    const pdfContents = await Promise.all(newDocUrls.map(async (url) => {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`Could not fetch ${url}`);
      const buffer = await r.arrayBuffer();
      return { name: url.split('/').pop(), data: Buffer.from(buffer).toString('base64') };
    }));

    const expanded = [];
    for (const pdf of pdfContents) {
      const chunks = await splitPdfIfNeeded(pdf.data);
      chunks.forEach((data, i) => expanded.push({ name: chunks.length > 1 ? `${pdf.name} part ${i + 1}` : pdf.name, data }));
    }

    const prompt = `Extract the following fields from the attached loan document. Return ONLY a raw JSON object, no markdown, no backticks.

Important:
- Prioritize any table titled "Loan Terms Summary", "Loan Terms", "Note Terms", or similar.
- If the table shows "First Payment Date", return that as next_payment_due_date.
- If the table shows "Loan Type", return it as loan_type.
- If the loan is interest only and no monthly_payment is stated, leave monthly_payment null.

Fields to extract:
- loan_id
- borrower_name
- guarantor_name
- property_address
- unpaid_principal (number only, no $ or commas)
- interest_rate (number only, no %)
- loan_type
- loan_origination_date (date string, format MM/DD/YYYY)
- maturity_date (date string, format MM/DD/YYYY)
- next_payment_due_date (date string, format MM/DD/YYYY)
- monthly_payment (number only, no $ or commas)
- statement_date (date string, format MM/DD/YYYY)
- daily_interest (number only if explicitly stated)
- accrual_basis
- stated_payoff_amount (number only, no $ or commas)
- loan_terms_summary_text (copy the Loan Terms Summary table text if present)`;

    const extractions = [];
    for (const pdf of expanded) {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        messages: [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf.data } },
            { type: 'text', text: prompt },
          ],
        }],
      });
      const rawText = response.content[0].text;
      const cleanJson = rawText.replace(/```json|```/g, '').replace(/[\s\S]*?(\{[\s\S]*\})[\s\S]*/g, '$1').trim();
      try { extractions.push(JSON.parse(cleanJson)); } catch {}
    }

    const combinedExtractionText = extractions.map(item => item?.loan_terms_summary_text || JSON.stringify(item)).join('\n');
    const loanData = applyLoanTermsSummaryFallback(mergeExtractions(extractions), combinedExtractionText);
    const docUrlValue = newDocUrls.join(',');
    const principal = numberOrNull(loanData.unpaid_principal);
    const rate = numberOrNull(loanData.interest_rate);
    const perDiem = numberOrNull(loanData.daily_interest) ?? (principal && rate ? (principal * (rate / 100)) / ((loanData.accrual_basis || '').includes('360') ? 360 : 365) : null);
    const loanStartDate = normalizeDate(loanData.loan_origination_date || loanData.statement_date);
    const maturityDate = normalizeDate(loanData.maturity_date);
    const nextPaymentDate = normalizeDate(loanData.next_payment_due_date);
    const loanType = loanData.loan_type || null;
    const monthlyPayment = numberOrNull(loanData.monthly_payment) ?? (loanType && String(loanType).toLowerCase().includes('interest') && principal && rate ? parseFloat(((principal * (rate / 100)) / 12).toFixed(2)) : null);

    const borrowerPatch = compact({
      legal_name: loanData.borrower_name,
      principal_balance: principal,
      interest_rate: rate,
      per_diem: perDiem ? parseFloat(perDiem.toFixed(2)) : null,
      monthly_payment: monthlyPayment,
      property_address: loanData.property_address,
      next_payment_date: nextPaymentDate,
      loan_start_date: loanStartDate,
      maturity_date: maturityDate,
      loan_document_urls: docUrlValue,
      status: 'active',
    });

    const requestPatch = compact({
      borrower_name: loanData.borrower_name,
      property_address: loanData.property_address,
      total_due: principal,
      interest_rate: rate,
      per_diem: perDiem ? parseFloat(perDiem.toFixed(2)) : null,
      maturity_date: maturityDate,
      loan_start_date: loanStartDate,
      next_payment_date: nextPaymentDate,
      guarantor_name: loanData.guarantor_name,
      loan_document_urls: docUrlValue,
    });

    const { data: borrowerRows, error: borrowerError } = await supabase
      .from('borrowers')
      .update(borrowerPatch)
      .eq('loan_id_internal', loanIdInternal)
      .select('*');
    if (borrowerError) throw borrowerError;

    const { data: requestRows, error: requestError } = await supabase
      .from('payoff_requests')
      .update(requestPatch)
      .eq('loan_id_internal', loanIdInternal)
      .select('*');
    if (requestError) throw requestError;

    return res.status(200).json({
      success: true,
      borrower: borrowerRows?.[0] || null,
      request: requestRows?.[0] || null,
      extracted: loanData,
    });
  } catch (error) {
    console.error('Reprocess loan docs error:', error);
    return res.status(500).json({ error: error.message });
  }
}
