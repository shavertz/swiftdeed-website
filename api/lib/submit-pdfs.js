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

export async function generateInvoicePDF({
  internalLoanId,
  name,
  email,
  company,
  phone,
  turnaround,
  totalCharged,
  borrowerName,
  invoiceNumber,
  invoiceDate,
  dueDate,
  billingPeriod,
  lenderName,
  contactName,
  billingEmail,
  billingAddress = [],
  servicingItems = [],
  additionalItems = [],
  paymentDate,
}) {
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
    const CW = PW - ML - 44;
    const BLACK = '#111111';
    const YELLOW = '#D4A017';
    const GRAY = '#444444';
    const MGRAY = '#555555';
    const LGRAY = '#dddddd';
    const DGRAY = '#f4f4f4';
    const HGRAY = '#fafafa';

    const fmtMoney = value => '$' + Number(value || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const shortDate = value => value || new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    const hr = (y, color = LGRAY, weight = 0.5) => doc.save().strokeColor(color).lineWidth(weight).moveTo(ML, y).lineTo(ML + CW, y).stroke().restore();
    const vline = (x, y1, y2) => doc.save().strokeColor(LGRAY).lineWidth(0.5).moveTo(x, y1).lineTo(x, y2).stroke().restore();
    const smallCaps = (text, x, y, opts = {}) => doc.save().font('Helvetica-Bold').fontSize(opts.size || 7).fillColor(opts.color || BLACK).text(text, x, y, { characterSpacing: 1, lineBreak: false, ...opts }).restore();

    const invNumber = invoiceNumber || `INV-${new Date().getFullYear()}-${String(internalLoanId || Date.now()).slice(-4)}`;
    const invDate = shortDate(invoiceDate);
    const invDueDate = shortDate(dueDate || invoiceDate);
    const period = billingPeriod || 'Billing period';
    const billToName = lenderName || company || name || 'SwiftDeed customer';
    const billToContact = contactName || (company ? name : '');
    const billToEmail = billingEmail || email || '';
    const billToAddress = Array.isArray(billingAddress) ? billingAddress : [billingAddress].filter(Boolean);
    const fallbackAmount = Number(totalCharged || (turnaround === 'rush' ? 50 : 40));
    const serviceRows = servicingItems.map(item => ({ ...item, amount: item.amount ?? 35 }));
    const chargeRows = additionalItems.length ? additionalItems : [{
      details: `Payoff statement - ${internalLoanId || 'loan'}${borrowerName ? ` - ${borrowerName}` : ''}${paymentDate ? ` - Generated ${paymentDate}` : ''}`,
      amount: fallbackAmount,
    }];
    const subtotal = serviceRows.reduce((sum, item) => sum + Number(item.amount || 0), 0) + chargeRows.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    let y = 40;
    doc.font('Helvetica-Bold').fontSize(20).fillColor(BLACK).text('Swift', ML, y, { continued: true, lineBreak: false });
    doc.fillColor(YELLOW).text('Deed', { lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(17).fillColor(BLACK).text('Invoice', ML, y, { width: CW, align: 'right', lineBreak: false });
    doc.font('Helvetica').fontSize(8).fillColor(GRAY).text(`${invNumber} - ${period}`, ML, y + 20, { width: CW, align: 'right', lineBreak: false });

    y += 38;
    hr(y, BLACK, 2.5);
    y += 18;

    const colW = CW / 2 - 10;
    smallCaps('BILL TO', ML, y);
    smallCaps('BILL FROM', ML + colW + 20, y);
    y += 12;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(BLACK).text(billToName, ML, y, { width: colW });
    doc.text('SwiftDeed Services, Inc.', ML + colW + 20, y, { width: colW });
    y += 13;
    [billToContact, billToEmail, ...billToAddress, phone].filter(Boolean).slice(0, 5).forEach((line, index) => {
      doc.font('Helvetica').fontSize(8).fillColor(GRAY).text(line, ML, y + index * 11, { width: colW });
    });
    doc.font('Helvetica').fontSize(8).fillColor(GRAY).text('hello@theswiftdeed.com', ML + colW + 20, y, { width: colW });
    doc.text('www.theswiftdeed.com', ML + colW + 20, y + 11, { width: colW });
    y += 64;

    const metaW = CW / 3;
    doc.save().rect(ML, y, CW, 40).fill(DGRAY).strokeColor(LGRAY).lineWidth(0.5).stroke().restore();
    vline(ML + metaW, y, y + 40);
    vline(ML + metaW * 2, y, y + 40);
    [['INVOICE DATE', invDate], ['DUE DATE', invDueDate], ['INVOICE NUMBER', invNumber]].forEach(([label, value], index) => {
      const x = ML + metaW * index + 12;
      doc.font('Helvetica').fontSize(7).fillColor(MGRAY).text(label, x, y + 9, { characterSpacing: 0.7 });
      doc.font('Helvetica-Bold').fontSize(8).fillColor(BLACK).text(value, x, y + 23);
    });
    y += 68;

    const drawTable = (title, rows, firstHeader) => {
      if (!rows.length) return;
      doc.save().rect(ML, y, CW, 20).fill(DGRAY).strokeColor(LGRAY).lineWidth(0.5).stroke().restore();
      smallCaps(title.toUpperCase(), ML + 12, y + 7, { size: 7 });
      y += 20;
      doc.save().rect(ML, y, CW, 24).fill(HGRAY).strokeColor(LGRAY).lineWidth(0.5).stroke().restore();
      smallCaps(firstHeader, ML + 12, y + 9, { size: 7, color: MGRAY });
      smallCaps('AMOUNT', ML + CW - 80, y + 9, { size: 7, color: MGRAY });
      y += 24;
      rows.forEach(item => {
        const details = item.details || item.loan || item.label || `${item.loanId || internalLoanId || ''}${item.borrower ? ` - ${item.borrower}` : ''}`;
        doc.font('Helvetica').fontSize(8).fillColor(GRAY).text(details, ML + 12, y + 10, { width: CW - 120 });
        doc.font('Helvetica').fontSize(8).fillColor(BLACK).text(fmtMoney(item.amount), ML, y + 10, { width: CW - 12, align: 'right' });
        y += 24;
        hr(y, '#eeeeee');
      });
      y += 14;
    };

    drawTable(`Loan servicing - ${serviceRows.length} loans @ $35.00/mo`, serviceRows, 'LOAN');
    drawTable('Additional charges', chargeRows, 'DETAILS');

    const totalsX = ML + CW - 240;
    const totalRow = (label, value, bold = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 9 : 8).fillColor(bold ? BLACK : MGRAY).text(label, totalsX, y, { width: 130 });
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 9 : 8).fillColor(BLACK).text(value, totalsX, y, { width: 240, align: 'right' });
      y += 16;
    };
    totalRow('Subtotal', fmtMoney(subtotal));
    totalRow('Tax', '$0.00');
    totalRow('Total due', fmtMoney(subtotal), true);
    y += 18;

    doc.save().rect(ML, y, CW, 48).fill(DGRAY).strokeColor(LGRAY).lineWidth(0.5).stroke().restore();
    doc.font('Helvetica').fontSize(8).fillColor(MGRAY).text(`Payment will be automatically charged to the card on file on ${invDueDate}. To update your payment method, log in to your SwiftDeed account. For billing questions, contact `, ML + 14, y + 14, { width: CW - 28, continued: true });
    doc.font('Helvetica-Bold').fillColor(BLACK).text('hello@theswiftdeed.com', { continued: false });

    const footerY = PH - 38;
    hr(footerY, '#cccccc');
    doc.font('Helvetica').fontSize(7).fillColor(MGRAY).text('SwiftDeed Services, Inc.', ML, footerY + 10, { lineBreak: false });
    doc.text('NMLS # XXXXXX - www.theswiftdeed.com', ML, footerY + 10, { width: CW, align: 'right', lineBreak: false });

    doc.end();
  });
}