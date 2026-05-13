import { preparePostRequest } from './lib/http.js';
import { normalizeLoanTerms } from './lib/borrowers.js';
import { extractLoanDataFromUrls } from './lib/loan-extraction.js';
import { supabase } from './lib/supabase.js';

export const maxDuration = 60;

function num(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function clean(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== ''));
}

export default async function handler(req, res) {
  if (preparePostRequest(req, res)) return;

  try {
    const { loanIdInternal, newDocUrls } = req.body || {};
    if (!loanIdInternal || !Array.isArray(newDocUrls)) return res.status(400).json({ error: 'Missing required fields' });

    if (newDocUrls.length === 0) {
      const clear = { interest_rate: null, per_diem: null, monthly_payment: null, next_payment_date: null, maturity_date: null, loan_type: null, loan_start_date: null, guarantor_name: null, loan_document_urls: '', principal_balance: null, original_loan_amount: null };
      const { data: borrowerRows, error: borrowerError } = await supabase
        .from('borrowers')
        .update(clear)
        .eq('loan_id_internal', loanIdInternal)
        .select();
      if (borrowerError) throw borrowerError;
      return res.status(200).json({ success: true, borrower: borrowerRows?.[0] || null, request: null });
    }

    const data = await extractLoanDataFromUrls(newDocUrls);
    const hasExtractedLoanData = Object.values(data || {}).some(value => value !== null && value !== undefined && value !== '');
    if (!hasExtractedLoanData) {
      return res.status(422).json({ error: 'No loan data could be extracted from uploaded documents' });
    }
    const principal = num(data.unpaid_principal);
    const rate = num(data.interest_rate);
    const perDiem = num(data.daily_interest) || (principal && rate ? Number(((principal * (rate / 100)) / 365).toFixed(2)) : null);
    const terms = normalizeLoanTerms({ loanData: data, dailyRateForPDF: perDiem, principal, rate });
    const docUrlValue = newDocUrls.join(',');

    const { data: existingBorrowerRows, error: existingBorrowerError } = await supabase
      .from('borrowers')
      .select('borrower_email,lender_email')
      .eq('loan_id_internal', loanIdInternal)
      .limit(1);
    if (existingBorrowerError) throw existingBorrowerError;

    const existingBorrower = existingBorrowerRows?.[0] || {};
    const borrowerEmail = existingBorrower.borrower_email || null;

    const borrowerPatch = clean({
      loan_id_internal: loanIdInternal,
      legal_name: data.borrower_name,
      borrower_email: borrowerEmail,
      lender_email: existingBorrower.lender_email || null,
      property_address: data.property_address,
      guarantor_name: data.guarantor_name,
      city: terms.city,
      state: terms.state,
      principal_balance: principal,
      original_loan_amount: principal,
      interest_rate: rate,
      per_diem: terms.perDiem,
      monthly_payment: terms.monthlyPayment,
      loan_type: terms.loanType,
      loan_start_date: terms.loanStartDate,
      maturity_date: terms.maturityDate,
      next_payment_date: terms.nextPaymentDate,
      loan_document_urls: docUrlValue,
    });

    const { data: updatedRows, error: borrowerError } = await supabase
      .from('borrowers')
      .update(borrowerPatch)
      .eq('loan_id_internal', loanIdInternal)
      .select();
    if (borrowerError) throw borrowerError;

    if (updatedRows?.length) {
      return res.status(200).json({ success: true, borrower: updatedRows[0], request: null });
    }

    const { data: insertedRows, error: insertError } = await supabase
      .from('borrowers')
      .insert(borrowerPatch)
      .select();
    if (insertError) throw insertError;

    return res.status(200).json({ success: true, borrower: insertedRows?.[0] || null, request: null });
  } catch (error) {
    console.error('Reprocess loan docs error:', error);
    return res.status(500).json({ error: error.message });
  }
}
