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

    const borrowerPayload = {
      loan_id_internal: loanIdInternal,
      loan_document_urls: docUrlValue,
      ...(borrowerName ? { legal_name: borrowerName } : {}),
      ...(borrowerEmail ? { borrower_email: borrowerEmail } : {}),
      ...(lenderEmail ? { lender_email: lenderEmail } : {}),
    };

    const { data: updatedRows, error } = await supabase
      .from('borrowers')
      .update({ loan_document_urls: docUrlValue })
      .eq('loan_id_internal', loanIdInternal)
      .select('id');

    if (error) {
      console.error('Update docs error:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!updatedRows || updatedRows.length === 0) {
      const { error: insertError } = await supabase
        .from('borrowers')
        .insert(borrowerPayload);

      if (insertError) {
        if (borrowerPayload.lender_email && insertError.message?.includes('lender_email')) {
          const { lender_email, ...payloadWithoutLenderEmail } = borrowerPayload;
          const { error: retryError } = await supabase
            .from('borrowers')
            .insert(payloadWithoutLenderEmail);
          if (!retryError) return res.status(200).json({ success: true, documentCount: cleanedDocUrls.length, loanDocumentUrls: docUrlValue });
        }
        console.error('Insert docs borrower error:', insertError);
        return res.status(500).json({ error: insertError.message });
      }
    }

    try {
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
    } catch (emailError) {
      console.error('Document email notification failed:', emailError);
    }

    return res.status(200).json({ success: true, documentCount: cleanedDocUrls.length, loanDocumentUrls: docUrlValue });
  } catch (error) {
    console.error('Update loan docs error:', error);
    return res.status(500).json({ error: error.message });
  }
}
