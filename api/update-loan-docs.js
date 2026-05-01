import { sendBorrowerDocsAddedEmail, sendLenderDocsUpdatedEmail } from './lib/email.js';
import { preparePostRequest } from './lib/http.js';
import { supabase } from './lib/supabase.js';

export default async function handler(req, res) {
  if (preparePostRequest(req, res)) return;

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

    const docUrlValue = cleanedDocUrls.join(',');

    const { error } = await supabase
      .from('borrowers')
      .update({ loan_document_urls: docUrlValue })
      .eq('loan_id_internal', loanIdInternal);

    if (error) {
      console.error('Update docs error:', error);
      return res.status(500).json({ error: error.message });
    }

    const { error: requestError } = await supabase
      .from('payoff_requests')
      .update({ loan_document_urls: docUrlValue })
      .eq('loan_id_internal', loanIdInternal);

    if (requestError) {
      console.error('Update request docs error:', requestError);
      return res.status(500).json({ error: requestError.message });
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
