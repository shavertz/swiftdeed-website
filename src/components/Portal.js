import { useEffect, useState } from 'react';
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

function daysUntil(dateStr) {
  if (!dateStr) return '—';
  const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'Overdue';
  if (diff === 0) return 'Today';
  return diff + ' days';
}

const PAGE_SIZE = 15;
const LEFT_COLS = '110px 130px 120px 1fr 100px';

const hovSolid = {
  onMouseEnter: e => { e.currentTarget.style.boxShadow = '0 0 16px rgba(255, 215, 0, 0.45)'; },
  onMouseLeave: e => { e.currentTarget.style.boxShadow = 'none'; },
};
const hovOutline = {
  onMouseEnter: e => { e.currentTarget.style.background = '#1e1a00'; e.currentTarget.style.color = '#FFD700'; e.currentTarget.style.boxShadow = '0 0 16px rgba(255, 215, 0, 0.3)'; e.currentTarget.style.borderColor = '#FFD700'; },
  onMouseLeave: e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#FFD700'; },
};

const s = {
  page: { padding: '40px 60px', maxWidth: 1600, margin: '0 auto' },
  heading: { fontSize: 24, fontWeight: 400, color: '#fff', marginBottom: 24 },
  statRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 },
  statCard: { background: '#141414', border: '0.5px solid #222', borderRadius: 10, padding: '20px 26px' },
  statLabel: { fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  statValue: { fontSize: 26, fontWeight: 600, color: '#fff' },
  controlRow: { display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' },
  searchInput: {
    background: '#141414', border: '0.5px solid #2a2a2a', borderRadius: 7,
    padding: '8px 14px', fontSize: 13, color: '#fff', fontFamily: 'inherit',
    outline: 'none', flex: 1, maxWidth: 340,
  },
  select: {
    background: '#141414', border: '0.5px solid #2a2a2a', borderRadius: 7,
    padding: '8px 14px', fontSize: 13, color: '#fff', fontFamily: 'inherit',
    outline: 'none', cursor: 'pointer',
  },
  serviceBtn: {
    background: '#FFD700', color: '#0f0f0f', fontSize: 13, fontWeight: 500,
    padding: '8px 18px', borderRadius: 7, border: 'none', cursor: 'pointer',
    whiteSpace: 'nowrap', marginLeft: 'auto', transition: 'box-shadow 0.15s',
  },
  splitWrap: { display: 'grid', gridTemplateColumns: '70% 30%', gap: 0, border: '0.5px solid #222', borderRadius: 10, overflow: 'hidden' },
  leftPane: { borderRight: '0.5px solid #222', overflow: 'hidden' },
  thead: {
    display: 'grid', gridTemplateColumns: LEFT_COLS,
    padding: '10px 20px', borderBottom: '0.5px solid #222',
    fontSize: 10, color: '#FFD700', textTransform: 'uppercase', letterSpacing: 0.8,
    background: '#141414',
  },
  trow: (selected) => ({
    display: 'grid', gridTemplateColumns: LEFT_COLS,
    padding: '14px 20px', borderBottom: '0.5px solid #1a1a1a',
    alignItems: 'center', fontSize: 12, cursor: 'pointer',
    background: selected ? '#1e1a00' : '#141414',
    borderLeft: selected ? '3px solid #FFD700' : '3px solid transparent',
    transition: 'background 0.1s',
  }),
  grey: { color: '#555' },
  badge: (color) => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 4,
    background: color === 'green' ? '#0a2416' : '#1f1800',
    color: color === 'green' ? '#34d399' : '#FFD700',
    border: `0.5px solid ${color === 'green' ? '#065f46' : '#78350f'}`,
    whiteSpace: 'nowrap',
  }),
  empty: { padding: '60px 20px', textAlign: 'center', color: '#444', fontSize: 14, background: '#141414' },
  pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '0.5px solid #1a1a1a', background: '#141414' },
  pageBtn: (disabled) => ({
    background: 'transparent', border: `0.5px solid ${disabled ? '#2a2a2a' : '#FFD700'}`, borderRadius: 5,
    color: disabled ? '#333' : '#fff', fontSize: 12, padding: '6px 14px',
    cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
  }),
  pageInfo: { fontSize: 12, color: '#555' },
  rightPane: { background: '#111', display: 'flex', flexDirection: 'column' },
  panelHeader: { padding: '20px 20px 16px', borderBottom: '0.5px solid #1e1e1e' },
  panelRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  panelKey: { fontSize: 12, color: '#555' },
  panelVal: { fontSize: 12, color: '#ccc', textAlign: 'right' },
  panelValGreen: { fontSize: 12, color: '#34d399', textAlign: 'right' },
  panelValRed: { fontSize: 12, color: '#f87171', textAlign: 'right' },
  panelSection: { padding: '16px 20px', borderBottom: '0.5px solid #1e1e1e' },
  panelSectionLabel: { fontSize: 9, color: '#FFD700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  headerLabel: { fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  headerVal: { fontSize: 13, color: '#fff', fontWeight: 500, marginBottom: 10 },
  headerValSub: { fontSize: 12, color: '#888', marginBottom: 10 },
  dlBtn: {
    display: 'block', width: 'calc(100% - 0px)', boxSizing: 'border-box', fontSize: 12, fontWeight: 500,
    padding: '7px', borderRadius: 6, textAlign: 'center',
    background: 'transparent', color: '#fff',
    border: '0.5px solid #FFD700', cursor: 'pointer',
    textDecoration: 'none', transition: 'all 0.15s', marginTop: 4,
  },
  noPanel: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#333', fontSize: 13 },
  liveLoading: { fontSize: 11, color: '#444', fontStyle: 'italic' },
};

