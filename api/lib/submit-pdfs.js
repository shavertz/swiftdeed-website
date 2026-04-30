export async function generatePayoffPDF(data) {
  const PDFDocument = (await import('pdfkit')).default;
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 0, compress: true, autoFirstPage: true });
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
    const GRAY   = '#888888';
    const LGRAY  = '#dddddd';
    const SHADE  = '#fafafa';
    const DGRAY  = '#f5f5f5';

    const fmt$ = v =>
      v == null ? '$0.00'
      : '$' + parseFloat(v).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    const fmtPct = v =>
      v == null ? '0.0000%' : parseFloat(v).toFixed(4) + '%';

    const fmtDate = v => v || '—';

    const hr = (y, color = LGRAY, weight = 0.5) => {
      doc.save().strokeColor(color).lineWidth(weight)
         .moveTo(ML, y).lineTo(ML + CW, y).stroke().restore();
    };

    const lineRow = (y, label, value, opts = {}) => {
      const rowH = opts.rowH || 16;
      if (opts.bg) {
        doc.save().rect(ML, y, CW, rowH).fill(opts.bg).restore();
      }
      doc.save().font('Helvetica').fontSize(8).fillColor(BLACK)
         .text(label, ML + 6, y + 4, { width: CW - 90, lineBreak: false }).restore();
      doc.save().font('Helvetica').fontSize(8).fillColor(BLACK)
         .text(value, ML, y + 4, { width: CW - 6, align: 'right', lineBreak: false }).restore();
      hr(y + rowH);
      return y + rowH;
    };

    const sectionLabel = (y, text) => {
      doc.save().font('Helvetica-Bold').fontSize(6.5).fillColor(BLACK)
         .text(text.toUpperCase(), ML, y, { characterSpacing: 0.8, lineBreak: false }).restore();
      return y + 11;
    };

    const borrowerName    = data.borrower_name    || 'Unknown Borrower';
    const propertyAddress = data.property_address || '';
    const lenderName      = data.lender_name      || data.servicer_name || 'Unknown Servicer';
    const lenderAddress   = data.lender_address   || '';
    const lenderPhone     = data.lender_phone     || '';
    const accountNumber   = data.loan_id_internal || data.loan_id || data.account_number || '';
    const statementDate   = fmtDate(data.statement_date);
    const payoffDate      = fmtDate(data.payoff_date || data.estimated_payoff_date);
    const maturityDate    = fmtDate(data.maturity_date || data.loan_maturity_date);
    const interestPaidTo  = fmtDate(data.interest_paid_to_date);
    const nextPaymentDue  = fmtDate(data.next_payment_due_date);
    const expiryDate = (() => { const raw = data.expiry_date; if (!raw || raw.includes('2021') || raw.includes('2020') || raw.includes('2019')) { const d = new Date(); d.setDate(d.getDate() + 30); return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }); } return fmtDate(raw); })();
    const lateDeadline    = fmtDate(data.late_charge_deadline);

    const unpaidPrincipal       = fmt$(data.unpaid_principal_balance);
    const deferredPrincipal     = fmt$(data.deferred_unpaid_principal || 0);
    const noteRateFrom          = fmtPct(data.note_interest_rate);
    const currentNoteRate       = fmtPct(data.current_note_interest_rate || data.note_interest_rate);
    const noteRateInterestDue   = fmt$(data.note_rate_interest_due);
    const noteRatePeriod        = data.interest_period || `${interestPaidTo} to ${payoffDate}`;
    const defaultRatePct        = fmtPct(data.default_interest_rate || 0);
    const defaultInterestDue    = fmt$(data.default_interest_due || 0);
    const accruedUnpaidInterest = fmt$(data.accrued_unpaid_interest || 0);
    const deferredInterest      = fmt$(data.deferred_unpaid_interest || 0);
    const unpaidLoanFees        = fmt$(data.unpaid_loan_fees || 0);
    const otherPayments         = fmt$(data.other_payments || 0);
    const lateFeesPaidTo        = fmt$(data.late_fees_paid_to_date || 0);
    const lateFeesUnpaid        = fmt$(data.late_fees_unpaid || 0);
    const lateFeesDeferred      = fmt$(data.late_fees_deferred || 0);
    const unpaidCharges         = fmt$(data.unpaid_loan_charges || 0);
    const payoffCharges         = fmt$(data.estimated_payoff_charges || data.servicer_fee || 55);
    const suspenseBalance       = fmt$(data.suspense_balance || 0);
    const escrowBalance         = fmt$(data.escrow_balance || 0);
    const restrictedFunds       = fmt$(data.restricted_funds || 0);
    const totalDue              = fmt$(data.total_due);
    const dailyInterest         = fmt$(data.daily_interest);
    const lateCharge            = fmt$(data.late_charge);

    // Wire details
    const wire = data.wire || {};
    const hasWire = wire.wire_bank_name && wire.wire_routing_number && wire.wire_account_number;

    let y = 36;

    doc.save().font('Helvetica-Bold').fontSize(20).fillColor(BLACK)
       .text('Swift', ML, y, { continued: true, lineBreak: false });
    doc.fillColor(YELLOW).text('Deed', { lineBreak: false }).restore();
    doc.save().font('Helvetica-Bold').fontSize(14).fillColor(BLACK)
       .text('Demand Loan Payoff', ML, y, { width: CW, align: 'right', lineBreak: false }).restore();
    doc.save().font('Helvetica').fontSize(8).fillColor(BLACK)
       .text(`Statement Date: ${statementDate}  ·  Account: ${accountNumber}`,
             ML, y + 18, { width: CW, align: 'right', lineBreak: false }).restore();

    y += 32;
    hr(y, BLACK, 1.5);
    y += 10;

    const colW = CW / 2 - 10;
    doc.save().font('Helvetica-Bold').fontSize(6.5).fillColor(BLACK)
       .text('BORROWER', ML, y, { characterSpacing: 0.6, lineBreak: false }).restore();
    doc.save().font('Helvetica-Bold').fontSize(6.5).fillColor(BLACK)
       .text('SERVICER', ML + colW + 20, y, { characterSpacing: 0.6, lineBreak: false }).restore();
    y += 10;

    doc.save().font('Helvetica-Bold').fontSize(8.5).fillColor(BLACK)
       .text(borrowerName, ML, y, { width: colW, lineBreak: false }).restore();
    doc.save().font('Helvetica-Bold').fontSize(8.5).fillColor(BLACK)
       .text(lenderName, ML + colW + 20, y, { width: colW, lineBreak: false }).restore();
    y += 13;

    const borrowerAddr = data.borrower_address || '';
    let byEnd = y;
    if (borrowerAddr) {
      borrowerAddr.split('\n').forEach(line => {
        doc.save().font('Helvetica').fontSize(8).fillColor(BLACK)
           .text(line, ML, byEnd, { width: colW, lineBreak: false }).restore();
        byEnd += 11;
      });
    }

    let syEnd = y;
    if (lenderAddress) {
      lenderAddress.split('\n').forEach(line => {
        doc.save().font('Helvetica').fontSize(8).fillColor(BLACK)
           .text(line, ML + colW + 20, syEnd, { width: colW, lineBreak: false }).restore();
        syEnd += 11;
      });
    }
    if (lenderPhone) {
      doc.save().font('Helvetica').fontSize(8).fillColor(BLACK)
         .text(lenderPhone, ML + colW + 20, syEnd, { width: colW, lineBreak: false }).restore();
      syEnd += 11;
    }

    y = Math.max(byEnd, syEnd) + 6;
    hr(y);
    y += 8;

    const cards = [
      { label: 'Estimated payoff date', value: payoffDate },
      { label: 'Loan maturity date',    value: maturityDate },
      { label: 'Interest paid to date', value: interestPaidTo },
      { label: 'Next payment due',      value: nextPaymentDue },
    ];
    const cardW = (CW - 12) / 4;
    cards.forEach((card, i) => {
      const cx = ML + i * (cardW + 4);
      doc.save().roundedRect(cx, y, cardW, 30, 4).fill(DGRAY).restore();
      doc.save().font('Helvetica').fontSize(7).fillColor(BLACK)
         .text(card.label, cx + 5, y + 5, { width: cardW - 10, lineBreak: false }).restore();
      doc.save().font('Helvetica-Bold').fontSize(8.5).fillColor(BLACK)
         .text(card.value, cx + 5, y + 16, { width: cardW - 10, lineBreak: false }).restore();
    });
    y += 38;

    doc.save().rect(ML, y, 3, 24).fill(GRAY).restore();
    doc.save().rect(ML + 3, y, CW - 3, 24).fill(DGRAY).restore();
    doc.save().font('Helvetica').fontSize(7).fillColor(BLACK)
       .text(
         'This demand issued by SwiftDeed as Loan Servicer hereby voids all prior demands in any form ' +
         'and requires the receiver of this demand to call prior to payoff to verify funds, as payoff amounts may change.',
         ML + 8, y + 7, { width: CW - 16, lineBreak: false }
       ).restore();
    y += 30;

    y = sectionLabel(y, 'Principal');
    y = lineRow(y, 'Unpaid principal balance of loan', unpaidPrincipal);
    y = lineRow(y, 'Deferred unpaid principal due', deferredPrincipal);
    y += 6;

    y = sectionLabel(y, 'Interest');
    y = lineRow(y, 'Note interest rate (from interest paid to date)', noteRateFrom, { bg: SHADE });
    y = lineRow(y, 'Current note interest rate (may include default rate)', currentNoteRate, { bg: SHADE });
    y = lineRow(y, `Note rate interest due — ${noteRatePeriod}`, noteRateInterestDue);
    y = lineRow(y, `Default rate interest due — ${noteRatePeriod} (@ ${defaultRatePct})`, defaultInterestDue);
    y = lineRow(y, 'Accrued / unpaid interest due (may include unpaid default interest)', accruedUnpaidInterest);
    y = lineRow(y, 'Deferred unpaid interest due', deferredInterest);
    y += 6;

    y = sectionLabel(y, 'Fees & Charges');
    y = lineRow(y, 'Unpaid loan fees', unpaidLoanFees);
    y = lineRow(y, 'Other payments', otherPayments);
    y = lineRow(y, 'Late fees due from paid-to-date', lateFeesPaidTo);
    y = lineRow(y, 'Late fees unpaid / due from previous payments', lateFeesUnpaid);
    y = lineRow(y, 'Late fees unpaid / due & deferred from previous servicer', lateFeesDeferred);
    y = lineRow(y, 'Unpaid loan charges or advances', unpaidCharges);
    y = lineRow(y, 'Estimated payoff charges from servicer', payoffCharges);
    y += 6;

    y = sectionLabel(y, 'Balances');
    y = lineRow(y, 'Suspense balance', suspenseBalance);
    y = lineRow(y, 'Escrow balance', escrowBalance);
    y = lineRow(y, 'Restricted funds', restrictedFunds);
    y += 8;

    doc.save().roundedRect(ML, y, CW, 28, 4).fill(BLACK).restore();
    doc.save().font('Helvetica-Bold').fontSize(9).fillColor('#ffffff')
       .text('Estimated amount to fully pay off this loan', ML + 10, y + 10, { lineBreak: false }).restore();
    doc.save().font('Helvetica-Bold').fontSize(14).fillColor('#ffffff')
       .text(totalDue, ML, y + 7, { width: CW - 10, align: 'right', lineBreak: false }).restore();
    y += 34;

    doc.save().roundedRect(ML, y, CW, 16, 3).stroke(LGRAY).restore();
    doc.save().font('Helvetica').fontSize(7.5).fillColor(BLACK)
       .text(
         `Daily interest if paying after ${payoffDate}${expiryDate && expiryDate !== '—' ? ' (expires ' + expiryDate + ')' : ''}`,
         ML + 6, y + 4, { lineBreak: false }
       ).restore();
    doc.save().font('Helvetica-Bold').fontSize(7.5).fillColor(BLACK)
       .text(`${dailyInterest} / day`, ML, y + 4, { width: CW - 6, align: 'right', lineBreak: false }).restore();
    y += 20;

    if (data.late_charge && parseFloat(data.late_charge) > 0) {
      doc.save().roundedRect(ML, y, CW, 16, 3).stroke(LGRAY).restore();
      doc.save().font('Helvetica').fontSize(7.5).fillColor(BLACK)
         .text(`Late charge if payment not received by ${lateDeadline}`,
               ML + 6, y + 4, { lineBreak: false }).restore();
      doc.save().font('Helvetica-Bold').fontSize(7.5).fillColor(BLACK)
         .text(lateCharge, ML, y + 4, { width: CW - 6, align: 'right', lineBreak: false }).restore();
      y += 20;
    }

    y += 6;
    hr(y);
    y += 6;

    const disclaimerLines = [
      `IMPORTANT NOTICE: This demand is accurate as of the statement date but is subject to change. Additional interest, late charges, fees, and costs may be incurred between the statement date and the payoff date. Please call ${lenderPhone || 'the servicer'} to verify the payoff amount prior to issuing payment. Upon receipt of payment in full, the release of lien will be processed as required by state law.`,
      `(1) Only certified funds or wire transfer will be accepted for immediate payoff.`,
      `(2) Please make your disbursement payable to: ${lenderName}.`,
      `(3) We reserve the right to amend this demand should any changes occur that would increase the total amount for payoff.`,
      `(4) This demand expires and becomes null and void on ${expiryDate}.`,
      `(5) The demand fee is due even if your transaction is cancelled.`,
    ];

    disclaimerLines.forEach((line, i) => {
      doc.save().font('Helvetica').fontSize(7).fillColor(BLACK)
         .text(line, ML, y, { width: CW, lineBreak: true }).restore();
      y = doc.y + (i === 0 ? 4 : 2);
    });

    // Footer page 1
    const footerY = PH - 38;
    hr(footerY);
    doc.save().font('Helvetica').fontSize(7).fillColor(BLACK)
       .text(`Property: ${propertyAddress}`, ML, footerY + 6, { lineBreak: false }).restore();
    doc.save().font('Helvetica').fontSize(7).fillColor(BLACK)
       .text('NMLS # XXXXXX  ·  Processed by SwiftDeed Services, Inc.  ·  www.theswiftdeed.com',
             ML, footerY + 16, { lineBreak: false }).restore();
    doc.save().font('Helvetica').fontSize(7).fillColor(BLACK)
       .text('Prepared by', ML, footerY + 6, { width: CW, align: 'right', lineBreak: false }).restore();
    doc.save().font('Helvetica-Bold').fontSize(7).fillColor(BLACK)
       .text('SwiftDeed Processing Team', ML, footerY + 16, { width: CW, align: 'right', lineBreak: false }).restore();

    // ── PAGE 2: Wire Instructions ──
    doc.addPage({ size: 'LETTER', margin: 0 });
    let y2 = 36;

    // Page 2 header
    doc.save().font('Helvetica-Bold').fontSize(20).fillColor(BLACK)
       .text('Swift', ML, y2, { continued: true, lineBreak: false });
    doc.fillColor(YELLOW).text('Deed', { lineBreak: false }).restore();
    doc.save().font('Helvetica-Bold').fontSize(14).fillColor(BLACK)
       .text('Wire Instructions', ML, y2, { width: CW, align: 'right', lineBreak: false }).restore();
    doc.save().font('Helvetica').fontSize(8).fillColor(BLACK)
       .text(`Account: ${accountNumber}  ·  Statement Date: ${statementDate}`,
             ML, y2 + 18, { width: CW, align: 'right', lineBreak: false }).restore();

    y2 += 32;
    hr(y2, BLACK, 1.5);
    y2 += 16;

    if (hasWire) {
      // Wire box
      doc.save().roundedRect(ML, y2, CW, 10).fill(YELLOW).restore();
      doc.save().font('Helvetica-Bold').fontSize(7).fillColor(BLACK)
         .text('WIRE INSTRUCTIONS', ML + 8, y2 + 2, { characterSpacing: 0.8, lineBreak: false }).restore();
      y2 += 14;

      doc.save().font('Helvetica').fontSize(8).fillColor(BLACK)
         .text('Please wire the full payoff amount directly to the lender\'s receiving account below. Include the reference number in your wire memo.',
               ML, y2, { width: CW, lineBreak: true }).restore();
      y2 = doc.y + 10;

      // Wire details table
      const wireRows = [
        ['Bank', wire.wire_bank_name],
        ['Account name', wire.wire_account_name],
        ['Routing number', wire.wire_routing_number],
        ['Account number', wire.wire_account_number],
        ...(wire.wire_bank_address ? [['Bank address', wire.wire_bank_address]] : []),
        ['Reference / memo', accountNumber],
      ];

      wireRows.forEach((row, i) => {
        const rowH = 18;
        const bg = i % 2 === 0 ? DGRAY : '#ffffff';
        doc.save().rect(ML, y2, CW, rowH).fill(bg).restore();
        doc.save().font('Helvetica').fontSize(8).fillColor(GRAY)
           .text(row[0], ML + 8, y2 + 5, { width: 120, lineBreak: false }).restore();
        const isRef = row[0] === 'Reference / memo';
        doc.save().font('Helvetica-Bold').fontSize(8).fillColor(isRef ? YELLOW : BLACK)
           .text(row[1], ML + 136, y2 + 5, { width: CW - 144, lineBreak: false }).restore();
        hr(y2 + rowH);
        y2 += rowH;
      });

      y2 += 12;

      // Important notice box
      doc.save().rect(ML, y2, 3, 40).fill(YELLOW).restore();
      doc.save().rect(ML + 3, y2, CW - 3, 40).fill(DGRAY).restore();
      doc.save().font('Helvetica-Bold').fontSize(7.5).fillColor(BLACK)
         .text('Important:', ML + 10, y2 + 6, { lineBreak: false }).restore();
      doc.save().font('Helvetica').fontSize(7.5).fillColor(BLACK)
         .text(
           'Always include the reference number in your wire memo field. Contact your lender directly to confirm receipt of funds before closing. Wire transfers may take 1–2 business days to settle.',
           ML + 10, y2 + 17, { width: CW - 18, lineBreak: true }
         ).restore();
      y2 += 50;

      y2 += 10;
      hr(y2);
      y2 += 10;

      doc.save().font('Helvetica').fontSize(7.5).fillColor(BLACK)
         .text(`Payoff amount as of ${statementDate}: `, ML, y2, { continued: true, lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(BLACK)
         .text(totalDue, { continued: true, lineBreak: false });
      doc.font('Helvetica').fontSize(7.5).fillColor(GRAY)
         .text(`  (${dailyInterest} / day after ${payoffDate})`, { lineBreak: false }).restore();

    } else {
      // No wire details on file
      doc.save().roundedRect(ML, y2, CW, 40, 4).fill(DGRAY).restore();
      doc.save().font('Helvetica-Bold').fontSize(9).fillColor(BLACK)
         .text('Wire instructions not on file', ML + 12, y2 + 12, { lineBreak: false }).restore();
      doc.save().font('Helvetica').fontSize(8).fillColor(GRAY)
         .text('Please contact your lender directly for wire transfer details.', ML + 12, y2 + 26, { lineBreak: false }).restore();
    }

    // Footer page 2
    hr(footerY);
    doc.save().font('Helvetica').fontSize(7).fillColor(BLACK)
       .text(`Property: ${propertyAddress}`, ML, footerY + 6, { lineBreak: false }).restore();
    doc.save().font('Helvetica').fontSize(7).fillColor(BLACK)
       .text('NMLS # XXXXXX  ·  Processed by SwiftDeed Services, Inc.  ·  www.theswiftdeed.com',
             ML, footerY + 16, { lineBreak: false }).restore();
    doc.save().font('Helvetica').fontSize(7).fillColor(BLACK)
       .text('Page 2 of 2', ML, footerY + 6, { width: CW, align: 'right', lineBreak: false }).restore();

    doc.end();
  });
}

