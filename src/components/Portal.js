import { useEffect, useState, useRef } from 'react';
import { calculatePayment } from '../utils/calculatePayment';
import { useUser } from '@clerk/clerk-react';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

function formatDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '-';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

//  Loan Detail Page 
function LoanDetail({ selected, liveData, liveLoading, loanPayments, docUrls, docSuccess, uploadingDocs, docFileRef, lenderEmail, lenderName, borrowerEmails, onBack, onRecordPayment, onRemoveDoc, onUploadDocs, onDeleteLoan, paymentSuccess }) {
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
                {['Date', 'Amount', 'Interest', 'Principal', 'Balance'].map(h => (
                  <th key={h} style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 0.8, padding: '8px 10px', textAlign: h === 'Date' ? 'left' : 'right', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayPayments.map((p, i) => (
                <tr key={p.id || i} style={{ borderBottom: '0.5px solid #1a1a1a' }}>
                  <td style={{ padding: '10px', fontSize: 12, color: '#777' }}>{p.payment_date ? new Date(p.payment_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}</td>
                  <td style={{ padding: '10px', fontSize: 12, color: '#fff', fontWeight: 500, textAlign: 'right' }}>{formatCurrency(p.amount)}</td>
                  <td style={{ padding: '10px', fontSize: 12, color: '#777', textAlign: 'right' }}>{formatCurrency(p.interest_portion)}</td>
                  <td style={{ padding: '10px', fontSize: 12, color: '#777', textAlign: 'right' }}>{formatCurrency(p.principal_portion)}</td>
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
      {docUrls.length === 0 ? (
        <div style={{ color: '#444', fontSize: 13, padding: '8px 0 12px' }}>No documents on file.</div>
      ) : (
        <div style={{ borderTop: '0.5px solid #1a1a1a' }}>
          {isDocumentsTab && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.7fr) minmax(120px, 0.8fr) minmax(110px, 0.7fr) 150px', gap: 12, padding: '10px 0', borderBottom: '0.5px solid #1a1a1a' }}>
              {['Document', 'Type', 'Uploaded', 'Action'].map(h => <div key={h} style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 0.8 }}>{h}</div>)}
            </div>
          )}
          {docUrls.slice(0, isDocumentsTab ? docUrls.length : 4).map((url, i) => {
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
          <div className="loan-detail-title">{selected.property_address || '-'}</div>
          <div style={{ fontSize: 13, color: '#555' }}>{selected.loan_id_internal || selected.loan_id || '-'} - {selected.borrower_name || '-'}</div>
        </div>
        <div className="loan-detail-actions">
          {selected.payoff_statement_url
            ? <a className="swiftdeed-statement-button" href={selected.payoff_statement_url} target="_blank" rel="noreferrer" style={{ ...secondaryBtn, background: '#FFD700', color: '#0f0f0f', border: 'none', fontWeight: 700 }}>Download statement</a>
            : <button disabled style={{ ...secondaryBtn, color: '#333', borderColor: '#222', cursor: 'not-allowed' }}>No statement</button>
          }
        </div>
      </div>

      <div className="loan-detail-metrics">
        {[
          { label: 'Current balance', value: formatCurrency(balance), gold: true, hint: originalAmount ? `of ${formatCurrency(originalAmount)} original` : '' },
          { label: 'Rate', value: rate ? rate + '%' : '-' },
          { label: 'Per diem', value: perDiem ? formatCurrency(perDiem) : '-' },
          { label: 'Next payment', value: formatDate(nextPaymentDate), hint: monthlyPayment ? `${formatCurrency(monthlyPayment)} due` : '' },
          { label: 'Status', value: paymentStatus || '-', custom: statusColor() },
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
              { k: 'Next payment date', v: formatDate(nextPaymentDate) },
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
  const [requests, setRequests] = useState([]);
  const [borrowerEmails, setBorrowerEmails] = useState({});
  const [borrowerData, setBorrowerData] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [page, setPage] = useState(1);
  const [activeView, setActiveView] = useState('dashboard');
  const [selected, setSelected] = useState(null);
  const [loanFilter, setLoanFilter] = useState({ id: 'all', label: 'All active loans', accent: '#FFD700' });
  const [hoveredAttention, setHoveredAttention] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [hoveredNav, setHoveredNav] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [liveData, setLiveData] = useState(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [lenderName, setLenderName] = useState('');
  const [loanPayments, setLoanPayments] = useState([]);
  const [docUrls, setDocUrls] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [docSuccess, setDocSuccess] = useState('');
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1600);
  const docFileRef = useRef();

  const email = user?.primaryEmailAddress?.emailAddress;

  useEffect(() => {
    setSelected(null);
    setLiveData(null);
    setLoanPayments([]);
    setDocUrls([]);
    setPaymentSuccess(false);
    setActiveView('dashboard');
    setLoanFilter({ id: 'all', label: 'All active loans', accent: '#FFD700' });
    setSearch('');
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
        const res = await fetch(`${SUPABASE_URL}/rest/v1/lenders?email=eq.${encodeURIComponent(email)}&select=company_name&limit=1`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) setLenderName(data[0].company_name || '');
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
          const bRes = await fetch(`${SUPABASE_URL}/rest/v1/borrowers?loan_id_internal=in.(${ids.map(id => `"${id}"`).join(',')})&select=loan_id_internal,borrower_email,principal_balance,next_payment_date,monthly_payment,payment_status,interest_rate,per_diem,original_loan_amount,total_interest_paid,total_payments_made,legal_name,guarantor_name,portal_access,loan_document_urls,last_payment_date,last_payment_amount,maturity_date`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
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

  async function handleRemoveDoc(urlToRemove) {
    const newUrls = docUrls.filter(u => u !== urlToRemove);
    const previousUrls = docUrls;
    setDocUrls(newUrls);
    try {
      const borrowerEmail = borrowerEmails[selected.loan_id_internal] || liveData?.borrower_email;
      const res = await fetch('/api/update-loan-docs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loanIdInternal: selected.loan_id_internal, newDocUrls: newUrls, lenderEmail: email, lenderName, borrowerEmail, borrowerName: selected.borrower_name, docsAdded: false }) });
      if (!res.ok) throw new Error('Document removal failed');
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
      setDocSuccess(`${newUrls.length} document${newUrls.length !== 1 ? 's' : ''} uploaded.`);
      setTimeout(() => setDocSuccess(''), 4000);
    } catch (e) {
      console.error('Upload error:', e);
      setDocSuccess('Could not upload documents. Try again.');
      setTimeout(() => setDocSuccess(''), 5000);
    } finally { setUploadingDocs(false); }
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
    if (raw.includes('default')) return 'Default';
    if (raw.includes('paid')) return 'Paid Off';
    if (raw.includes('late') || raw.includes('missed') || raw.includes('overdue') || raw.includes('past due')) return 'Past Due';
    if (!isNaN(balance) && balance <= 0) return 'Paid Off';
    return 'Active';
  };

  const isNarrowPortfolio = windowWidth < 1280;
  const LOAN_TABLE_COLS = 'minmax(118px, 0.85fr) minmax(130px, 0.95fr) minmax(110px, 0.75fr) 58px minmax(105px, 0.7fr) 64px minmax(105px, 0.7fr) minmax(105px, 0.7fr) minmax(100px, 0.7fr) minmax(95px, 0.65fr) minmax(120px, 0.8fr)';
  const tableInnerMinWidth = 1180;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filterConfig = {
    all: { id: 'all', label: 'All active loans', accent: '#FFD700' },
    received_month: { id: 'received_month', label: 'Received this month', accent: '#FFD700' },
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
    return { city: explicitCity || '-', state: explicitState || '-' };
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
    if (days > 60) return '60+ days';
    if (days >= 31) return '31-60 days';
    if (days >= 1) return '1-30 days';
    return 'Current';
  };
  const statusSeverity = (request) => {
    const bucket = statusBucket(request);
    if (bucket === 'Default') return 5;
    if (bucket === '60+ days') return 4;
    if (bucket === '31-60 days') return 3;
    if (bucket === '1-30 days') return 2;
    if (bucket === 'Current') return 1;
    return 0;
  };
  const isAttentionLoan = (request) => {
    const b = borrowerData[request.loan_id_internal];
    return !b || !b.monthly_payment || isOverdueLoan(request) || getLoanStatus(request) === 'Default';
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
      case 'current': return isActiveLoan(request) && !isOverdueLoan(request);
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

  const sc = { background: '#111', border: '0.5px solid #252525', borderRadius: 9, padding: '22px 24px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' };
  const statCard = (id) => ({
    ...sc,
    background: hoveredCard === id ? '#151515' : '#111',
    borderColor: hoveredCard === id ? '#3a3a3a' : '#252525',
    boxShadow: hoveredCard === id ? 'inset 3px 0 0 #FFD700' : 'none',
    transition: 'background 0.12s, border-color 0.12s, box-shadow 0.12s',
  });
  const sl = { fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 10 };
  const sv = { fontSize: 27, fontWeight: 600, color: '#fff', marginBottom: 6 };
  const ss = { fontSize: 12, color: '#444' };
  const attentionCardStyle = (filter, accent) => ({
    background: hoveredAttention === filter ? '#141414' : '#111',
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
        onClick={() => { setActiveView(id); setSelected(null); if (id === 'loans') setLoansView('all'); }}
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
  const modals = (
    <>
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

      <button onClick={onSubmitRequest} style={{ ...onboardingBanner, width: '100%', textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer' }} {...hovSolid}>
        <span style={onboardingIcon}>+</span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', color: '#fff', fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Onboard a new loan</span>
          <span style={{ display: 'block', color: '#d8d0b8', fontSize: 13, lineHeight: 1.45 }}>Upload your loan documents and SwiftDeed will extract the terms automatically. Live in minutes.</span>
        </span>
        <span style={onboardingCta}>Get started <span aria-hidden="true">-&gt;</span></span>
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: dashboardStatCols, gap: 12, marginBottom: 28 }}>
        <button style={statCard('principal')} onClick={() => setLoansView('all')} onMouseEnter={() => setHoveredCard('principal')} onMouseLeave={() => setHoveredCard(null)}><div style={sl}>Principal Outstanding</div><div style={sv}>{formatCurrency(principalOutstanding)}</div><div style={ss}>{activeLoans.length} active loans</div></button>
        <button style={statCard('received')} onClick={() => setLoansView('received_month')} onMouseEnter={() => setHoveredCard('received')} onMouseLeave={() => setHoveredCard(null)}><div style={sl}>Received This Month</div><div style={{ ...sv, color: '#FFD700' }}>{formatCurrency(receivedThisMonthTotal)}</div><div style={ss}>{receivedThisMonth.length} loans with payments</div></button>
        <button style={statCard('attention')} onClick={() => setLoansView('attention')} onMouseEnter={() => setHoveredCard('attention')} onMouseLeave={() => setHoveredCard(null)}><div style={sl}>Loans Needing Attention</div><div style={{ ...sv, color: loansNeedingAttentionCount > 0 ? '#FFD700' : '#666' }}>{loansNeedingAttentionCount}</div><div style={ss}>Review flagged loans</div></button>
        <button style={statCard('maturing')} onClick={() => setLoansView('maturing_90')} onMouseEnter={() => setHoveredCard('maturing')} onMouseLeave={() => setHoveredCard(null)}><div style={sl}>Maturing Within 90 Days</div><div style={{ ...sv, color: '#FFD700' }}>{maturingSoon.length}</div><div style={ss}>{nextMaturity ? `${formatDate(nextMaturityBorrower.maturity_date || nextMaturity.maturity_date)} - ${formatCurrency(nextMaturityBorrower.principal_balance || nextMaturity.total_due)}` : '-'}</div></button>
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
          { id: 'all', label: 'All Loans', count: activeLoans.length, total: principalOutstanding, accent: '#fff' },
          { id: 'current', label: 'Current', count: currentLoans.length, total: currentLoans.reduce((sum, r) => sum + (parseFloat(getBorrower(r).principal_balance || r.total_due) || 0), 0), accent: '#34d399' },
          { id: 'bucket_1_30', label: '1-30 Days Past Due', count: bucketOne.length, total: bucketOne.reduce((sum, r) => sum + (parseFloat(getBorrower(r).principal_balance || r.total_due) || 0), 0), accent: '#FFD700' },
          { id: 'bucket_31_60', label: '31-60 Days Past Due', count: bucketTwo.length, total: bucketTwo.reduce((sum, r) => sum + (parseFloat(getBorrower(r).principal_balance || r.total_due) || 0), 0), accent: '#f87171' },
          { id: 'bucket_60_plus', label: '60+ Days Past Due', count: bucketThree.length, total: bucketThree.reduce((sum, r) => sum + (parseFloat(getBorrower(r).principal_balance || r.total_due) || 0), 0), accent: '#777' },
        ].map(bucket => (
          <button key={bucket.id} onClick={() => setLoansView(bucket.id)} onMouseEnter={() => setHoveredCard(bucket.id)} onMouseLeave={() => setHoveredCard(null)} style={{ background: hoveredCard === bucket.id ? '#151515' : 'transparent', border: 'none', borderRight: '0.5px solid #222', boxShadow: hoveredCard === bucket.id ? 'inset 3px 0 0 #FFD700' : 'none', padding: '18px 16px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', transition: 'background 0.12s, box-shadow 0.12s' }}>
            <div style={{ ...sl, marginBottom: 8 }}>{bucket.label}</div>
            <div style={{ fontSize: 27, color: bucket.accent, marginBottom: 6 }}>{bucket.count}</div>
            <div style={{ color: '#444', fontSize: 12 }}>{bucket.total ? formatCurrency(bucket.total) : '-'}</div>
          </button>
        ))}
        </div>
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
    const isSerious = bucket === '31-60 days' || bucket === '60+ days' || bucket === 'Default';
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
                style={{ background: 'transparent', border: 'none', color: column.sortable ? '#FFD700' : '#666', padding: 0, textAlign: 'left', fontFamily: 'inherit', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.7, cursor: column.sortable ? 'pointer' : 'default', whiteSpace: 'nowrap' }}
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
      docFileRef={docFileRef}
      lenderEmail={email}
      lenderName={lenderName}
      borrowerEmails={borrowerEmails}
      paymentSuccess={paymentSuccess}
      onBack={() => { setSelected(null); setLiveData(null); setLoanPayments([]); setDocUrls([]); setPaymentSuccess(false); setActiveView('loans'); }}
      onRecordPayment={() => { setPaymentSuccess(false); setShowPaymentModal(true); }}
      onRemoveDoc={handleRemoveDoc}
      onUploadDocs={handleUploadDocs}
      onDeleteLoan={() => { setShowDeleteModal(true); setDeleteConfirmText(''); }}
    />
  ) : null;

  const mainView = selected
    ? detailView
    : activeView === 'dashboard' ? dashboardView
    : activeView === 'loans' ? loansView
    : activeView === 'documents' ? placeholder('Documents')
    : activeView === 'invoices' ? placeholder('Invoices')
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
      `}</style>
      <aside style={{ background: '#0b0b0b', borderRight: shellNarrow ? 'none' : '0.5px solid #222', borderBottom: shellNarrow ? '0.5px solid #222' : 'none', minHeight: shellNarrow ? 'auto' : 'calc(100vh - 65px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
