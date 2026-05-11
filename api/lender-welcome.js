import { sendLenderWelcomeEmail } from './lib/email.js';
import { preparePostRequest } from './lib/http.js';

export default async function handler(req, res) {
  if (preparePostRequest(req, res)) return;

  try {
    const { lenderEmail, lenderName, companyName, portalUrl } = req.body || {};

    if (!lenderEmail) {
      return res.status(400).json({ error: 'Missing lender email' });
    }

    await sendLenderWelcomeEmail({
      lenderEmail,
      lenderName,
      companyName,
      portalUrl,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Lender welcome email error:', error);
    return res.status(500).json({ error: error.message });
  }
}
