import Anthropic from '@anthropic-ai/sdk';
import formidable from 'formidable';
import fs from 'fs';
import { upsertBorrower } from './lib/borrowers.js';
import { sendInternalSubmissionEmail, sendLenderPayoffEmail } from './lib/email.js';
import { preparePostRequest } from './lib/http.js';
import { generateInvoicePDF, generatePayoffPDF } from './lib/submit-pdfs.js';
import { supabase } from './lib/supabase.js';

export const config = { api: { bodyParser: false, responseLimit: false } };

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function calculateInterest({ principal, rate, accrualBasis, compoundingFrequency, interestCalculationMethod, daysElapsed, statedPayoffAmount }) {
  const r = rate / 100;

  if (
    interestCalculationMethod &&
    (interestCalculationMethod.toLowerCase().includes('precomputed') ||
     interestCalculationMethod.toLowerCase().includes('rule of 78'))
  ) {
    return { interestDue: null, useStatedPayoff: true };
  }

  if (
    compoundingFrequency &&
    !compoundingFrequency.toLowerCase().includes('simple') &&
    !compoundingFrequency.toLowerCase().includes('none')
  ) {
    let n;
    const freq = compoundingFrequency.toLowerCase();
    if (freq.includes('daily'))        n = 365;
    else if (freq.includes('monthly')) n = 12;
    else if (freq.includes('quarter')) n = 4;
    else if (freq.includes('annual'))  n = 1;
    else                               n = 365;

    const years = daysElapsed / 365;
    const compoundedBalance = principal * Math.pow(1 + r / n, n * years);
    const interestDue = compoundedBalance - principal;
    return { interestDue, useStatedPayoff: false };
  }

  const basis = (accrualBasis || '').toLowerCase();

  if (basis.includes('actual/360') || basis.includes('actual / 360')) {
    const dailyRate = (principal * r) / 360;
    return { interestDue: dailyRate * daysElapsed, useStatedPayoff: false };
  }

  if (basis.includes('30/360') || basis.includes('30 / 360')) {
    const months = daysElapsed / 30;
    const interestDue = principal * r * (months / 12);
    return { interestDue, useStatedPayoff: false };
  }

  const dailyRate = (principal * r) / 365;
  return { interestDue: dailyRate * daysElapsed, useStatedPayoff: false };
}

function mergeExtractions(results) {
  const merged = {};
  for (const result of results) {
    for (const [key, value] of Object.entries(result)) {
      if (value !== null && value !== undefined && value !== '' && !merged[key]) {
        merged[key] = value;
      }
    }
  }
  return merged;
}

