import { sendBorrowerActivationEmail } from './email.js';

function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 48; i++) token += chars.charAt(Math.floor(Math.random() * chars.length));
  return token;
}

function cleanDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function parseLocation(address = '') {
  const match = String(address).match(/,\s*([^,]+),\s*([A-Z]{2})(?:\s+\d{5})?\s*$/i);
  return { city: match?.[1]?.trim() || null, state: match?.[2]?.toUpperCase() || null };
}

export async function upsertBorrower({
  supabase,
  loanData,
  internalLoanId,
  loanDocumentUrls,
  dailyRateForPDF,
  principal,
  rate,
  borrowerEmail,
  borrowerName,
  activationBaseUrl,
}) {
  try {
    const legalName = borrowerName || loanData.borrower_name || null;
    if (!legalName) return;

    const perDiem = parseFloat(dailyRateForPDF.toFixed(2));
    const loanType = loanData.loan_type || null;
    const monthlyPayment = parseFloat(loanData.monthly_payment) || (principal && rate ? parseFloat(((principal * (rate / 100)) / 12).toFixed(2)) : null);
    const nextPaymentDate = cleanDate(loanData.next_payment_due_date);
    const loanStartDate = cleanDate(loanData.loan_origination_date || loanData.interest_paid_to_date || loanData.statement_date);
    const maturityDate = cleanDate(loanData.maturity_date);
    const { city, state } = parseLocation(loanData.property_address);
    const token = generateToken();
    const activationUrl = `${activationBaseUrl || 'https://www.theswiftdeed.com'}#activate=${token}`;

    const { data: existingRows } = await supabase
      .from('borrowers')
      .select('id')
      .eq('loan_id_internal', internalLoanId)
      .limit(1);

    const existing = existingRows && existingRows.length > 0 ? existingRows[0] : null;

    if (existing) {
      await supabase
        .from('borrowers')
        .update({
          loan_id_internal: internalLoanId,
          principal_balance: principal,
          original_loan_amount: principal,
          interest_rate: rate,
          per_diem: perDiem,
          monthly_payment: monthlyPayment,
          loan_type: loanType,
          property_address: loanData.property_address || null,
          guarantor_name: loanData.guarantor_name || null,
          city,
          state,
          next_payment_date: nextPaymentDate,
          loan_start_date: loanStartDate,
          maturity_date: maturityDate,
          loan_document_urls: loanDocumentUrls,
          status: 'active',
          ...(borrowerEmail ? { borrower_email: borrowerEmail, verification_token: token } : {}),
        })
        .eq('loan_id_internal', internalLoanId);
    } else {
      await supabase
        .from('borrowers')
        .insert({
          legal_name: legalName,
          loan_id_internal: internalLoanId,
          principal_balance: principal,
          original_loan_amount: principal,
          interest_rate: rate,
          per_diem: perDiem,
          monthly_payment: monthlyPayment,
          loan_type: loanType,
          property_address: loanData.property_address || null,
          guarantor_name: loanData.guarantor_name || null,
          city,
          state,
          next_payment_date: nextPaymentDate,
          loan_start_date: loanStartDate,
          maturity_date: maturityDate,
          loan_document_urls: loanDocumentUrls,
          status: 'active',
          borrower_email: borrowerEmail || null,
          verification_token: token,
        });
    }

    if (borrowerEmail) {
      await sendBorrowerActivationEmail({
        borrowerEmail,
        borrowerName,
        internalLoanId,
        activationUrl,
      });
      console.log('Borrower activation email sent to:', borrowerEmail);
    }

    console.log('Borrower record upserted for:', legalName);
  } catch (err) {
    throw new Error(`Borrower setup failed: ${err.message}`);
  }
}
