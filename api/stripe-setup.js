import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { borrowerEmail, borrowerName, loanIdInternal } = req.body;

    if (!borrowerEmail || !loanIdInternal) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find or create Stripe customer
    const existing = await stripe.customers.list({ email: borrowerEmail, limit: 1 });
    let customer;
    if (existing.data.length > 0) {
      customer = existing.data[0];
    } else {
      customer = await stripe.customers.create({
        email: borrowerEmail,
        name: borrowerName || borrowerEmail,
        metadata: { loan_id_internal: loanIdInternal },
      });
    }

    // Create a SetupIntent for ACH bank account collection
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ['us_bank_account'],
      payment_method_options: {
        us_bank_account: {
          financial_connections: { permissions: ['payment_method'] },
        },
      },
      metadata: { loan_id_internal: loanIdInternal },
    });

    return res.status(200).json({
      clientSecret: setupIntent.client_secret,
      customerId: customer.id,
    });
  } catch (error) {
    console.error('Stripe setup error:', error);
    return res.status(500).json({ error: error.message });
  }
}
