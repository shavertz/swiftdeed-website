import { sendLenderLoanDeletedEmail } from './lib/email.js';
import { supabase } from './lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { loanIdInternal, lenderEmail, lenderName, borrowerName, propertyAddress } = req.body;

    if (!loanIdInternal || !lenderEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { error: borrowerError } = await supabase
      .from('borrowers')
      .delete()
      .eq('loan_id_internal', loanIdInternal);

    if (borrowerError) {
      console.error('Borrower delete error:', borrowerError);
      return res.status(500).json({ error: borrowerError.message });
    }

    const { error: requestError } = await supabase
      .from('payoff_requests')
      .delete()
      .eq('loan_id_internal', loanIdInternal);

    if (requestError) {
      console.error('Request delete error:', requestError);
      return res.status(500).json({ error: requestError.message });
    }

    await sendLenderLoanDeletedEmail({
      lenderEmail,
      lenderName,
      loanIdInternal,
      borrowerName,
      propertyAddress,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Delete loan error:', error);
    return res.status(500).json({ error: error.message });
  }
}
