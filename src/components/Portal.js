import { useEffect, useState, useRef } from 'react';
import { calculatePayment } from '../utils/calculatePayment';
import { useClerk, useUser } from '@clerk/clerk-react';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

function formatDate(iso) {
  if (!iso) return '-';
  const value = typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}/.test(iso) ? `${iso.slice(0, 10)}T00:00:00` : iso;
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '-';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function defaultGoodThroughDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

function parseDocUrls(value) {
  if (!value) return [];
  return String(value).split(',').map(u => u.trim()).filter(Boolean);
}

function uniqueDocUrls(...values) {
  return [...new Set(values.flatMap(parseDocUrls))];
}


const PAGE_SIZE = 15;

const hovSolid = {
  onMouseEnter: e => { e.currentTarget.style.boxShadow = '0 0 16px rgba(255, 215, 0, 0.45)'; },
  onMouseLeave: e => { e.currentTarget.style.boxShadow = 'none'; },
};

function NavIcon({ type, active }) {
  const color = active ? '#FFD700' : '#666';
  const common = { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', style: { flexShrink: 0 } };
  if (type === 'dashboard') {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    );
  }
  if (type === 'loans') {
    return (
      <svg {...common}>
        <path d="M4 7.5h16" />
        <path d="M6 4.5h12c1.1 0 2 .9 2 2v11c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2v-11c0-1.1.9-2 2-2Z" />
        <path d="M8 11h8" />
        <path d="M8 15h5" />
      </svg>
    );
  }
  if (type === 'documents') {
    return (
      <svg {...common}>
        <path d="M7 3.5h7l4 4v13H7c-1.1 0-2-.9-2-2v-13c0-1.1.9-2 2-2Z" />
        <path d="M14 3.5v5h5" />
        <path d="M8 12h8" />
        <path d="M8 16h6" />
      </svg>
    );
  }
  if (type === 'invoices') {
    return (
      <svg {...common}>
        <path d="M6 3.5h12v17l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2-2 1.2v-17Z" />
        <path d="M9 8h6" />
        <path d="M9 12h6" />
        <path d="M9 16h4" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.05.05a2 2 0 0 1-2.83 2.83l-.05-.05a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 0 1-4 0v-.07a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.05.05a2 2 0 0 1-2.83-2.83l.05-.05A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 0 1 0-4h.07A1.7 1.7 0 0 0 4.6 8.94a1.7 1.7 0 0 0-.34-1.88l-.05-.05a2 2 0 0 1 2.83-2.83l.05.05A1.7 1.7 0 0 0 8.97 4.6 1.7 1.7 0 0 0 10 3.07V3a2 2 0 0 1 4 0v.07a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.05-.05a2 2 0 0 1 2.83 2.83l-.05.05A1.7 1.7 0 0 0 19.4 8.94 1.7 1.7 0 0 0 20.93 10H21a2 2 0 0 1 0 4h-.07A1.7 1.7 0 0 0 19.4 15Z" />
    </svg>
  );
}


const s = {
  page: { padding: '40px 60px', width: '100%', maxWidth: 1600, margin: '0 auto', boxSizing: 'border-box', overflowX: 'hidden' },
  heading: { fontSize: 24, fontWeight: 400, color: '#fff', marginBottom: 24 },
  statRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 },
  statCard: { background: '#141414', border: '0.5px solid #222', borderRadius: 10, padding: '20px 26px' },
  statLabel: { fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  statValue: { fontSize: 26, fontWeight: 600, color: '#fff' },
  controlRow: { display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' },
  searchInput: { background: '#141414', border: '0.5px solid #2a2a2a', borderRadius: 7, padding: '8px 14px', fontSize: 13, color: '#fff', fontFamily: 'inherit', outline: 'none', flex: 1, maxWidth: 340 },
  select: { background: '#141414', border: '0.5px solid #2a2a2a', borderRadius: 7, padding: '8px 14px', fontSize: 13, color: '#fff', fontFamily: 'inherit', outline: 'none', cursor: 'pointer' },
  serviceBtn: { background: '#FFD700', color: '#0f0f0f', fontSize: 13, fontWeight: 500, padding: '8px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: 'auto', transition: 'box-shadow 0.15s' },
  grey: { color: '#555' },
  badge: (color) => ({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 4, background: color === 'green' ? '#0a2416' : '#1f1800', color: color === 'green' ? '#34d399' : '#FFD700', border: `0.5px solid ${color === 'green' ? '#065f46' : '#78350f'}`, whiteSpace: 'nowrap' }),
  empty: { padding: '60px 20px', textAlign: 'center', color: '#444', fontSize: 14, background: '#141414' },
};

//  Record Payment Modal (unchanged) 
function RecordPaymentModal({ borrower, lenderEmail, lenderName, onClose, onSuccess }) {
  const today = new Date().toISOString().split('T')[0];
  const [amount, setAmount] = useState(borrower?.monthly_payment ? String(borrower.monthly_payment) : '');
  const [date, setDate] = useState(today);
  const [method, setMethod] = useState('Wire');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const inputStyle = { background: '#1a1a1a', border: '0.5px solid #2a2a2a', borderRadius: 6, padding: '9px 12px', fontSize: 13, color: '#fff', fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box' };
  const labelStyle = { fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5, display: 'block' };

  async function handleConfirm() {
    if (!amount || !date) { setError('Please enter an amount and date.'); return; }
    setSaving(true); setError('');
    try {
      const lastDate = borrower.last_payment_date || borrower.loan_start_date;
      if (!lastDate) { setError('Missing loan start date.'); setSaving(false); return; }
      if (new Date(date) <= new Date(lastDate)) { setError('Payment date must be after the last payment date.'); setSaving(false); return; }
      const result = calculatePayment({ loan_type: borrower.loan_type || 'interest_only', principal_balance: parseFloat(borrower.principal_balance), interest_rate: parseFloat(borrower.interest_rate), monthly_payment: parseFloat(borrower.monthly_payment) || 0, total_interest_paid: parseFloat(borrower.total_interest_paid) || 0, total_payments_made: parseInt(borrower.total_payments_made) || 0, last_payment_date: borrower.last_payment_date || borrower.loan_start_date || borrower.next_payment_date, next_payment_date: borrower.next_payment_date, maturity_date: borrower.maturity_date, day_count_convention: borrower.day_count_convention || 360 }, date, parseFloat(amount));
      if (result.error) { setError('Calculation error: ' + result.error); setSaving(false); return; }
      const updates = { ...result.updates, last_payment_amount: parseFloat(amount), last_payment_method: method, last_payment_interest: result.breakdown.interestPortion, last_payment_principal: result.breakdown.principalPortion };
      const res = await fetch('/api/record-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ borrowerId: borrower.id, loanIdInternal: borrower.loan_id_internal, updates, borrowerEmail: borrower.borrower_email || null, lenderEmail: lenderEmail || null, lenderName: lenderName || null, borrowerName: borrower.legal_name || null, propertyAddress: borrower.property_address || null, perDiem: borrower.per_diem || null, nextPaymentDate: result.updates.next_payment_date || null, paymentLog: { loan_id_internal: borrower.loan_id_internal, payment_date: date, amount: parseFloat(amount), method, interest_portion: result.breakdown.interestPortion, principal_portion: result.breakdown.principalPortion, principal_balance_after: result.updates.principal_balance, payment_status: result.updates.payment_status, recorded_by: 'lender' } }) });
      if (!res.ok) throw new Error('Failed to save payment');
      onSuccess(updates);
    } catch (e) {
      setError('Failed to record payment. Please try again.');
    } finally { setSaving(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#141414', border: '0.5px solid #2a2a2a', borderRadius: 12, padding: '32px', width: '100%', maxWidth: 400 }}>
        <div style={{ fontSize: 16, fontWeight: 500, color: '#fff', marginBottom: 6 }}>Record payment</div>
        <div style={{ fontSize: 12, color: '#555', marginBottom: 24 }}>{borrower.legal_name} - {borrower.loan_id_internal}</div>
        <label style={labelStyle}>Payment amount</label>
        <input style={{ ...inputStyle, marginBottom: 16 }} type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
        <label style={labelStyle}>Payment date</label>
        <input style={{ ...inputStyle, marginBottom: 16 }} type="date" value={date} onChange={e => setDate(e.target.value)} />
        <label style={labelStyle}>Payment method</label>
        <select style={{ ...inputStyle, marginBottom: 24, cursor: 'pointer' }} value={method} onChange={e => setMethod(e.target.value)}>
          <option value="Wire">Wire transfer</option>
          <option value="Check">Check</option>
          <option value="ACH">ACH</option>
          <option value="Other">Other</option>
        </select>
        {error && <div style={{ fontSize: 12, color: '#f87171', marginBottom: 16 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleConfirm} disabled={saving} style={{ flex: 1, background: '#FFD700', color: '#0f0f0f', fontSize: 13, fontWeight: 600, padding: '10px', borderRadius: 6, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }} onMouseEnter={e => { if (!saving) e.currentTarget.style.boxShadow = '0 0 12px rgba(255,215,0,0.4)'; }} onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>{saving ? 'Recording...' : 'Confirm payment'}</button>
          <button onClick={onClose} disabled={saving} style={{ flex: 1, background: 'transparent', color: '#fff', fontSize: 13, padding: '10px', borderRadius: 6, border: '0.5px solid #2a2a2a', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#555'} onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a2a'}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function PayoffStatementModal({ loan, goodThroughDate, onDateChange, onClose, onGenerate, generating, error, successUrl, onDone }) {
  if (!loan) return null;
  const buttonBase = { flex: 1, fontSize: 13, fontWeight: 700, padding: '10px 12px', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit' };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 18 }}>
      <div style={{ width: '100%', maxWidth: 430, background: '#121212', border: '0.5px solid #2a2a2a', borderRadius: 11, padding: 24, boxShadow: '0 18px 60px rgba(0,0,0,0.45)' }}>
        {successUrl ? (
          <>
            <div style={{ width: 42, height: 42, borderRadius: 9, background: '#221c00', border: '0.5px solid #FFD70066', color: '#FFD700', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 16 }}>✓</div>
            <div style={{ fontSize: 19, color: '#fff', fontWeight: 600, marginBottom: 6 }}>Payoff statement generated</div>
            <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5, marginBottom: 18 }}>The PDF was emailed to the lender and added to Documents under Payoff Statements.</div>
            <div style={{ background: '#0f0f0f', border: '0.5px solid #252525', borderRadius: 8, padding: 14, marginBottom: 18 }}>
              <div style={{ color: '#FFD700', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{loan.loan_id_internal || loan.loan_id || '-'}</div>
              <div style={{ color: '#fff', fontSize: 13 }}>{loan.borrower_name || '-'}</div>
              <div style={{ color: '#555', fontSize: 12, marginTop: 4 }}>{loan.property_address || '-'}</div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => window.open(successUrl, '_blank', 'noopener,noreferrer')} style={{ ...buttonBase, background: '#FFD700', color: '#0f0f0f', border: 'none' }}>View statement -&gt;</button>
              <button onClick={onDone} style={{ ...buttonBase, background: 'transparent', color: '#fff', border: '0.5px solid #2a2a2a' }}>Done</button>
            </div>
          </>
        ) : (
          <>
        <div style={{ fontSize: 19, color: '#fff', fontWeight: 600, marginBottom: 6 }}>Generate payoff statement</div>
        <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5, marginBottom: 18 }}>Loan is already selected. Choose the good-through date for the payoff PDF.</div>

        <div style={{ background: '#0f0f0f', border: '0.5px solid #252525', borderRadius: 8, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 7 }}>Selected loan</div>
          <div style={{ color: '#FFD700', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{loan.loan_id_internal || loan.loan_id || '-'}</div>
          <div style={{ color: '#fff', fontSize: 13 }}>{loan.borrower_name || '-'}</div>
          <div style={{ color: '#555', fontSize: 12, marginTop: 4 }}>{loan.property_address || '-'}</div>
        </div>

        <label style={{ display: 'block', fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 7 }}>Good-through date</label>
        <input
          type="date"
          value={goodThroughDate}
          onChange={e => onDateChange(e.target.value)}
          style={{ width: '100%', background: '#0f0f0f', border: '0.5px solid #2a2a2a', borderRadius: 7, padding: '10px 12px', color: '#fff', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 18 }}
        />

        {error && <div style={{ color: '#f87171', fontSize: 12, marginBottom: 14 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onGenerate} disabled={generating} style={{ ...buttonBase, background: '#FFD700', color: '#0f0f0f', border: 'none', cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.75 : 1 }}>{generating ? 'Generating...' : 'Generate PDF'}</button>
          <button onClick={onClose} disabled={generating} style={{ ...buttonBase, fontWeight: 400, background: 'transparent', color: '#fff', border: '0.5px solid #2a2a2a', cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.75 : 1 }}>Cancel</button>
        </div>
          </>
        )}
      </div>
    </div>
  );
}

function getMonthlyStatementData(doc, borrower, lenderName) {
  if (!doc) return null;
  const loan = doc.loan || {};
  const accountNumber = loan.loan_id_internal || loan.loan_id || '-';
  const borrowerName = loan.borrower_name || borrower?.legal_name || '-';
  const propertyAddress = loan.property_address || borrower?.property_address || '-';
  const statementDate = '05/01/2026';
  const paymentDueDate = borrower?.next_payment_date ? new Date(borrower.next_payment_date).toLocaleDateString('en-US') : '05/01/2026';
  const maturityDate = borrower?.maturity_date ? new Date(borrower.maturity_date).toLocaleDateString('en-US') : '04/01/2028';
  const originalBalance = parseFloat(borrower?.original_loan_amount || loan.total_due || 125000);
  const endingBalance = parseFloat(borrower?.principal_balance || 123750);
  const principalReduction = Math.max(0, originalBalance - endingBalance);
  const rate = parseFloat(borrower?.interest_rate || loan.interest_rate || 10);
  const perDiem = parseFloat(borrower?.per_diem || loan.per_diem || 34.38);
  const monthlyPayment = parseFloat(borrower?.monthly_payment || 2291.67);
  const paymentReceived = parseFloat(borrower?.last_payment_amount || monthlyPayment);
  const interestApplied = parseFloat(borrower?.last_payment_interest || 1041.67);
  const principalApplied = parseFloat(borrower?.last_payment_principal || Math.max(0, paymentReceived - interestApplied));
  const paymentReceivedDate = borrower?.last_payment_date ? new Date(borrower.last_payment_date).toLocaleDateString('en-US') : '04/28/2026';
  const paymentStatus = borrower?.payment_status || 'Paid';
  const servicerName = lenderName || 'SwiftDeed Services, Inc.';

  return {
    accountNumber,
    borrowerName,
    propertyAddress,
    statementDate,
    paymentDueDate,
    maturityDate,
    originalBalance,
    endingBalance,
    principalReduction,
    rate,
    perDiem,
    monthlyPayment,
    paymentReceived,
    interestApplied,
    principalApplied,
    paymentReceivedDate,
    paymentStatus,
    servicerName,
  };
}

function monthlyStatementHtml(data) {
  if (!data) return '';
  const money = value => '$' + Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

  return `<!doctype html>
<html>
<head>
  <title>Monthly Statement - ${safe(data.accountNumber)}</title>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #ececec; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; color: #111; }
    .toolbar { position: sticky; top: 0; background: #111; color: #fff; padding: 12px 18px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; }
    .toolbar button { background: #FFD700; color: #0f0f0f; border: 0; border-radius: 7px; padding: 9px 14px; font-weight: 700; cursor: pointer; }
    .page { background: #fff; width: min(760px, calc(100vw - 28px)); margin: 22px auto; padding: 2rem 2.5rem; font-size: 13px; box-shadow: 0 12px 45px rgba(0,0,0,0.12); }
    .top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; gap: 20px; }
    .brand { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
    .title { text-align: right; }
    .title h1 { font-size: 17px; margin: 0 0 2px; }
    .meta { font-size: 11px; color: #444; }
    .rule { border-top: 2.5px solid #111; margin-bottom: 14px; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 0; margin-bottom: 16px; }
    .eyebrow { font-size: 9px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px; }
    .name { font-weight: 700; font-size: 13px; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); background: #f4f4f4; border: 0.5px solid #ddd; margin-bottom: 16px; }
    .summary > div { padding: 8px 10px; border-right: 0.5px solid #ddd; }
    .summary > div:last-child { border-right: 0; }
    .summary-label { font-size: 9px; color: #555; text-transform: uppercase; letter-spacing: 0.7px; margin-bottom: 3px; }
    .summary-value { font-weight: 700; font-size: 12px; }
    .section { margin-bottom: 14px; }
    .section-title { font-size: 9px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; background: #f4f4f4; border: 0.5px solid #ddd; border-bottom: none; padding: 5px 8px; }
    table { width: 100%; border-collapse: collapse; border: 0.5px solid #ddd; }
    td { padding: 5px 8px; font-size: 12px; border-bottom: 0.5px solid #eee; }
    tr:last-child td { border-bottom: 0; }
    td:last-child { text-align: right; }
    .muted { color: #555; padding-left: 20px; }
    .due { border: 1px solid #111; padding: 10px 12px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; }
    .small { font-size: 10px; color: #555; }
    .footer { border-top: 0.5px solid #ccc; padding-top: 8px; display: flex; justify-content: space-between; gap: 18px; font-size: 9.5px; color: #555; }
    @media print {
      body { background: #fff; }
      .toolbar { display: none; }
      .page { width: 100%; margin: 0; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div>Monthly statement preview</div>
    <button onclick="window.print()">Print / save PDF</button>
  </div>
  <div class="page">
    <div class="top">
      <div class="brand"><span>Swift</span><span style="color:#E9A800;">Deed</span></div>
      <div class="title">
        <h1>Monthly Loan Statement</h1>
        <div class="meta">Statement Date: ${safe(data.statementDate)} &nbsp;-&nbsp; Account: ${safe(data.accountNumber)}</div>
      </div>
    </div>
    <div class="rule"></div>
    <div class="parties">
      <div>
        <div class="eyebrow">Borrower</div>
        <div class="name">${safe(data.borrowerName)}</div>
        <div>${safe(data.propertyAddress)}</div>
      </div>
      <div>
        <div class="eyebrow">Servicer</div>
        <div class="name">${safe(data.servicerName)}</div>
        <div>Processed by SwiftDeed Services, Inc.</div>
        <div>www.theswiftdeed.com</div>
      </div>
    </div>
    <div class="summary">
      <div><div class="summary-label">Statement period</div><div class="summary-value">Apr 1 - Apr 30, 2026</div></div>
      <div><div class="summary-label">Payment due date</div><div class="summary-value">${safe(data.paymentDueDate)}</div></div>
      <div><div class="summary-label">Loan maturity date</div><div class="summary-value">${safe(data.maturityDate)}</div></div>
      <div><div class="summary-label">Payment status</div><div class="summary-value" style="color:#1a7a3f;">${safe(data.paymentStatus)}</div></div>
    </div>
    <div class="section">
      <div class="section-title">Principal</div>
      <table>
        <tr><td>Beginning principal balance</td><td>${money(data.originalBalance)}</td></tr>
        <tr><td>Principal reduction this period</td><td>(${money(data.principalReduction)})</td></tr>
        <tr><td><strong>Ending principal balance</strong></td><td><strong>${money(data.endingBalance)}</strong></td></tr>
      </table>
    </div>
    <div class="section">
      <div class="section-title">Interest</div>
      <table>
        <tr><td>Note interest rate</td><td>${Number(data.rate || 0).toFixed(4)}%</td></tr>
        <tr><td>Interest charged this period</td><td>${money(data.interestApplied)}</td></tr>
        <tr><td>Daily interest (per diem)</td><td>${money(data.perDiem)} / day</td></tr>
      </table>
    </div>
    <div class="section">
      <div class="section-title">Payment detail</div>
      <table>
        <tr><td>Scheduled monthly payment</td><td>${money(data.monthlyPayment)}</td></tr>
        <tr><td>Payment received</td><td>${money(data.paymentReceived)}</td></tr>
        <tr><td class="muted">Interest applied</td><td class="muted">${money(data.interestApplied)}</td></tr>
        <tr><td class="muted">Principal applied</td><td class="muted">${money(data.principalApplied)}</td></tr>
        <tr><td>Late fees charged</td><td>$0.00</td></tr>
        <tr><td>Date payment received</td><td>${safe(data.paymentReceivedDate)}</td></tr>
      </table>
    </div>
    <div class="due">
      <div><div class="small">Next payment due</div><strong style="font-size:14px;">${safe(data.paymentDueDate)}</strong></div>
      <div style="text-align:right;"><div class="small">Amount due</div><strong style="font-size:14px;">${money(data.monthlyPayment)}</strong></div>
    </div>
    <div style="font-size:10px; color:#444; line-height:1.6; margin-bottom:14px;">This statement is generated by SwiftDeed as Loan Servicer and reflects all activity for the period indicated above. Please retain this statement for your records. Contact SwiftDeed if you believe any information is inaccurate.</div>
    <div class="footer">
      <span>Property: ${safe(data.propertyAddress)}</span>
      <span>Processed by SwiftDeed Services, Inc. - www.theswiftdeed.com</span>
    </div>
    <div style="font-size:9.5px; color:#555; margin-top:4px;">Prepared by SwiftDeed Processing Team</div>
  </div>
</body>
</html>`;
}

function MonthlyStatementPreviewModal({ doc, borrower, lenderName, onClose }) {
  if (!doc) return null;
  const data = getMonthlyStatementData(doc, borrower, lenderName);

  const {
    accountNumber,
    borrowerName,
    propertyAddress,
    statementDate,
    paymentDueDate,
    maturityDate,
    originalBalance,
    endingBalance,
    principalReduction,
    rate,
    perDiem,
    monthlyPayment,
    paymentReceived,
    interestApplied,
    principalApplied,
    paymentReceivedDate,
    paymentStatus,
    servicerName,
  } = data;

  const money = value => '$' + Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const row = (label, value, strong = false, muted = false) => (
    <tr style={{ borderBottom: '0.5px solid #eee' }}>
      <td style={{ padding: '5px 8px', fontSize: 12, fontWeight: strong ? 700 : 400, paddingLeft: muted ? 20 : 8, color: muted ? '#555' : '#111' }}>{label}</td>
      <td style={{ padding: '5px 8px', textAlign: 'right', fontSize: 12, fontWeight: strong ? 700 : 400, color: muted ? '#555' : '#111' }}>{value}</td>
    </tr>
  );
  const section = (title, children) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', background: '#f4f4f4', border: '0.5px solid #ddd', borderBottom: 'none', padding: '5px 8px' }}>{title}</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #ddd' }}>
        <tbody>{children}</tbody>
      </table>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 18 }}>
      <div className="swiftdeed-yellow-scroll" style={{ width: '100%', maxWidth: 760, maxHeight: '90vh', overflow: 'auto', background: '#fff', borderRadius: 10, boxShadow: '0 18px 70px rgba(0,0,0,0.55)' }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 2, background: '#111', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px' }}>
          <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>Monthly statement preview</div>
          <button onClick={onClose} style={{ background: 'transparent', color: '#FFD700', border: '0.5px solid #4a3900', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
        </div>
        <div style={{ background: '#fff', maxWidth: 680, margin: '0 auto', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 13, color: '#111', padding: '2rem 2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 20 }}>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>
              <span style={{ color: '#111' }}>Swift</span><span style={{ color: '#E9A800' }}>Deed</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>Monthly Loan Statement</div>
              <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>Statement Date: {statementDate} &nbsp;-&nbsp; Account: {accountNumber}</div>
            </div>
          </div>

          <div style={{ borderTop: '2.5px solid #111', marginBottom: 14 }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#111', marginBottom: 4 }}>Borrower</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{borrowerName}</div>
              <div style={{ fontSize: 12 }}>{propertyAddress}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#111', marginBottom: 4 }}>Servicer</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{servicerName}</div>
              <div style={{ fontSize: 12 }}>Processed by SwiftDeed Services, Inc.</div>
              <div style={{ fontSize: 12 }}>www.theswiftdeed.com</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', background: '#f4f4f4', border: '0.5px solid #ddd', marginBottom: 16 }}>
            {[
              ['Statement period', 'Apr 1 - Apr 30, 2026'],
              ['Payment due date', paymentDueDate],
              ['Loan maturity date', maturityDate],
              ['Payment status', paymentStatus],
            ].map(([label, value], index) => (
              <div key={label} style={{ padding: '8px 10px', borderRight: index < 3 ? '0.5px solid #ddd' : 'none' }}>
                <div style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 3 }}>{label}</div>
                <div style={{ fontWeight: 700, fontSize: 12, color: label === 'Payment status' ? '#1a7a3f' : '#111' }}>{value}</div>
              </div>
            ))}
          </div>

          {section('Principal', <>
            {row('Beginning principal balance', money(originalBalance))}
            {row('Principal reduction this period', `(${money(principalReduction)})`)}
            {row('Ending principal balance', money(endingBalance), true)}
          </>)}

          {section('Interest', <>
            {row('Note interest rate', `${rate.toFixed(4)}%`)}
            {row('Interest charged this period', money(interestApplied))}
            {row('Daily interest (per diem)', `${money(perDiem)} / day`)}
          </>)}

          {section('Payment detail', <>
            {row('Scheduled monthly payment', money(monthlyPayment))}
            {row('Payment received', money(paymentReceived))}
            {row('Interest applied', money(interestApplied), false, true)}
            {row('Principal applied', money(principalApplied), false, true)}
            {row('Late fees charged', '$0.00')}
            {row('Date payment received', paymentReceivedDate)}
          </>)}

          <div style={{ border: '1px solid #111', padding: '10px 12px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 10, color: '#555' }}>Next payment due</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{paymentDueDate}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: '#555' }}>Amount due</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{money(monthlyPayment)}</div>
            </div>
          </div>

          <div style={{ fontSize: 10, color: '#444', lineHeight: 1.6, marginBottom: 14 }}>
            This statement is generated by SwiftDeed as Loan Servicer and reflects all activity for the period indicated above. Please retain this statement for your records. Contact SwiftDeed if you believe any information is inaccurate.
          </div>

          <div style={{ borderTop: '0.5px solid #ccc', paddingTop: 8, display: 'flex', justifyContent: 'space-between', gap: 18, fontSize: 9.5, color: '#555' }}>
            <span>Property: {propertyAddress}</span>
            <span>Processed by SwiftDeed Services, Inc. - www.theswiftdeed.com</span>
          </div>
          <div style={{ fontSize: 9.5, color: '#555', marginTop: 4 }}>Prepared by SwiftDeed Processing Team</div>
        </div>
      </div>
    </div>
  );
}

//  Loan Detail Page 
function LoanDetail({ selected, liveData, liveLoading, loanPayments, docUrls, docSuccess, uploadingDocs, pendingDocProcess, processingDocs, clearingLoanData, docFileRef, lenderEmail, lenderName, borrowerEmails, onBack, onRecordPayment, onRemoveDoc, onUploadDocs, onProcessDocs, onClearLoanData, onDeleteLoan, onViewDocuments, onGeneratePayoff, paymentSuccess }) {
  const [showAllPayments, setShowAllPayments] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [loanNotes, setLoanNotes] = useState(liveData?.notes || selected?.notes || '');
  const [notesSaved, setNotesSaved] = useState(false);

  const live = liveData || {};
  const balance = live.principal_balance != null ? live.principal_balance : selected?.total_due;
  const originalAmount = live.original_loan_amount || selected?.total_due;
  const principalPaid = originalAmount && balance ? (parseFloat(originalAmount) - parseFloat(balance)) : 0;
  const rate = live.interest_rate != null ? live.interest_rate : selected?.interest_rate;
  const perDiem = live.per_diem != null ? live.per_diem : selected?.per_diem;
  const loanStart = live.loan_start_date || selected?.loan_start_date;
  const maturity = live.maturity_date || selected?.maturity_date;
  const paymentStatus = live.payment_status || selected?.payment_status;
  const nextPaymentDate = live.next_payment_date || selected?.next_payment_date;
  const maturityDateValue = maturity ? new Date(`${String(maturity).slice(0, 10)}T00:00:00`) : null;
  const isPastMaturity = maturityDateValue && !isNaN(maturityDateValue.getTime()) && maturityDateValue < new Date(new Date().setHours(0, 0, 0, 0)) && parseFloat(balance || 0) > 0;
  const displayStatus = isPastMaturity ? 'Past maturity' : (paymentStatus || '-');
  const totalInterestPaid = live.total_interest_paid || 0;
  const lateCharges = live.late_charges || selected?.late_charges || 0;
  const otherCharges = live.other_charges || selected?.other_charges || 0;
  const totalPaid = (principalPaid + parseFloat(totalInterestPaid || 0));
  const panelBorrowerEmail = borrowerEmails[selected.loan_id_internal] || live.borrower_email || selected?.borrower_email || '-';
  const loanType = live.loan_type || selected?.loan_type || '-';
  const monthlyPayment = live.monthly_payment || selected?.monthly_payment;
  const principalProgress = originalAmount && parseFloat(originalAmount) > 0 ? Math.max(0, Math.min(100, (principalPaid / parseFloat(originalAmount)) * 100)) : 0;
  const displayPayments = activeTab === 'payments' || showAllPayments ? loanPayments : loanPayments.slice(0, 5);
  const isDocumentsTab = activeTab === 'documents';

  const statusColor = () => {
    if (isPastMaturity) return '#f87171';
    if (!paymentStatus) return '#555';
    const st = paymentStatus.toLowerCase();
    if (st === 'current' || st === 'on time') return '#34d399';
    if (st === 'late' || st === 'missed' || st === 'overdue') return '#f87171';
    return '#ccc';
  };

  const card = { background: '#111', border: '0.5px solid #252525', borderRadius: 9, padding: '20px 22px', boxSizing: 'border-box' };
  const cardLabel = { fontSize: 11, color: '#FFD700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 };
  const fieldRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '8px 0', borderBottom: '0.5px solid #1a1a1a' };
  const fieldKey = { fontSize: 12, color: '#555' };
  const fieldVal = { fontSize: 12, color: '#ccc', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
  const documentType = name => {
    const lower = name.toLowerCase();
    if (lower.includes('promissory') || lower.includes('note')) return 'Promissory note';
    if (lower.includes('agreement')) return 'Loan agreement';
    if (lower.includes('payoff')) return 'Payoff';
    if (lower.includes('tax')) return 'Tax';
    return 'Other';
  };
  const documentName = url => decodeURIComponent(url.split('/').pop()).replace(/^\d+_/, '').replace(/[-_]/g, ' ').replace('.pdf', '').trim();
  const handleDocDrop = e => {
    e.preventDefault();
    if (!uploadingDocs && e.dataTransfer.files?.length) onUploadDocs(e.dataTransfer.files);
  };
  const tabButton = (id, label) => ({
    background: activeTab === id ? '#171717' : 'transparent',
    color: activeTab === id ? '#FFD700' : '#666',
    border: 'none',
    borderBottom: activeTab === id ? '2px solid #FFD700' : '2px solid transparent',
    padding: '12px 14px',
    fontSize: 13,
    cursor: 'pointer',
    fontFamily: 'inherit',
  });
  const secondaryBtn = { background: 'transparent', color: '#fff', fontSize: 13, fontWeight: 500, padding: '10px 16px', borderRadius: 7, border: '0.5px solid #FFD700', cursor: 'pointer', transition: 'all 0.15s', textDecoration: 'none', textAlign: 'center', fontFamily: 'inherit' };

  const paymentsPanel = (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginBottom: 10 }}>
        <div style={cardLabel}>Payment history</div>
        {loanPayments.length > 5 && (
          <button onClick={() => setShowAllPayments(p => !p)} style={{ background: 'transparent', border: 'none', color: '#FFD700', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
            {showAllPayments ? 'Show less' : `View all ${loanPayments.length}`}
          </button>
        )}
      </div>
      {loanPayments.length === 0 ? (
        <div style={{ color: '#444', fontSize: 13, padding: '8px 0 2px' }}>No payments recorded yet.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid #222' }}>
                {['Date', 'Amount', 'Principal', 'Interest', 'Remaining Balance'].map(h => (
                  <th key={h} style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 0.8, padding: '8px 10px', textAlign: h === 'Date' ? 'left' : 'right', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayPayments.map((p, i) => (
                <tr key={p.id || i} style={{ borderBottom: '0.5px solid #1a1a1a' }}>
                  <td style={{ padding: '10px', fontSize: 12, color: '#777' }}>{p.payment_date ? new Date(p.payment_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}</td>
                  <td style={{ padding: '10px', fontSize: 12, color: '#fff', fontWeight: 500, textAlign: 'right' }}>{formatCurrency(p.amount)}</td>
                  <td style={{ padding: '10px', fontSize: 12, color: '#777', textAlign: 'right' }}>{formatCurrency(p.principal_portion)}</td>
                  <td style={{ padding: '10px', fontSize: 12, color: '#777', textAlign: 'right' }}>{formatCurrency(p.interest_portion)}</td>
                  <td style={{ padding: '10px', fontSize: 12, color: '#ccc', textAlign: 'right' }}>{formatCurrency(p.principal_balance_after)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const documentsPanel = (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginBottom: 10 }}>
        <div style={cardLabel}>Loan documents</div>
        {docSuccess && <span style={{ fontSize: 11, color: '#34d399' }}>{docSuccess}</span>}
      </div>
      <input ref={docFileRef} type="file" accept="application/pdf" multiple style={{ display: 'none' }} onChange={e => onUploadDocs(e.target.files)} />
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={handleDocDrop}
        onClick={() => docFileRef.current.click()}
        style={{
          border: '0.5px dashed #3a3300',
          background: '#0d0d0d',
          borderRadius: 9,
          minHeight: isDocumentsTab ? 145 : 94,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
          color: uploadingDocs ? '#555' : '#ccc',
          cursor: uploadingDocs ? 'not-allowed' : 'pointer',
          marginBottom: 16,
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { if (!uploadingDocs) { e.currentTarget.style.borderColor = '#FFD700'; e.currentTarget.style.background = '#121000'; } }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#3a3300'; e.currentTarget.style.background = '#0d0d0d'; }}
      >
        {isDocumentsTab && <div style={{ width: 38, height: 38, borderRadius: 8, border: '0.5px solid #252525', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFD700', fontSize: 22 }}>^</div>}
        <div style={{ fontSize: isDocumentsTab ? 15 : 13, color: '#ddd' }}>{isDocumentsTab ? 'Drag and drop loan documents here' : 'Drag and drop additional loan documents'}</div>
        <div style={{ fontSize: 12, color: '#555' }}>{uploadingDocs ? 'Uploading...' : 'Browse to upload - PDF only'}</div>
      </div>
      {docSuccess && <div style={{ color: docSuccess.startsWith('Could') ? '#f87171' : '#34d399', fontSize: 12, marginBottom: 12 }}>{docSuccess}</div>}
      {pendingDocProcess && (
        <div style={{ border: '0.5px solid #3a3300', background: '#171300', borderRadius: 8, padding: 13, marginBottom: 14, display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center' }}>
          <div>
            <div style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{pendingDocProcess.newCount} document{pendingDocProcess.newCount === 1 ? '' : 's'} uploaded</div>
            <div style={{ color: '#777', fontSize: 12, marginTop: 4 }}>Confirm to extract terms and update the loan data.</div>
          </div>
          <button onClick={onProcessDocs} disabled={processingDocs} style={{ background: '#FFD700', color: '#0f0f0f', border: 'none', borderRadius: 7, padding: '10px 14px', fontWeight: 700, cursor: processingDocs ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
            {processingDocs ? 'Processing...' : 'Confirm update ->'}
          </button>
        </div>
      )}
      {docUrls.length === 0 ? (
        <div style={{ border: '0.5px solid #3a3300', background: '#171300', borderRadius: 8, padding: 13 }}>
          <div style={{ color: '#FFD700', fontSize: 13, fontWeight: 700 }}>No source documents on file.</div>
          <div style={{ color: '#777', fontSize: 12, marginTop: 5 }}>Loan data is based on prior extraction.</div>
          <button onClick={onClearLoanData} disabled={clearingLoanData} style={{ marginTop: 12, background: 'transparent', color: '#f87171', border: '0.5px solid #5a2020', borderRadius: 7, padding: '8px 12px', cursor: clearingLoanData ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {clearingLoanData ? 'Clearing...' : 'Clear extracted loan data'}
          </button>
        </div>
      ) : (
        <div style={{ borderTop: '0.5px solid #1a1a1a' }}>
          {isDocumentsTab && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.7fr) minmax(120px, 0.8fr) minmax(110px, 0.7fr) 150px', gap: 12, padding: '10px 0', borderBottom: '0.5px solid #1a1a1a' }}>
              {['Document', 'Type', 'Uploaded', 'Action'].map(h => <div key={h} style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 0.8 }}>{h}</div>)}
            </div>
          )}
          <div className="swiftdeed-yellow-scroll" style={{ maxHeight: isDocumentsTab ? 'none' : 260, overflowY: isDocumentsTab ? 'visible' : 'auto', paddingRight: isDocumentsTab ? 0 : 6 }}>
          {docUrls.map((url, i) => {
        const name = documentName(url);
        return (
          <div key={i} style={isDocumentsTab ? { display: 'grid', gridTemplateColumns: 'minmax(220px, 1.7fr) minmax(120px, 0.8fr) minmax(110px, 0.7fr) 150px', gap: 12, alignItems: 'center', padding: '12px 0', borderBottom: '0.5px solid #1a1a1a' } : { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '0.5px solid #1a1a1a' }}>
            <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none', flex: 1 }}
              onMouseEnter={e => e.currentTarget.style.color = '#FFD700'} onMouseLeave={e => e.currentTarget.style.color = '#ccc'}>
              {name || `Document ${i + 1}`}
            </a>
            {isDocumentsTab && <div style={{ fontSize: 12, color: '#777' }}>{documentType(name)}</div>}
            {isDocumentsTab && <div style={{ fontSize: 12, color: '#555' }}>-</div>}
            <div style={{ display: 'flex', gap: 12, justifyContent: isDocumentsTab ? 'flex-end' : 'flex-start', alignItems: 'center' }}>
              {isDocumentsTab && <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#FFD700', textDecoration: 'none' }}>View</a>}
            <button onClick={() => onRemoveDoc(url)} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}
              onMouseEnter={e => e.currentTarget.style.color = '#f87171'} onMouseLeave={e => e.currentTarget.style.color = '#555'}>
              Remove
            </button>
            </div>
          </div>
        );
          })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="loan-detail-page" style={{ ...s.page }}>
      <style>{`
        .loan-detail-page {
          max-width: 1320px;
          padding: 34px 46px;
        }
        .loan-detail-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          margin-bottom: 22px;
        }
        .loan-detail-title {
          font-size: 26px;
          line-height: 1.2;
          font-weight: 500;
          color: #fff;
          margin-bottom: 6px;
          overflow-wrap: anywhere;
        }
        .loan-detail-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
          flex-shrink: 0;
        }
        .loan-detail-metrics {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 1px;
          background: #252525;
          border: 0.5px solid #252525;
          border-radius: 9px;
          overflow: hidden;
          margin-bottom: 18px;
        }
        .loan-detail-overview-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 14px;
        }
        .loan-detail-lower-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(320px, 0.8fr);
          gap: 14px;
          margin-top: 14px;
          margin-bottom: 24px;
        }
        .loan-detail-actions-grid {
          display: grid;
          grid-template-columns: minmax(220px, 0.8fr) minmax(220px, 1fr) minmax(220px, 0.8fr);
          gap: 12px;
          align-items: start;
        }
        .loan-detail-progress-row {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 9px;
        }
        .swiftdeed-statement-button {
          box-shadow: none !important;
          white-space: nowrap;
        }
        .swiftdeed-statement-button:hover {
          box-shadow: 0 12px 28px rgba(255, 215, 0, 0.28), inset 0 -2px 0 rgba(0, 0, 0, 0.18) !important;
        }
        @media (max-width: 1150px) {
          .loan-detail-page {
            padding: 28px 32px;
          }
          .loan-detail-header {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: 14px;
          }
          .loan-detail-actions {
            justify-content: flex-start;
          }
          .loan-detail-metrics {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .loan-detail-overview-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .loan-detail-overview-grid > *:last-child {
            grid-column: 1 / -1;
          }
          .loan-detail-lower-grid,
          .loan-detail-actions-grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }
        @media (max-width: 760px) {
          .loan-detail-page {
            padding: 22px 18px;
          }
          .loan-detail-title {
            font-size: 22px;
          }
          .loan-detail-metrics,
          .loan-detail-overview-grid {
            grid-template-columns: minmax(0, 1fr);
          }
          .loan-detail-overview-grid > *:last-child {
            grid-column: auto;
          }
          .loan-detail-progress-row {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
          }
          .swiftdeed-statement-button {
            width: 100%;
          }
        }
      `}</style>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#FFD700', fontSize: 13, cursor: 'pointer', marginBottom: 18, padding: 0, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.7'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
        Back to Loans
      </button>

      <div className="loan-detail-header">
        <div style={{ minWidth: 0 }}>
          <div className="loan-detail-title">{selected.loan_id_internal || selected.loan_id || '-'}</div>
          <div style={{ fontSize: 13, color: '#555' }}>{selected.borrower_name || '-'}</div>
          <div style={{ fontSize: 13, color: '#555' }}>{selected.property_address || '-'}</div>
        </div>
        <div className="loan-detail-actions">
          <button className="swiftdeed-statement-button" onClick={() => onViewDocuments(selected)} style={{ ...secondaryBtn, background: '#FFD700', color: '#0f0f0f', border: 'none', fontWeight: 700 }}>View documents -&gt;</button>
          <button className="swiftdeed-statement-button" onClick={() => onGeneratePayoff(selected)} style={{ ...secondaryBtn, background: '#FFD700', color: '#0f0f0f', border: 'none', fontWeight: 700 }}>Generate payoff statement -&gt;</button>
        </div>
      </div>

      <div className="loan-detail-metrics">
        {[
          { label: 'Current balance', value: formatCurrency(balance), gold: true, hint: originalAmount ? `of ${formatCurrency(originalAmount)} original` : '' },
          { label: 'Rate', value: rate ? rate + '%' : '-' },
          { label: 'Per diem', value: perDiem ? formatCurrency(perDiem) : '-' },
          { label: 'Next payment', value: isPastMaturity ? 'Past maturity' : formatDate(nextPaymentDate), hint: isPastMaturity ? 'Loan is past maturity' : (monthlyPayment ? `${formatCurrency(monthlyPayment)} due` : '') },
          { label: 'Status', value: displayStatus, custom: statusColor() },
        ].map(({ label, value, gold, custom, hint }) => (
          <div key={label} style={{ background: '#111', padding: '16px 18px' }}>
            <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 7 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: gold ? '#FFD700' : custom || '#e0d8c8' }}>{value}</div>
            {hint && <div style={{ fontSize: 11, color: '#444', marginTop: 5 }}>{hint}</div>}
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 20, borderBottom: '0.5px solid #222', display: 'flex', gap: 4, overflowX: 'auto' }}>
        {[
          ['overview', 'Overview'],
          ['payments', 'Payments'],
          ['documents', 'Documents'],
          ['notes', 'Notes'],
        ].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)} style={tabButton(id, label)}>{label}</button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
        <div style={card}>
          <div style={cardLabel}>Principal progress</div>
          <div className="loan-detail-progress-row">
            <span style={{ fontSize: 12, color: '#555' }}>{formatCurrency(principalPaid)} paid down</span>
            <span style={{ fontSize: 12, color: '#555' }}>{formatCurrency(balance)} remaining - {principalProgress.toFixed(0)}% complete</span>
          </div>
          <div style={{ height: 5, background: '#1e1e1e', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${principalProgress}%`, height: '100%', background: '#FFD700', borderRadius: 999 }} />
          </div>
        </div>

        <div className="loan-detail-overview-grid">
          <div style={card}>
            <div style={cardLabel}>Borrower</div>
            {[
              { k: 'Legal name', v: live.legal_name || selected.borrower_name || '-' },
              { k: 'Guarantor', v: live.guarantor_name || selected.guarantor_name || '-' },
              { k: 'Email', v: panelBorrowerEmail, link: true },
              { k: 'Property', v: selected.property_address || '-' },
              { k: 'Portal access', v: live.portal_access || 'Active', green: true },
            ].map(({ k, v, link, green }) => (
              <div key={k} style={fieldRow}><span style={fieldKey}>{k}</span><span style={{ ...fieldVal, color: link ? '#5b9bd5' : green ? '#34d399' : '#ccc' }}>{v}</span></div>
            ))}
          </div>

          <div style={card}>
            <div style={cardLabel}>Loan details {liveLoading && <span style={{ fontSize: 10, color: '#444', fontStyle: 'italic', textTransform: 'none', letterSpacing: 0 }}>updating...</span>}</div>
            {[
              { k: 'Origination date', v: formatDate(loanStart) },
              { k: 'Maturity date', v: formatDate(maturity) },
              { k: 'Next payment date', v: isPastMaturity ? 'Past maturity' : formatDate(nextPaymentDate) },
              { k: 'Loan type', v: loanType.replace('_', ' ') },
              { k: 'Monthly payment', v: formatCurrency(monthlyPayment) },
            ].map(({ k, v }) => (
              <div key={k} style={fieldRow}><span style={fieldKey}>{k}</span><span style={fieldVal}>{v}</span></div>
            ))}
          </div>

          <div style={card}>
            <div style={cardLabel}>Loan breakdown</div>
            {[
              { k: 'Original amount', v: formatCurrency(originalAmount) },
              { k: 'Principal remaining', v: formatCurrency(balance), gold: true },
              { k: 'Principal paid', v: formatCurrency(principalPaid) },
              { k: 'Interest paid to date', v: formatCurrency(totalInterestPaid) },
              { k: 'Late charges', v: formatCurrency(lateCharges) },
              { k: 'Other charges', v: formatCurrency(otherCharges) },
              { k: 'Total paid', v: formatCurrency(totalPaid) },
            ].map(({ k, v, gold }) => (
              <div key={k} style={fieldRow}><span style={fieldKey}>{k}</span><span style={{ ...fieldVal, color: gold ? '#FFD700' : '#ccc' }}>{v}</span></div>
            ))}
          </div>
        </div>

        <div className="loan-detail-lower-grid">
          {paymentsPanel}
          {documentsPanel}
        </div>

        <div style={card}>
          <div style={cardLabel}>More actions</div>
          <div className="loan-detail-actions-grid">
            <button onClick={onRecordPayment} style={secondaryBtn}
              onMouseEnter={e => { e.currentTarget.style.background = '#1e1a00'; e.currentTarget.style.color = '#FFD700'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff'; }}>
              Record manual payment
            </button>
            <div style={{ color: '#444', fontSize: 12, lineHeight: 1.5 }}>Use only when a payment needs to be entered manually. This should not be the lender's default payment workflow.</div>
            <button onClick={onDeleteLoan} style={{ background: 'transparent', color: '#f87171', fontSize: 13, fontWeight: 500, padding: '10px 16px', borderRadius: 7, border: '0.5px solid #f87171', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}
              onMouseEnter={e => e.currentTarget.style.background = '#1a0000'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              Delete loan permanently
            </button>
          </div>
        </div>
        </>
      )}

      {activeTab === 'payments' && paymentsPanel}
      {activeTab === 'documents' && documentsPanel}
      {activeTab === 'notes' && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginBottom: 12 }}>
            <div style={cardLabel}>Notes</div>
            {notesSaved && <span style={{ fontSize: 11, color: '#34d399' }}>Saved locally</span>}
          </div>
          <textarea
            value={loanNotes}
            onChange={e => { setLoanNotes(e.target.value); setNotesSaved(false); }}
            placeholder="Add internal notes for this loan..."
            style={{
              width: '100%',
              minHeight: 230,
              resize: 'vertical',
              background: '#0d0d0d',
              border: '0.5px solid #252525',
              borderRadius: 8,
              color: '#ddd',
              padding: 14,
              boxSizing: 'border-box',
              fontSize: 13,
              lineHeight: 1.6,
              fontFamily: 'inherit',
              outline: 'none',
            }}
            onFocus={e => e.currentTarget.style.borderColor = '#FFD700'}
            onBlur={e => e.currentTarget.style.borderColor = '#252525'}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginTop: 14 }}>
            <div style={{ color: '#444', fontSize: 12 }}>Private notes for this loan. Database save comes later.</div>
            <button onClick={() => setNotesSaved(true)} style={{ ...secondaryBtn, background: '#FFD700', color: '#0f0f0f', border: 'none', fontWeight: 700 }}>Save notes</button>
          </div>
        </div>
      )}

      {paymentSuccess && <div style={{ marginTop: 14, color: '#34d399', fontSize: 12 }}>Payment recorded.</div>}
    </div>
  );
}

//  Main Portal 
export default function Portal({ onSubmitRequest, resetToken }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [requests, setRequests] = useState([]);
  const [borrowerEmails, setBorrowerEmails] = useState({});
  const [borrowerData, setBorrowerData] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [docSearch, setDocSearch] = useState('');
  const [docTab, setDocTab] = useState('loan');
  const [selectedDocLoanId, setSelectedDocLoanId] = useState('');
  const [docSort, setDocSort] = useState('recent');
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [page, setPage] = useState(1);
  const [activeView, setActiveView] = useState('dashboard');
  const [selected, setSelected] = useState(null);
  const [loanFilter, setLoanFilter] = useState({ id: 'all', label: 'All active loans', accent: '#FFD700' });
  const [hoveredAttention, setHoveredAttention] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [hoveredNav, setHoveredNav] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoveredDocLoan, setHoveredDocLoan] = useState(null);
  const [hoveredDocTab, setHoveredDocTab] = useState(null);
  const [invoiceYear, setInvoiceYear] = useState('2026');
  const [invoiceStatus, setInvoiceStatus] = useState('all');
  const [openInvoiceId, setOpenInvoiceId] = useState('');
  const [settingsTab, setSettingsTab] = useState('account');
  const [settingsNotice, setSettingsNotice] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [lenderSettings, setLenderSettings] = useState(null);
  const [accountForm, setAccountForm] = useState({ firstName: '', lastName: '', companyName: '', email: '', phone: '', state: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [billingEmail, setBillingEmail] = useState('');
  const [wireForm, setWireForm] = useState({ wire_bank_name: '', wire_routing_number: '', wire_account_number: '', wire_account_name: '', wire_bank_address: '' });
  const [liveData, setLiveData] = useState(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payoffLoan, setPayoffLoan] = useState(null);
  const [payoffGoodThrough, setPayoffGoodThrough] = useState(defaultGoodThroughDate());
  const [generatingPayoff, setGeneratingPayoff] = useState(false);
  const [payoffError, setPayoffError] = useState('');
  const [payoffSuccessUrl, setPayoffSuccessUrl] = useState('');
  const [monthlyStatementDoc, setMonthlyStatementDoc] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [lenderName, setLenderName] = useState('');
  const [loanPayments, setLoanPayments] = useState([]);
  const [docUrls, setDocUrls] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [docSuccess, setDocSuccess] = useState('');
  const [pendingDocProcess, setPendingDocProcess] = useState(null);
  const [processingDocs, setProcessingDocs] = useState(false);
  const [clearingLoanData, setClearingLoanData] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1600);
  const docFileRef = useRef();

  const email = user?.primaryEmailAddress?.emailAddress;

  useEffect(() => {
    setSelected(null);
    setLiveData(null);
    setLoanPayments([]);
    setDocUrls([]);
    setPendingDocProcess(null);
    setProcessingDocs(false);
    setClearingLoanData(false);
    setPaymentSuccess(false);
    setPayoffLoan(null);
    setPayoffGoodThrough(defaultGoodThroughDate());
    setGeneratingPayoff(false);
    setPayoffError('');
    setPayoffSuccessUrl('');
    setMonthlyStatementDoc(null);
    setActiveView('dashboard');
    setLoanFilter({ id: 'all', label: 'All active loans', accent: '#FFD700' });
    setSearch('');
    setDocSearch('');
    setDocTab('loan');
    setSelectedDocLoanId('');
    setDocSort('recent');
    setInvoiceYear('2026');
    setInvoiceStatus('all');
    setOpenInvoiceId('may-2026');
    setPage(1);
  }, [resetToken]);

  useEffect(() => {
    function handleResize() {
      setWindowWidth(window.innerWidth);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!email) return;
    async function fetchLenderName() {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/lenders?email=eq.${encodeURIComponent(email)}&select=*&limit=1`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const lender = data[0];
          const [firstName = user?.firstName || '', ...lastParts] = String(lender.full_name || user?.fullName || '').split(' ');
          setLenderSettings(lender);
          setLenderName(lender.company_name || '');
          setAccountForm({
            firstName,
            lastName: lastParts.join(' ') || user?.lastName || '',
            companyName: lender.company_name || '',
            email: lender.email || email,
            phone: lender.phone || '',
            state: lender.state || '',
          });
          setBillingEmail(lender.billing_email || lender.email || email);
          setWireForm({
            wire_bank_name: lender.wire_bank_name || '',
            wire_routing_number: lender.wire_routing_number || '',
            wire_account_number: lender.wire_account_number || '',
            wire_account_name: lender.wire_account_name || '',
            wire_bank_address: lender.wire_bank_address || '',
          });
        }
      } catch (e) { console.error(e); }
    }
    fetchLenderName();
  }, [email]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!email) return;
    setLoanFilter({ id: 'all', label: 'All active loans', accent: '#FFD700' });
    setSearch('');
    setPage(1);
    async function load() {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/payoff_requests?from_email=eq.${encodeURIComponent(email)}&order=created_at.desc`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
        const data = await res.json();
        const rows = Array.isArray(data) ? data : [];
        setRequests(rows);
        const ids = rows.map(r => r.loan_id_internal).filter(Boolean);
        if (ids.length > 0) {
          const bRes = await fetch(`${SUPABASE_URL}/rest/v1/borrowers?loan_id_internal=in.(${ids.map(id => `"${id}"`).join(',')})&select=loan_id_internal,borrower_email,principal_balance,next_payment_date,monthly_payment,payment_status,interest_rate,per_diem,original_loan_amount,total_interest_paid,total_payments_made,legal_name,guarantor_name,portal_access,loan_document_urls,last_payment_date,last_payment_amount,maturity_date,property_address,city,state`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
          const bData = await bRes.json();
          if (Array.isArray(bData)) {
            const emailMap = {};
            const dataMap = {};
            bData.forEach(b => {
              if (b.loan_id_internal) {
                emailMap[b.loan_id_internal] = b.borrower_email;
                dataMap[b.loan_id_internal] = b;
              }
            });
            rows.forEach(r => {
              if (!r.loan_id_internal) return;
              dataMap[r.loan_id_internal] = {
                ...(dataMap[r.loan_id_internal] || {}),
                loan_document_urls: dataMap[r.loan_id_internal]?.loan_document_urls || r.loan_document_urls || '',
              };
            });
            setBorrowerEmails(emailMap);
            setBorrowerData(dataMap);
          }
        }
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    load();
  }, [email]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selected?.loan_id_internal) { setDocUrls([]); return; }
    async function fetchDocs() {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/borrowers?loan_id_internal=eq.${encodeURIComponent(selected.loan_id_internal)}&select=loan_document_urls&limit=1`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
        const data = await res.json();
        const borrowerDocs = Array.isArray(data) && data.length > 0 ? data[0].loan_document_urls : '';
        const reqRes = await fetch(`${SUPABASE_URL}/rest/v1/payoff_requests?loan_id_internal=eq.${encodeURIComponent(selected.loan_id_internal)}&select=loan_document_urls&limit=1`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
        const reqData = await reqRes.json();
        const requestDocs = Array.isArray(reqData) && reqData.length > 0 ? reqData[0].loan_document_urls : '';
        setDocUrls(uniqueDocUrls(borrowerDocs, selected.loan_document_urls, requestDocs));
      } catch (e) { console.error(e); }
    }
    fetchDocs();
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selected?.loan_id_internal) { setLoanPayments([]); return; }
    async function fetchPayments() {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/payments?loan_id_internal=eq.${encodeURIComponent(selected.loan_id_internal)}&order=payment_date.desc`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
        const data = await res.json();
        setLoanPayments(Array.isArray(data) ? data : []);
      } catch (e) { console.error(e); }
    }
    fetchPayments();
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selected?.loan_id_internal) { setLiveData(null); return; }
    async function fetchLive() {
      setLiveLoading(true);
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/borrowers?loan_id_internal=eq.${encodeURIComponent(selected.loan_id_internal)}&limit=1&select=*`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
        const data = await res.json();
        setLiveData(Array.isArray(data) && data.length > 0 ? data[0] : null);
      } catch (e) { console.error(e); setLiveData(null); } finally { setLiveLoading(false); }
    }
    fetchLive();
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  function syncLoanDocumentState(loanIdInternal, urls) {
    if (!loanIdInternal) return;
    const loanDocumentUrls = uniqueDocUrls(urls).join(',');
    setBorrowerData(prev => ({
      ...prev,
      [loanIdInternal]: {
        ...(prev[loanIdInternal] || {}),
        loan_document_urls: loanDocumentUrls,
      },
    }));
    setRequests(prev => prev.map(request => (
      request.loan_id_internal === loanIdInternal
        ? { ...request, loan_document_urls: loanDocumentUrls }
        : request
    )));
    setSelected(prev => (
      prev?.loan_id_internal === loanIdInternal
        ? { ...prev, loan_document_urls: loanDocumentUrls }
        : prev
    ));
    setLiveData(prev => (
      prev?.loan_id_internal === loanIdInternal
        ? { ...prev, loan_document_urls: loanDocumentUrls }
        : prev
    ));
  }

  async function handleRemoveDoc(urlToRemove) {
    const newUrls = docUrls.filter(u => u !== urlToRemove);
    const previousUrls = docUrls;
    setDocUrls(newUrls);
    try {
      const borrowerEmail = borrowerEmails[selected.loan_id_internal] || liveData?.borrower_email;
      const res = await fetch('/api/update-loan-docs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loanIdInternal: selected.loan_id_internal, newDocUrls: newUrls, lenderEmail: email, lenderName, borrowerEmail, borrowerName: selected.borrower_name, docsAdded: false }) });
      if (!res.ok) throw new Error('Document removal failed');
      syncLoanDocumentState(selected.loan_id_internal, newUrls);
      setDocSuccess('Document removed.');
      setTimeout(() => setDocSuccess(''), 4000);
    } catch (e) {
      console.error('Remove document error:', e);
      setDocUrls(previousUrls);
      setDocSuccess('Could not remove document. Try again.');
      setTimeout(() => setDocSuccess(''), 5000);
    }
  }

  async function handleUploadDocs(files) {
    if (!files || files.length === 0) return;
    setUploadingDocs(true);
    try {
      const { createClient: sc } = await import('@supabase/supabase-js');
      const sb = sc(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_ANON_KEY);
      const newUrls = [];
      for (const file of Array.from(files)) {
        if (file.type !== 'application/pdf') continue;
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const { error: uploadError } = await sb.storage.from('loan-documents').upload(fileName, file, { contentType: 'application/pdf' });
        if (!uploadError) {
          const { data: urlData } = sb.storage.from('loan-documents').getPublicUrl(fileName);
          if (urlData?.publicUrl) newUrls.push(urlData.publicUrl);
        }
      }
      const combined = [...docUrls, ...newUrls];
      const borrowerEmail = borrowerEmails[selected.loan_id_internal] || liveData?.borrower_email;
      const res = await fetch('/api/update-loan-docs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loanIdInternal: selected.loan_id_internal, newDocUrls: combined, lenderEmail: email, lenderName, borrowerEmail, borrowerName: selected.borrower_name, docsAdded: newUrls.length > 0 }) });
      if (!res.ok) throw new Error('Document update failed');
      setDocUrls(combined);
      syncLoanDocumentState(selected.loan_id_internal, combined);
      if (newUrls.length > 0) {
        setPendingDocProcess({ urls: combined, newCount: newUrls.length });
        setDocSuccess(`${newUrls.length} document${newUrls.length !== 1 ? 's' : ''} uploaded. Confirm to update loan data.`);
      } else {
        setDocSuccess('No PDF documents were uploaded.');
        setTimeout(() => setDocSuccess(''), 4000);
      }
    } catch (e) {
      console.error('Upload error:', e);
      setDocSuccess('Could not upload documents. Try again.');
      setTimeout(() => setDocSuccess(''), 5000);
    } finally { setUploadingDocs(false); }
  }

  async function handleProcessUploadedDocs() {
    if (!selected?.loan_id_internal || !pendingDocProcess?.urls?.length) return;
    setProcessingDocs(true);
    setDocSuccess('Processing documents...');
    try {
      const res = await fetch('/api/reprocess-loan-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanIdInternal: selected.loan_id_internal, newDocUrls: pendingDocProcess.urls }),
      });
      if (!res.ok) throw new Error('Document processing failed');
      const data = await res.json();
      if (data.borrower) {
        setLiveData(data.borrower);
        setBorrowerData(prev => ({ ...prev, [selected.loan_id_internal]: data.borrower }));
      }
      if (data.request) {
        setRequests(prev => prev.map(r => r.loan_id_internal === selected.loan_id_internal ? { ...r, ...data.request } : r));
        setSelected(prev => prev?.loan_id_internal === selected.loan_id_internal ? { ...prev, ...data.request } : prev);
      }
      setPendingDocProcess(null);
      setDocSuccess('Loan data updated from documents.');
      setTimeout(() => setDocSuccess(''), 5000);
    } catch (e) {
      console.error('Process docs error:', e);
      setDocSuccess('Could not process documents. Try again.');
    } finally {
      setProcessingDocs(false);
    }
  }

  async function handleClearLoanData() {
    if (!selected?.loan_id_internal) return;
    setClearingLoanData(true);
    setDocSuccess('');
    try {
      const patch = {
        principal_balance: null,
        interest_rate: null,
        per_diem: null,
        monthly_payment: null,
        next_payment_date: null,
        maturity_date: null,
      };
      const requestPatch = {
        total_due: null,
        interest_rate: null,
        per_diem: null,
        next_payment_date: null,
        maturity_date: null,
      };
      const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
      const borrowerRes = await fetch(`${SUPABASE_URL}/rest/v1/borrowers?loan_id_internal=eq.${encodeURIComponent(selected.loan_id_internal)}`, { method: 'PATCH', headers, body: JSON.stringify(patch) });
      if (!borrowerRes.ok) throw new Error('Clear borrower data failed');
      const requestRes = await fetch(`${SUPABASE_URL}/rest/v1/payoff_requests?loan_id_internal=eq.${encodeURIComponent(selected.loan_id_internal)}`, { method: 'PATCH', headers, body: JSON.stringify(requestPatch) });
      if (!requestRes.ok) throw new Error('Clear request data failed');
      const borrowerRows = await borrowerRes.json();
      const requestRows = await requestRes.json();
      if (borrowerRows?.[0]) {
        setLiveData(borrowerRows[0]);
        setBorrowerData(prev => ({ ...prev, [selected.loan_id_internal]: borrowerRows[0] }));
      }
      if (requestRows?.[0]) {
        setRequests(prev => prev.map(r => r.loan_id_internal === selected.loan_id_internal ? { ...r, ...requestRows[0] } : r));
        setSelected(prev => prev?.loan_id_internal === selected.loan_id_internal ? { ...prev, ...requestRows[0] } : prev);
      }
      setDocSuccess('Extracted loan data cleared.');
      setTimeout(() => setDocSuccess(''), 5000);
    } catch (e) {
      console.error('Clear loan data error:', e);
      setDocSuccess('Could not clear extracted loan data.');
    } finally {
      setClearingLoanData(false);
    }
  }

  async function handleDeleteLoan() {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleting(true);
    try {
      const res = await fetch('/api/delete-loan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loanIdInternal: selected.loan_id_internal, lenderEmail: email, lenderName, borrowerName: selected.borrower_name, propertyAddress: selected.property_address }) });
      if (!res.ok) throw new Error('Loan delete failed');
      setShowDeleteModal(false);
      setDeleteConfirmText('');
      setRequests(prev => prev.filter(r => r.loan_id_internal !== selected.loan_id_internal));
      setSelected(null);
    } catch (e) {
      console.error('Delete error:', e);
      setDocSuccess('Could not delete loan. Try again.');
      setTimeout(() => setDocSuccess(''), 5000);
    } finally { setDeleting(false); }
  }

  const getLoanStatus = (request) => {
    const b = borrowerData[request.loan_id_internal] || {};
    const raw = (b.payment_status || request.payment_status || '').toLowerCase();
    const balance = parseFloat(b.principal_balance || request.total_due);
    const maturityDays = daysFromToday(b.maturity_date || request.maturity_date);
    if (raw.includes('default')) return 'Default';
    if (raw.includes('paid')) return 'Paid Off';
    if (raw.includes('late') || raw.includes('missed') || raw.includes('overdue') || raw.includes('past due')) return 'Past Due';
    if (!isNaN(balance) && balance <= 0) return 'Paid Off';
    if (maturityDays != null && maturityDays < 0) return 'Past maturity';
    return 'Active';
  };

  const isNarrowPortfolio = windowWidth < 1280;
  const LOAN_TABLE_COLS = 'minmax(118px, 0.85fr) minmax(130px, 0.95fr) minmax(110px, 0.75fr) 58px minmax(105px, 0.7fr) 64px minmax(105px, 0.7fr) minmax(105px, 0.7fr) minmax(100px, 0.7fr) minmax(95px, 0.65fr) minmax(120px, 0.8fr)';
  const tableInnerMinWidth = 1180;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filterConfig = {
    all: { id: 'all', label: 'All active loans', accent: '#FFD700' },
    received_month: { id: 'received_month', label: 'Payments this month', accent: '#FFD700' },
    attention: { id: 'attention', label: 'Loans needing attention', accent: '#FFD700' },
    maturing_90: { id: 'maturing_90', label: 'Maturing within 90 days', accent: '#FFD700' },
    maturity: { id: 'maturity', label: 'Maturity', accent: '#FFD700' },
    overdue: { id: 'overdue', label: 'Overdue', accent: '#f87171' },
    upcoming: { id: 'upcoming', label: 'Upcoming payments', accent: '#4aa3ff' },
    current: { id: 'current', label: 'Current loans', accent: '#34d399' },
    bucket_1_30: { id: 'bucket_1_30', label: '1-30 days delinquent', accent: '#FFD700' },
    bucket_31_60: { id: 'bucket_31_60', label: '31-60 days delinquent', accent: '#f87171' },
    bucket_60_plus: { id: 'bucket_60_plus', label: '60+ days delinquent', accent: '#777' },
    not_activated: { id: 'not_activated', label: 'Borrowers not activated', accent: '#FFD700' },
    missing_payment: { id: 'missing_payment', label: 'Missing payment amount', accent: '#FFD700' },
    default: { id: 'default', label: 'Loans currently in default', accent: '#f87171' },
  };

  const setLoansView = (filterId = 'all') => {
    setLoanFilter(filterConfig[filterId] || filterConfig.all);
    setActiveView('loans');
    setSelected(null);
    setSearch('');
    setPage(1);
  };

  const getBorrower = (request) => borrowerData[request.loan_id_internal] || {};
  const parseLocation = (request) => {
    const b = getBorrower(request);
    const explicitCity = b.city || request.city || request.property_city;
    const explicitState = b.state || request.state || request.property_state;
    if (explicitCity || explicitState) return { city: explicitCity || '-', state: explicitState || '-' };
    const address = b.property_address || request.property_address || '';
    const match = String(address).match(/,\s*([^,]+),\s*([A-Z]{2})(?:\s+\d{5})?\s*$/i);
    return { city: match?.[1]?.trim() || '-', state: match?.[2]?.toUpperCase() || '-' };
  };
  const dateValue = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
  };
  const daysFromToday = (iso) => {
    const d = dateValue(iso);
    if (!d) return null;
    return Math.ceil((d - today) / 86400000);
  };
  const daysPastDue = (request) => {
    const b = getBorrower(request);
    const diff = daysFromToday(b.next_payment_date);
    return diff == null || diff >= 0 ? 0 : Math.abs(diff);
  };
  const isThisMonth = (iso) => {
    const d = dateValue(iso);
    return !!d && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  };
  const isActiveLoan = (request) => getLoanStatus(request) !== 'Paid Off';
  const isOverdueLoan = (request) => getLoanStatus(request) === 'Past Due' || daysPastDue(request) > 0;
  const statusBucket = (request) => {
    const status = getLoanStatus(request);
    const days = daysPastDue(request);
    if (status === 'Default') return 'Default';
    if (status === 'Paid Off') return 'Paid Off';
    if (status === 'Past maturity') return 'Past maturity';
    if (days > 60) return '60+ days';
    if (days >= 31) return '31-60 days';
    if (days >= 1) return '1-30 days';
    return 'Current';
  };
  const statusSeverity = (request) => {
    const bucket = statusBucket(request);
    if (bucket === 'Default') return 5;
    if (bucket === 'Past maturity') return 5;
    if (bucket === '60+ days') return 4;
    if (bucket === '31-60 days') return 3;
    if (bucket === '1-30 days') return 2;
    if (bucket === 'Current') return 1;
    return 0;
  };
  const isAttentionLoan = (request) => {
    const b = borrowerData[request.loan_id_internal];
    return !b || !b.monthly_payment || isOverdueLoan(request) || getLoanStatus(request) === 'Default' || getLoanStatus(request) === 'Past maturity';
  };
  const matchesLoanFilter = (request, filterId) => {
    const b = getBorrower(request);
    const maturityDays = daysFromToday(b.maturity_date || request.maturity_date);
    const nextPaymentDays = daysFromToday(b.next_payment_date);
    const pastDueDays = daysPastDue(request);
    switch (filterId) {
      case 'received_month': return isThisMonth(b.last_payment_date);
      case 'attention': return isAttentionLoan(request);
      case 'maturing_90':
      case 'maturity': return maturityDays != null && maturityDays >= 0 && maturityDays <= 90;
      case 'overdue': return isOverdueLoan(request);
      case 'upcoming': return nextPaymentDays != null && nextPaymentDays >= 0 && nextPaymentDays <= 7;
      case 'current': return statusBucket(request) === 'Current';
      case 'bucket_1_30': return pastDueDays >= 1 && pastDueDays <= 30;
      case 'bucket_31_60': return pastDueDays >= 31 && pastDueDays <= 60;
      case 'bucket_60_plus': return pastDueDays > 60;
      case 'not_activated': return !borrowerData[request.loan_id_internal];
      case 'missing_payment': return !!borrowerData[request.loan_id_internal] && !b.monthly_payment;
      case 'default': return getLoanStatus(request) === 'Default';
      case 'all':
      default: return isActiveLoan(request);
    }
  };

  const searchTerm = search.trim().toLowerCase();
  const filtered = requests.filter(r => {
    const b = getBorrower(r);
    const { city, state } = parseLocation(r);
    const originalBalance = b.original_loan_amount || r.original_loan_amount || r.total_due;
    const matchesSearch = !searchTerm
      || String(r.loan_id_internal || '').toLowerCase().includes(searchTerm)
      || String(r.loan_id || '').toLowerCase().includes(searchTerm)
      || String(r.borrower_name || '').toLowerCase().includes(searchTerm)
      || String(r.property_address || '').toLowerCase().includes(searchTerm)
      || String(city || '').toLowerCase().includes(searchTerm)
      || String(state || '').toLowerCase().includes(searchTerm)
      || String(originalBalance || '').toLowerCase().includes(searchTerm)
      || formatCurrency(originalBalance).toLowerCase().includes(searchTerm);
    return matchesSearch && matchesLoanFilter(r, loanFilter.id);
  });

  const getSortValue = (request, key) => {
    const b = getBorrower(request);
    const loc = parseLocation(request);
    if (key === 'borrower') return String(request.borrower_name || '').toLowerCase();
    if (key === 'city') return String(loc.city || '').toLowerCase();
    if (key === 'state') return String(loc.state || '').toLowerCase();
    if (key === 'maturity') return dateValue(b.maturity_date || request.maturity_date)?.getTime() || 0;
    if (key === 'rate') return parseFloat(b.interest_rate || request.interest_rate) || 0;
    if (key === 'original_balance') return parseFloat(b.original_loan_amount || request.original_loan_amount || request.total_due) || 0;
    if (key === 'current_balance') return parseFloat(b.principal_balance || request.total_due) || 0;
    if (key === 'next_payment_date') return dateValue(b.next_payment_date)?.getTime() || 0;
    if (key === 'next_payment_amount') return parseFloat(b.monthly_payment) || 0;
    if (key === 'days_past_due') return daysPastDue(request);
    if (key === 'status') return statusSeverity(request);
    return new Date(request.created_at).getTime() || 0;
  };

  const sorted = [...filtered].sort((a, b) => {
    const aVal = getSortValue(a, sortConfig.key);
    const bVal = getSortValue(b, sortConfig.key);
    if (typeof aVal === 'string' || typeof bVal === 'string') {
      return sortConfig.direction === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    }
    return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const allBorrowers = Object.values(borrowerData);
  const principalOutstanding = requests.reduce((sum, r) => {
    const b = borrowerData[r.loan_id_internal] || {};
    return isActiveLoan(r) ? sum + (parseFloat(b.principal_balance || r.total_due) || 0) : sum;
  }, 0);
  const receivedThisMonth = allBorrowers.filter(b => { if (!b.last_payment_date) return false; const d = new Date(b.last_payment_date); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; });
  const receivedThisMonthTotal = receivedThisMonth.reduce((sum, b) => sum + (parseFloat(b.last_payment_amount || b.monthly_payment) || 0), 0);
  const activeLoans = requests.filter(isActiveLoan);
  const pastDue = requests.filter(isOverdueLoan).length;
  const needingAttention = requests.filter(isAttentionLoan);
  const maturingSoon = requests.filter(r => matchesLoanFilter(r, 'maturing_90'));
  const upcomingPayments = requests.filter(r => matchesLoanFilter(r, 'upcoming'));
  const currentLoans = requests.filter(r => matchesLoanFilter(r, 'current'));
  const bucketOne = requests.filter(r => matchesLoanFilter(r, 'bucket_1_30'));
  const bucketTwo = requests.filter(r => matchesLoanFilter(r, 'bucket_31_60'));
  const bucketThree = requests.filter(r => matchesLoanFilter(r, 'bucket_60_plus'));
  const loansNeedingAttentionCount = needingAttention.length;
  const nextMaturity = [...maturingSoon].sort((a, b) => daysFromToday(getBorrower(a).maturity_date || a.maturity_date) - daysFromToday(getBorrower(b).maturity_date || b.maturity_date))[0];
  const nextMaturityBorrower = nextMaturity ? getBorrower(nextMaturity) : {};

  const sc = { background: '#121212', border: '0.5px solid #202020', borderRadius: 9, padding: '22px 24px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' };
  const statCard = (id) => ({
    ...sc,
    background: hoveredCard === id ? '#171717' : '#121212',
    borderColor: hoveredCard === id ? '#333' : '#202020',
    transition: 'background 0.12s, border-color 0.12s',
  });
  const sl = { fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 10 };
  const sv = { fontSize: 27, fontWeight: 600, color: '#fff', marginBottom: 6 };
  const ss = { fontSize: 12, color: '#444' };
  const attentionCardStyle = (filter, accent) => ({
    background: hoveredAttention === filter ? '#141414' : '#101010',
    border: '0.5px solid #252525',
    borderLeft: `3px solid ${accent}`,
    borderRadius: 9,
    padding: '18px 20px 16px',
    cursor: 'pointer',
    transition: 'background 0.12s',
    overflow: 'hidden',
  });
  const shellNarrow = windowWidth < 900;
  const shellTiny = windowWidth < 560;
  const contentPad = shellNarrow ? '28px 22px' : isNarrowPortfolio ? '34px 42px' : '34px 46px';
  const contentWrap = { width: '100%', maxWidth: 1160, boxSizing: 'border-box' };
  const onboardingBanner = {
    display: 'grid',
    gridTemplateColumns: shellNarrow ? 'auto 1fr' : 'auto minmax(0, 1fr) auto',
    gap: shellNarrow ? '12px 14px' : '16px',
    alignItems: 'center',
    background: '#1d1705',
    border: '0.5px solid #4a3900',
    borderLeft: '3px solid #FFD700',
    borderRadius: 9,
    padding: shellNarrow ? '14px 16px' : '16px 18px',
    marginBottom: 28,
    boxSizing: 'border-box',
  };
  const onboardingIcon = {
    width: 34,
    height: 34,
    borderRadius: 8,
    background: '#3a2d00',
    color: '#FFD700',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
    lineHeight: 1,
    flexShrink: 0,
  };
  const onboardingCta = {
    gridColumn: shellNarrow ? '2 / 3' : 'auto',
    justifySelf: shellNarrow ? 'start' : 'end',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: 'transparent',
    border: 'none',
    color: '#FFD700',
    fontSize: 13,
    fontWeight: 600,
    padding: 0,
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  };
  const quickActionGrid = {
    display: 'grid',
    gridTemplateColumns: shellNarrow ? '1fr' : 'repeat(2, minmax(0, 1fr))',
    gap: 12,
    marginBottom: 28,
  };
  const quickActionCard = (variant = 'blue') => ({
    ...onboardingBanner,
    gridTemplateColumns: shellNarrow ? 'auto 1fr' : 'auto minmax(0, 1fr) auto',
    width: '100%',
    minHeight: shellNarrow ? 'auto' : 98,
    marginBottom: 0,
    background: variant === 'amber' ? '#1d1705' : '#121f27',
    border: variant === 'amber' ? '0.5px solid #4a3900' : '0.5px solid #4f6270',
    borderLeft: variant === 'amber' ? '3px solid #FFD700' : '3px solid #8fb0c4',
    textAlign: 'left',
    fontFamily: 'inherit',
    cursor: 'pointer',
    transition: 'border-color 0.12s, background 0.12s, box-shadow 0.12s',
  });
  const quickActionHover = (variant = 'blue') => ({
    onMouseEnter: e => {
      e.currentTarget.style.background = variant === 'amber' ? '#241d06' : '#152937';
      e.currentTarget.style.borderColor = variant === 'amber' ? '#806a00' : '#7892a3';
      e.currentTarget.style.boxShadow = variant === 'amber'
        ? '0 12px 28px rgba(255, 215, 0, 0.14)'
        : '0 12px 28px rgba(143, 176, 196, 0.14)';
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = variant === 'amber' ? '#1d1705' : '#121f27';
      e.currentTarget.style.borderColor = variant === 'amber' ? '#4a3900' : '#4f6270';
      e.currentTarget.style.boxShadow = 'none';
    },
  });
  const payoffIcon = {
    ...onboardingIcon,
    background: '#3a2d00',
    border: 'none',
    color: '#FFD700',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.6,
  };
  const actionIcon = {
    ...onboardingIcon,
    background: '#1d2d37',
    border: '0.5px solid #4f6270',
    color: '#dbeaf2',
  };
  const sidebarGutter = shellNarrow ? 16 : 20;
  const dashboardStatCols = 'repeat(auto-fit, minmax(220px, 1fr))';
  const attentionCols = 'repeat(auto-fit, minmax(240px, 1fr))';
  const bucketCols = isNarrowPortfolio ? 'repeat(5, minmax(145px, 1fr))' : 'repeat(5, minmax(0, 1fr))';
  const navItem = (id, label, count) => {
    const active = activeView === id && !selected;
    const hovered = hoveredNav === id;
    return (
      <button
        key={id}
        onClick={() => { setActiveView(id); setSelected(null); if (id === 'loans') setLoansView('all'); if (id === 'invoices') setOpenInvoiceId(''); }}
        onMouseEnter={() => setHoveredNav(id)}
        onMouseLeave={() => setHoveredNav(null)}
        style={{
          width: shellNarrow ? (shellTiny ? '100%' : 'auto') : '100%',
          minWidth: shellNarrow && !shellTiny ? 128 : 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          background: active || hovered ? '#151515' : 'transparent',
          border: 'none',
          borderLeft: !shellNarrow && active ? '3px solid #FFD700' : '3px solid transparent',
          borderBottom: shellNarrow && active ? '2px solid #FFD700' : '2px solid transparent',
          borderRadius: shellNarrow ? 8 : 0,
          color: active || hovered ? '#fff' : '#666',
          padding: shellNarrow ? '10px 12px' : `12px 18px 12px ${sidebarGutter}px`,
          fontSize: 14,
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'inherit',
          transition: 'background 0.12s, color 0.12s',
          flexShrink: 0,
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <NavIcon type={id} active={active || hovered} />
          <span>{label}</span>
        </span>
        {count != null && count > 0 && <span style={{ color: '#FFD700', background: '#1e1a00', borderRadius: 999, padding: '1px 8px', fontSize: 11 }}>{count}</span>}
      </button>
    );
  };
  const dashboardListItem = (loan, filterId, accent, detail, tag) => {
    const b = getBorrower(loan);
    return (
      <button key={loan.id} onClick={() => setLoansView(filterId)} style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, background: 'transparent', border: 'none', borderTop: '0.5px solid #1f1f1f', padding: '13px 0', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
        <span>
          <span style={{ display: 'block', color: '#fff', fontSize: 13, lineHeight: 1.2 }}>{loan.borrower_name || loan.property_address || '-'}</span>
          <span style={{ display: 'block', color: '#555', fontSize: 12, marginTop: 3 }}>{detail || formatCurrency(b.principal_balance || loan.total_due)}</span>
        </span>
        {tag && <span style={{ color: accent, background: `${accent}22`, borderRadius: 4, padding: '3px 8px', fontSize: 11, alignSelf: 'center' }}>{tag}</span>}
      </button>
    );
  };
  const placeholder = (title) => (
    <div style={{ padding: contentPad }}>
      <div style={{ fontSize: 24, fontWeight: 500, color: '#fff' }}>{title}</div>
    </div>
  );
  const settingsInput = {
    background: '#0f0f0f',
    border: '0.5px solid #252525',
    borderRadius: 6,
    color: '#aaa',
    fontSize: 12,
    fontFamily: 'inherit',
    padding: '10px 12px',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
  };
  const settingsLabel = { color: '#aaa', fontSize: 12, marginBottom: 7 };
  const settingsCard = { background: '#151515', border: '0.5px solid #252525', borderRadius: 9, padding: 20 };
  const settingsPrimary = { background: '#FFD700', color: '#0f0f0f', border: 'none', borderRadius: 6, padding: '9px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };
  const settingsSecondary = { background: '#111', color: '#777', border: '0.5px solid #2a2a2a', borderRadius: 6, padding: '9px 16px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' };
  const settingsDanger = { ...settingsSecondary, color: '#ff6b6b', borderColor: '#3a1d1d' };
  const settingField = (label, props = {}) => (
    <div>
      <div style={settingsLabel}>{label}</div>
      <input {...props} style={{ ...settingsInput, ...(props.style || {}) }} />
    </div>
  );
  const showSettingsNotice = (message) => {
    setSettingsNotice(message);
    setSettingsError('');
    window.setTimeout(() => setSettingsNotice(''), 2600);
  };
  const resetAccountForm = () => {
    const [firstName = user?.firstName || '', ...lastParts] = String(lenderSettings?.full_name || user?.fullName || '').split(' ');
    setAccountForm({
      firstName,
      lastName: lastParts.join(' ') || user?.lastName || '',
      companyName: lenderSettings?.company_name || '',
      email: lenderSettings?.email || email || '',
      phone: lenderSettings?.phone || '',
      state: lenderSettings?.state || '',
    });
    showSettingsNotice('Account changes discarded.');
  };
  const patchLenderSettings = async (payload) => {
    setSavingSettings(true);
    setSettingsError('');
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/lenders?email=eq.${encodeURIComponent(email)}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      const next = Array.isArray(updated) && updated[0] ? updated[0] : { ...lenderSettings, ...payload };
      setLenderSettings(next);
      if (payload.company_name) setLenderName(payload.company_name);
      return next;
    } finally {
      setSavingSettings(false);
    }
  };
  const saveAccountSettings = async () => {
    try {
      await patchLenderSettings({
        full_name: `${accountForm.firstName} ${accountForm.lastName}`.trim(),
        company_name: accountForm.companyName,
        phone: accountForm.phone,
        state: accountForm.state,
      });
      showSettingsNotice('Account changes saved.');
    } catch {
      setSettingsError('Account changes could not be saved.');
    }
  };
  const saveBillingEmail = async () => {
    try {
      await patchLenderSettings({ billing_email: billingEmail });
      showSettingsNotice('Billing email saved.');
    } catch {
      setSettingsError('Billing email could not be saved. The database may need a billing_email field.');
    }
  };
  const resetWireForm = () => {
    setWireForm({
      wire_bank_name: lenderSettings?.wire_bank_name || '',
      wire_routing_number: lenderSettings?.wire_routing_number || '',
      wire_account_number: lenderSettings?.wire_account_number || '',
      wire_account_name: lenderSettings?.wire_account_name || '',
      wire_bank_address: lenderSettings?.wire_bank_address || '',
    });
    showSettingsNotice('Wire instruction changes discarded.');
  };
  const saveWireSettings = async () => {
    try {
      await patchLenderSettings(wireForm);
      showSettingsNotice('Wire instructions saved.');
    } catch {
      setSettingsError('Wire instructions could not be saved.');
    }
  };
  const updatePassword = async () => {
    if (!passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword) {
      setSettingsError('New passwords do not match.');
      return;
    }
    setSavingSettings(true);
    setSettingsError('');
    try {
      await user.updatePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showSettingsNotice('Password updated.');
    } catch {
      setSettingsError('Password could not be updated.');
    } finally {
      setSavingSettings(false);
    }
  };
  const toggleRow = (title, desc, checked = true) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '15px 0', borderTop: '0.5px solid #222' }}>
      <div>
        <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{title}</div>
        <div style={{ color: '#555', fontSize: 12, marginTop: 4 }}>{desc}</div>
      </div>
      <label style={{ position: 'relative', display: 'inline-block', width: 42, height: 22, flex: '0 0 auto' }}>
        <input type="checkbox" defaultChecked={checked} style={{ opacity: 0, width: 0, height: 0 }} />
        <span style={{ position: 'absolute', inset: 0, borderRadius: 999, background: checked ? '#FFD700' : '#2a2a2a' }} />
        <span style={{ position: 'absolute', width: 18, height: 18, left: checked ? 22 : 2, top: 2, borderRadius: '50%', background: checked ? '#0f0f0f' : '#777' }} />
      </label>
    </div>
  );
  const settingsTabs = [
    ['account', 'Account'],
    ['billing', 'Billing'],
    ['wire', 'Wire instructions'],
    ['notifications', 'Notifications'],
    ['security', 'Security'],
  ];
  const settingsView = (
    <div style={{ padding: contentPad }}>
      <div style={{ ...contentWrap, maxWidth: 1160 }}>
        <div style={{ fontSize: 24, fontWeight: 600, color: '#fff', marginBottom: 22 }}>Settings</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, overflow: 'visible', borderBottom: '0.5px solid #222', marginBottom: 24 }}>
          {settingsTabs.map(([id, label]) => (
            <button key={id} onClick={() => { setSettingsTab(id); setSettingsNotice(''); }} style={{ background: 'transparent', border: 'none', borderBottom: settingsTab === id ? '2px solid #FFD700' : '2px solid transparent', color: settingsTab === id ? '#FFD700' : '#666', padding: '10px 2px', marginBottom: -1, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>{label}</button>
          ))}
        </div>
        {settingsNotice && <div style={{ color: '#34d399', fontSize: 12, margin: '-10px 0 16px' }}>{settingsNotice}</div>}
        {settingsError && <div style={{ color: '#ff6b6b', fontSize: 12, margin: '-10px 0 16px' }}>{settingsError}</div>}

        {settingsTab === 'account' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={settingsCard}>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>Account information</div>
              <div style={{ color: '#555', fontSize: 12, marginTop: 5, marginBottom: 20 }}>Update your name, company, and contact details.</div>
              <div style={{ display: 'grid', gridTemplateColumns: shellNarrow ? '1fr' : '1fr 1fr', gap: 14 }}>
                {settingField('First name', { value: accountForm.firstName, onChange: e => setAccountForm(f => ({ ...f, firstName: e.target.value })) })}
                {settingField('Last name', { value: accountForm.lastName, onChange: e => setAccountForm(f => ({ ...f, lastName: e.target.value })) })}
              </div>
              <div style={{ display: 'grid', gap: 14, marginTop: 14 }}>
                {settingField('Company / entity name', { value: accountForm.companyName, onChange: e => setAccountForm(f => ({ ...f, companyName: e.target.value })) })}
                {settingField('Email address', { value: accountForm.email, readOnly: true, style: { color: '#666' } })}
                {settingField('Phone number', { value: accountForm.phone, onChange: e => setAccountForm(f => ({ ...f, phone: e.target.value })) })}
                {settingField('State', { value: accountForm.state, onChange: e => setAccountForm(f => ({ ...f, state: e.target.value })) })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <button onClick={resetAccountForm} className="swiftdeed-settings-secondary" style={settingsSecondary}>Cancel</button>
                <button disabled={savingSettings} onClick={saveAccountSettings} className="swiftdeed-settings-primary" style={settingsPrimary}>Save changes</button>
              </div>
            </div>
            <div style={settingsCard}>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>Change password</div>
              <div style={{ color: '#555', fontSize: 12, marginTop: 5, marginBottom: 20 }}>Update your login password.</div>
              <div style={{ display: 'grid', gap: 14 }}>
                {settingField('Current password', { type: 'password', value: passwordForm.currentPassword, onChange: e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value })) })}
                <div style={{ display: 'grid', gridTemplateColumns: shellNarrow ? '1fr' : '1fr 1fr', gap: 14 }}>
                  {settingField('New password', { type: 'password', placeholder: 'Min. 8 characters', value: passwordForm.newPassword, onChange: e => setPasswordForm(f => ({ ...f, newPassword: e.target.value })) })}
                  {settingField('Confirm new password', { type: 'password', placeholder: 'Re-enter password', value: passwordForm.confirmPassword, onChange: e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value })) })}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}><button disabled={savingSettings} onClick={updatePassword} className="swiftdeed-settings-primary" style={settingsPrimary}>Update password</button></div>
            </div>
          </div>
        )}

        {settingsTab === 'billing' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={settingsCard}>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>Payment method</div>
              <div style={{ color: '#555', fontSize: 12, marginTop: 5, marginBottom: 18 }}>Charged on the 1st of each month for active loans and any additional charges.</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, border: '0.5px solid #252525', borderRadius: 8, padding: 14, marginBottom: 12 }}>
                <div>
                  <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>Visa ending in 4242 <span style={{ color: '#34d399', background: '#0a2416', borderRadius: 999, padding: '3px 8px', fontSize: 10, marginLeft: 8 }}>Active</span></div>
                  <div style={{ color: '#555', fontSize: 12, marginTop: 4 }}>Expires 09/2028 - Added Jan 12, 2026</div>
                </div>
                <button className="swiftdeed-settings-secondary" style={settingsSecondary}>Update</button>
              </div>
              <button className="swiftdeed-settings-secondary" style={settingsSecondary}>+ Add payment method</button>
            </div>
            <div style={settingsCard}>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>Billing email</div>
              <div style={{ color: '#555', fontSize: 12, marginTop: 5, marginBottom: 18 }}>Invoices and billing notifications will be sent to this address.</div>
              {settingField('Billing email', { value: billingEmail, onChange: e => setBillingEmail(e.target.value) })}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}><button disabled={savingSettings} onClick={saveBillingEmail} className="swiftdeed-settings-primary" style={settingsPrimary}>Save</button></div>
            </div>
          </div>
        )}

        {settingsTab === 'wire' && (
          <div style={settingsCard}>
            <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>Wire instructions</div>
            <div style={{ color: '#555', fontSize: 12, marginTop: 5, marginBottom: 20 }}>Borrower payments will be wired to the account below. Keep this accurate and up to date.</div>
            <div style={{ display: 'grid', gap: 14 }}>
              {settingField('Bank name', { value: wireForm.wire_bank_name, onChange: e => setWireForm(f => ({ ...f, wire_bank_name: e.target.value })) })}
              {settingField('Account name', { value: wireForm.wire_account_name, onChange: e => setWireForm(f => ({ ...f, wire_account_name: e.target.value })) })}
              <div style={{ display: 'grid', gridTemplateColumns: shellNarrow ? '1fr' : '1fr 1fr', gap: 14 }}>
                {settingField('Routing number', { value: wireForm.wire_routing_number, onChange: e => setWireForm(f => ({ ...f, wire_routing_number: e.target.value.replace(/\D/g, '').slice(0, 9) })) })}
                {settingField('Account number', { value: wireForm.wire_account_number, onChange: e => setWireForm(f => ({ ...f, wire_account_number: e.target.value })) })}
              </div>
              {settingField('Bank address', { value: wireForm.wire_bank_address, onChange: e => setWireForm(f => ({ ...f, wire_bank_address: e.target.value })) })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button onClick={resetWireForm} className="swiftdeed-settings-secondary" style={settingsSecondary}>Cancel</button>
              <button disabled={savingSettings} onClick={saveWireSettings} className="swiftdeed-settings-primary" style={settingsPrimary}>Save wire instructions</button>
            </div>
          </div>
        )}

        {settingsTab === 'notifications' && (
          <div style={settingsCard}>
            <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>Email notifications</div>
            <div style={{ color: '#555', fontSize: 12, marginTop: 5, marginBottom: 10 }}>Choose which events trigger an email to your account.</div>
            {toggleRow('Payment received', "When a borrower's ACH payment clears")}
            {toggleRow('Payment missed', 'When a payment is not received by the due date')}
            {toggleRow('Maturity approaching', '60 and 30 days before a loan matures')}
            {toggleRow('Loan onboarded', 'Confirmation when a new loan goes live')}
            {toggleRow('Payoff statement generated', 'When a payoff statement is created and charged', false)}
            {toggleRow('Monthly invoice ready', 'When your monthly invoice is generated')}
          </div>
        )}

        {settingsTab === 'security' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={settingsCard}>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>Active sessions</div>
              <div style={{ color: '#555', fontSize: 12, marginTop: 5, marginBottom: 12 }}>Devices currently logged into your account.</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '14px 0', borderTop: '0.5px solid #222' }}>
                <div><div style={{ color: '#fff', fontSize: 13 }}>Chrome - macOS - New York, NY</div><div style={{ color: '#34d399', fontSize: 11, marginTop: 3 }}>Current session</div></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '14px 0', borderTop: '0.5px solid #222' }}>
                <div><div style={{ color: '#fff', fontSize: 13 }}>Safari - iPhone - Westport, CT</div><div style={{ color: '#555', fontSize: 11, marginTop: 3 }}>Last active 2 hours ago</div></div>
                <button onClick={() => signOut()} className="swiftdeed-settings-secondary" style={settingsDanger}>Log out</button>
              </div>
              <div style={{ borderTop: '0.5px solid #222', paddingTop: 14 }}><button onClick={() => signOut()} className="swiftdeed-settings-secondary" style={settingsDanger}>Log out of all devices</button></div>
            </div>
            <div style={settingsCard}>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>Two-factor authentication</div>
              <div style={{ color: '#555', fontSize: 12, marginTop: 5, marginBottom: 16 }}>Add an extra layer of security to your account. Coming soon.</div>
              <button disabled style={{ ...settingsSecondary, opacity: 0.4, cursor: 'not-allowed' }}>Enable 2FA - coming soon</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
  const openLoanDocuments = (loan) => {
    setSelected(null);
    setLiveData(null);
    setLoanPayments([]);
    setDocUrls([]);
    setActiveView('documents');
    setDocTab('loan');
    setSelectedDocLoanId(loan?.loan_id_internal || loan?.loan_id || '');
  };
  const openPayoffModal = (loan) => {
    setPayoffLoan(loan);
    setPayoffGoodThrough(defaultGoodThroughDate());
    setPayoffError('');
    setPayoffSuccessUrl('');
  };
  const closePayoffModal = () => {
    if (generatingPayoff) return;
    setPayoffLoan(null);
    setPayoffError('');
    setPayoffSuccessUrl('');
  };
  const finishPayoffModal = () => {
    setPayoffLoan(null);
    setPayoffError('');
    setPayoffSuccessUrl('');
  };
  const handleGeneratePayoff = async () => {
    if (!payoffLoan) return;
    setGeneratingPayoff(true);
    setPayoffError('');
    try {
      const loanIdInternal = payoffLoan.loan_id_internal || payoffLoan.loan_id;
      const res = await fetch('/api/generate-payoff-statement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanIdInternal,
          goodThroughDate: payoffGoodThrough,
          lenderEmail: email,
          lenderName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate payoff statement');

      const patch = {
        payoff_statement_url: data.statementUrl,
        total_due: data.totalDue,
        completed_at: data.completedAt,
        status: 'completed',
      };
      setRequests(prev => prev.map(r => (r.loan_id_internal || r.loan_id) === loanIdInternal ? { ...r, ...patch } : r));
      setSelected(prev => prev && (prev.loan_id_internal || prev.loan_id) === loanIdInternal ? { ...prev, ...patch } : prev);
      setPayoffSuccessUrl(data.statementUrl || '');
    } catch (error) {
      setPayoffError(error.message || 'Could not generate payoff statement.');
    } finally {
      setGeneratingPayoff(false);
    }
  };
  const modals = (
    <>
      <PayoffStatementModal loan={payoffLoan} goodThroughDate={payoffGoodThrough} onDateChange={setPayoffGoodThrough} onClose={closePayoffModal} onGenerate={handleGeneratePayoff} generating={generatingPayoff} error={payoffError} successUrl={payoffSuccessUrl} onDone={finishPayoffModal} />
      <MonthlyStatementPreviewModal doc={monthlyStatementDoc} borrower={monthlyStatementDoc?.loan ? getBorrower(monthlyStatementDoc.loan) : null} lenderName={lenderName} onClose={() => setMonthlyStatementDoc(null)} />
      {showPaymentModal && liveData && (
        <RecordPaymentModal borrower={liveData} lenderEmail={email} lenderName={lenderName} onClose={() => setShowPaymentModal(false)} onSuccess={(updates) => { setShowPaymentModal(false); setPaymentSuccess(true); setLiveData(prev => ({ ...prev, ...updates })); setTimeout(() => setPaymentSuccess(false), 5000); }} />
      )}
      {showDeleteModal && selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#141414', border: '0.5px solid #2a2a2a', borderRadius: 12, padding: 28, width: '100%', maxWidth: 400 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1a0000', border: '0.5px solid #3a0000', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <span style={{ color: '#f87171', fontSize: 18 }}>!</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#fff', marginBottom: 8 }}>Delete this loan?</div>
            <div style={{ fontSize: 12, color: '#555', lineHeight: 1.6, marginBottom: 20 }}>
              This will permanently delete <span style={{ color: '#ccc' }}>{selected.loan_id_internal}</span> and remove <span style={{ color: '#ccc' }}>{selected.borrower_name}</span>'s borrower portal access. This cannot be undone.
            </div>
            <div style={{ fontSize: 11, color: '#555', marginBottom: 6 }}>Type DELETE to confirm</div>
            <input style={{ width: '100%', background: '#1a1a1a', border: '0.5px solid #2a2a2a', borderRadius: 6, padding: '9px 12px', fontSize: 13, color: '#fff', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box', marginBottom: 16 }} value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder="DELETE" />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleDeleteLoan} disabled={deleteConfirmText !== 'DELETE' || deleting} style={{ flex: 1, background: deleteConfirmText === 'DELETE' ? '#7f1d1d' : '#1a1a1a', color: deleteConfirmText === 'DELETE' ? '#f87171' : '#444', fontSize: 13, fontWeight: 500, padding: 10, borderRadius: 6, border: '0.5px solid #f87171', cursor: deleteConfirmText === 'DELETE' ? 'pointer' : 'not-allowed', transition: 'all 0.15s' }}>{deleting ? 'Deleting...' : 'Delete permanently'}</button>
              <button onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }} style={{ flex: 1, background: 'transparent', color: '#fff', fontSize: 13, padding: 10, borderRadius: 6, border: '0.5px solid #2a2a2a', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  const dashboardView = (
    <div style={{ padding: contentPad }}>
      <div style={contentWrap}>
      <style>{`
        .swiftdeed-bucket-scroll {
          scrollbar-color: #FFD700 #0f0f0f;
          scrollbar-width: thin;
        }
        .swiftdeed-bucket-scroll::-webkit-scrollbar {
          height: 14px;
          background: #0f0f0f;
        }
        .swiftdeed-bucket-scroll::-webkit-scrollbar-track {
          background: #0f0f0f;
          border-top: 0.5px solid #FFD700;
          border-bottom: 0.5px solid #FFD700;
        }
        .swiftdeed-bucket-scroll::-webkit-scrollbar-thumb {
          background: #111;
          border: 1px solid #FFD700;
          border-radius: 999px;
        }
        .swiftdeed-bucket-scroll::-webkit-scrollbar-button {
          width: 14px;
          background: #0f0f0f;
          border: 0.5px solid #FFD700;
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 500, color: '#fff', marginBottom: 6 }}>Dashboard</div>
          <div style={{ fontSize: 13, color: '#444' }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
        </div>
      </div>

      <div style={quickActionGrid}>
        <button onClick={onSubmitRequest} style={quickActionCard('blue')} {...quickActionHover('blue')}>
          <span style={actionIcon}>+</span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', color: '#fff', fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Onboard a new loan</span>
            <span style={{ display: 'block', color: '#c9d6dd', fontSize: 13, lineHeight: 1.45 }}>Upload loan documents and SwiftDeed will extract the terms automatically.</span>
          </span>
          <span style={{ ...onboardingCta, color: '#dbeaf2' }}>Get started <span aria-hidden="true">-&gt;</span></span>
        </button>
        <button onClick={() => { setActiveView('documents'); setDocTab('payoff'); setSelected(null); }} style={quickActionCard('amber')} {...quickActionHover('amber')}>
          <span style={payoffIcon}>PDF</span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', color: '#fff', fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Generate payoff statement</span>
            <span style={{ display: 'block', color: '#d8d0b8', fontSize: 13, lineHeight: 1.45 }}>Create a payoff PDF for any active loan.</span>
            <span style={{ display: 'block', color: '#6f642f', fontSize: 11, marginTop: 4 }}>$30 per statement</span>
          </span>
          <span style={onboardingCta}>Generate <span aria-hidden="true">-&gt;</span></span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: dashboardStatCols, gap: 12, marginBottom: 28 }}>
        <button style={statCard('principal')} onClick={() => setLoansView('all')} onMouseEnter={() => setHoveredCard('principal')} onMouseLeave={() => setHoveredCard(null)}><div style={sl}>Principal Outstanding</div><div style={sv}>{formatCurrency(principalOutstanding)}</div><div style={ss}>{activeLoans.length} active loans</div></button>
        <button style={statCard('received')} onClick={() => setLoansView('received_month')} onMouseEnter={() => setHoveredCard('received')} onMouseLeave={() => setHoveredCard(null)}><div style={sl}>Payments This Month</div><div style={sv}>{formatCurrency(receivedThisMonthTotal)}</div><div style={ss}>{receivedThisMonth.length} loans with payments</div></button>
        <button style={statCard('attention')} onClick={() => setLoansView('attention')} onMouseEnter={() => setHoveredCard('attention')} onMouseLeave={() => setHoveredCard(null)}><div style={sl}>Loans Needing Attention</div><div style={sv}>{loansNeedingAttentionCount}</div><div style={ss}>Review flagged loans</div></button>
        <button style={statCard('maturing')} onClick={() => setLoansView('maturing_90')} onMouseEnter={() => setHoveredCard('maturing')} onMouseLeave={() => setHoveredCard(null)}><div style={sl}>Maturing Within 90 Days</div><div style={sv}>{maturingSoon.length}</div><div style={ss}>{nextMaturity ? `${formatDate(nextMaturityBorrower.maturity_date || nextMaturity.maturity_date)} - ${formatCurrency(nextMaturityBorrower.principal_balance || nextMaturity.total_due)}` : '-'}</div></button>
      </div>

      <div style={{ fontSize: 12, color: '#FFD700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Needs Attention</div>
      <div style={{ display: 'grid', gridTemplateColumns: attentionCols, gap: 12, marginBottom: 28 }}>
        {[
          { id: 'maturity', label: 'Maturity', count: maturingSoon.length, loans: maturingSoon, accent: '#FFD700' },
          { id: 'overdue', label: 'Overdue', count: pastDue, loans: requests.filter(isOverdueLoan), accent: '#f87171' },
          { id: 'upcoming', label: 'Upcoming', count: upcomingPayments.length, loans: upcomingPayments, accent: '#4aa3ff' },
        ].map(card => (
          <div key={card.id} onClick={() => setLoansView(card.id)} onMouseEnter={() => setHoveredAttention(card.id)} onMouseLeave={() => setHoveredAttention(null)} style={attentionCardStyle(card.id, card.accent)}>
            <button onClick={() => setLoansView(card.id)} style={{ width: '100%', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <span style={{ color: card.accent, fontSize: 13, textTransform: 'uppercase' }}>{card.label}</span>
                <span style={{ color: '#555', fontSize: 12 }}>{card.id === 'upcoming' ? `${card.count} payments this week` : `${card.count} loans`}</span>
              </div>
            </button>
            <div style={{ marginTop: 14 }}>
              {card.loans.slice(0, 3).map(loan => {
                const b = getBorrower(loan);
                const daysLabel = card.id === 'maturity'
                  ? `${Math.max(0, daysFromToday(b.maturity_date || loan.maturity_date) || 0)} days`
                  : card.id === 'overdue'
                    ? `${daysPastDue(loan)} days`
                    : b.next_payment_date ? formatDate(b.next_payment_date) : '';
                const detail = card.id === 'overdue'
                  ? `${formatCurrency(b.principal_balance || loan.total_due)} outstanding`
                  : card.id === 'upcoming'
                    ? `${formatCurrency(b.monthly_payment)} due`
                    : formatCurrency(b.principal_balance || loan.total_due);
                return dashboardListItem(loan, card.id, card.accent, detail, daysLabel);
              })}
              {card.loans.length === 0 && <div style={{ color: '#444', fontSize: 13, padding: '18px 0' }}>None</div>}
              <button onClick={() => setLoansView(card.id)} style={{ background: 'transparent', border: 'none', color: card.accent, padding: '14px 0 0', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12 }}>View all {card.label.toLowerCase()} -&gt;</button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12, color: '#FFD700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Delinquency Buckets</div>
      <div className="swiftdeed-bucket-scroll" style={{ border: '0.5px solid #252525', borderRadius: 9, overflowX: 'auto', overflowY: 'hidden', background: '#111', scrollbarColor: '#FFD700 #0f0f0f', scrollbarWidth: 'thin' }}>
        <div style={{ display: 'grid', gridTemplateColumns: bucketCols, minWidth: isNarrowPortfolio ? 725 : 0 }}>
        {[
          { id: 'all', label: 'All Loans', count: activeLoans.length, total: principalOutstanding },
          { id: 'current', label: 'Current', count: currentLoans.length, total: currentLoans.reduce((sum, r) => sum + (parseFloat(getBorrower(r).principal_balance || r.total_due) || 0), 0) },
          { id: 'bucket_1_30', label: '1-30 Days Past Due', count: bucketOne.length, total: bucketOne.reduce((sum, r) => sum + (parseFloat(getBorrower(r).principal_balance || r.total_due) || 0), 0) },
          { id: 'bucket_31_60', label: '31-60 Days Past Due', count: bucketTwo.length, total: bucketTwo.reduce((sum, r) => sum + (parseFloat(getBorrower(r).principal_balance || r.total_due) || 0), 0) },
          { id: 'bucket_60_plus', label: '60+ Days Past Due', count: bucketThree.length, total: bucketThree.reduce((sum, r) => sum + (parseFloat(getBorrower(r).principal_balance || r.total_due) || 0), 0) },
        ].map(bucket => (
          <button key={bucket.id} onClick={() => setLoansView(bucket.id)} onMouseEnter={() => setHoveredCard(bucket.id)} onMouseLeave={() => setHoveredCard(null)} style={{ background: hoveredCard === bucket.id ? '#151515' : 'transparent', border: 'none', borderRight: '0.5px solid #222', padding: '18px 16px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', transition: 'background 0.12s' }}>
            <div style={{ ...sl, marginBottom: 8 }}>{bucket.label}</div>
            <div style={{ fontSize: 27, color: '#fff', marginBottom: 6 }}>{bucket.count}</div>
            <div style={{ color: '#444', fontSize: 12 }}>{bucket.total ? formatCurrency(bucket.total) : '-'}</div>
          </button>
        ))}
        </div>
      </div>
      </div>
    </div>
  );

  const monthLabel = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const docAccent = { monthly: '#4aa3ff', payoff: '#34d399', loan: '#FFD700', yearend: '#a78bfa' };
  const documentRecords = [
    ...activeLoans.map(loan => {
      const b = getBorrower(loan);
      return {
        id: `monthly-${loan.loan_id_internal}`,
        tab: 'monthly',
        type: 'Monthly statement',
        title: `${monthLabel} Statement`,
        detail: 'Current monthly borrower statement',
        loan,
        borrower: loan.borrower_name || b.legal_name || '-',
        period: monthLabel,
        date: 'Ready',
        action: 'View',
      };
    }),
    ...activeLoans.map(loan => {
      const b = getBorrower(loan);
      return {
        id: `payoff-${loan.loan_id_internal}`,
        tab: 'payoff',
        type: 'Payoff statement',
        title: loan.payoff_statement_url ? 'Payoff Statement' : 'No payoff statement yet',
        detail: loan.payoff_statement_url ? `${formatCurrency(loan.total_due || b.principal_balance)} payoff amount` : 'Generate one for this loan',
        generated: !!loan.payoff_statement_url,
        loan,
        borrower: loan.borrower_name || b.legal_name || '-',
        period: loan.payoff_statement_url ? 'Good-through date' : 'Not generated',
        date: loan.payoff_statement_url ? formatDate(loan.completed_at || loan.created_at) : '-',
        action: 'View',
        url: loan.payoff_statement_url,
      };
    }),
    ...requests.flatMap(loan => {
      const urls = uniqueDocUrls(getBorrower(loan).loan_document_urls, loan.loan_document_urls);
      return urls.length > 0
        ? urls.map((url, index) => ({
            id: `loan-${loan.loan_id_internal}-${index}`,
            tab: 'loan',
            type: 'Loan document',
            title: decodeURIComponent(url.split('/').pop()).replace(/^\d+_/, '').replace(/[-_]/g, ' ').replace('.pdf', '').trim() || 'Loan document',
            detail: 'Uploaded loan file',
            loan,
            borrower: loan.borrower_name || '-',
            period: 'Loan file',
            date: formatDate(loan.created_at),
            action: 'View',
            url,
          }))
        : [{
            id: `loan-placeholder-${loan.loan_id_internal}`,
            tab: 'loan',
            type: 'Loan documents',
            title: 'Loan file',
            detail: 'Promissory note, deed of trust, agreement',
            loan,
            borrower: loan.borrower_name || '-',
            period: 'On file',
            date: '-',
            action: 'View',
          }];
    }),
    {
      id: 'yearend-summary-2025',
      tab: 'yearend',
      type: 'Year-end document',
      title: '2025 Lender Year-End Summary',
      detail: 'Annual summary across every active loan',
      loan: null,
      borrower: 'Full portfolio',
      period: '2025 tax year',
      date: 'Jan 31, 2026',
      action: 'View',
    },
    {
      id: 'yearend-interest-2025',
      tab: 'yearend',
      type: 'Year-end document',
      title: '2025 Interest Summary',
      detail: 'Interest totals across every loan',
      loan: null,
      borrower: 'Full portfolio',
      period: '2025 tax year',
      date: 'Jan 31, 2026',
      action: 'View',
    },
    {
      id: 'yearend-ledger-2025',
      tab: 'yearend',
      type: 'Year-end document',
      title: '2025 Payment Ledger Export',
      detail: 'Annual payment ledger for the full portfolio',
      loan: null,
      borrower: 'Full portfolio',
      period: '2025 tax year',
      date: 'Jan 31, 2026',
      action: 'View',
    },
  ];
  const loanDocId = loan => loan?.loan_id_internal || loan?.loan_id || '';
  const docsForLoan = (loan, tab = docTab) => documentRecords.filter(doc => doc.tab === tab && loanDocId(doc.loan) === loanDocId(loan));
  const yearEndRecords = documentRecords.filter(doc => doc.tab === 'yearend');
  const visibleDocCount = (loan, tab = docTab) => {
    if (tab === 'yearend') return yearEndRecords.length;
    if (tab === 'payoff') return loan.payoff_statement_url ? 1 : 0;
    if (tab === 'loan') return uniqueDocUrls(getBorrower(loan).loan_document_urls, loan.loan_document_urls).length;
    return docsForLoan(loan, tab).length;
  };
  const normalizedDocSearch = docSearch.trim().toLowerCase();
  const documentLoanOptions = activeLoans.filter(loan => !normalizedDocSearch || loanDocId(loan).toLowerCase().includes(normalizedDocSearch));
  const sortedDocumentLoans = [...documentLoanOptions].sort((a, b) => {
    const aBorrower = (a.borrower_name || '').toLowerCase();
    const bBorrower = (b.borrower_name || '').toLowerCase();
    if (docSort === 'recent') return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    if (docSort === 'maturity') return (daysFromToday(getBorrower(a).maturity_date || a.maturity_date) ?? 99999) - (daysFromToday(getBorrower(b).maturity_date || b.maturity_date) ?? 99999);
    if (docSort === 'delinquency') return daysPastDue(b) - daysPastDue(a);
    if (docSort === 'most_docs') return visibleDocCount(b) - visibleDocCount(a) || aBorrower.localeCompare(bBorrower);
    if (docSort === 'no_docs') return visibleDocCount(a) - visibleDocCount(b) || aBorrower.localeCompare(bBorrower);
    return aBorrower.localeCompare(bBorrower);
  });
  const selectedDocLoan = sortedDocumentLoans.find(loan => loanDocId(loan) === selectedDocLoanId) || sortedDocumentLoans[0] || null;
  const selectedDocRecords = selectedDocLoan ? docsForLoan(selectedDocLoan).filter(doc => docTab !== 'payoff' || doc.generated) : [];
  const openMonthlyStatementTab = (doc) => {
    const html = monthlyStatementHtml(getMonthlyStatementData(doc, doc?.loan ? getBorrower(doc.loan) : null, lenderName));
    const tab = window.open('', '_blank');
    if (!tab) return;
    tab.opener = null;
    tab.document.open();
    tab.document.write(html);
    tab.document.close();
  };
  const documentRow = (doc) => {
    const accent = docAccent[doc.tab] || '#FFD700';
    const visibleDate = doc.date && doc.date !== '-' && doc.date !== 'Ready' ? doc.date : '';
    return (
      <div key={doc.id} style={{ display: 'grid', gridTemplateColumns: shellNarrow ? '1fr auto' : 'minmax(230px, 280px) 145px 104px minmax(86px, 1fr)', gap: shellNarrow ? '8px 12px' : 12, alignItems: 'center', padding: '12px 14px', borderTop: '0.5px solid #1c1c1c' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <span style={{ width: 28, height: 28, borderRadius: 7, background: `${accent}18`, border: `0.5px solid ${accent}55`, flexShrink: 0 }} />
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', color: '#fff', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</span>
            <span style={{ display: 'block', color: '#555', fontSize: 12, marginTop: 2 }}>{doc.detail}</span>
          </span>
        </div>
        {!shellNarrow && <span />}
        {!shellNarrow && <span style={{ color: '#777', fontSize: 12, textAlign: 'right' }}>{visibleDate}</span>}
        <button
          onClick={() => {
            if (doc.tab === 'monthly') openMonthlyStatementTab(doc);
            if (doc.url) window.open(doc.url, '_blank', 'noopener,noreferrer');
          }}
          style={{ background: 'transparent', border: 'none', color: '#FFD700', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'right', whiteSpace: 'nowrap', justifySelf: 'end' }}
        >
          View -&gt;
        </button>
        {shellNarrow && visibleDate && <div style={{ gridColumn: '1 / -1', color: '#666', fontSize: 12, paddingLeft: 40 }}>{visibleDate}</div>}
      </div>
    );
  };
  const documentsView = (
    <div style={{ padding: contentPad }}>
      <div style={{ ...contentWrap, maxWidth: 1160 }}>
        <style>{`
          .swiftdeed-doc-loan-list {
            scrollbar-color: #FFD700 #0f0f0f;
            scrollbar-width: thin;
          }
          .swiftdeed-doc-loan-list::-webkit-scrollbar {
            width: 8px;
            background: #0f0f0f;
          }
          .swiftdeed-doc-loan-list::-webkit-scrollbar-track {
            background: #0f0f0f;
          }
          .swiftdeed-doc-loan-list::-webkit-scrollbar-thumb {
            background: #FFD700;
            border-radius: 999px;
            border: 2px solid #0f0f0f;
          }
          .swiftdeed-yellow-scroll {
            scrollbar-color: #FFD700 #0f0f0f;
            scrollbar-width: thin;
          }
          .swiftdeed-yellow-scroll::-webkit-scrollbar {
            width: 14px;
            height: 14px;
            background: #0f0f0f;
          }
          .swiftdeed-yellow-scroll::-webkit-scrollbar-track {
            background: #0f0f0f;
            border: 0.5px solid #FFD700;
          }
          .swiftdeed-yellow-scroll::-webkit-scrollbar-thumb {
            background: #111;
            border: 1px solid #FFD700;
            border-radius: 999px;
          }
          .swiftdeed-yellow-scroll::-webkit-scrollbar-button {
            width: 14px;
            height: 14px;
            background: #0f0f0f;
            border: 0.5px solid #FFD700;
          }
        `}</style>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 24, fontWeight: 500, color: '#fff', marginBottom: 6 }}>Documents</div>
          <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>Select a loan to view its documents. Payoff statements can be generated once a loan is selected.</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: shellNarrow ? '1fr' : '270px minmax(0, 1fr)', border: '0.5px solid #252525', borderRadius: 10, overflow: 'hidden', background: '#0f0f0f', minHeight: shellNarrow ? 520 : 'calc(100vh - 265px)' }}>
          <div style={{ borderRight: shellNarrow ? 'none' : '0.5px solid #252525', borderBottom: shellNarrow ? '0.5px solid #252525' : 'none', minWidth: 0 }}>
            <div style={{ padding: 12, borderBottom: '0.5px solid #252525' }}>
              <label style={{ display: 'block', color: '#555', fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 7 }}>Search loan ID</label>
              <input
                value={docSearch}
                onChange={e => setDocSearch(e.target.value)}
                placeholder="SD-2026..."
                style={{ width: '100%', background: '#111', border: '0.5px solid #2a2a2a', borderRadius: 7, color: '#ccc', fontSize: 12, padding: '8px 9px', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 12 }}
              />
              <label style={{ display: 'block', color: '#555', fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 7 }}>Sort loans</label>
              <select value={docSort} onChange={e => setDocSort(e.target.value)} style={{ width: '100%', background: '#111', border: '0.5px solid #2a2a2a', borderRadius: 7, color: '#ccc', fontSize: 12, padding: '8px 9px', fontFamily: 'inherit' }}>
                <option value="recent">Recent activity</option>
                <option value="borrower">Borrower A-Z</option>
                <option value="maturity">Maturity date</option>
                <option value="delinquency">Delinquency</option>
                <option value="most_docs">Most documents</option>
                <option value="no_docs">No documents</option>
              </select>
            </div>
            <div className="swiftdeed-doc-loan-list" style={{ height: shellNarrow ? 260 : 'calc(100vh - 418px)', minHeight: shellNarrow ? 0 : 455, overflowY: 'auto' }}>
              {sortedDocumentLoans.length === 0 ? (
                <div style={{ color: '#555', fontSize: 12, padding: 14 }}>No loan IDs match.</div>
              ) : sortedDocumentLoans.map(loan => {
                const loanId = loanDocId(loan);
                const active = loanDocId(loan) === loanDocId(selectedDocLoan);
                const overdueDays = daysPastDue(loan);
                return (
                  <button key={loanId} onClick={() => setSelectedDocLoanId(loanId)} onMouseEnter={() => setHoveredDocLoan(loanId)} onMouseLeave={() => setHoveredDocLoan(null)} style={{ width: '100%', background: active ? '#151515' : hoveredDocLoan === loanId ? '#121212' : 'transparent', border: 'none', borderLeft: active ? '3px solid #FFD700' : '3px solid transparent', borderBottom: '0.5px solid #1c1c1c', padding: active ? '11px 12px 11px 9px' : '11px 12px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.12s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ color: '#FFD700', fontSize: 11, fontFamily: 'monospace' }}>{loanId}</span>
                    </div>
                    <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loan.borrower_name || '-'}</div>
                    <div style={{ color: '#555', fontSize: 12, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loan.property_address || '-'}</div>
                    {overdueDays > 0 && <div style={{ display: 'inline-flex', marginTop: 7, color: overdueDays > 60 ? '#f87171' : '#FFD700', background: overdueDays > 60 ? '#2a1010' : '#221c00', border: `0.5px solid ${overdueDays > 60 ? '#552020' : '#4a3900'}`, borderRadius: 5, padding: '2px 6px', fontSize: 10 }}>{overdueDays} days overdue</div>}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ minWidth: 0, padding: shellNarrow ? 16 : 18 }}>
            <div className="swiftdeed-yellow-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', borderBottom: '0.5px solid #252525', marginBottom: 16 }}>
              {[
                ['payoff', 'Payoff Statements'],
                ['loan', 'Loan Docs'],
                ['monthly', 'Monthly Statements'],
                ['yearend', 'Year-End Docs'],
              ].map(([id, label]) => (
                <button key={id} onClick={() => setDocTab(id)} onMouseEnter={() => setHoveredDocTab(id)} onMouseLeave={() => setHoveredDocTab(null)} style={{ background: hoveredDocTab === id && docTab !== id ? '#141414' : 'transparent', border: 'none', borderBottom: docTab === id ? '2px solid #FFD700' : '2px solid transparent', color: docTab === id ? '#FFD700' : hoveredDocTab === id ? '#ddd' : '#777', padding: '10px 12px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'background 0.12s, color 0.12s' }}>{label}</button>
              ))}
            </div>
            {docTab === 'yearend' ? (
              <>
                <div style={{ paddingBottom: 14, borderBottom: '0.5px solid #252525', marginBottom: 14 }}>
                  <div style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>Annual documents across your full portfolio</div>
                  <div style={{ color: '#555', fontSize: 12, marginTop: 4 }}>These year-end documents are collective across every active loan.</div>
                </div>
                <div style={{ color: '#555', fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>{yearEndRecords.length} annual document{yearEndRecords.length === 1 ? '' : 's'}</div>
                <div style={{ borderTop: '0.5px solid #1c1c1c' }}>{yearEndRecords.map(documentRow)}</div>
              </>
            ) : selectedDocLoan ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: shellNarrow ? '1fr' : 'minmax(0, 1fr) auto', gap: 14, alignItems: 'start', paddingBottom: 14, borderBottom: '0.5px solid #252525', marginBottom: 14 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>{selectedDocLoan.borrower_name || '-'}</div>
                    <div style={{ color: '#FFD700', fontSize: 12, fontFamily: 'monospace', marginTop: 3 }}>{loanDocId(selectedDocLoan)}</div>
                    <div style={{ color: '#555', fontSize: 12, marginTop: 3 }}>{selectedDocLoan.property_address || '-'}</div>
                  </div>
                  {docTab === 'payoff' && <button onClick={() => openPayoffModal(selectedDocLoan)} onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 14px rgba(255, 215, 0, 0.38)'} onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'} style={{ background: '#FFD700', color: '#0f0f0f', border: 'none', borderRadius: 7, padding: '10px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'box-shadow 0.12s' }}>Generate payoff statement -&gt;</button>}
                </div>
                <div style={{ color: '#555', fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>{selectedDocRecords.length ? `${selectedDocRecords.length} ${docTab === 'payoff' ? 'payoff statement' : 'document'}${selectedDocRecords.length === 1 ? '' : 's'}` : `No ${docTab === 'payoff' ? 'payoff statements' : 'documents'} yet`}</div>
                {selectedDocRecords.length === 0 ? (
                  <div style={{ ...s.empty, borderRadius: 9, border: '0.5px solid #252525' }}>{docTab === 'payoff' ? 'Generate a payoff statement for this loan when needed.' : 'No documents on file for this category.'}</div>
                ) : (
                  <div style={{ borderTop: '0.5px solid #1c1c1c' }}>{selectedDocRecords.map(documentRow)}</div>
                )}
              </>
            ) : (
              <div style={{ ...s.empty, borderRadius: 9, border: '0.5px solid #252525' }}>Select a loan to view documents.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const servicingLineItems = (activeLoans.length ? activeLoans : requests).slice(0, 10).map(loan => ({
    type: 'Loan servicing',
    details: `${loan.loan_id_internal || loan.loan_id || '-'} - ${loan.borrower_name || 'Borrower'}`,
    amount: 35,
  }));
  const payoffLineItems = requests
    .filter(loan => loan.payoff_statement_url)
    .slice(0, 2)
    .map(loan => ({
      type: 'Payoff statement',
      details: `${loan.loan_id_internal || loan.loan_id || '-'} - ${loan.borrower_name || 'Borrower'}`,
      amount: 30,
    }));
  const invoiceRows = [
    {
      id: 'may-2026',
      month: 'May',
      year: '2026',
      status: 'due',
      badge: 'Due Jun 1',
      servicing: servicingLineItems,
      additional: payoffLineItems.length ? payoffLineItems : [
        { type: 'Payoff statement', details: 'SD-2026-7782 - K. Patel', amount: 30 },
        { type: 'Payoff statement', details: 'SD-2026-4421 - J. Martinez', amount: 30 },
      ],
    },
    { id: 'apr-2026', month: 'April', year: '2026', status: 'paid', badge: 'Paid', servicingCount: 10, payoffCount: 1, total: 380 },
    { id: 'mar-2026', month: 'March', year: '2026', status: 'paid', badge: 'Paid', servicingCount: 10, payoffCount: 0, total: 350 },
    { id: 'feb-2026', month: 'February', year: '2026', status: 'paid', badge: 'Paid', servicingCount: 8, payoffCount: 0, total: 280 },
  ].map(row => {
    const servicingTotal = row.servicing ? row.servicing.reduce((sum, item) => sum + item.amount, 0) : (row.servicingCount || 0) * 35;
    const additionalTotal = row.additional ? row.additional.reduce((sum, item) => sum + item.amount, 0) : (row.payoffCount || 0) * 30;
    const lineCount = row.servicing ? row.servicing.length + row.additional.length : (row.servicingCount || 0) + (row.payoffCount || 0);
    return { ...row, servicingTotal, additionalTotal, lineCount, total: row.total || servicingTotal + additionalTotal };
  });
  const filteredInvoices = invoiceRows.filter(invoice => (
    invoice.year === invoiceYear &&
    (invoiceStatus === 'all' || invoice.status === invoiceStatus)
  ));
  const invoiceYears = Array.from(new Set(invoiceRows.map(invoice => invoice.year)));
  const invoicePill = (active) => ({
    background: active ? '#1e1a00' : '#161616',
    border: `0.5px solid ${active ? 'rgba(255,215,0,0.45)' : '#2a2a2a'}`,
    color: active ? '#FFD700' : '#777',
    borderRadius: 999,
    padding: '6px 14px',
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  });
  const invoiceLineTable = (title, items, totalLabel = 'Subtotal') => (
    <>
      <div style={{ color: '#FFD700', fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', padding: '12px 0 8px' }}>{title}</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520, tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '34%' }} />
            <col style={{ width: '48%' }} />
            <col style={{ width: '18%' }} />
          </colgroup>
          <thead>
            <tr>
              {['Service type', 'Details', 'Amount'].map((heading, i) => (
                <th key={heading} style={{ color: '#555', fontSize: 10, letterSpacing: 0.7, textTransform: 'uppercase', padding: '6px 0', borderBottom: '0.5px solid #252525', textAlign: i === 2 ? 'right' : 'left' }}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={`${item.details}-${index}`}>
                <td style={{ color: '#888', fontSize: 12, padding: '8px 0', borderBottom: '0.5px solid #1c1c1c' }}>{item.type}</td>
                <td style={{ color: '#888', fontSize: 12, padding: '8px 0', borderBottom: '0.5px solid #1c1c1c' }}>{item.details}</td>
                <td style={{ color: '#aaa', fontSize: 12, padding: '8px 0', borderBottom: '0.5px solid #1c1c1c', textAlign: 'right' }}>{formatCurrency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 11, borderTop: '0.5px solid #333', marginTop: 4 }}>
        <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{totalLabel}</span>
        <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{formatCurrency(items.reduce((sum, item) => sum + item.amount, 0))}</span>
      </div>
    </>
  );
  const downloadInvoicePDF = async (invoice, event) => {
    event.stopPropagation();
    try {
      const response = await fetch('/api/generate-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice,
          lender: {
            name: user?.fullName || user?.primaryEmailAddress?.emailAddress || '',
            email: user?.primaryEmailAddress?.emailAddress || '',
          },
        }),
      });
      if (!response.ok) throw new Error('Invoice download failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoice.id || 'swiftdeed-invoice'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(error.message || 'Unable to download invoice.');
    }
  };
  const invoicesView = (
    <div style={{ padding: contentPad }}>
      <div style={{ ...contentWrap, maxWidth: 1160 }}>
        <div style={{ fontSize: 24, fontWeight: 500, color: '#fff', marginBottom: 22 }}>Invoices</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 22 }}>
          <span style={{ color: '#555', fontSize: 12 }}>Year</span>
          {invoiceYears.map(year => (
            <button key={year} onClick={() => setInvoiceYear(year)} style={invoicePill(invoiceYear === year)}>{year}</button>
          ))}
          <span style={{ width: 1, height: 22, background: '#2a2a2a', margin: '0 4px' }} />
          <span style={{ color: '#555', fontSize: 12 }}>Status</span>
          {[
            ['all', 'All'],
            ['paid', 'Paid'],
            ['due', 'Unpaid'],
          ].map(([id, label]) => (
            <button key={id} onClick={() => setInvoiceStatus(id)} style={invoicePill(invoiceStatus === id)}>{label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {filteredInvoices.length === 0 ? (
            <div style={{ ...s.empty, border: '0.5px solid #252525', borderRadius: 9 }}>No invoices found.</div>
          ) : filteredInvoices.map(invoice => {
            const open = openInvoiceId === invoice.id;
            return (
              <div key={invoice.id} style={{ background: '#161616', border: '0.5px solid #252525', borderRadius: 8, overflow: 'hidden' }}>
                <button onClick={() => setOpenInvoiceId(open ? '' : invoice.id)} style={{ width: '100%', display: 'grid', gridTemplateColumns: shellNarrow ? '1fr auto' : '80px minmax(0, 1fr) auto auto auto auto', gap: 14, alignItems: 'center', background: 'transparent', border: 'none', padding: '14px 16px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                  <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>{invoice.month}<br />{invoice.year}</div>
                  <div style={{ color: '#555', fontSize: 11, gridColumn: shellNarrow ? '1 / -1' : 'auto' }}>{invoice.lineCount} line items - {(invoice.servicing?.length || invoice.servicingCount || 0)} loans{(invoice.additional?.length || invoice.payoffCount || 0) ? ` + ${(invoice.additional?.length || invoice.payoffCount)} payoff statement${(invoice.additional?.length || invoice.payoffCount) === 1 ? '' : 's'}` : ''}</div>
                  <span style={{ justifySelf: shellNarrow ? 'start' : 'auto', background: invoice.status === 'paid' ? 'rgba(22,101,52,0.3)' : 'rgba(255,215,0,0.15)', color: invoice.status === 'paid' ? '#4ade80' : '#FFD700', borderRadius: 999, padding: '4px 12px', fontSize: 11, fontWeight: 700 }}>{invoice.badge}</span>
                  <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>{formatCurrency(invoice.total)}</span>
                  <span onClick={(event) => downloadInvoicePDF(invoice, event)} style={{ color: '#FFD700', fontSize: 12, whiteSpace: 'nowrap', cursor: 'pointer' }}>View -&gt;</span>
                  <span style={{ color: '#555', fontSize: 16 }}>{open ? '⌃' : '⌄'}</span>
                </button>
                {open && (
                  <div style={{ borderTop: '0.5px solid #1e1e1e', padding: '0 16px 16px' }}>
                    {invoice.servicing?.length ? invoiceLineTable(`Loan servicing - ${invoice.servicing.length} loans @ $35.00`, invoice.servicing) : null}
                    {invoice.additional?.length ? (
                      <>
                        <hr style={{ border: 'none', borderTop: '0.5px solid #1e1e1e', margin: '12px 0' }} />
                        {invoiceLineTable('Additional line items', invoice.additional, 'Total')}
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const loanColumns = [
    { key: 'loan_id', label: 'Loan ID', sortable: false },
    { key: 'borrower', label: 'Borrower', sortable: true },
    { key: 'city', label: 'City', sortable: true },
    { key: 'state', label: 'State', sortable: true },
    { key: 'maturity', label: 'Maturity', sortable: true },
    { key: 'rate', label: 'Rate', sortable: true },
    { key: 'original_balance', label: 'Orig. Bal.', sortable: true },
    { key: 'current_balance', label: 'Curr. Bal.', sortable: true },
    { key: 'next_payment_date', label: 'Next Pmt', sortable: true },
    { key: 'next_payment_amount', label: 'Next Amt', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
  ];
  const toggleSort = (column) => {
    if (!column.sortable) return;
    setSortConfig(prev => ({
      key: column.key,
      direction: prev.key === column.key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
    setPage(1);
  };
  const sortMarker = (column) => {
    if (!column.sortable) return '';
    if (sortConfig.key !== column.key) return ' ↕';
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };
  const statusBadge = (request) => {
    const bucket = statusBucket(request);
    const isCurrent = bucket === 'Current';
    const isMinor = bucket === '1-30 days';
    const isSerious = bucket === '31-60 days' || bucket === '60+ days' || bucket === 'Default' || bucket === 'Past maturity';
    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      color: isCurrent ? '#34d399' : isMinor ? '#FFD700' : isSerious ? '#f87171' : '#777',
      whiteSpace: 'nowrap',
    };
  };

  const loansView = (
    <div style={{ padding: contentPad }}>
      <div style={{ ...contentWrap, maxWidth: 'none' }}>
      <style>{`
        .swiftdeed-table-scroll { scrollbar-color: #FFD700 #0f0f0f; scrollbar-width: thin; }
        .swiftdeed-table-scroll::-webkit-scrollbar { height: 14px; background: #0f0f0f; }
        .swiftdeed-table-scroll::-webkit-scrollbar-track { background: #0f0f0f; border-top: 0.5px solid #FFD700; border-bottom: 0.5px solid #FFD700; }
        .swiftdeed-table-scroll::-webkit-scrollbar-thumb { background: #111; border: 1px solid #FFD700; border-radius: 999px; }
        .swiftdeed-table-scroll::-webkit-scrollbar-button { width: 14px; background: #0f0f0f; border: 0.5px solid #FFD700; }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 500, color: '#fff', marginBottom: 6 }}>Loans</div>
          <div style={{ fontSize: 13, color: loanFilter.accent }}>{sorted.length} {loanFilter.label.toLowerCase()}</div>
        </div>
        <button style={{ ...s.serviceBtn, marginLeft: 0, padding: '10px 18px' }} onClick={onSubmitRequest} {...hovSolid}>Onboard a loan</button>
      </div>

      <div className="swiftdeed-table-scroll" style={{ width: '100%', minWidth: 0, maxWidth: '100%', border: '0.5px solid #252525', borderRadius: 9, overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch', background: '#111', boxSizing: 'border-box', boxShadow: 'inset 0 0 0 0.5px #1f1f1f' }}>
        <div style={{ width: '100%', minWidth: tableInnerMinWidth }}>
          <div style={{ display: 'flex', gap: 10, padding: 14, borderBottom: '0.5px solid #222', alignItems: 'stretch' }}>
            <input style={{ ...s.searchInput, maxWidth: 420, height: 42, boxSizing: 'border-box' }} placeholder="Search loan ID, borrower, city, state, balance..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: LOAN_TABLE_COLS, gap: 8, padding: '11px 14px', borderBottom: '0.5px solid #222', fontSize: 10, color: '#FFD700', textTransform: 'uppercase', letterSpacing: 0.7, background: '#111' }}>
            {loanColumns.map(column => (
              <button
                key={column.key}
                onClick={() => toggleSort(column)}
                style={{ background: 'transparent', border: 'none', color: '#FFD700', padding: 0, textAlign: 'left', fontFamily: 'inherit', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.7, cursor: column.sortable ? 'pointer' : 'default', whiteSpace: 'nowrap' }}
              >
                {column.label}{sortMarker(column)}
              </button>
            ))}
          </div>

          {loading && <div style={s.empty}>Loading your loans...</div>}
          {!loading && sorted.length === 0 && <div style={s.empty}>{searchTerm ? 'No results found.' : `No loans match ${loanFilter.label.toLowerCase()}.`}</div>}

          {!loading && paginated.map(r => {
            const b = getBorrower(r);
            const loc = parseLocation(r);
            const isHov = hoveredId === r.id;
            const originalBalance = b.original_loan_amount || r.original_loan_amount || r.total_due;
            const currentBalance = b.principal_balance || r.total_due;
            const days = daysPastDue(r);
            const bucket = statusBucket(r);
            return (
              <div key={r.id}
                style={{ display: 'grid', gridTemplateColumns: LOAN_TABLE_COLS, gap: 8, minHeight: 44, padding: '0 14px', borderBottom: '0.5px solid #1b1b1b', alignItems: 'center', fontSize: 12, cursor: 'pointer', background: isHov ? '#171717' : '#111', boxShadow: isHov ? `inset 4px 0 0 ${loanFilter.accent}` : 'none', transition: 'background 0.1s, box-shadow 0.1s' }}
                onClick={() => setSelected(r)}
                onMouseEnter={() => setHoveredId(r.id)}
                onMouseLeave={() => setHoveredId(null)}>
                <span style={{ color: '#777', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.loan_id_internal || r.loan_id || '-'}</span>
                <span style={{ color: '#fff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.borrower_name || '-'}</span>
                <span style={{ color: '#777', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loc.city}</span>
                <span style={{ color: '#777' }}>{loc.state}</span>
                <span style={{ color: '#e0d8c8' }}>{formatDate(b.maturity_date || r.maturity_date)}</span>
                <span style={{ color: '#777' }}>{b.interest_rate || r.interest_rate ? `${b.interest_rate || r.interest_rate}%` : '-'}</span>
                <span style={{ color: '#777' }}>{formatCurrency(originalBalance)}</span>
                <span style={{ color: '#f0f0f0', fontWeight: 500 }}>{formatCurrency(currentBalance)}</span>
                <span style={{ color: '#e0d8c8' }}>{formatDate(b.next_payment_date)}</span>
                <span style={{ color: '#f0f0f0' }}>{formatCurrency(b.monthly_payment)}</span>
                <span style={statusBadge(r)}><span style={{ fontSize: 16, lineHeight: 0 }}>•</span>{days > 0 ? `${days} days past due` : bucket}</span>
              </div>
            );
          })}
        </div>
      </div>
      {!loading && sorted.length > PAGE_SIZE && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', border: '0.5px solid #252525', borderTop: 'none', borderRadius: '0 0 9px 9px', background: '#111' }}>
          <button style={{ background: 'transparent', border: `0.5px solid ${page === 1 ? '#2a2a2a' : '#FFD700'}`, borderRadius: 5, color: page === 1 ? '#333' : '#fff', fontSize: 12, padding: '6px 14px', cursor: page === 1 ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
          <span style={{ fontSize: 12, color: '#555' }}>Page {safePage} of {totalPages} - {sorted.length} total</span>
          <button style={{ background: 'transparent', border: `0.5px solid ${page === totalPages ? '#2a2a2a' : '#FFD700'}`, borderRadius: 5, color: page === totalPages ? '#333' : '#fff', fontSize: 12, padding: '6px 14px', cursor: page === totalPages ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}
      </div>
    </div>
  );

  const detailView = selected ? (
    <LoanDetail
      selected={selected}
      liveData={liveData}
      liveLoading={liveLoading}
      loanPayments={loanPayments}
      docUrls={docUrls}
      docSuccess={docSuccess}
      uploadingDocs={uploadingDocs}
      pendingDocProcess={pendingDocProcess}
      processingDocs={processingDocs}
      clearingLoanData={clearingLoanData}
      docFileRef={docFileRef}
      lenderEmail={email}
      lenderName={lenderName}
      borrowerEmails={borrowerEmails}
      paymentSuccess={paymentSuccess}
      onBack={() => { setSelected(null); setLiveData(null); setLoanPayments([]); setDocUrls([]); setPaymentSuccess(false); setActiveView('loans'); }}
      onRecordPayment={() => { setPaymentSuccess(false); setShowPaymentModal(true); }}
      onRemoveDoc={handleRemoveDoc}
      onUploadDocs={handleUploadDocs}
      onProcessDocs={handleProcessUploadedDocs}
      onClearLoanData={handleClearLoanData}
      onDeleteLoan={() => { setShowDeleteModal(true); setDeleteConfirmText(''); }}
      onViewDocuments={openLoanDocuments}
      onGeneratePayoff={openPayoffModal}
    />
  ) : null;

  const mainView = selected
    ? detailView
    : activeView === 'dashboard' ? dashboardView
    : activeView === 'loans' ? loansView
    : activeView === 'documents' ? documentsView
    : activeView === 'invoices' ? invoicesView
    : activeView === 'settings' ? settingsView
    : placeholder('Settings');

  return (
    <div style={{ display: shellNarrow ? 'block' : 'grid', gridTemplateColumns: shellNarrow ? '1fr' : '238px minmax(0, 1fr)', minHeight: 'calc(100vh - 65px)', background: '#0f0f0f' }}>
      <style>{`
        .swiftdeed-portal-nav-scroll {
          scrollbar-color: #FFD700 #0f0f0f;
          scrollbar-width: thin;
        }
        .swiftdeed-portal-nav-scroll::-webkit-scrollbar {
          height: 12px;
          background: #0f0f0f;
        }
        .swiftdeed-portal-nav-scroll::-webkit-scrollbar-track {
          background: #0f0f0f;
          border-top: 0.5px solid #FFD700;
          border-bottom: 0.5px solid #FFD700;
        }
        .swiftdeed-portal-nav-scroll::-webkit-scrollbar-thumb {
          background: #111;
          border: 1px solid #FFD700;
          border-radius: 999px;
        }
        .swiftdeed-portal-nav-scroll::-webkit-scrollbar-button {
          width: 12px;
          background: #0f0f0f;
          border: 0.5px solid #FFD700;
        }
        .swiftdeed-settings-primary,
        .swiftdeed-settings-secondary {
          transition: box-shadow 0.15s, background 0.15s, color 0.15s, border-color 0.15s;
        }
        .swiftdeed-settings-primary:hover {
          box-shadow: 0 0 14px rgba(255, 215, 0, 0.36);
        }
        .swiftdeed-settings-secondary:hover {
          color: #fff !important;
          border-color: #FFD700 !important;
          background: #171717 !important;
        }
      `}</style>
      <aside style={{ background: '#0b0b0b', borderRight: shellNarrow ? 'none' : '0.5px solid #222', borderBottom: shellNarrow ? '0.5px solid #222' : 'none', minHeight: shellNarrow ? 'auto' : 'calc(100vh - 65px)', height: shellNarrow ? 'auto' : 'calc(100vh - 65px)', position: shellNarrow ? 'static' : 'sticky', top: shellNarrow ? 'auto' : 65, alignSelf: 'start', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: shellNarrow ? '14px 22px 8px' : `24px 18px 34px ${sidebarGutter}px`, borderBottom: shellNarrow ? 'none' : '0.5px solid #1d1d1d' }}>
          <div style={{ color: '#FFD700', fontSize: 12, fontWeight: 500, letterSpacing: 0.6, textTransform: 'uppercase' }}>Lender Portal</div>
        </div>
        <nav className={shellNarrow && !shellTiny ? 'swiftdeed-portal-nav-scroll' : undefined} style={{ padding: shellNarrow ? '0 22px 14px' : '18px 0', flex: shellNarrow ? 'none' : 1, display: shellNarrow ? (shellTiny ? 'grid' : 'flex') : 'block', gridTemplateColumns: shellTiny ? 'repeat(2, minmax(0, 1fr))' : undefined, gap: shellNarrow ? 8 : 0, overflowX: shellNarrow && !shellTiny ? 'auto' : 'visible', WebkitOverflowScrolling: 'touch' }}>
          {navItem('dashboard', 'Dashboard', loansNeedingAttentionCount)}
          {navItem('loans', 'Loans')}
          {navItem('documents', 'Documents')}
          {navItem('invoices', 'Invoices')}
        </nav>
        {!shellNarrow && <div style={{ padding: '16px 10px', borderTop: '0.5px solid #1d1d1d' }}>{navItem('settings', 'Settings')}</div>}
      </aside>
      <main style={{ minWidth: 0 }}>
        {mainView}
      </main>
      {modals}
    </div>
  );
}