export default async function handler(req, res) {
  if (preparePostRequest(req, res)) return;

  try {
    const form = formidable({ multiples: true, maxFileSize: 25 * 1024 * 1024 });
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const name       = Array.isArray(fields.name)          ? fields.name[0]          : fields.name;
    const email      = Array.isArray(fields.email)         ? fields.email[0]         : fields.email;
    const company    = Array.isArray(fields.company)       ? fields.company[0]       : fields.company;
    const phone      = Array.isArray(fields.phone)         ? fields.phone[0]         : fields.phone;
    const borrowerId = Array.isArray(fields.borrowerId)    ? fields.borrowerId[0]    : fields.borrowerId;
    const notes      = Array.isArray(fields.notes)         ? fields.notes[0]         : fields.notes;
    const turnaround = Array.isArray(fields.turnaround)    ? fields.turnaround[0]    : fields.turnaround;
    const borrowerEmail = Array.isArray(fields.borrowerEmail) ? fields.borrowerEmail[0] : fields.borrowerEmail;
    const borrowerName  = Array.isArray(fields.borrowerName)  ? fields.borrowerName[0]  : fields.borrowerName;

    // Fetch lender wire details
    let wireDetails = {};
    if (email) {
      const { data: lenderRows } = await supabase
        .from('lenders')
        .select('wire_bank_name, wire_routing_number, wire_account_number, wire_account_name, wire_bank_address')
        .eq('email', email)
        .limit(1);
      if (lenderRows && lenderRows.length > 0) {
        wireDetails = lenderRows[0];
      }
    }

    const fileUrlsRaw = Array.isArray(fields.fileUrls) ? fields.fileUrls[0] : fields.fileUrls;
    const fileUrls = fileUrlsRaw ? JSON.parse(fileUrlsRaw) : [];
    const pdfContents = await Promise.all(fileUrls.map(async (url) => {
      const r = await fetch(url);
      const buffer = await r.arrayBuffer();
      return { name: url.split('/').pop(), data: Buffer.from(buffer).toString('base64') };
    }));

    const { PDFDocument } = await import('pdf-lib');
    const splitPdfIfNeeded = async (base64Data) => {
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
    };

    const expandedPdfContents = [];
    for (const pdf of pdfContents) {
      const chunks = await splitPdfIfNeeded(pdf.data);
      chunks.forEach((chunkData, i) => expandedPdfContents.push({
        name: chunks.length > 1 ? `${pdf.name} (part ${i + 1})` : pdf.name,
        data: chunkData
      }));
    }

    const extractionPrompt = `Extract the following fields from the attached loan document. Return ONLY a raw JSON object, no markdown, no backticks.

Fields to extract:
- loan_id
- borrower_name (the borrowing entity or individual — look for "Borrower" label)
- guarantor_name (the personal guarantor — look for "Guarantor" label, or the individual who signed personally)
- borrower_address (full multi-line address as a single string with \\n between lines)
- property_address
- lender_name (look for servicer or lender mentions)
- lender_address (full multi-line address as a single string with \\n between lines)
- lender_phone
- unpaid_principal (number only, no $ or commas)
- interest_rate (number only, no %)
- servicer_fee (number only, no $ or commas)
- loan_origination_date (the date the loan was made or agreement was signed, format MM/DD/YYYY)
- interest_paid_to_date (date string, format MM/DD/YYYY)
- payoff_date (date string, format MM/DD/YYYY)
- maturity_date (date string, format MM/DD/YYYY)
- next_payment_due_date (date string, format MM/DD/YYYY)
- statement_date (date string, format MM/DD/YYYY)
- expiry_date (date string, format MM/DD/YYYY)
- late_charge_deadline (date string, format MM/DD/YYYY)
- default_interest_rate (number only, no %)
- daily_interest (number only — extract if explicitly stated in the document)
- late_charge (number only)
- accrual_basis (look for "Actual/360", "Actual/365", "30/360" or similar language — return exactly as written, or null if not found)
- compounding_frequency (look for "compounded daily", "compounded monthly", "simple interest" — return as written, or null if not found)
- interest_calculation_method (look for "Rule of 78s", "precomputed interest", or similar — return as written, or null if not found)
- stated_payoff_amount (number only — the total payoff amount if explicitly stated, no $ or commas, or null if not stated)

Submitter notes: ${notes || 'none'}
Borrower ID provided by submitter: ${borrowerId || 'none'}`;

    const allExtractions = [];
    console.log(`Processing ${expandedPdfContents.length} chunk(s)`);
    for (const pdf of expandedPdfContents) {
      const chunkResponse = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf.data } },
            { type: 'text', text: extractionPrompt }
          ]
        }]
      });

      const rawText = chunkResponse.content[0].text;
      const cleanJson = rawText.replace(/```json|```/g, '').replace(/[\s\S]*?(\{[\s\S]*\})[\s\S]*/g, '$1').trim();
      try {
        const extracted = JSON.parse(cleanJson);
        console.log(`Chunk "${pdf.name}" extracted:`, JSON.stringify(extracted));
        allExtractions.push(extracted);
      } catch (e) {
        console.warn('Failed to parse chunk extraction:', e.message);
      }
    }

    const loanData = mergeExtractions(allExtractions);

    const principal   = parseFloat(loanData.unpaid_principal) || 0;
    const rate        = parseFloat(loanData.interest_rate) || 0;
    const servicerFee = parseFloat(loanData.servicer_fee) || 0;

    if (!loanData.interest_paid_to_date && loanData.statement_date) {
      loanData.interest_paid_to_date = loanData.statement_date;
    }

    let daysElapsed = 0;
    if (loanData.interest_paid_to_date) {
      const paidToDate = new Date(loanData.interest_paid_to_date);
      const today = new Date();
      daysElapsed = Math.max(0, Math.floor((today - paidToDate) / (1000 * 60 * 60 * 24)));
    }

    const { interestDue, useStatedPayoff } = calculateInterest({
      principal,
      rate,
      accrualBasis: loanData.accrual_basis,
      compoundingFrequency: loanData.compounding_frequency,
      interestCalculationMethod: loanData.interest_calculation_method,
      daysElapsed,
      statedPayoffAmount: loanData.stated_payoff_amount,
    });

    let totalDue;
    if (useStatedPayoff && loanData.stated_payoff_amount) {
      totalDue = parseFloat(loanData.stated_payoff_amount);
    } else {
      totalDue = principal + (interestDue || 0) + servicerFee;
    }

    const dailyRateForPDF = loanData.daily_interest
      ? parseFloat(loanData.daily_interest)
      : (() => {
          const basis = (loanData.accrual_basis || '').toLowerCase();
          const divisor = basis.includes('360') ? 360 : 365;
          return (principal * (rate / 100)) / divisor;
        })();

    const internalLoanId = 'SD-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-6);
    const activationBaseUrl = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host || 'www.theswiftdeed.com'}`;

    const pdfBuffer = await generatePayoffPDF({
      ...loanData,
      unpaid_principal_balance: principal,
      note_interest_rate: rate,
      note_rate_interest_due: useStatedPayoff ? null : interestDue,
      estimated_payoff_charges: servicerFee,
      total_due: totalDue,
      daily_interest: dailyRateForPDF,
      late_charge: loanData.late_charge,
      interest_period: `${loanData.interest_paid_to_date} to ${loanData.payoff_date || loanData.maturity_date || 'payoff date'}`,
      loan_id_internal: internalLoanId,
      account_number: internalLoanId,
      statement_date: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
      wire: wireDetails,
    });

    const invoiceBuffer = await generateInvoicePDF({
      internalLoanId,
      name,
      email,
      company,
      phone,
      turnaround,
      totalCharged: turnaround === 'rush' ? 50 : 40,
      borrowerName: loanData.borrower_name,
    });

    const loanDocumentUrls = fileUrls;

    const borrowerSlug = (loanData.borrower_name || 'unknown').replace(/[^a-zA-Z0-9]/g, '-');
    const statementFileName = `${internalLoanId}_${borrowerSlug}.pdf`;
    await supabase.storage.from('payoff-statements').upload(statementFileName, pdfBuffer, { contentType: 'application/pdf' });
    const { data: urlData } = supabase.storage.from('payoff-statements').getPublicUrl(statementFileName);
    const statementUrl = urlData?.publicUrl || null;

    const loanStartDate = loanData.loan_origination_date || loanData.interest_paid_to_date || loanData.statement_date || null;

    await supabase.from('payoff_requests').insert({
      from_email: email,
      borrower_name: loanData.borrower_name,
      property_address: loanData.property_address,
      loan_id: loanData.loan_id || internalLoanId,
      loan_id_internal: internalLoanId,
      total_due: parseFloat(totalDue.toFixed(2)),
      status: 'completed',
      payoff_statement_url: statementUrl,
      completed_at: new Date().toISOString(),
      loan_document_urls: loanDocumentUrls.join(','),
      source: 'web',
      submitter_name: name || null,
      submitter_phone: phone || null,
      company_name: company || null,
      borrower_id: borrowerId || null,
      notes: notes || null,
      interest_rate: rate || null,
      per_diem: parseFloat(dailyRateForPDF.toFixed(2)) || null,
      maturity_date: loanData.maturity_date || null,
      loan_start_date: loanStartDate,
      next_payment_date: loanData.next_payment_due_date || null,
      guarantor_name: loanData.guarantor_name || null,
    });

    await upsertBorrower({
      supabase,
      loanData,
      internalLoanId,
      loanDocumentUrls: loanDocumentUrls.join(','),
      dailyRateForPDF,
      principal,
      rate,
      borrowerEmail: borrowerEmail || null,
      borrowerName: borrowerName || null,
      activationBaseUrl,
    });

    await sendLenderPayoffEmail({
      lenderEmail: email,
      lenderName: name,
      borrowerName: loanData.borrower_name,
      totalDue,
      internalLoanId,
      pdfBuffer,
      invoiceBuffer,
    });

    const paymentIntentId = Array.isArray(fields.paymentIntentId) ? fields.paymentIntentId[0] : fields.paymentIntentId;
    const skipPayment = Array.isArray(fields.skipPayment) ? fields.skipPayment[0] : fields.skipPayment;
    if (paymentIntentId && skipPayment !== 'true') {
      const { default: Stripe } = await import('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      await stripe.paymentIntents.capture(paymentIntentId);
    }

    await sendInternalSubmissionEmail({
      name,
      email,
      company,
      phone,
      borrowerId,
      turnaround,
      notes,
      internalLoanId,
      loanData,
      fileCount: fileUrls.length,
    });

    return res.status(200).json({ success: true, loanId: internalLoanId });

  } catch (error) {
    console.error('Submit error:', error);
    return res.status(500).json({ error: 'Processing failed', details: error.message });
  }
}
