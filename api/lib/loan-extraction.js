import Anthropic from '@anthropic-ai/sdk';
import { deriveLoanFieldsFromText, extractReportLabTextFromPdfBuffer, mergeMissingFields } from './pdf-text.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function mergeExtractions(results) {
  const merged = {};
  for (const result of results) {
    for (const [key, value] of Object.entries(result || {})) {
      if (value !== null && value !== undefined && value !== '' && !merged[key]) {
        merged[key] = value;
      }
    }
  }
  return merged;
}

async function splitPdfIfNeeded(base64Data) {
  const { PDFDocument } = await import('pdf-lib');
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

function extractionPrompt({ notes, borrowerId } = {}) {
  return `Extract the following fields from the attached loan document. Return ONLY a raw JSON object, no markdown, no backticks.

Important:
- Prioritize any table titled "Loan Terms Summary", "Loan Terms", "Note Terms", or similar.
- If the document has a main date under the loan number or a "Close Date", return it as loan_origination_date.
- If the table shows "First Payment Date", return that as next_payment_due_date.
- If the table shows "Loan Type", return it as loan_type. If it says "Interest Only", return exactly "Interest Only".
- CRITICAL - loan_type must reflect the PAYMENT STRUCTURE, not the document type. Use exactly one of these values: "Interest Only", "Fully Amortizing", "Partially Amortizing", or "Interest Only with Balloon". Look for language like "interest only", "fully amortizing", "balloon payment", or "monthly installments of principal and interest". Do NOT use document names like "Commercial Deed to Secure Debt" or "Promissory Note" as the loan type.
- If the loan is interest only and no monthly_payment is stated, leave monthly_payment null.
- Always extract guarantor_name from "Guarantor", "Guarantor(s)", or the Commercial Guaranty.

Fields to extract:
- loan_id
- borrower_name (the borrowing entity or individual - look for "Borrower" label)
- guarantor_name (the personal guarantor - look for "Guarantor" label, or the individual who signed personally)
- borrower_address (full multi-line address as a single string with \\n between lines)
- property_address
- lender_name (look for servicer or lender mentions)
- lender_address (full multi-line address as a single string with \\n between lines)
- lender_phone
- unpaid_principal (number only, no $ or commas)
- interest_rate (number only, no %)
- loan_type
- servicer_fee (number only, no $ or commas)
- loan_origination_date (the date the loan was made or agreement was signed, format MM/DD/YYYY)
- interest_paid_to_date (date string, format MM/DD/YYYY)
- payoff_date (date string, format MM/DD/YYYY)
- maturity_date (date string, format MM/DD/YYYY)
- next_payment_due_date (date string, format MM/DD/YYYY)
- monthly_payment (number only, no $ or commas)
- statement_date (date string, format MM/DD/YYYY)
- expiry_date (date string, format MM/DD/YYYY)
- late_charge_deadline (date string, format MM/DD/YYYY)
- default_interest_rate (number only, no %)
- daily_interest (number only - extract if explicitly stated in the document)
- late_charge (number only)
- accrual_basis (look for "Actual/360", "Actual/365", "30/360" or similar language - return exactly as written, or null if not found)
- compounding_frequency (look for "compounded daily", "compounded monthly", "simple interest" - return as written, or null if not found)
- interest_calculation_method (look for "Rule of 78s", "precomputed interest", or similar - return as written, or null if not found)
- stated_payoff_amount (number only - the total payoff amount if explicitly stated, no $ or commas, or null if not stated)

Submitter notes: ${notes || 'none'}
Borrower ID provided by submitter: ${borrowerId || 'none'}`;
}

export async function extractLoanDataFromUrls(fileUrls, { notes, borrowerId } = {}) {
  let pdfTextFallback = '';
  const pdfContents = [];

  for (const url of fileUrls) {
    const response = await fetch(url);
    if (!response.ok) continue;
    const buffer = Buffer.from(await response.arrayBuffer());
    pdfTextFallback += `${extractReportLabTextFromPdfBuffer(buffer)}\n`;
    pdfContents.push({ name: url.split('/').pop(), data: buffer.toString('base64') });
  }

  const expandedPdfContents = [];
  for (const pdf of pdfContents) {
    const chunks = await splitPdfIfNeeded(pdf.data);
    chunks.forEach((chunkData, i) => expandedPdfContents.push({
      name: chunks.length > 1 ? `${pdf.name} (part ${i + 1})` : pdf.name,
      data: chunkData,
    }));
  }

  const allExtractions = [];
  const prompt = extractionPrompt({ notes, borrowerId });
  for (const pdf of expandedPdfContents) {
    try {
      const chunkResponse = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf.data } },
            { type: 'text', text: prompt },
          ],
        }],
      });

      const rawText = chunkResponse.content?.[0]?.text || '{}';
      const cleanJson = rawText.replace(/```json|```/g, '').replace(/[\s\S]*?(\{[\s\S]*\})[\s\S]*/g, '$1').trim();
      try { allExtractions.push(JSON.parse(cleanJson)); } catch {}
    } catch (error) {
      console.error('Loan extraction failed for chunk:', error);
    }
  }

  return mergeMissingFields(mergeExtractions(allExtractions), deriveLoanFieldsFromText(pdfTextFallback));
}