function RecordPaymentModal({ borrower, lenderEmail, lenderName, onClose, onSuccess }) {
  const today = new Date().toISOString().split('T')[0];
  const [amount, setAmount] = useState(borrower?.monthly_payment ? String(borrower.monthly_payment) : '');
  const [date, setDate] = useState(today);
  const [method, setMethod] = useState('Wire');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const inputStyle = {
    background: '#1a1a1a', border: '0.5px solid #2a2a2a', borderRadius: 6,
    padding: '9px 12px', fontSize: 13, color: '#fff', fontFamily: 'inherit',
    outline: 'none', width: '100%', boxSizing: 'border-box',
  };
  const labelStyle = { fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5, display: 'block' };

  async function handleConfirm() {
    if (!amount || !date) { setError('Please enter an amount and date.'); return; }
    setSaving(true);
    setError('');
    try {
      // Validate we have required fields
      const lastDate = borrower.last_payment_date || borrower.loan_start_date;
      if (!lastDate) { setError('Missing loan start date — please update the borrower record in Supabase.'); setSaving(false); return; }
      if (new Date(date) <= new Date(lastDate)) { setError('Payment date must be after the last payment date.'); setSaving(false); return; }
      console.log('borrower id:', borrower.id, 'liveData:', borrower);
      console.log('calculatePayment input:', { loan_type: borrower.loan_type, principal_balance: borrower.principal_balance, interest_rate: borrower.interest_rate, last_payment_date: borrower.last_payment_date || borrower.loan_start_date, maturity_date: borrower.maturity_date, date });
      const result = calculatePayment(
        {
          loan_type: borrower.loan_type || 'interest_only',
          principal_balance: parseFloat(borrower.principal_balance),
          interest_rate: parseFloat(borrower.interest_rate),
          monthly_payment: parseFloat(borrower.monthly_payment) || 0,
          total_interest_paid: parseFloat(borrower.total_interest_paid) || 0,
          total_payments_made: parseInt(borrower.total_payments_made) || 0,
          last_payment_date: borrower.last_payment_date || borrower.loan_start_date || borrower.next_payment_date,
          next_payment_date: borrower.next_payment_date,
          maturity_date: borrower.maturity_date,
          day_count_convention: borrower.day_count_convention || 360,
        },
        date,
        parseFloat(amount)
      );

      if (result.error) { setError('Calculation error: ' + result.error); setSaving(false); return; }

      const updates = {
        ...result.updates,
        last_payment_amount: parseFloat(amount),
        last_payment_method: method,
        last_payment_interest: result.breakdown.interestPortion,
        last_payment_principal: result.breakdown.principalPortion,
      };

      const res = await fetch('/api/record-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          borrowerId: borrower.id,
          loanIdInternal: borrower.loan_id_internal,
          updates,
          borrowerEmail: borrower.borrower_email || null,
          lenderEmail: lenderEmail || null,
          lenderName: lenderName || null,
          borrowerName: borrower.legal_name || null,
          propertyAddress: borrower.property_address || null,
          perDiem: borrower.per_diem || null,
          nextPaymentDate: result.updates.next_payment_date || null,
          paymentLog: {
            loan_id_internal: borrower.loan_id_internal,
            payment_date: date,
            amount: parseFloat(amount),
            method,
            interest_portion: result.breakdown.interestPortion,
            principal_portion: result.breakdown.principalPortion,
            principal_balance_after: result.updates.principal_balance,
            payment_status: result.updates.payment_status,
            recorded_by: 'lender',
          },
        }),
      });

      if (!res.ok) throw new Error('Failed to save payment');

      onSuccess(updates);
    } catch (e) {
      setError('Failed to record payment. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#141414', border: '0.5px solid #2a2a2a', borderRadius: 12, padding: '32px', width: '100%', maxWidth: 400, fontFamily: 'system-ui, sans-serif' }}>
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
          <button
            onClick={handleConfirm}
            disabled={saving}
            style={{ flex: 1, background: '#FFD700', color: '#0f0f0f', fontSize: 13, fontWeight: 600, padding: '10px', borderRadius: 6, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, transition: 'box-shadow 0.15s' }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.boxShadow = '0 0 12px rgba(255,215,0,0.4)'; }}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >{saving ? 'Recording...' : 'Confirm payment'}</button>
          <button
            onClick={onClose}
            disabled={saving}
            style={{ flex: 1, background: 'transparent', color: '#fff', fontSize: 13, padding: '10px', borderRadius: 6, border: '0.5px solid #2a2a2a', cursor: 'pointer', transition: 'border-color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#555'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a2a'}
          >Cancel</button>
        </div>
      </div>
    </div>
  );
}


