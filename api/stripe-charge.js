import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      customerId,
      paymentMethodId,
      amount,
      borrowerId,
      loanIdInternal,
      borrowerName,
      borrowerEmail,
      lenderEmail,
      interestPortion,
      principalPortion,
      principalBalanceAfter,
      nextPaymentDate,
      totalPaymentsMade,
    } = req.body;

    if (!customerId || !paymentMethodId || !amount || !borrowerId || !loanIdInternal) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Enforce $25k ACH cap
    if (parseFloat(amount) >= 25000) {
      return res.status(400).json({ error: 'Payments of $25,000 or more must be sent via wire transfer.' });
    }

    // Create and confirm the PaymentIntent
    const amountCents = Math.round(parseFloat(amount) * 100);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      customer: customerId,
      payment_method: paymentMethodId,
      payment_method_types: ['us_bank_account'],
      confirm: true,
      mandate_data: {
        customer_acceptance: {
          type: 'online',
          online: { ip_address: req.headers['x-forwarded-for'] || '0.0.0.0', user_agent: req.headers['user-agent'] || '' },
        },
      },
      metadata: { loan_id_internal: loanIdInternal, borrower_name: borrowerName },
    });

    const today = new Date().toISOString().split('T')[0];

    // Update borrower row
    const { error: borrowerError } = await supabase
      .from('borrowers')
      .update({
        principal_balance: principalBalanceAfter,
        last_payment_amount: amount,
        last_payment_date: today,
        last_payment_method: 'ACH',
        last_payment_interest: interestPortion,
        last_payment_principal: principalPortion,
        next_payment_date: nextPaymentDate,
        payment_status: 'current',
        total_payments_made: totalPaymentsMade,
        stripe_customer_id: customerId,
        stripe_payment_method_id: paymentMethodId,
      })
      .eq('id', borrowerId);

    if (borrowerError) {
      console.error('Borrower update error:', borrowerError);
      return res.status(500).json({ error: borrowerError.message });
    }

    // Log to payments table
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        loan_id_internal: loanIdInternal,
        payment_date: today,
        amount: parseFloat(amount),
        method: 'ACH',
        interest_portion: interestPortion,
        principal_portion: principalPortion,
        principal_balance_after: principalBalanceAfter,
        payment_status: 'current',
        recorded_by: borrowerEmail || 'borrower',
        stripe_payment_intent_id: paymentIntent.id,
      });

    if (paymentError) console.error('Payment log error:', paymentError);

    return res.status(200).json({ success: true, paymentIntentId: paymentIntent.id, status: paymentIntent.status });
  } catch (error) {
    console.error('Stripe charge error:', error);
    return res.status(500).json({ error: error.message });
  }
}
