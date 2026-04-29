import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const POSTMARK_TOKEN = process.env.POSTMARK_SERVER_TOKEN;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { loanIdInternal, lenderEmail, lenderName, borrowerName, propertyAddress } = req.body;
    if (!loanIdInternal || !lenderEmail) return res.status(400).json({ error: 'Missing required fields' });

    // Delete borrower row
    const { error: borrowerError } = await supabase
      .from('borrowers')
      .delete()
      .eq('loan_id_internal', loanIdInternal);
    if (borrowerError) console.error('Borrower delete error:', borrowerError);

    // Delete payoff_request row
    const { error: requestError } = await supabase
      .from('payoff_requests')
      .delete()
      .eq('loan_id_internal', loanIdInternal);
    if (requestError) {
      console.error('Request delete error:', requestError);
      return res.status(500).json({ error: requestError.message });
    }

    // Email lender confirmation
    await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: { 'X-Postmark-Server-Token': POSTMARK_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        From: 'scott@theswiftdeed.com',
        To: lenderEmail,
        Subject: `Loan deleted — ${loanIdInternal}`,
        HtmlBody: `<p>Hi ${lenderName || 'there'},</p><p>The loan <strong>${loanIdInternal}</strong> for borrower <strong>${borrowerName || '—'}</strong> at <strong>${propertyAddress || '—'}</strong> has been permanently deleted from SwiftDeed. The borrower's portal access has been removed.</p><p>If this was a mistake, please resubmit the loan through the portal.</p><p>— SwiftDeed</p>`,
        TextBody: `Loan ${loanIdInternal} for ${borrowerName} has been permanently deleted. The borrower's portal access has been removed.`,
        MessageStream: 'outbound',
      }),
    });

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('Delete loan error:', e);
    return res.status(500).json({ error: e.message });
  }
}
