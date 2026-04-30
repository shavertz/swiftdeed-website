const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { paymentIntentId } = req.body;

    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);

    res.status(200).json({ success: true, paymentIntent });
  } catch (error) {
    console.error('Capture error:', error);
    res.status(500).json({ error: error.message });
  }
};