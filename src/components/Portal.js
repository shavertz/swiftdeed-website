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
  const panelBorrowerEmail = borrowerEmails[selected.loan_id_internal] || live.borrower_email || selected?.borrower_email || '-';
  const loanType = live.loan_type || selected?.loan_type || '-';
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
         My Loans
      </button>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 400, color: '#fff', marginBottom: 4 }}>{selected.property_address || '-'}</div>
        <div style={{ fontSize: 13, color: '#555' }}>{selected.loan_id_internal} - {selected.borrower_name}</div>
      </div>

      {/* Stat bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1, background: '#222', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
        {[
          { label: 'Balance', value: formatCurrency(balance), gold: true },
          { label: 'Rate', value: rate ? rate + '%' : '-' },
          { label: 'Per diem', value: perDiem ? formatCurrency(perDiem) : '-' },
          { label: 'Next payment', value: formatDate(nextPaymentDate) },
          { label: 'Loan status', value: paymentStatus || '-', custom: statusColor() },
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
            { k: 'Legal name', v: live.legal_name || selected.borrower_name || '-' },
            { k: 'Guarantor', v: live.guarantor_name || selected.guarantor_name || '-' },
            { k: 'Email', v: panelBorrowerEmail, link: true },
            { k: 'Property', v: selected.property_address || '-' },
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
                      <td style={{ padding: '10px 16px', fontSize: 12, color: '#555' }}>{p.payment_date ? new Date(p.payment_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</td>
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
            {docSuccess && <span style={{ fontSize: 11, color: '#34d399' }}> {docSuccess}</span>}
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
                    onMouseEnter={e => e.currentTarget.style.color = '#f87171'} onMouseLeave={e => e.currentTarget.style.color = '#555'}></span>
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
            {paymentSuccess && <span style={{ fontSize: 11, color: '#34d399' }}> Payment recorded</span>}
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

//  Main Portal 
export default function Portal({ onSubmitRequest, resetToken }) {
  const { user } = useUser();
  const [requests, setRequests] = useState([]);
  const [borrowerEmails, setBorrowerEmails] = useState({});
  const [borrowerData, setBorrowerData] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [previewId, setPreviewId] = useState(null);
  const [attentionFilter, setAttentionFilter] = useState('all');
  const [hoveredAttention, setHoveredAttention] = useState(null);
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
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1600);
  const docFileRef = useRef();

  const email = user?.primaryEmailAddress?.emailAddress;

  useEffect(() => {
    setSelected(null);
    setLiveData(null);
    setLoanPayments([]);
    setDocUrls([]);
    setPaymentSuccess(false);
    setAttentionFilter('all');
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
    setAttentionFilter('all');
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
          const bRes = await fetch(`${SUPABASE_URL}/rest/v1/borrowers?loan_id_internal=in.(${ids.map(id => `"${id}"`).join(',')})&select=loan_id_internal,borrower_email,principal_balance,next_payment_date,monthly_payment,payment_status,interest_rate,per_diem,original_loan_amount,total_interest_paid,total_payments_made,legal_name,guarantor_name,portal_access,loan_document_urls,last_payment_date,maturity_date`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
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

  const getAttentionMatch = (request, filter) => {
    const b = borrowerData[request.loan_id_internal];
    if (filter === 'not_activated') return !b;
    if (!b) return false;
    if (filter === 'missing_payment') return !b.monthly_payment;
    if (filter === 'past_due') return getLoanStatus(request) === 'Past Due';
    if (filter === 'default') return getLoanStatus(request) === 'Default';
    return true;
  };

  const activeFilter = ['not_activated', 'missing_payment', 'past_due', 'default'].includes(attentionFilter) ? attentionFilter : 'all';
  const searchTerm = search.trim().toLowerCase();

  const filtered = requests.filter(r => {
    const matchesSearch = !searchTerm
      || String(r.loan_id_internal || '').toLowerCase().includes(searchTerm)
      || String(r.loan_id || '').toLowerCase().includes(searchTerm)
      || String(r.borrower_name || '').toLowerCase().includes(searchTerm)
      || String(r.property_address || '').toLowerCase().includes(searchTerm);
    return matchesSearch && (activeFilter === 'all' || getAttentionMatch(r, activeFilter));
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
    if (sort === 'amount_desc') return (parseFloat(borrowerData[b.loan_id_internal]?.principal_balance || b.total_due) || 0) - (parseFloat(borrowerData[a.loan_id_internal]?.principal_balance || a.total_due) || 0);
    if (sort === 'amount_asc') return (parseFloat(borrowerData[a.loan_id_internal]?.principal_balance || a.total_due) || 0) - (parseFloat(borrowerData[b.loan_id_internal]?.principal_balance || b.total_due) || 0);
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);


  const isNarrowPortfolio = windowWidth < 1280;
  const pagePad = isNarrowPortfolio ? '34px 42px' : '40px 60px';
  const snapshotWidth = isNarrowPortfolio ? '100%' : 340;
  const TABLE_COLS = isNarrowPortfolio
    ? '130px 165px minmax(220px, 1fr) 120px 105px 115px'
    : '150px 190px minmax(220px, 1fr) 135px 120px 120px';
  const tableInnerMinWidth = isNarrowPortfolio ? 900 : 'auto';

  const loanStatusBadge = (status) => {
    const isDefault = status === 'Default';
    const isPastDue = status === 'Past Due';
    const isPaidOff = status === 'Paid Off';
    return {
      display: 'inline-flex',
      justifyContent: 'center',
      minWidth: 68,
      borderRadius: 4,
      padding: '5px 8px',
      fontSize: 11,
      color: isDefault || isPastDue ? '#f87171' : isPaidOff ? '#aaa' : '#34d399',
      background: isDefault || isPastDue ? '#2a1010' : isPaidOff ? '#1a1a1a' : '#102113',
      border: `0.5px solid ${isDefault || isPastDue ? '#4a1717' : isPaidOff ? '#333' : '#1c3a23'}`,
    };
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
  const principalOutstanding = requests.reduce((sum, r) => {
    const b = borrowerData[r.loan_id_internal] || {};
    return sum + (parseFloat(b.principal_balance || r.total_due) || 0);
  }, 0);
  const dueThisMonth = allBorrowers.filter(b => { if (!b.next_payment_date) return false; const d = new Date(b.next_payment_date); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; });
  const dueThisMonthTotal = dueThisMonth.reduce((sum, b) => sum + (parseFloat(b.monthly_payment) || 0), 0);
  const rateValues = requests.map(r => parseFloat((borrowerData[r.loan_id_internal] || {}).interest_rate || r.interest_rate)).filter(n => !isNaN(n) && n > 0);
  const avgRate = rateValues.length > 0 ? rateValues.reduce((sum, rate) => sum + rate, 0) / rateValues.length : 0;
  const notActivated = requests.filter(r => !borrowerData[r.loan_id_internal]).length;
  const missingPayment = allBorrowers.filter(b => !b.monthly_payment).length;
  const pastDue = requests.filter(r => getLoanStatus(r) === 'Past Due').length;
  const inDefault = requests.filter(r => getLoanStatus(r) === 'Default').length;
  const activatedBorrowers = allBorrowers.length;
  const previewLoan = sorted.find(r => r.loan_id_internal === previewId) || sorted[0] || null;
  const previewBorrower = previewLoan ? borrowerData[previewLoan.loan_id_internal] || {} : {};
  const previewBalance = previewBorrower.principal_balance || previewLoan?.total_due;
  const previewOriginal = previewBorrower.original_loan_amount || previewLoan?.total_due;
  const previewPrincipalPaid = previewOriginal && previewBalance ? (parseFloat(previewOriginal) - parseFloat(previewBalance)) : 0;
  const previewTotalPaid = previewPrincipalPaid + (parseFloat(previewBorrower.total_interest_paid || 0) || 0);
  const previewDocs = uniqueDocUrls(previewBorrower.loan_document_urls, previewLoan?.loan_document_urls).length;
  const filterLabels = {
    all: 'All loans',
    not_activated: 'Borrowers not activated',
    missing_payment: 'Missing payment amount',
    past_due: 'Past due loans',
    default: 'Loans currently in default',
  };

  const sc = { background: '#111', border: '0.5px solid #252525', borderRadius: 9, padding: '22px 24px' };
  const sl = { fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 10 };
  const sv = { fontSize: 27, fontWeight: 600, color: '#fff', marginBottom: 6 };
  const ss = { fontSize: 12, color: '#444' };
  const attentionItem = (filter, num, label) => ({
    background: hoveredAttention === filter ? '#1e1a00' : '#151515',
    padding: '16px 22px',
    borderLeft: '0.5px solid #242424',
    boxShadow: activeFilter === filter ? 'inset 0 0 0 1px #FFD700' : 'none',
    cursor: 'pointer',
    transition: 'background 0.12s, box-shadow 0.12s',
  });
  const snapLine = { display: 'flex', justifyContent: 'space-between', gap: 16, padding: '8px 0', fontSize: 13, borderBottom: '0.5px solid #1b1b1b' };

  return (
    <div style={{ ...s.page, padding: pagePad }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 500, color: '#fff' }}>{lenderName || user?.firstName || 'Lender'}'s Loan Portfolio</div>
        </div>
        <button style={{ ...s.serviceBtn, padding: '12px 28px', fontSize: 14 }} onClick={onSubmitRequest} {...hovSolid}>+ Upload loan documents</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 14 }}>
        <div style={sc}><div style={sl}>Principal Outstanding</div><div style={sv}>{formatCurrency(principalOutstanding)}</div><div style={ss}>{requests.length} serviced loans</div></div>
        <div style={sc}><div style={sl}>Due This Month</div><div style={sv}>{formatCurrency(dueThisMonthTotal)}</div><div style={ss}>{dueThisMonth.length} scheduled payments</div></div>
        <div style={sc}><div style={sl}>Activated Borrowers</div><div style={sv}>{activatedBorrowers} / {requests.length}</div><div style={ss}>{notActivated} pending activation</div></div>
        <div style={sc}><div style={sl}>Avg. Note Rate</div><div style={sv}>{avgRate > 0 ? avgRate.toFixed(1).replace('.0', '') + '%' : '-'}</div><div style={ss}>Across active loans</div></div>
      </div>

      <div style={{ background: '#111', border: '0.5px solid #252525', borderRadius: 9, display: 'grid', gridTemplateColumns: '240px repeat(4, 1fr)', overflow: 'hidden', marginBottom: 22 }}>
        <div style={{ background: '#111', color: '#fff', fontSize: 14, fontWeight: 600, textAlign: 'left', padding: '22px 24px', display: 'flex', alignItems: 'center' }}>Needs Attention</div>
        {[
          { filter: 'not_activated', num: notActivated, label: 'Borrowers not activated' },
          { filter: 'missing_payment', num: missingPayment, label: 'Missing payment amount' },
          { filter: 'past_due', num: pastDue, label: 'Past due loans' },
          { filter: 'default', num: inDefault, label: 'Loans currently in default' },
        ].map(({ filter, num, label }) => (
          <button
            key={filter}
            onClick={() => { setAttentionFilter(activeFilter === filter ? 'all' : filter); setPage(1); }}
            onMouseEnter={() => setHoveredAttention(filter)}
            onMouseLeave={() => setHoveredAttention(null)}
            style={{ ...attentionItem(filter, num, label), borderTop: 'none', borderRight: 'none', textAlign: 'left', fontFamily: 'inherit' }}
          >
            <div style={{ fontSize: 24, fontWeight: 600, color: num > 0 ? '#FFD700' : '#666', marginBottom: 6 }}>{num}</div>
            <div style={{ fontSize: 13, color: '#555' }}>{label}</div>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: isNarrowPortfolio ? 'column' : 'row', gap: isNarrowPortfolio ? 14 : 18, alignItems: 'flex-start', width: '100%', overflow: 'hidden' }}>
        <div style={{ flex: 1, minWidth: 0, border: '0.5px solid #252525', borderRadius: 9, overflowX: 'auto', overflowY: 'hidden', background: '#111' }}>
          <div style={{ minWidth: tableInnerMinWidth }}>
          <div style={{ display: 'flex', gap: 10, padding: 14, borderBottom: '0.5px solid #222', alignItems: 'stretch' }}>
            <input style={{ ...s.searchInput, maxWidth: 'none', height: 52, boxSizing: 'border-box' }} placeholder={activeFilter === 'all' ? 'Search by loan ID, borrower, or property...' : `Showing: ${filterLabels[activeFilter]}`} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            <select style={{ ...s.select, height: 52, width: 260, boxSizing: 'border-box' }} value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}>
              <option value="newest">Sort: Newest first</option>
              <option value="oldest">Sort: Oldest first</option>
              <option value="amount_desc">Sort: Balance high to low</option>
              <option value="amount_asc">Sort: Balance low to high</option>
            </select>
          </div>

          <div style={{ padding: '0 20px 12px', color: '#555', fontSize: 12, borderBottom: '0.5px solid #222' }}>
            Click a row for a snapshot. Double-click a row to open the full loan file.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: TABLE_COLS, gap: isNarrowPortfolio ? 6 : 12, padding: isNarrowPortfolio ? '12px 12px' : '12px 20px', borderBottom: '0.5px solid #222', fontSize: 10, color: '#FFD700', textTransform: 'uppercase', letterSpacing: 0.8, background: '#111' }}>
            <span>Loan</span><span>Borrower</span><span>Property</span><span>Balance</span><span>Next Due</span><span>Loan Status</span>
          </div>

          {loading && <div style={s.empty}>Loading your loans...</div>}
          {!loading && sorted.length === 0 && <div style={s.empty}>{searchTerm ? 'No results found.' : activeFilter !== 'all' ? `No loans match ${filterLabels[activeFilter].toLowerCase()}. Click the active attention item again to show all loans.` : 'No loans yet. Upload your first loan documents above.'}</div>}

          {!loading && paginated.map(r => {
            const b = borrowerData[r.loan_id_internal] || {};
            const isHov = hoveredId === r.id;
            const isActive = previewLoan?.id === r.id;
            const loanStatus = getLoanStatus(r);
            return (
              <div key={r.id}
                style={{ display: 'grid', gridTemplateColumns: TABLE_COLS, gap: isNarrowPortfolio ? 6 : 12, minHeight: 70, padding: isNarrowPortfolio ? '0 12px' : '0 20px', borderBottom: '0.5px solid #1b1b1b', alignItems: 'center', fontSize: isNarrowPortfolio ? 11 : 13, cursor: 'pointer', background: isHov ? '#1e1a00' : '#111', boxShadow: isActive ? 'inset 0 0 0 1px #FFD700, inset 4px 0 0 #FFD700' : 'none', transition: 'background 0.1s, box-shadow 0.1s' }}
                onClick={() => setPreviewId(r.loan_id_internal)}
                onDoubleClick={() => setSelected(r)}
                onMouseEnter={() => setHoveredId(r.id)}
                onMouseLeave={() => setHoveredId(null)}>
                <span>
                  <span style={{ color: '#777' }}>{r.loan_id_internal || r.loan_id || '-'}</span>
                  <span style={{ display: 'block', color: '#555', fontSize: 12, marginTop: 4 }}>{formatDate(r.created_at)}</span>
                </span>
                <span style={{ color: '#fff', fontWeight: 600 }}>{r.borrower_name || '-'}</span>
                <span style={{ color: '#777', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{r.property_address || '-'}</span>
                <span style={{ color: '#f0f0f0', fontWeight: 500 }}>{formatCurrency(b.principal_balance || r.total_due)}</span>
                <span style={{ color: '#e0d8c8' }}>{b.next_payment_date ? formatDate(b.next_payment_date) : '-'}</span>
                <span><span style={loanStatusBadge(loanStatus)}>{loanStatus}</span></span>
              </div>
            );
          })}

          {!loading && sorted.length > PAGE_SIZE && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '0.5px solid #1a1a1a', background: '#111' }}>
              <button
                style={{ background: 'transparent', border: `0.5px solid ${page === 1 ? '#2a2a2a' : '#FFD700'}`, borderRadius: 5, color: page === 1 ? '#333' : '#fff', fontSize: 12, padding: '6px 14px', cursor: page === 1 ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                onMouseEnter={e => { if (page !== 1) { e.currentTarget.style.background = '#1e1a00'; e.currentTarget.style.color = '#FFD700'; } }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = page === 1 ? '#333' : '#fff'; }}
              >Prev</button>
              <span style={{ fontSize: 12, color: '#555' }}>Page {safePage} of {totalPages} - {sorted.length} total</span>
              <button
                style={{ background: 'transparent', border: `0.5px solid ${page === totalPages ? '#2a2a2a' : '#FFD700'}`, borderRadius: 5, color: page === totalPages ? '#333' : '#fff', fontSize: 12, padding: '6px 14px', cursor: page === totalPages ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                onMouseEnter={e => { if (page !== totalPages) { e.currentTarget.style.background = '#1e1a00'; e.currentTarget.style.color = '#FFD700'; } }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = page === totalPages ? '#333' : '#fff'; }}
              >Next</button>
            </div>
          )}
          </div>
        </div>

        <aside style={{ width: snapshotWidth, flexShrink: 0, background: '#111', border: '0.5px solid #252525', borderRadius: 9, overflow: 'hidden', position: isNarrowPortfolio ? 'static' : 'sticky', top: 84, minWidth: 0 }}>
          {previewLoan ? (
            <>
              <div style={{ padding: '20px 22px', borderBottom: '0.5px solid #222' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 18, lineHeight: 1.3, fontWeight: 600, color: '#fff' }}>{previewLoan.property_address || '-'}</div>
                    <div style={{ color: '#565656', marginTop: 7, fontSize: 13 }}>{previewLoan.loan_id_internal || previewLoan.loan_id} - {previewLoan.borrower_name || '-'}</div>
                  </div>
                  <button
                    onClick={() => setSelected(previewLoan)}
                    style={{ background: '#FFD700', border: 'none', color: '#0f0f0f', cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: '8px 12px', borderRadius: 6, whiteSpace: 'nowrap', fontFamily: 'inherit', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#FFE45C'; e.currentTarget.style.boxShadow = '0 0 16px rgba(255, 215, 0, 0.45)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#FFD700'; e.currentTarget.style.boxShadow = 'none'; }}
                  >Open loan file</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '0.5px solid #222' }}>
                {[
                  { label: 'Balance', value: formatCurrency(previewBalance) },
                  { label: 'Rate', value: previewBorrower.interest_rate ? `${previewBorrower.interest_rate}%` : '-' },
                  { label: 'Per diem', value: previewBorrower.per_diem ? formatCurrency(previewBorrower.per_diem) : '-' },
                  { label: 'Next payment', value: formatDate(previewBorrower.next_payment_date) },
                ].map((item, i) => (
                  <div key={item.label} style={{ padding: '14px 16px', borderRight: i % 2 === 0 ? '0.5px solid #222' : 'none', borderBottom: i < 2 ? '0.5px solid #222' : 'none' }}>
                    <div style={{ color: '#555', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 7 }}>{item.label}</div>
                    <div style={{ fontSize: 15, color: '#f0f0f0', fontWeight: 600 }}>{item.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '18px 22px', borderBottom: '0.5px solid #222' }}>
                <div style={{ marginBottom: 12, color: '#FFD700', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 }}>Loan Breakdown</div>
                {[
                  { k: 'Original amount', v: formatCurrency(previewOriginal) },
                  { k: 'Principal paid', v: formatCurrency(previewPrincipalPaid) },
                  { k: 'Total paid', v: formatCurrency(previewTotalPaid) },
                ].map(({ k, v }) => <div key={k} style={snapLine}><span style={{ color: '#555' }}>{k}</span><span style={{ color: '#d6d6d6', textAlign: 'right' }}>{v}</span></div>)}
              </div>
              <div style={{ padding: '18px 22px' }}>
                <div style={{ marginBottom: 12, color: '#FFD700', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 }}>Borrower</div>
                {[
                  { k: 'Legal name', v: previewBorrower.legal_name || previewLoan.borrower_name || '-' },
                  { k: 'Guarantor', v: previewBorrower.guarantor_name || previewLoan.guarantor_name || '-' },
                  { k: 'Portal access', v: previewBorrower.portal_access || (previewBorrower.borrower_email ? 'Active' : 'Pending'), green: !!previewBorrower.borrower_email },
                  { k: 'Documents', v: `${previewDocs} on file` },
                ].map(({ k, v, green }) => <div key={k} style={snapLine}><span style={{ color: '#555' }}>{k}</span><span style={{ color: green ? '#34d399' : '#d6d6d6', textAlign: 'right' }}>{v}</span></div>)}
              </div>
            </>
          ) : (
            <div style={{ padding: 24, color: '#555', fontSize: 13 }}>Select a loan to see the snapshot.</div>
          )}
        </aside>
      </div>
    </div>
  );
}
