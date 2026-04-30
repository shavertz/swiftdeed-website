import { sendBorrowerDocsAddedEmail, sendLenderDocsUpdatedEmail } from './lib/email.js';
import { supabase } from './lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      loanIdInternal,
      newDocUrls,
      lenderEmail,
      lenderName,
      borrowerEmail,
      borrowerName,
      docsAdded,
    } = req.body;

    if (!loanIdInternal || !Array.isArray(newDocUrls)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const cleanedDocUrls = newDocUrls
      .map(url => typeof url === 'string' ? url.trim() : '')
      .filter(Boolean);

    const { error } = await supabase
      .from('borrowers')
      .update({ loan_document_urls: cleanedDocUrls.join(',') })
      .eq('loan_id_internal', loanIdInternal);

    if (error) {
      console.error('Update docs error:', error);
      return res.status(500).json({ error: error.message });
    }

    await sendLenderDocsUpdatedEmail({
      lenderEmail,
      lenderName,
      loanIdInternal,
      documentCount: cleanedDocUrls.length,
      docsAdded,
    });

    if (docsAdded && borrowerEmail) {
      await sendBorrowerDocsAddedEmail({
        borrowerEmail,
        borrowerName,
      });
    }

    return res.status(200).json({ success: true, documentCount: cleanedDocUrls.length });
  } catch (error) {
    console.error('Update loan docs error:', error);
    return res.status(500).json({ error: error.message });
  }
}
