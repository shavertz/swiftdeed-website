import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      borrowerId,
      loanIdInternal,
      updates,
      paymentLog,
    } = req.body;

    if (!borrowerId || !updates) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Update borrower row
    const { error: borrowerError } = await supabase
      .from('borrowers')
      .update(updates)
      .eq('id', borrowerId);

    if (borrowerError) {
      console.error('Borrower update error:', borrowerError);
      return res.status(500).json({ error: borrowerError.message });
    }

    // Log to payments table
    if (paymentLog) {
      const { error: paymentError } = await supabase
        .from('payments')
        .insert(paymentLog);

      if (paymentError) {
        console.error('Payment log error:', paymentError);
        // Non-blocking — don't fail the whole request
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Record payment error:', error);
    return res.status(500).json({ error: error.message });
  }
}