export default function Portal({ onSubmitRequest }) {
  const { user } = useUser();
  const [requests, setRequests] = useState([]);
  const [borrowerEmails, setBorrowerEmails] = useState({});
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

  const email = user?.primaryEmailAddress?.emailAddress;

  useEffect(() => {
    if (!email) return;
    async function fetchLenderName() {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/lenders?email=eq.${encodeURIComponent(email)}&select=company_name&limit=1`,
          { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
        );
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setLenderName(data[0].company_name || '');
        }
      } catch (e) { console.error(e); }
    }
    fetchLenderName();
  }, [email]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!email) return;
    async function load() {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/payoff_requests?from_email=eq.${encodeURIComponent(email)}&order=created_at.desc`,
          { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
        );
        const data = await res.json();
        const rows = Array.isArray(data) ? data : [];
        setRequests(rows);
        if (rows.length > 0) {
          setSelected(rows[0]);
        }

        const ids = rows.map(r => r.loan_id_internal).filter(Boolean);
        if (ids.length > 0) {
          const bRes = await fetch(
            `${SUPABASE_URL}/rest/v1/borrowers?loan_id_internal=in.(${ids.map(id => `"${id}"`).join(',')})&select=loan_id_internal,borrower_email`,
            { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
          );
          const bData = await bRes.json();
          if (Array.isArray(bData)) {
            const map = {};
            bData.forEach(b => { if (b.loan_id_internal) map[b.loan_id_internal] = b.borrower_email; });
            setBorrowerEmails(map);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [email]);

  useEffect(() => {
    if (!selected?.loan_id_internal) {
      setLoanPayments([]);
      return;
    }
    async function fetchPayments() {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/payments?loan_id_internal=eq.${encodeURIComponent(selected.loan_id_internal)}&order=payment_date.desc`,
          { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
        );
        const data = await res.json();
        setLoanPayments(Array.isArray(data) ? data : []);
      } catch (e) { console.error(e); }
    }
    fetchPayments();
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selected?.loan_id_internal) {
      setLiveData(null);
      return;
    }
    async function fetchLive() {
      setLiveLoading(true);
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/borrowers?loan_id_internal=eq.${encodeURIComponent(selected.loan_id_internal)}&limit=1&select=*`,
          { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
        );
        const data = await res.json();
        setLiveData(Array.isArray(data) && data.length > 0 ? data[0] : null);
      } catch (e) {
        console.error(e);
        setLiveData(null);
      } finally {
        setLiveLoading(false);
      }
    }
    fetchLive();
  }, [selected]);

  const filtered = requests.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      r.loan_id_internal?.toLowerCase().includes(q) ||
      r.loan_id?.toLowerCase().includes(q) ||
      r.borrower_name?.toLowerCase().includes(q) ||
      r.property_address?.toLowerCase().includes(q);
    const matchStatus =
      sort === 'completed' ? r.status?.toLowerCase() === 'completed' :
      sort === 'pending' ? r.status?.toLowerCase() !== 'completed' : true;
    return matchSearch && matchStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
    if (sort === 'amount_asc') return (parseFloat(a.total_due) || 0) - (parseFloat(b.total_due) || 0);
    if (sort === 'amount_desc') return (parseFloat(b.total_due) || 0) - (parseFloat(a.total_due) || 0);
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalAmount = requests.reduce((sum, r) => sum + (parseFloat(r.total_due) || 0), 0);
  const avgLoanSize = requests.length > 0 ? totalAmount / requests.length : 0;
  const activeBorrowers = new Set(requests.map(r => borrowerEmails[r.loan_id_internal]).filter(Boolean)).size;

  const paymentStatusStyle = (status) => {
    if (!status) return s.panelVal;
    const st = status.toLowerCase();
    if (st === 'current') return s.panelValGreen;
    if (st === 'late' || st === 'missed') return s.panelValRed;
    return s.panelVal;
  };

  const panelBorrowerEmail = selected
    ? (borrowerEmails[selected.loan_id_internal] || selected.borrower_email || '—')
    : '—';

  const getRowStyle = (r) => {
    const isSelected = selected?.id === r.id;
    const isHovered = hoveredId === r.id && !isSelected;
    return {
      ...s.trow(isSelected),
      background: isSelected ? '#1e1a00' : isHovered ? '#191500' : '#141414',
    };
  };

  const live = liveData || {};
  const balance = live.principal_balance != null ? live.principal_balance : selected?.total_due;
  const rate = live.interest_rate != null ? live.interest_rate : selected?.interest_rate;
  const perDiem = live.per_diem != null ? live.per_diem : selected?.per_diem;
  const loanStart = live.loan_start_date || selected?.loan_start_date;
  const maturity = live.maturity_date || selected?.maturity_date;
  const paymentStatus = live.payment_status || selected?.payment_status;
  const lastPaymentDate = live.last_payment_date || selected?.last_payment_date;
  const nextPaymentDate = live.next_payment_date || selected?.next_payment_date;
  const totalPaymentsMade = live.total_payments_made ?? selected?.total_payments_made;

  return (
    <div style={s.page}>
      <div style={s.heading}>My Loans</div>
      <div style={{ fontSize: 13, color: '#555', marginTop: -18, marginBottom: 24 }}>{email}</div>

      <div style={s.statRow}>
        <div style={s.statCard}>
          <div style={s.statLabel}>Total Loans</div>
          <div style={s.statValue}>{requests.length}</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>Total Amount Processed</div>
          <div style={{ ...s.statValue, fontSize: 22 }}>{formatCurrency(totalAmount)}</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>Avg. Loan Size</div>
          <div style={{ ...s.statValue, fontSize: 22 }}>{requests.length > 0 ? formatCurrency(avgLoanSize) : '—'}</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>Active Borrowers</div>
          <div style={s.statValue}>{activeBorrowers}</div>
        </div>
      </div>

      <div style={s.controlRow}>
        <input
          style={s.searchInput}
          placeholder="Search by loan ID, borrower, or property..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        <select style={s.select} value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}>
          <option value="newest">Sort: Newest first</option>
          <option value="oldest">Sort: Oldest first</option>
          <option value="amount_desc">Sort: Amount ↓</option>
          <option value="amount_asc">Sort: Amount ↑</option>
          <option value="completed">Filter: Completed</option>
          <option value="pending">Filter: Pending</option>
        </select>
        {(search || sort !== 'newest') && (
          <span style={{ fontSize: 12, color: '#555' }}>{sorted.length} result{sorted.length !== 1 ? 's' : ''}</span>
        )}
        <button style={s.serviceBtn} onClick={onSubmitRequest} {...hovSolid}>+ Service a loan</button>
      </div>

      <div style={s.splitWrap}>
        <div style={s.leftPane}>
          <div style={s.thead}>
            <span>Date Serviced</span>
            <span>Loan ID</span>
            <span>Amount</span>
            <span>Property</span>
            <span>Status</span>
          </div>

          {loading && <div style={s.empty}>Loading your loans...</div>}
          {!loading && sorted.length === 0 && (
            <div style={s.empty}>{search ? 'No results found.' : 'No loans yet — service your first loan above.'}</div>
          )}

          {!loading && paginated.map(r => {
            const isCompleted = r.status?.toLowerCase() === 'completed';
            return (
              <div
                key={r.id}
                style={getRowStyle(r)}
                onClick={() => setSelected(r)}
                onMouseEnter={() => setHoveredId(r.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <span style={s.grey}>{formatDate(r.created_at)}</span>
                <span style={s.grey}>{r.loan_id_internal || r.loan_id || '—'}</span>
                <span style={{ fontWeight: 600, color: '#fff' }}>{formatCurrency(r.total_due)}</span>
                <span style={s.grey}>{r.property_address || '—'}</span>
                <span>
                  <span style={s.badge(isCompleted ? 'green' : 'yellow')}>
                    {isCompleted ? 'Completed' : 'Pending'}
                  </span>
                </span>
              </div>
            );
          })}

          {!loading && sorted.length > PAGE_SIZE && (
            <div style={s.pagination}>
              <button style={s.pageBtn(page === 1)} disabled={page === 1} onClick={() => setPage(p => p - 1)}
                {...(page !== 1 ? hovOutline : {})}>← Prev</button>
              <span style={s.pageInfo}>Page {page} of {totalPages} · {sorted.length} total</span>
              <button style={s.pageBtn(page === totalPages)} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                {...(page !== totalPages ? hovOutline : {})}>Next →</button>
            </div>
          )}
        </div>

        <div style={s.rightPane}>
          {!selected ? (
            <div style={s.noPanel}>Select a loan to view details</div>
          ) : (
            <>
              <div style={s.panelHeader}>
                <div style={s.headerLabel}>Borrower</div>
                <div style={s.headerVal}>{selected.borrower_name || '—'}</div>
                {selected.guarantor_name && (
                  <>
                    <div style={s.headerLabel}>Guarantor</div>
                    <div style={s.headerValSub}>{selected.guarantor_name}</div>
                  </>
                )}
                <div style={s.headerLabel}>Email</div>
                <div style={{ ...s.headerValSub, marginBottom: 0 }}>{panelBorrowerEmail}</div>
              </div>

              <div style={s.panelSection}>
                <div style={s.panelSectionLabel}>
                  Loan Details {liveLoading && <span style={s.liveLoading}>updating...</span>}
                </div>
                <div style={s.panelRow}>
                  <span style={s.panelKey}>Balance</span>
                  <span style={s.panelVal}>{formatCurrency(balance)}</span>
                </div>
                <div style={s.panelRow}>
                  <span style={s.panelKey}>Rate</span>
                  <span style={s.panelVal}>{rate ? rate + '%' : '—'}</span>
                </div>
                <div style={s.panelRow}>
                  <span style={s.panelKey}>Per diem</span>
                  <span style={s.panelVal}>{perDiem ? formatCurrency(perDiem) : '—'}</span>
                </div>
                <div style={s.panelRow}>
                  <span style={s.panelKey}>Loan start date</span>
                  <span style={s.panelVal}>{formatDate(loanStart)}</span>
                </div>
                <div style={s.panelRow}>
                  <span style={s.panelKey}>Maturity date</span>
                  <span style={s.panelVal}>{formatDate(maturity)}</span>
                </div>
              </div>

              <div style={s.panelSection}>
                <div style={s.panelSectionLabel}>Payment Info</div>
                <div style={s.panelRow}>
                  <span style={s.panelKey}>Payment status</span>
                  <span style={paymentStatusStyle(paymentStatus)}>{paymentStatus || '—'}</span>
                </div>
                <div style={s.panelRow}>
                  <span style={s.panelKey}>Last payment</span>
                  <span style={s.panelVal}>{formatDate(lastPaymentDate)}</span>
                </div>
                <div style={s.panelRow}>
                  <span style={s.panelKey}>Next payment</span>
                  <span style={s.panelVal}>{formatDate(nextPaymentDate)}</span>
                </div>
                <div style={s.panelRow}>
                  <span style={s.panelKey}>Days until next</span>
                  <span style={s.panelVal}>{daysUntil(nextPaymentDate)}</span>
                </div>
                <div style={s.panelRow}>
                  <span style={s.panelKey}>Total payments made</span>
                  <span style={s.panelVal}>{totalPaymentsMade ?? '—'}</span>
                </div>
              </div>

              <div style={s.panelSection}>
                <div style={s.panelSectionLabel}>Payment History</div>
                {loanPayments.length === 0 ? (
                  <div style={{ fontSize: 11, color: '#333' }}>No payments recorded yet.</div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 50px', gap: 4, marginBottom: 4 }}>
                      {['Date','Amount','Method'].map(h => (
                        <span key={h} style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: h === 'Date' ? 'left' : 'right' }}>{h}</span>
                      ))}
                    </div>
                    <div style={{ maxHeight: 136, overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'thin', scrollbarColor: '#FFD700 #0f0f0f', marginRight: -8, paddingRight: 8 }}>
                      {loanPayments.map((p, i) => (
                        <div key={p.id || i} style={{ display: 'grid', gridTemplateColumns: '1fr 76px 44px', gap: 4, padding: '6px 0', borderBottom: '0.5px solid #1a1a1a', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: '#555' }}>{p.payment_date ? new Date(p.payment_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                          <span style={{ fontSize: 11, color: '#fff', fontWeight: 500, textAlign: 'right' }}>${parseFloat(p.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                          <span style={{ fontSize: 11, color: '#ccc', textAlign: 'right' }}>{p.method || '—'}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div style={s.panelSection}>
                <div style={s.panelSectionLabel}>Manual Payment</div>
                {paymentSuccess && <div style={{ fontSize: 11, color: '#34d399', marginBottom: 8 }}>✓ Payment recorded successfully</div>}
                <button
                  onClick={() => { setPaymentSuccess(false); setShowPaymentModal(true); }}
                  style={{ display: 'block', width: '100%', background: 'transparent', color: '#fff', fontSize: 12, fontWeight: 500, padding: '7px', borderRadius: 6, border: '0.5px solid #FFD700', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s', marginBottom: 4 }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#1e1a00'; e.currentTarget.style.color = '#FFD700'; e.currentTarget.style.boxShadow = '0 0 16px rgba(255, 215, 0, 0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.boxShadow = 'none'; }}
                >Record payment (wire / check)</button>
              </div>

              <div style={s.panelSection}>
                <div style={s.panelSectionLabel}>Statement</div>
                {selected.payoff_statement_url
                  ? <a href={selected.payoff_statement_url} target="_blank" rel="noreferrer" style={s.dlBtn}
                      onMouseEnter={e => { e.currentTarget.style.background = '#1e1a00'; e.currentTarget.style.color = '#FFD700'; e.currentTarget.style.boxShadow = '0 0 16px rgba(255, 215, 0, 0.3)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.boxShadow = 'none'; }}
                    >Download Statement</a>
                  : <div style={{ fontSize: 12, color: '#333' }}>No statement available</div>
                }
              </div>

              
            </>
          )}
        </div>
      </div>
      {showPaymentModal && liveData && (
        <RecordPaymentModal
          borrower={liveData}
          lenderEmail={email}
          lenderName={lenderName}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={(updates) => {
            setShowPaymentModal(false);
            setPaymentSuccess(true);
            setLiveData(prev => ({ ...prev, ...updates }));
            setTimeout(() => setPaymentSuccess(false), 5000);
          }}
        />
      )}
    </div>
  );
}
