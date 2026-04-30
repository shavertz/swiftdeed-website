import Anthropic from '@anthropic-ai/sdk';
import formidable from 'formidable';
import fs from 'fs';
import { upsertBorrower } from './lib/borrowers.js';
import { sendInternalSubmissionEmail, sendLenderPayoffEmail } from './lib/email.js';
import { supabase } from './lib/supabase.js';

export const config = { api: { bodyParser: false, responseLimit: false } };

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function generatePayoffPDF(data) {
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

async function generateInvoicePDF({ internalLoanId, name, email, company, phone, turnaround, totalCharged, borrowerName }) {
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

function calculateInterest({ principal, rate, accrualBasis, compoundingFrequency, interestCalculationMethod, daysElapsed, statedPayoffAmount }) {
  const r = rate / 100;

  if (
    interestCalculationMethod &&
    (interestCalculationMethod.toLowerCase().includes('precomputed') ||
     interestCalculationMethod.toLowerCase().includes('rule of 78'))
  ) {
    return { interestDue: null, useStatedPayoff: true };
  }

  if (
    compoundingFrequency &&
    !compoundingFrequency.toLowerCase().includes('simple') &&
    !compoundingFrequency.toLowerCase().includes('none')
  ) {
    let n;
    const freq = compoundingFrequency.toLowerCase();
    if (freq.includes('daily'))        n = 365;
    else if (freq.includes('monthly')) n = 12;
    else if (freq.includes('quarter')) n = 4;
    else if (freq.includes('annual'))  n = 1;
    else                               n = 365;

    const years = daysElapsed / 365;
    const compoundedBalance = principal * Math.pow(1 + r / n, n * years);
    const interestDue = compoundedBalance - principal;
    return { interestDue, useStatedPayoff: false };
  }

  const basis = (accrualBasis || '').toLowerCase();

  if (basis.includes('actual/360') || basis.includes('actual / 360')) {
    const dailyRate = (principal * r) / 360;
    return { interestDue: dailyRate * daysElapsed, useStatedPayoff: false };
  }

  if (basis.includes('30/360') || basis.includes('30 / 360')) {
    const months = daysElapsed / 30;
    const interestDue = principal * r * (months / 12);
    return { interestDue, useStatedPayoff: false };
  }

  const dailyRate = (principal * r) / 365;
  return { interestDue: dailyRate * daysElapsed, useStatedPayoff: false };
}

function mergeExtractions(results) {
  const merged = {};
  for (const result of results) {
    for (const [key, value] of Object.entries(result)) {
      if (value !== null && value !== undefined && value !== '' && !merged[key]) {
        merged[key] = value;
      }
    }
  }
  return merged;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const form = formidable({ multiples: true, maxFileSize: 25 * 1024 * 1024 });
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const name       = Array.isArray(fields.name)          ? fields.name[0]          : fields.name;
    const email      = Array.isArray(fields.email)         ? fields.email[0]         : fields.email;
    const company    = Array.isArray(fields.company)       ? fields.company[0]       : fields.company;
    const phone      = Array.isArray(fields.phone)         ? fields.phone[0]         : fields.phone;
    const borrowerId = Array.isArray(fields.borrowerId)    ? fields.borrowerId[0]    : fields.borrowerId;
    const notes      = Array.isArray(fields.notes)         ? fields.notes[0]         : fields.notes;
    const turnaround = Array.isArray(fields.turnaround)    ? fields.turnaround[0]    : fields.turnaround;
    const borrowerEmail = Array.isArray(fields.borrowerEmail) ? fields.borrowerEmail[0] : fields.borrowerEmail;
    const borrowerName  = Array.isArray(fields.borrowerName)  ? fields.borrowerName[0]  : fields.borrowerName;

    // Fetch lender wire details
    let wireDetails = {};
    if (email) {
      const { data: lenderRows } = await supabase
        .from('lenders')
        .select('wire_bank_name, wire_routing_number, wire_account_number, wire_account_name, wire_bank_address')
        .eq('email', email)
        .limit(1);
      if (lenderRows && lenderRows.length > 0) {
        wireDetails = lenderRows[0];
      }
    }

    const fileUrlsRaw = Array.isArray(fields.fileUrls) ? fields.fileUrls[0] : fields.fileUrls;
    const fileUrls = fileUrlsRaw ? JSON.parse(fileUrlsRaw) : [];
    const pdfContents = await Promise.all(fileUrls.map(async (url) => {
      const r = await fetch(url);
      const buffer = await r.arrayBuffer();
      return { name: url.split('/').pop(), data: Buffer.from(buffer).toString('base64') };
    }));

    const { PDFDocument } = await import('pdf-lib');
    const splitPdfIfNeeded = async (base64Data) => {
      const pdfBytes = Buffer.from(base64Data, 'base64');
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const totalPages = pdfDoc.getPageCount();
      if (totalPages <= 100) return [base64Data];
      const chunks = [];
      let start = 0;
      while (start < totalPages) {
        const end = Math.min(start + 90, totalPages);
        const chunkDoc = await PDFDocument.create();
        const pageIndices = Array.from({ length: end - start }, (_, i) => start + i);
        const copiedPages = await chunkDoc.copyPages(pdfDoc, pageIndices);
        copiedPages.forEach(p => chunkDoc.addPage(p));
        const chunkBytes = await chunkDoc.save();
        chunks.push(Buffer.from(chunkBytes).toString('base64'));
        if (end >= totalPages) break;
        start = end - 1;
      }
      return chunks;
    };

    const expandedPdfContents = [];
    for (const pdf of pdfContents) {
      const chunks = await splitPdfIfNeeded(pdf.data);
      chunks.forEach((chunkData, i) => expandedPdfContents.push({
        name: chunks.length > 1 ? `${pdf.name} (part ${i + 1})` : pdf.name,
        data: chunkData
      }));
    }

    const extractionPrompt = `Extract the following fields from the attached loan document. Return ONLY a raw JSON object, no markdown, no backticks.

Fields to extract:
- loan_id
- borrower_name (the borrowing entity or individual — look for "Borrower" label)
- guarantor_name (the personal guarantor — look for "Guarantor" label, or the individual who signed personally)
- borrower_address (full multi-line address as a single string with \\n between lines)
- property_address
- lender_name (look for servicer or lender mentions)
- lender_address (full multi-line address as a single string with \\n between lines)
- lender_phone
- unpaid_principal (number only, no $ or commas)
- interest_rate (number only, no %)
- servicer_fee (number only, no $ or commas)
- loan_origination_date (the date the loan was made or agreement was signed, format MM/DD/YYYY)
- interest_paid_to_date (date string, format MM/DD/YYYY)
- payoff_date (date string, format MM/DD/YYYY)
- maturity_date (date string, format MM/DD/YYYY)
- next_payment_due_date (date string, format MM/DD/YYYY)
- statement_date (date string, format MM/DD/YYYY)
- expiry_date (date string, format MM/DD/YYYY)
- late_charge_deadline (date string, format MM/DD/YYYY)
- default_interest_rate (number only, no %)
- daily_interest (number only — extract if explicitly stated in the document)
- late_charge (number only)
- accrual_basis (look for "Actual/360", "Actual/365", "30/360" or similar language — return exactly as written, or null if not found)
- compounding_frequency (look for "compounded daily", "compounded monthly", "simple interest" — return as written, or null if not found)
- interest_calculation_method (look for "Rule of 78s", "precomputed interest", or similar — return as written, or null if not found)
- stated_payoff_amount (number only — the total payoff amount if explicitly stated, no $ or commas, or null if not stated)

Submitter notes: ${notes || 'none'}
Borrower ID provided by submitter: ${borrowerId || 'none'}`;

    const allExtractions = [];
    console.log(`Processing ${expandedPdfContents.length} chunk(s)`);
    for (const pdf of expandedPdfContents) {
      const chunkResponse = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf.data } },
            { type: 'text', text: extractionPrompt }
          ]
        }]
      });

      const rawText = chunkResponse.content[0].text;
      const cleanJson = rawText.replace(/```json|```/g, '').replace(/[\s\S]*?(\{[\s\S]*\})[\s\S]*/g, '$1').trim();
      try {
        const extracted = JSON.parse(cleanJson);
        console.log(`Chunk "${pdf.name}" extracted:`, JSON.stringify(extracted));
        allExtractions.push(extracted);
      } catch (e) {
        console.warn('Failed to parse chunk extraction:', e.message);
      }
    }

    const loanData = mergeExtractions(allExtractions);

    const principal   = parseFloat(loanData.unpaid_principal) || 0;
    const rate        = parseFloat(loanData.interest_rate) || 0;
    const servicerFee = parseFloat(loanData.servicer_fee) || 0;

    if (!loanData.interest_paid_to_date && loanData.statement_date) {
      loanData.interest_paid_to_date = loanData.statement_date;
    }

    let daysElapsed = 0;
    if (loanData.interest_paid_to_date) {
      const paidToDate = new Date(loanData.interest_paid_to_date);
      const today = new Date();
      daysElapsed = Math.max(0, Math.floor((today - paidToDate) / (1000 * 60 * 60 * 24)));
    }

    const { interestDue, useStatedPayoff } = calculateInterest({
      principal,
      rate,
      accrualBasis: loanData.accrual_basis,
      compoundingFrequency: loanData.compounding_frequency,
      interestCalculationMethod: loanData.interest_calculation_method,
      daysElapsed,
      statedPayoffAmount: loanData.stated_payoff_amount,
    });

    let totalDue;
    if (useStatedPayoff && loanData.stated_payoff_amount) {
      totalDue = parseFloat(loanData.stated_payoff_amount);
    } else {
      totalDue = principal + (interestDue || 0) + servicerFee;
    }

    const dailyRateForPDF = loanData.daily_interest
      ? parseFloat(loanData.daily_interest)
      : (() => {
          const basis = (loanData.accrual_basis || '').toLowerCase();
          const divisor = basis.includes('360') ? 360 : 365;
          return (principal * (rate / 100)) / divisor;
        })();

    const internalLoanId = 'SD-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-6);
    const activationBaseUrl = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host || 'www.theswiftdeed.com'}`;

    const pdfBuffer = await generatePayoffPDF({
      ...loanData,
      unpaid_principal_balance: principal,
      note_interest_rate: rate,
      note_rate_interest_due: useStatedPayoff ? null : interestDue,
      estimated_payoff_charges: servicerFee,
      total_due: totalDue,
      daily_interest: dailyRateForPDF,
      late_charge: loanData.late_charge,
      interest_period: `${loanData.interest_paid_to_date} to ${loanData.payoff_date || loanData.maturity_date || 'payoff date'}`,
      loan_id_internal: internalLoanId,
      account_number: internalLoanId,
      statement_date: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
      wire: wireDetails,
    });

    const invoiceBuffer = await generateInvoicePDF({
      internalLoanId,
      name,
      email,
      company,
      phone,
      turnaround,
      totalCharged: turnaround === 'rush' ? 50 : 40,
      borrowerName: loanData.borrower_name,
    });

    const loanDocumentUrls = fileUrls;

    const borrowerSlug = (loanData.borrower_name || 'unknown').replace(/[^a-zA-Z0-9]/g, '-');
    const statementFileName = `${internalLoanId}_${borrowerSlug}.pdf`;
    await supabase.storage.from('payoff-statements').upload(statementFileName, pdfBuffer, { contentType: 'application/pdf' });
    const { data: urlData } = supabase.storage.from('payoff-statements').getPublicUrl(statementFileName);
    const statementUrl = urlData?.publicUrl || null;

    const loanStartDate = loanData.loan_origination_date || loanData.interest_paid_to_date || loanData.statement_date || null;

    await supabase.from('payoff_requests').insert({
      from_email: email,
      borrower_name: loanData.borrower_name,
      property_address: loanData.property_address,
      loan_id: loanData.loan_id || internalLoanId,
      loan_id_internal: internalLoanId,
      total_due: parseFloat(totalDue.toFixed(2)),
      status: 'completed',
      payoff_statement_url: statementUrl,
      completed_at: new Date().toISOString(),
      loan_document_urls: loanDocumentUrls.join(','),
      source: 'web',
      submitter_name: name || null,
      submitter_phone: phone || null,
      company_name: company || null,
      borrower_id: borrowerId || null,
      notes: notes || null,
      interest_rate: rate || null,
      per_diem: parseFloat(dailyRateForPDF.toFixed(2)) || null,
      maturity_date: loanData.maturity_date || null,
      loan_start_date: loanStartDate,
      next_payment_date: loanData.next_payment_due_date || null,
      guarantor_name: loanData.guarantor_name || null,
    });

    await upsertBorrower({
      supabase,
      loanData,
      internalLoanId,
      loanDocumentUrls: loanDocumentUrls.join(','),
      dailyRateForPDF,
      principal,
      rate,
      borrowerEmail: borrowerEmail || null,
      borrowerName: borrowerName || null,
      activationBaseUrl,
    });

    await sendLenderPayoffEmail({
      lenderEmail: email,
      lenderName: name,
      borrowerName: loanData.borrower_name,
      totalDue,
      internalLoanId,
      pdfBuffer,
      invoiceBuffer,
    });

    const paymentIntentId = Array.isArray(fields.paymentIntentId) ? fields.paymentIntentId[0] : fields.paymentIntentId;
    const skipPayment = Array.isArray(fields.skipPayment) ? fields.skipPayment[0] : fields.skipPayment;
    if (paymentIntentId && skipPayment !== 'true') {
      const { default: Stripe } = await import('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      await stripe.paymentIntents.capture(paymentIntentId);
    }

    await sendInternalSubmissionEmail({
      name,
      email,
      company,
      phone,
      borrowerId,
      turnaround,
      notes,
      internalLoanId,
      loanData,
      fileCount: fileUrls.length,
    });

    return res.status(200).json({ success: true, loanId: internalLoanId });

  } catch (error) {
    console.error('Submit error:', error);
    return res.status(500).json({ error: 'Processing failed', details: error.message });
  }
}
