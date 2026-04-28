import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function generatePaymentInvoicePDF({ borrowerName, loanIdInternal, propertyAddress, paymentDate, amount, interestPortion, principalPortion, principalBalanceAfter, nextPaymentDate, paymentMethod, perDiem, lenderName }) {
  const PDFDocument = (await import('pdfkit')).default;
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 0, compress: true });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const PW = 612;
    const PH = 792;
    const ML = 44;
    const MR = 44;
    const CW = PW - ML - MR;
    const BLACK  = '#111111';
    const YELLOW = '#D4A017';
    const LGRAY  = '#dddddd';
    const DGRAY  = '#f5f5f5';

    const fmt$ = v => '$' + parseFloat(v || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    const hr = (y, color = LGRAY, weight = 0.5) => {
      doc.save().strokeColor(color).lineWidth(weight)
         .moveTo(ML, y).lineTo(ML + CW, y).stroke().restore();
    };

    const fmtDate = (str) => {
      if (!str) return '—';
      try {
        return new Date(str).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      } catch { return str; }
    };

    const invoiceNumber = `${loanIdInternal}-${paymentDate?.replace(/-/g, '')}`;
    const issueDate = fmtDate(paymentDate);

    let y = 36;

    // Header
    doc.save().font('Helvetica-Bold').fontSize(20).fillColor(BLACK)
       .text('Swift', ML, y, { continued: true, lineBreak: false });
    doc.fillColor(YELLOW).text('Deed', { lineBreak: false }).restore();
    doc.save().font('Helvetica-Bold').fontSize(14).fillColor(BLACK)
       .text('Payment Receipt', ML, y, { width: CW, align: 'right', lineBreak: false }).restore();
    doc.save().font('Helvetica').fontSize(8).fillColor(BLACK)
       .text(`Receipt #: ${invoiceNumber}  ·  Date: ${issueDate}`,
             ML, y + 18, { width: CW, align: 'right', lineBreak: false }).restore();

    y += 32;
    hr(y, BLACK, 1.5);
    y += 14;

    // Borrower / Lender columns
    const colW = CW / 2 - 10;
    doc.save().font('Helvetica-Bold').fontSize(6.5).fillColor(BLACK)
       .text('BORROWER', ML, y, { characterSpacing: 0.6, lineBreak: false }).restore();
    doc.save().font('Helvetica-Bold').fontSize(6.5).fillColor(BLACK)
       .text('LENDER / SERVICER', ML + colW + 20, y, { characterSpacing: 0.6, lineBreak: false }).restore();
    y += 10;

    doc.save().font('Helvetica-Bold').fontSize(9).fillColor(BLACK)
       .text(borrowerName || '—', ML, y, { width: colW, lineBreak: false }).restore();
    doc.save().font('Helvetica-Bold').fontSize(9).fillColor(BLACK)
       .text(lenderName || '—', ML + colW + 20, y, { width: colW, lineBreak: false }).restore();
    y += 13;

    if (propertyAddress) {
      doc.save().font('Helvetica').fontSize(8).fillColor(BLACK)
         .text(propertyAddress, ML, y, { width: colW, lineBreak: false }).restore();
      y += 11;
    }

    doc.save().font('Helvetica').fontSize(8).fillColor(BLACK)
       .text('Serviced by SwiftDeed LLC', ML + colW + 20, y, { width: colW, lineBreak: false }).restore();
    y += 20;
    hr(y);
    y += 14;

    // Payment details table header
    doc.save().rect(ML, y, CW, 18).fill(BLACK).restore();
    doc.save().font('Helvetica-Bold').fontSize(7.5).fillColor('#ffffff')
       .text('Description', ML + 8, y + 5, { lineBreak: false }).restore();
    doc.save().font('Helvetica-Bold').fontSize(7.5).fillColor('#ffffff')
       .text('Amount', ML, y + 5, { width: CW - 8, align: 'right', lineBreak: false }).restore();
    y += 18;

    // Payment row
    doc.save().rect(ML, y, CW, 24).fill(DGRAY).restore();
    doc.save().font('Helvetica').fontSize(8).fillColor(BLACK)
       .text(`Loan payment — ${loanIdInternal}  ·  ${fmtDate(paymentDate)}  ·  ${paymentMethod || 'Wire'}`, ML + 8, y + 8, { lineBreak: false }).restore();
    doc.save().font('Helvetica-Bold').fontSize(8).fillColor(BLACK)
       .text(fmt$(amount), ML, y + 8, { width: CW - 8, align: 'right', lineBreak: false }).restore();
    y += 24;
    hr(y);
    y += 14;

    // Breakdown
    const breakdownRows = [
      ['Interest portion', fmt$(interestPortion)],
      ['Principal portion', fmt$(principalPortion)],
    ];
    breakdownRows.forEach(([label, value]) => {
      doc.save().font('Helvetica').fontSize(8).fillColor(BLACK)
         .text(label, ML, y, { width: CW - 8 - 120, align: 'right', lineBreak: false }).restore();
      doc.save().font('Helvetica').fontSize(8).fillColor(BLACK)
         .text(value, ML, y, { width: CW - 8, align: 'right', lineBreak: false }).restore();
      y += 14;
    });

    hr(y - 4);
    y += 2;

    doc.save().font('Helvetica-Bold').fontSize(8).fillColor(BLACK)
       .text('Total paid', ML, y, { width: CW - 8 - 120, align: 'right', lineBreak: false }).restore();
    doc.save().font('Helvetica-Bold').fontSize(8).fillColor(BLACK)
       .text(fmt$(amount), ML, y, { width: CW - 8, align: 'right', lineBreak: false }).restore();
    y += 20;

    // Status box
    doc.save().roundedRect(ML, y, CW, 28, 4).fill(DGRAY).restore();
    doc.save().font('Helvetica-Bold').fontSize(10).fillColor('#34a853')
       .text('PAID', ML + 10, y + 9, { lineBreak: false }).restore();
    doc.save().font('Helvetica').fontSize(8).fillColor(BLACK)
       .text(`Payment received · Ref: ${invoiceNumber}`, ML + 46, y + 11, { lineBreak: false }).restore();
    y += 38;

    hr(y);
    y += 14;

    // Remaining balance section
    const balanceRows = [
      ['Principal balance after payment', fmt$(principalBalanceAfter)],
      ['Per diem (daily interest)', fmt$(perDiem) + ' / day'],
      ['Next payment due', fmtDate(nextPaymentDate)],
    ];

    balanceRows.forEach(([label, value]) => {
      doc.save().font('Helvetica').fontSize(8).fillColor(BLACK)
         .text(label, ML, y, { lineBreak: false }).restore();
      doc.save().font('Helvetica').fontSize(8).fillColor(BLACK)
         .text(value, ML, y, { width: CW, align: 'right', lineBreak: false }).restore();
      y += 14;
    });

    y += 6;
    hr(y);
    y += 10;

    doc.save().font('Helvetica').fontSize(7).fillColor('#888888')
       .text(
         `This receipt confirms payment received on ${issueDate} for loan ${loanIdInternal}, serviced by SwiftDeed LLC. ` +
         `For questions, contact support@theswiftdeed.com.`,
         ML, y, { width: CW, lineBreak: true }
       ).restore();

    // Footer
    const footerY = PH - 38;
    hr(footerY);
    doc.save().font('Helvetica').fontSize(7).fillColor(BLACK)
       .text(`Loan: ${loanIdInternal}  ·  Property: ${propertyAddress || '—'}`, ML, footerY + 6, { lineBreak: false }).restore();
    doc.save().font('Helvetica').fontSize(7).fillColor(BLACK)
       .text('SwiftDeed LLC  ·  www.theswiftdeed.com  ·  support@theswiftdeed.com',
             ML, footerY + 16, { lineBreak: false }).restore();
    doc.save().font('Helvetica').fontSize(7).fillColor(BLACK)
       .text(invoiceNumber, ML, footerY + 10, { width: CW, align: 'right', lineBreak: false }).restore();

    doc.end();
  });
}

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
      borrowerEmail,
      lenderEmail,
      borrowerName,
      lenderName,
      propertyAddress,
      perDiem,
      nextPaymentDate,
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
    let paymentId = null;
    if (paymentLog) {
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert(paymentLog)
        .select('id')
        .single();

      if (paymentError) {
        console.error('Payment log error:', paymentError);
      } else {
        paymentId = paymentData?.id;
      }
    }

    // Generate invoice PDF
    let invoiceUrl = null;
    try {
      const pdfBuffer = await generatePaymentInvoicePDF({
        borrowerName,
        loanIdInternal,
        propertyAddress,
        paymentDate: paymentLog?.payment_date,
        amount: paymentLog?.amount,
        interestPortion: paymentLog?.interest_portion,
        principalPortion: paymentLog?.principal_portion,
        principalBalanceAfter: paymentLog?.principal_balance_after,
        nextPaymentDate: updates?.next_payment_date || nextPaymentDate,
        paymentMethod: paymentLog?.method,
        perDiem,
        lenderName,
      });

      const invoiceFileName = `${loanIdInternal}-payment-${paymentLog?.payment_date?.replace(/-/g, '')}-${paymentId || Date.now()}.pdf`;
      await supabase.storage
        .from('payoff-statements')
        .upload(invoiceFileName, pdfBuffer, { contentType: 'application/pdf' });

      const { data: urlData } = supabase.storage
        .from('payoff-statements')
        .getPublicUrl(invoiceFileName);

      invoiceUrl = urlData?.publicUrl || null;

      // Email borrower
      if (borrowerEmail) {
        await fetch('https://api.postmarkapp.com/email', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Postmark-Server-Token': process.env.POSTMARK_SERVER_TOKEN,
          },
          body: JSON.stringify({
            From: 'scott@theswiftdeed.com',
            To: borrowerEmail,
            Subject: `Payment Receipt — ${loanIdInternal}`,
            HtmlBody: `<p>Hi ${borrowerName},</p><p>Your payment of <strong>$${parseFloat(paymentLog?.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong> has been received for loan <strong>${loanIdInternal}</strong>.</p><p>Please find your payment receipt attached.</p><p>Thank you,<br>SwiftDeed LLC</p>`,
            TextBody: `Hi ${borrowerName},\n\nYour payment of $${parseFloat(paymentLog?.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} has been received for loan ${loanIdInternal}.\n\nPlease find your payment receipt attached.\n\nThank you,\nSwiftDeed LLC`,
            Attachments: [{
              Name: `${loanIdInternal}-payment-receipt.pdf`,
              Content: pdfBuffer.toString('base64'),
              ContentType: 'application/pdf',
            }],
          }),
        });
        console.log('Payment receipt sent to borrower:', borrowerEmail);
      }

      // Email lender
      if (lenderEmail) {
        await fetch('https://api.postmarkapp.com/email', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Postmark-Server-Token': process.env.POSTMARK_SERVER_TOKEN,
          },
          body: JSON.stringify({
            From: 'scott@theswiftdeed.com',
            To: lenderEmail,
            Subject: `Payment Received — ${borrowerName} · ${loanIdInternal}`,
            HtmlBody: `<p>A payment of <strong>$${parseFloat(paymentLog?.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong> has been recorded for borrower <strong>${borrowerName}</strong> on loan <strong>${loanIdInternal}</strong>.</p><p>Method: ${paymentLog?.method || '—'}<br>Date: ${paymentLog?.payment_date || '—'}<br>Remaining balance: $${parseFloat(paymentLog?.principal_balance_after || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p><p>SwiftDeed LLC</p>`,
            TextBody: `Payment recorded for ${borrowerName} — ${loanIdInternal}\n\nAmount: $${parseFloat(paymentLog?.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}\nMethod: ${paymentLog?.method || '—'}\nDate: ${paymentLog?.payment_date || '—'}\nRemaining balance: $${parseFloat(paymentLog?.principal_balance_after || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}\n\nSwiftDeed LLC`,
          }),
        });
        console.log('Payment notification sent to lender:', lenderEmail);
      }

    } catch (pdfErr) {
      console.error('Invoice generation error (non-blocking):', pdfErr.message);
    }

    return res.status(200).json({ success: true, invoiceUrl });
  } catch (error) {
    console.error('Record payment error:', error);
    return res.status(500).json({ error: error.message });
  }
}
