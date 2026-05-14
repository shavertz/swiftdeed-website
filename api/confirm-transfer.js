import { preparePostRequest } from './lib/http.js';
import { supabase } from './lib/supabase.js';
import { sendBorrowerActivationEmail } from './lib/email.js';

function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 48; i++) token += chars.charAt(Math.floor(Math.random() * chars.length));
  return token;
}

function generateLoanId() {
  return `SD-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
}

export default async function handler(req, res) {
  if (preparePostRequest(req, res)) return;

  try {
    const { loans, lenderEmail, lenderName, borrowerEmail } = req.body || {};

    if (!loans || !Array.isArray(loans) || loans.length === 0) {
      return res.status(400).json({ error: 'No loans provided' });
    }
    if (!lenderEmail) return res.status(400).json({ error: 'Missing lenderEmail' });

    const results = [];

    for (const loan of loans) {
      const loanIdInternal = loan.loan_id || generateLoanId();
      const docUrls = [
        ...(loan.closing_doc_urls || []),
        ...(loan.servicer_statement_urls || []),
        ...(loan.payment_history_urls || []),
      ].join(',');

      const token = generateToken();
      const { error: borrowerError } = await supabase.from('borrowers').upsert({
        loan_id_internal: loanIdInternal,
        lender_email: lenderEmail,
        legal_name: loan.borrower_name || null,
        borrower_email: borrowerEmail || null,
        property_address: loan.property_address || null,
        original_loan_amount: loan.original_loan_amount || null,
        principal_balance: loan.current_principal_balance || loan.original_loan_amount || null,
        interest_rate: loan.interest_rate || null,
        per_diem: loan.per_diem || null,
        monthly_payment: loan.monthly_payment || null,
        loan_type: loan.loan_type || null,
        loan_start_date: loan.loan_origination_date || null,
        maturity_date: loan.maturity_date || null,
        next_payment_date: loan.next_payment_date || null,
        guarantor_name: loan.guarantor_name || null,
        total_interest_paid: loan.interest_paid_to_date || null,
        loan_document_urls: docUrls,
        verification_token: token,
        status: 'active',
        portal_access: 'Active',
      }, { onConflict: 'loan_id_internal' });
      if (borrowerError) throw borrowerError;

      if (loan.payments && loan.payments.length > 0) {
        const paymentRows = loan.payments.map(p => ({
          loan_id_internal: loanIdInternal,
          payment_date: p.date || null,
          amount: parseFloat(p.amount) || null,
          principal_portion: parseFloat(p.principal) || null,
          interest_portion: parseFloat(p.interest) || null,
          principal_balance_after: parseFloat(p.balance_after) || null,
          method: 'Transfer import',
          payment_status: 'paid',
          recorded_by: 'transfer',
        }));
        const { error: paymentError } = await supabase.from('payments').insert(paymentRows);
        if (paymentError) throw paymentError;
      }

      if (borrowerEmail) {
        try {
          const activationUrl = `${process.env.ACTIVATION_BASE_URL || process.env.PUBLIC_SITE_URL || 'https://www.theswiftdeed.com'}#activate=${token}`;
          await sendBorrowerActivationEmail({
            borrowerEmail,
            borrowerName: loan.borrower_name,
            internalLoanId: loanIdInternal,
            activationUrl,
          });
        } catch (e) {
          console.error('Borrower email failed:', e.message);
        }
      }

      results.push({ loan_id_internal: loanIdInternal, success: true });
    }

    return res.status(200).json({ success: true, results, count: results.length });
  } catch (e) {
    console.error('Confirm transfer error:', e);
    return res.status(500).json({ error: e.message });
  }
}