export async function generateInvoicePDF({ internalLoanId, name, email, company, phone, turnaround, totalCharged, borrowerName }) {
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

    const hr = (y, color = LGRAY, weight = 0.5) => {
      doc.save().strokeColor(color).lineWidth(weight)
         .moveTo(ML, y).lineTo(ML + CW, y).stroke().restore();
    };

    const issueDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const serviceLabel = turnaround === 'rush'
      ? 'Payoff Statement — Rush Processing (within 15 min)'
      : 'Payoff Statement — Standard Processing (within 24 hrs)';
    const amount = turnaround === 'rush' ? 50.00 : 40.00;
    const fmt$ = v => '$' + parseFloat(v).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    let y = 36;

    doc.save().font('Helvetica-Bold').fontSize(20).fillColor(BLACK)
       .text('Swift', ML, y, { continued: true, lineBreak: false });
    doc.fillColor(YELLOW).text('Deed', { lineBreak: false }).restore();
    doc.save().font('Helvetica-Bold').fontSize(14).fillColor(BLACK)
       .text('Invoice', ML, y, { width: CW, align: 'right', lineBreak: false }).restore();
    doc.save().font('Helvetica').fontSize(8).fillColor(BLACK)
       .text(`Invoice #: ${internalLoanId}  ·  Date: ${issueDate}`,
             ML, y + 18, { width: CW, align: 'right', lineBreak: false }).restore();

    y += 32;
    hr(y, BLACK, 1.5);
    y += 14;

    const colW = CW / 2 - 10;
    doc.save().font('Helvetica-Bold').fontSize(6.5).fillColor(BLACK)
       .text('BILLED TO', ML, y, { characterSpacing: 0.6, lineBreak: false }).restore();
    doc.save().font('Helvetica-Bold').fontSize(6.5).fillColor(BLACK)
       .text('FROM', ML + colW + 20, y, { characterSpacing: 0.6, lineBreak: false }).restore();
    y += 10;

    doc.save().font('Helvetica-Bold').fontSize(9).fillColor(BLACK)
       .text(name || '—', ML, y, { width: colW, lineBreak: false }).restore();
    doc.save().font('Helvetica-Bold').fontSize(9).fillColor(BLACK)
       .text('SwiftDeed Services', ML + colW + 20, y, { width: colW, lineBreak: false }).restore();
    y += 13;

    if (company) {
      doc.save().font('Helvetica').fontSize(8).fillColor(BLACK)
         .text(company, ML, y, { width: colW, lineBreak: false }).restore();
      doc.save().font('Helvetica').fontSize(8).fillColor(BLACK)
         .text('www.theswiftdeed.com', ML + colW + 20, y, { width: colW, lineBreak: false }).restore();
      y += 11;
    }
    doc.save().font('Helvetica').fontSize(8).fillColor(BLACK)
       .text(email || '—', ML, y, { width: colW, lineBreak: false }).restore();
    doc.save().font('Helvetica').fontSize(8).fillColor(BLACK)
       .text('support@theswiftdeed.com', ML + colW + 20, y, { width: colW, lineBreak: false }).restore();
    y += 11;

    if (phone) {
      doc.save().font('Helvetica').fontSize(8).fillColor(BLACK)
         .text(phone, ML, y, { width: colW, lineBreak: false }).restore();
      y += 11;
    }

    y += 10;
    hr(y);
    y += 14;

    doc.save().rect(ML, y, CW, 18).fill(BLACK).restore();
    doc.save().font('Helvetica-Bold').fontSize(7.5).fillColor('#ffffff')
       .text('Description', ML + 8, y + 5, { lineBreak: false }).restore();
    doc.save().font('Helvetica-Bold').fontSize(7.5).fillColor('#ffffff')
       .text('Borrower', ML + 260, y + 5, { lineBreak: false }).restore();
    doc.save().font('Helvetica-Bold').fontSize(7.5).fillColor('#ffffff')
       .text('Amount', ML, y + 5, { width: CW - 8, align: 'right', lineBreak: false }).restore();
    y += 18;

    doc.save().rect(ML, y, CW, 24).fill(DGRAY).restore();
    doc.save().font('Helvetica').fontSize(8).fillColor(BLACK)
       .text(serviceLabel, ML + 8, y + 8, { lineBreak: false }).restore();
    doc.save().font('Helvetica').fontSize(8).fillColor(BLACK)
       .text(borrowerName || '—', ML + 260, y + 8, { lineBreak: false }).restore();
    doc.save().font('Helvetica-Bold').fontSize(8).fillColor(BLACK)
       .text(fmt$(amount), ML, y + 8, { width: CW - 8, align: 'right', lineBreak: false }).restore();
    y += 24;
    hr(y);
    y += 10;

    const totRow = (label, value, bold = false) => {
      doc.save().font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).fillColor(BLACK)
         .text(label, ML, y, { width: CW - 8 - 120, align: 'right', lineBreak: false }).restore();
      doc.save().font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).fillColor(BLACK)
         .text(value, ML, y, { width: CW - 8, align: 'right', lineBreak: false }).restore();
      y += 14;
    };

    totRow('Subtotal', fmt$(amount));
    totRow('Tax', '$0.00');
    hr(y - 4);
    y += 2;
    totRow('Total', fmt$(amount), true);
    y += 4;

    doc.save().roundedRect(ML, y, CW, 28, 4).fill(DGRAY).restore();
    doc.save().font('Helvetica-Bold').fontSize(10).fillColor(BLACK)
       .text('PAID', ML + 10, y + 9, { lineBreak: false }).restore();
    doc.save().font('Helvetica').fontSize(8).fillColor(BLACK)
       .text(`Payment collected at submission · Reference: ${internalLoanId}`,
             ML + 46, y + 11, { lineBreak: false }).restore();
    y += 38;

    hr(y);
    y += 10;

    doc.save().font('Helvetica').fontSize(7).fillColor('#888888')
       .text(
         `This invoice confirms payment for payoff statement processing services rendered on ${issueDate}. ` +
         `For questions, contact support@theswiftdeed.com. Thank you for using SwiftDeed.`,
         ML, y, { width: CW, lineBreak: true }
       ).restore();

    const footerY = PH - 38;
    hr(footerY);
    doc.save().font('Helvetica').fontSize(7).fillColor(BLACK)
       .text('SwiftDeed Services, Inc.  ·  www.theswiftdeed.com  ·  support@theswiftdeed.com',
             ML, footerY + 10, { lineBreak: false }).restore();
    doc.save().font('Helvetica').fontSize(7).fillColor(BLACK)
       .text(internalLoanId, ML, footerY + 10, { width: CW, align: 'right', lineBreak: false }).restore();

    doc.end();
  });
}
