import { sendLenderPayoffEmail } from './lib/email.js';
import { preparePostRequest } from './lib/http.js';
import { generatePayoffPDF } from './lib/submit-pdfs.js';
import { supabase } from './lib/supabase.js';

function toNumber(value, fallback = 0) {
  const number = parseFloat(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

function daysBetween(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;
  const diff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  return Math.max(diff, 0);
}

function publicUrl(bucket, path) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || null;
}

async function uploadPayoffPdf(fileName, pdfBuffer) {
  const buckets = ['payoff-statements', 'loan-documents'];
  let lastError = null;

  for (const bucket of buckets) {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (!error) {
      return publicUrl(bucket, fileName);
    }

    lastError = error;
  }

  throw lastError || new Error('Could not upload payoff statement');
}

export default async function handler(req, res) {
  if (preparePostRequest(req, res)) return;

  try {
    const {
      loanIdInternal,
      goodThroughDate,
      lenderEmail,
      lenderName,
    } = req.body || {};

    if (!loanIdInternal || !goodThroughDate || !lenderEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: borrower, error: borrowerLookupError } = await supabase
      .from('borrowers')
      .select('*')
      .eq('loan_id_internal', loanIdInternal)
      .eq('lender_email', lenderEmail)
      .limit(1)
      .maybeSingle();

    if (borrowerLookupError) throw borrowerLookupError;

    const { data: request, error: requestError } = await supabase
      .from('payoff_requests')
      .select('*')
      .eq('loan_id_internal', loanIdInternal)
      .eq('from_email', lenderEmail)
      .limit(1)
      .maybeSingle();

    if (requestError) throw requestError;
    if (!borrower && !request) return res.status(404).json({ error: 'Loan not found' });

    const { data: lender } = await supabase
      .from('lenders')
      .select('*')
      .eq('email', lenderEmail)
      .limit(1)
      .maybeSingle();

    const principal = toNumber(
      borrower?.principal_balance ??
      borrower?.original_loan_amount ??
      request?.total_due,
      0
    );
    const rate = toNumber(borrower?.interest_rate ?? request?.interest_rate, 0);
    const perDiem = toNumber(
      borrower?.per_diem ?? request?.per_diem,
      rate ? (principal * (rate / 100)) / 365 : 0
    );
    const daysToGoodThrough = daysBetween(new Date(), goodThroughDate);
    const interestDue = perDiem * daysToGoodThrough;
    const servicerFee = 30;
    const totalDue = principal + interestDue + servicerFee;
    const completedAt = new Date().toISOString();
    const payoffDate = formatDate(goodThroughDate);

    const pdfData = {
      ...(request || {}),
      borrower_name: request?.borrower_name || borrower?.legal_name,
      property_address: request?.property_address || borrower?.property_address,
      borrower_address: request?.property_address || borrower?.property_address,
      lender_name: lender?.company_name || lenderName || request?.company_name || 'SwiftDeed',
      lender_address: lender?.wire_bank_address || '',
      lender_phone: lender?.phone || request?.submitter_phone || '',
      loan_id_internal: loanIdInternal,
      account_number: loanIdInternal,
      statement_date: formatDate(completedAt),
      payoff_date: payoffDate,
      estimated_payoff_date: payoffDate,
      expiry_date: payoffDate,
      maturity_date: formatDate(borrower?.maturity_date || request?.maturity_date),
      interest_paid_to_date: formatDate(borrower?.last_payment_date || borrower?.loan_start_date || request?.loan_start_date || request?.created_at),
      next_payment_due_date: formatDate(borrower?.next_payment_date || request?.next_payment_date),
      unpaid_principal_balance: principal,
      note_interest_rate: rate,
      current_note_interest_rate: rate,
      note_rate_interest_due: interestDue,
      interest_period: `${formatDate(new Date())} to ${payoffDate}`,
      total_due: totalDue,
      daily_interest: perDiem,
      servicer_fee: servicerFee,
      late_charge: 0,
      wire: {
        wire_bank_name: lender?.wire_bank_name,
        wire_routing_number: lender?.wire_routing_number,
        wire_account_number: lender?.wire_account_number,
        wire_account_name: lender?.wire_account_name,
        wire_bank_address: lender?.wire_bank_address,
      },
    };

    const pdfBuffer = await generatePayoffPDF(pdfData);
    const fileName = `${loanIdInternal}/payoff-${goodThroughDate}-${Date.now()}.pdf`;
    const statementUrl = await uploadPayoffPdf(fileName, pdfBuffer);

    const payoffPatch = {
      payoff_statement_url: statementUrl,
      total_due: parseFloat(totalDue.toFixed(2)),
      status: 'completed',
      completed_at: completedAt,
    };

    const { error: borrowerUpdateError } = await supabase
      .from('borrowers')
      .update({ payoff_statement_url: statementUrl })
      .eq('loan_id_internal', loanIdInternal)
      .eq('lender_email', lenderEmail);

    if (borrowerUpdateError) console.error('Borrower payoff statement update failed:', borrowerUpdateError);

    if (request) {
      const { error: updateError } = await supabase
        .from('payoff_requests')
        .update(payoffPatch)
        .eq('loan_id_internal', loanIdInternal)
        .eq('from_email', lenderEmail);

      if (updateError) console.error('Payoff request update failed:', updateError);
    }

    await sendLenderPayoffEmail({
      lenderEmail,
      lenderName: lenderName || lender?.full_name || lender?.company_name,
      borrowerName: request?.borrower_name || borrower?.legal_name,
      totalDue,
      internalLoanId: loanIdInternal,
      pdfBuffer,
    });

    return res.status(200).json({
      success: true,
      statementUrl,
      totalDue: parseFloat(totalDue.toFixed(2)),
      completedAt,
    });
  } catch (error) {
    console.error('Generate payoff statement error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate payoff statement' });
  }
}
