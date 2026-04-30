import { useEffect, useState, useRef } from 'react';
import { calculatePayment } from '../utils/calculatePayment';
import { useUser } from '@clerk/clerk-react';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '—';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}


const PAGE_SIZE = 15;

const hovSolid = {
  onMouseEnter: e => { e.currentTarget.style.boxShadow = '0 0 16px rgba(255, 215, 0, 0.45)'; },
  onMouseLeave: e => { e.currentTarget.style.boxShadow = 'none'; },
};


const s = {
  page: { padding: '40px 60px', maxWidth: 1600, margin: '0 auto' },
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

// ── Record Payment Modal (unchanged) ──────────────────────────────────────────
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
        <div style={{ fontSize: 12, color: '#555', marginBottom: 24 }}>{borrower.legal_name} · {borrower.loan_id_internal}</div>
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

// ── Loan Detail Page ──────────────────────────────────────────────────────────
function LoanDetail({ selected, liveData, liveLoading, loanPayments, docUrls, docSuccess, uploadingDocs, docFileRef, lenderEmail, lenderName, borrowerEmails, onBack, onRecordPayment, onRemoveDoc, onUploadDocs, onDeleteLoan, paymentSuccess }) {
  const [showAllPayments, setShowAllPayments] = useState(false);

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
  const totalPaid = (principalPaid + parseFloat(totalInterestPaid || 0));
  const panelBorrowerEmail = borrowerEmails[selected.loan_id_internal] || live.borrower_email || selected?.borrower_email || '—';
  const loanType = live.loan_type || selected?.loan_type || '—';
  const monthlyPayment = live.monthly_payment || selected?.monthly_payment;

  const statusColor = () => {
    if (!paymentStatus) return '#555';
    const st = paymentStatus.toLowerCase();
    if (st === 'current' || st === 'on time') return '#34d399';
    if (st === 'late' || st === 'missed' || st === 'overdue') return '#f87171';
    return '#ccc';
  };

  const card = { background: '#141414', border: '0.5px solid #222', borderRadius: 10, padding: '20px 22px' };
  const cardLabel = { fontSize: 10, color: '#FFD700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 };
  const fieldRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '0.5px solid #1a1a1a' };
  const fieldKey = { fontSize: 12, color: '#555' };
  const fieldVal = { fontSize: 12, color: '#ccc', textAlign: 'right' };

  const previewPayments = loanPayments.slice(0, 3);
  const displayPayments = showAllPayments ? loanPayments : previewPayments;

  return (
    <div style={s.page}>
      {/* Back */}
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#E9A800', fontSize: 13, cursor: 'pointer', marginBottom: 20, padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.7'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
        ← My Loans
      </button>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 400, color: '#fff', marginBottom: 4 }}>{selected.property_address || '—'}</div>
        <div style={{ fontSize: 13, color: '#555' }}>{selected.loan_id_internal} · {selected.borrower_name}</div>
      </div>

      {/* Stat bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1, background: '#222', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
        {[
          { label: 'Balance', value: formatCurrency(balance), gold: true },
          { label: 'Rate', value: rate ? rate + '%' : '—' },
          { label: 'Per diem', value: perDiem ? formatCurrency(perDiem) : '—' },
          { label: 'Next payment', value: formatDate(nextPaymentDate) },
          { label: 'Loan status', value: paymentStatus || '—', custom: statusColor() },
        ].map(({ label, value, gold, custom }) => (
          <div key={label} style={{ background: '#141414', padding: '14px 20px' }}>
            <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 }}>{label}</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: gold ? '#E9A800' : custom || '#e0d8c8' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* 3 cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
        {/* Borrower */}
        <div style={card}>
          <div style={cardLabel}>Borrower</div>
          {[
            { k: 'Legal name', v: live.legal_name || selected.borrower_name || '—' },
            { k: 'Guarantor', v: live.guarantor_name || selected.guarantor_name || '—' },
            { k: 'Email', v: panelBorrowerEmail, link: true },
            { k: 'Property', v: selected.property_address || '—' },
            { k: 'Portal access', v: live.portal_access || 'Active', green: true },
          ].map(({ k, v, link, green }) => (
            <div key={k} style={{ ...fieldRow }}>
              <span style={fieldKey}>{k}</span>
              <span style={{ ...fieldVal, color: link ? '#5b9bd5' : green ? '#34d399' : '#ccc', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Loan details */}
        <div style={card}>
          <div style={cardLabel}>Loan details {liveLoading && <span style={{ fontSize: 10, color: '#444', fontStyle: 'italic', textTransform: 'none', letterSpacing: 0 }}>updating...</span>}</div>
          {[
            { k: 'Origination date', v: formatDate(loanStart) },
            { k: 'Maturity date', v: formatDate(maturity) },
            { k: 'Loan type', v: loanType.replace('_', ' ') },
            { k: 'Original amount', v: formatCurrency(originalAmount) },
            { k: 'Monthly payment', v: formatCurrency(monthlyPayment) },
          ].map(({ k, v }) => (
            <div key={k} style={fieldRow}><span style={fieldKey}>{k}</span><span style={fieldVal}>{v}</span></div>
          ))}
        </div>

        {/* Loan breakdown */}
        <div style={card}>
          <div style={cardLabel}>Loan breakdown</div>
          {[
            { k: 'Original amount', v: formatCurrency(originalAmount) },
            { k: 'Principal remaining', v: formatCurrency(balance), gold: true },
            { k: 'Principal paid', v: formatCurrency(principalPaid) },
            { k: 'Interest paid to date', v: formatCurrency(totalInterestPaid) },
            { k: 'Total paid', v: formatCurrency(totalPaid) },
          ].map(({ k, v, gold }) => (
            <div key={k} style={fieldRow}><span style={fieldKey}>{k}</span><span style={{ ...fieldVal, color: gold ? '#E9A800' : '#ccc' }}>{v}</span></div>
          ))}
        </div>
      </div>

      {/* Bottom 3-card row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 40 }}>

        {/* Payment history */}
        <div style={{ background: '#141414', border: '0.5px solid #222', borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 22px', borderBottom: '0.5px solid #1e1e1e' }}>
            <span style={{ fontSize: 10, color: '#FFD700', textTransform: 'uppercase', letterSpacing: 1 }}>Payment history</span>
            {loanPayments.length > 3 && (
              <button onClick={() => setShowAllPayments(p => !p)} style={{ background: 'none', border: 'none', color: '#E9A800', fontSize: 12, cursor: 'pointer', padding: 0 }}>
                {showAllPayments ? 'Show less' : `View all ${loanPayments.length}`}
              </button>
            )}
          </div>
          {loanPayments.length === 0 ? (
            <div style={{ padding: '24px 22px', color: '#333', fontSize: 13 }}>No payments recorded yet.</div>
          ) : (
            <div style={{ overflowY: 'auto', maxHeight: 280, scrollbarWidth: 'thin', scrollbarColor: '#E9A800 #1a1a1a' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '0.5px solid #1e1e1e' }}>
                    {['Date', 'Amount', 'Balance'].map(h => (
                      <th key={h} style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 0.7, padding: '8px 16px', textAlign: h === 'Date' ? 'left' : 'right', fontWeight: 400 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayPayments.map((p, i) => (
                    <tr key={p.id || i} style={{ borderBottom: '0.5px solid #1a1a1a' }}>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: '#555' }}>{p.payment_date ? new Date(p.payment_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: '#fff', fontWeight: 500, textAlign: 'right' }}>{formatCurrency(p.amount)}</td>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: '#888', textAlign: 'right' }}>{formatCurrency(p.principal_balance_after)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Documents */}
        <div style={{ background: '#141414', border: '0.5px solid #222', borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 22px', borderBottom: '0.5px solid #1e1e1e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#FFD700', textTransform: 'uppercase', letterSpacing: 1 }}>Documents</span>
            {docSuccess && <span style={{ fontSize: 11, color: '#34d399' }}>✓ {docSuccess}</span>}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 260, scrollbarWidth: 'thin', scrollbarColor: '#E9A800 #1a1a1a' }}>
            {docUrls.length === 0 ? (
              <div style={{ padding: '20px 22px', color: '#333', fontSize: 13 }}>No documents on file.</div>
            ) : docUrls.map((url, i) => {
              const name = decodeURIComponent(url.split('/').pop()).replace(/^\d+_/, '').replace(/[-_]/g, ' ').replace('.pdf', '').trim();
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 22px', borderBottom: '0.5px solid #1a1a1a' }}>
                  <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none', flex: 1 }}
                    onMouseEnter={e => e.currentTarget.style.color = '#FFD700'} onMouseLeave={e => e.currentTarget.style.color = '#ccc'}>
                    {name || `Document ${i + 1}`}
                  </a>
                  <span style={{ fontSize: 14, color: '#555', cursor: 'pointer', marginLeft: 12, flexShrink: 0 }} onClick={() => onRemoveDoc(url)}
                    onMouseEnter={e => e.currentTarget.style.color = '#f87171'} onMouseLeave={e => e.currentTarget.style.color = '#555'}>✕</span>
                </div>
              );
            })}
          </div>
          <div style={{ padding: '14px 22px', borderTop: '0.5px solid #1e1e1e' }}>
            <input ref={docFileRef} type="file" accept="application/pdf" multiple style={{ display: 'none' }} onChange={e => onUploadDocs(e.target.files)} />
            <button onClick={() => docFileRef.current.click()} disabled={uploadingDocs} style={{ width: '100%', background: 'transparent', color: uploadingDocs ? '#555' : '#fff', fontSize: 13, padding: '8px', borderRadius: 6, border: '0.5px solid #FFD700', cursor: uploadingDocs ? 'not-allowed' : 'pointer', transition: 'all 0.15s', opacity: uploadingDocs ? 0.6 : 1 }}
              onMouseEnter={e => { if (!uploadingDocs) { e.currentTarget.style.background = '#1e1a00'; e.currentTarget.style.color = '#FFD700'; } }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff'; }}>
              {uploadingDocs ? 'Uploading...' : '+ Upload documents'}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div style={{ background: '#141414', border: '0.5px solid #222', borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 22px', borderBottom: '0.5px solid #1e1e1e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#FFD700', textTransform: 'uppercase', letterSpacing: 1 }}>Actions</span>
            {paymentSuccess && <span style={{ fontSize: 11, color: '#34d399' }}>✓ Payment recorded</span>}
          </div>
          <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
            <button onClick={onRecordPayment} style={{ width: '100%', background: 'transparent', color: '#fff', fontSize: 13, fontWeight: 500, padding: '10px', borderRadius: 6, border: '0.5px solid #FFD700', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#1e1a00'; e.currentTarget.style.color = '#FFD700'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff'; }}>
              Record payment
            </button>
            {selected.payoff_statement_url
              ? <a href={selected.payoff_statement_url} target="_blank" rel="noreferrer" style={{ width: '100%', background: 'transparent', color: '#fff', fontSize: 13, fontWeight: 500, padding: '10px', borderRadius: 6, border: '0.5px solid #FFD700', cursor: 'pointer', textDecoration: 'none', textAlign: 'center', display: 'block', boxSizing: 'border-box', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#1e1a00'; e.currentTarget.style.color = '#FFD700'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff'; }}>Download statement</a>
              : <button disabled style={{ width: '100%', background: 'transparent', color: '#333', fontSize: 13, padding: '10px', borderRadius: 6, border: '0.5px solid #222', cursor: 'not-allowed' }}>No statement available</button>
            }
            <div style={{ flex: 1 }} />
            <div style={{ borderTop: '0.5px solid #1e1e1e', paddingTop: 16 }}>
              <p style={{ fontSize: 11, color: '#444', lineHeight: 1.5, marginBottom: 12 }}>Only use if you uploaded entirely wrong documents and need to start over.</p>
              <button onClick={onDeleteLoan} style={{ width: '100%', background: 'transparent', color: '#f87171', fontSize: 13, fontWeight: 500, padding: '10px', borderRadius: 6, border: '0.5px solid #f87171', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#1a0000'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                Delete loan permanently
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Main Portal ───────────────────────────────────────────────────────────────
export default function Portal({ onSubmitRequest }) {
  const { user } = useUser();
  const [requests, setRequests] = useState([]);
  const [borrowerEmails, setBorrowerEmails] = useState({});
  const [borrowerData, setBorrowerData] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
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
  const docFileRef = useRef();

  const email = user?.primaryEmailAddress?.emailAddress;

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
    async function load() {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/payoff_requests?from_email=eq.${encodeURIComponent(email)}&order=created_at.desc`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
        const data = await res.json();
        const rows = Array.isArray(data) ? data : [];
        setRequests(rows);
        const ids = rows.map(r => r.loan_id_internal).filter(Boolean);
        if (ids.length > 0) {
          const bRes = await fetch(`${SUPABASE_URL}/rest/v1/borrowers?loan_id_internal=in.(${ids.map(id => `"${id}"`).join(',')})&select=loan_id_internal,borrower_email,principal_balance,next_payment_date,monthly_payment,payment_status`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
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
        if (Array.isArray(data) && data.length > 0 && data[0].loan_document_urls) {
          setDocUrls(data[0].loan_document_urls.split(',').map(u => u.trim()).filter(Boolean));
        } else { setDocUrls([]); }
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
    setDocUrls(newUrls);
    const borrowerEmail = borrowerEmails[selected.loan_id_internal] || liveData?.borrower_email;
    await fetch('/api/update-loan-docs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loanIdInternal: selected.loan_id_internal, newDocUrls: newUrls, lenderEmail: email, lenderName, borrowerEmail, borrowerName: selected.borrower_name, docsAdded: false }) });
    setDocSuccess('Document removed.');
    setTimeout(() => setDocSuccess(''), 4000);
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
      setDocUrls(combined);
      const borrowerEmail = borrowerEmails[selected.loan_id_internal] || liveData?.borrower_email;
      await fetch('/api/update-loan-docs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loanIdInternal: selected.loan_id_internal, newDocUrls: combined, lenderEmail: email, lenderName, borrowerEmail, borrowerName: selected.borrower_name, docsAdded: newUrls.length > 0 }) });
      setDocSuccess(`${newUrls.length} document${newUrls.length !== 1 ? 's' : ''} uploaded.`);
      setTimeout(() => setDocSuccess(''), 4000);
    } catch (e) { console.error('Upload error:', e); } finally { setUploadingDocs(false); }
  }

  async function handleDeleteLoan() {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleting(true);
    try {
      await fetch('/api/delete-loan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loanIdInternal: selected.loan_id_internal, lenderEmail: email, lenderName, borrowerName: selected.borrower_name, propertyAddress: selected.property_address }) });
      setShowDeleteModal(false);
      setDeleteConfirmText('');
      setRequests(prev => prev.filter(r => r.loan_id_internal !== selected.loan_id_internal));
      setSelected(null);
    } catch (e) { console.error('Delete error:', e); } finally { setDeleting(false); }
  }

  const filtered = requests.filter(r => {
    const q = search.toLowerCase();
    return !q || r.loan_id_internal?.toLowerCase().includes(q) || r.loan_id?.toLowerCase().includes(q) || r.borrower_name?.toLowerCase().includes(q) || r.property_address?.toLowerCase().includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
    if (sort === 'amount_desc') return (parseFloat(borrowerData[b.loan_id_internal]?.principal_balance || b.total_due) || 0) - (parseFloat(borrowerData[a.loan_id_internal]?.principal_balance || a.total_due) || 0);
    if (sort === 'amount_asc') return (parseFloat(borrowerData[a.loan_id_internal]?.principal_balance || a.total_due) || 0) - (parseFloat(borrowerData[b.loan_id_internal]?.principal_balance || b.total_due) || 0);
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);


  const TABLE_COLS = '100px 140px 180px minmax(150px, 300px) 120px 130px 110px 110px';

  const loanStatusStyle = (status) => {
    if (!status) return { color: '#555' };
    const st = status.toLowerCase();
    if (st === 'current' || st === 'on time') return { color: '#34d399' };
    if (st === 'late' || st === 'missed' || st === 'overdue') return { color: '#f87171' };
    return { color: '#888' };
  };

  // If a loan is selected, show the detail page
  if (selected) {
    return (
      <>
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
          onBack={() => { setSelected(null); setLiveData(null); setLoanPayments([]); setDocUrls([]); setPaymentSuccess(false); }}
          onRecordPayment={() => { setPaymentSuccess(false); setShowPaymentModal(true); }}
          onRemoveDoc={handleRemoveDoc}
          onUploadDocs={handleUploadDocs}
          onDeleteLoan={() => { setShowDeleteModal(true); setDeleteConfirmText(''); }}
        />

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
  }

  // Loans list
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const allBorrowers = Object.values(borrowerData);
  const principalOutstanding = allBorrowers.reduce((sum, b) => sum + (parseFloat(b.principal_balance) || 0), 0);
  const dueThisMonth = allBorrowers.filter(b => { if (!b.next_payment_date) return false; const d = new Date(b.next_payment_date); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; });
  const dueThisMonthTotal = dueThisMonth.reduce((sum, b) => sum + (parseFloat(b.monthly_payment) || 0), 0);
  const avgRate = allBorrowers.length > 0 ? allBorrowers.reduce((sum, b) => sum + (parseFloat(b.interest_rate) || 0), 0) / allBorrowers.length : 0;
  const notActivated = requests.filter(r => !borrowerData[r.loan_id_internal]).length;
  const missingPayment = allBorrowers.filter(b => !b.monthly_payment).length;
  const dueSoon = allBorrowers.filter(b => { if (!b.next_payment_date) return false; const diff = Math.ceil((new Date(b.next_payment_date) - now) / (1000 * 60 * 60 * 24)); return diff >= 0 && diff <= 7; }).length;
  const inDefault = allBorrowers.filter(b => b.payment_status?.toLowerCase() === 'default').length;
  const needsAttention = notActivated + missingPayment + dueSoon + inDefault;

  const sc = { background: '#141414', border: '0.5px solid #222', borderRadius: 10, padding: '18px 22px' };
  const sl = { fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 10 };
  const sv = { fontSize: 24, fontWeight: 600, color: '#fff', marginBottom: 4 };
  const ss = { fontSize: 12, color: '#444' };

  return (
    <div style={s.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 500, color: '#fff' }}>Loan Portfolio</div>
          <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>{email}</div>
        </div>
        <button style={s.serviceBtn} onClick={onSubmitRequest} {...hovSolid}>+ Service a loan</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 14 }}>
        <div style={sc}><div style={sl}>Principal Outstanding</div><div style={sv}>{formatCurrency(principalOutstanding)}</div><div style={ss}>{requests.length} serviced loans</div></div>
        <div style={sc}><div style={sl}>Due This Month</div><div style={sv}>{formatCurrency(dueThisMonthTotal)}</div><div style={ss}>{dueThisMonth.length} scheduled payments</div></div>
        <div style={sc}><div style={sl}>Needs Attention</div><div style={{ ...sv, color: needsAttention > 0 ? '#E9A800' : '#34d399' }}>{needsAttention}</div><div style={ss}>Missing or overdue data</div></div>
        <div style={sc}><div style={sl}>Avg. Note Rate</div><div style={sv}>{avgRate > 0 ? avgRate.toFixed(1) + '%' : '—'}</div><div style={ss}>Across all active loans</div></div>
      </div>

      <div style={{ background: '#141414', border: '0.5px solid #222', borderRadius: 10, padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 0, marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', minWidth: 130, marginRight: 24 }}>Needs Attention</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', flex: 1, gap: 1, background: '#222', borderRadius: 7, overflow: 'hidden' }}>
          {[
            { num: notActivated, label: 'Borrowers not activated' },
            { num: missingPayment, label: 'Missing payment amount' },
            { num: dueSoon, label: 'Payment due within 7 days' },
            { num: inDefault, label: 'Loans currently in default', danger: true },
          ].map(({ num, label, danger }) => (
            <div key={label} style={{ background: '#1a1a1a', padding: '12px 16px' }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: danger ? (num > 0 ? '#f87171' : '#555') : (num > 0 ? '#E9A800' : '#555'), marginBottom: 2 }}>{num}</div>
              <div style={{ fontSize: 11, color: '#555' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={s.controlRow}>
        <input style={s.searchInput} placeholder="Search by loan ID, borrower, or property..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <select style={s.select} value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}>
          <option value="newest">Sort: Newest first</option>
          <option value="oldest">Sort: Oldest first</option>
          <option value="amount_desc">Sort: Balance ↓</option>
          <option value="amount_asc">Sort: Balance ↑</option>
        </select>
        {(search || sort !== 'newest') && <span style={{ fontSize: 12, color: '#555' }}>{sorted.length} result{sorted.length !== 1 ? 's' : ''}</span>}
      </div>

      <div style={{ border: '0.5px solid #222', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: TABLE_COLS, padding: '10px 20px', borderBottom: '0.5px solid #222', fontSize: 10, color: '#FFD700', textTransform: 'uppercase', letterSpacing: 0.8, background: '#141414' }}>
          <span>Date</span><span>Loan ID</span><span>Borrower</span><span>Property</span><span style={{ textAlign: 'right' }}>Balance</span><span style={{ textAlign: 'right' }}>Next Payment</span><span style={{ textAlign: 'right' }}>Pmt Amount</span><span style={{ textAlign: 'right' }}>Loan Status</span>
        </div>

        {loading && <div style={s.empty}>Loading your loans...</div>}
        {!loading && sorted.length === 0 && <div style={s.empty}>{search ? 'No results found.' : 'No loans yet — service your first loan above.'}</div>}

        {!loading && paginated.map(r => {
          const b = borrowerData[r.loan_id_internal] || {};
          const isHov = hoveredId === r.id;
          const nextPmt = b.next_payment_date;
          const daysLeft = nextPmt ? Math.ceil((new Date(nextPmt) - new Date()) / (1000 * 60 * 60 * 24)) : null;
          const nextPmtColor = daysLeft !== null && daysLeft <= 7 ? '#E9A800' : '#555';
          return (
            <div key={r.id}
              style={{ display: 'grid', gridTemplateColumns: TABLE_COLS, padding: '11px 20px', borderBottom: '0.5px solid #1a1a1a', alignItems: 'center', fontSize: 12, cursor: 'pointer', background: isHov ? '#2a2000' : '#141414', transition: 'background 0.1s' }}
              onClick={() => setSelected(r)}
              onMouseEnter={() => setHoveredId(r.id)}
              onMouseLeave={() => setHoveredId(null)}>
              <span style={{ color: '#555' }}>{formatDate(r.created_at)}</span>
              <span style={{ color: '#888' }}>{r.loan_id_internal || r.loan_id || '—'}</span>
              <span style={{ color: '#fff', fontWeight: 500 }}>{r.borrower_name || '—'}</span>
              <span style={{ color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{r.property_address || '—'}</span>
              <span style={{ color: '#E9A800', textAlign: 'right' }}>{formatCurrency(b.principal_balance || r.total_due)}</span>
              <span style={{ color: nextPmtColor, textAlign: 'right' }}>{nextPmt ? formatDate(nextPmt) : '—'}</span>
              <span style={{ color: '#888', textAlign: 'right' }}>{b.monthly_payment ? formatCurrency(b.monthly_payment) : '—'}</span>
              <span style={{ textAlign: 'right', ...loanStatusStyle(b.payment_status) }}>{b.payment_status || '—'}</span>
            </div>
          );
        })}

        {!loading && sorted.length > PAGE_SIZE && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '0.5px solid #1a1a1a', background: '#141414' }}>
            <button style={{ background: 'transparent', border: `0.5px solid ${page === 1 ? '#2a2a2a' : '#FFD700'}`, borderRadius: 5, color: page === 1 ? '#333' : '#fff', fontSize: 12, padding: '6px 14px', cursor: page === 1 ? 'not-allowed' : 'pointer' }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={{ fontSize: 12, color: '#555' }}>Page {page} of {totalPages} · {sorted.length} total</span>
            <button style={{ background: 'transparent', border: `0.5px solid ${page === totalPages ? '#2a2a2a' : '#FFD700'}`, borderRadius: 5, color: page === totalPages ? '#333' : '#fff', fontSize: 12, padding: '6px 14px', cursor: page === totalPages ? 'not-allowed' : 'pointer' }} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
