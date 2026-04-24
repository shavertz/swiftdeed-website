import { useEffect, useState } from 'react';
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
    border: selected ? '1px solid #FFD700' : '1px solid transparent',
    borderBottom: selected ? '1px solid #FFD700' : '0.5px solid #1a1a1a',
    transition: 'all 0.1s',
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
    display: 'block', width: '100%', fontSize: 13, fontWeight: 600,
    padding: '10px', borderRadius: 6, textAlign: 'center',
    background: 'transparent', color: '#fff',
    border: '0.5px solid #FFD700', cursor: 'pointer',
    textDecoration: 'none', transition: 'all 0.15s', marginTop: 4,
  },
  noPanel: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#333', fontSize: 13 },
};

export default function Portal({ onSubmitRequest }) {
  const { user } = useUser();
  const [requests, setRequests] = useState([]);
  const [borrowerEmails, setBorrowerEmails] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  const email = user?.primaryEmailAddress?.emailAddress;

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
        if (rows.length > 0) setSelected(rows[0]);

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

  return (
    <div style={s.page}>
      <div style={s.heading}>My Loans</div>

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
            const isSelected = selected?.id === r.id;
            return (
              <div
                key={r.id}
                style={s.trow(isSelected)}
                onClick={() => setSelected(r)}
                onMouseEnter={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = '#191500';
                    e.currentTarget.style.border = '1px solid #3a3000';
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = '#141414';
                    e.currentTarget.style.border = '1px solid transparent';
                    e.currentTarget.style.borderBottom = '0.5px solid #1a1a1a';
                  }
                }}
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
                <div style={s.panelSectionLabel}>Loan Details</div>
                <div style={s.panelRow}>
                  <span style={s.panelKey}>Balance</span>
                  <span style={s.panelVal}>{formatCurrency(selected.total_due)}</span>
                </div>
                <div style={s.panelRow}>
                  <span style={s.panelKey}>Rate</span>
                  <span style={s.panelVal}>{selected.interest_rate ? selected.interest_rate + '%' : '—'}</span>
                </div>
                <div style={s.panelRow}>
                  <span style={s.panelKey}>Per diem</span>
                  <span style={s.panelVal}>{selected.per_diem ? formatCurrency(selected.per_diem) : '—'}</span>
                </div>
                <div style={s.panelRow}>
                  <span style={s.panelKey}>Loan start date</span>
                  <span style={s.panelVal}>{formatDate(selected.loan_start_date)}</span>
                </div>
                <div style={s.panelRow}>
                  <span style={s.panelKey}>Maturity date</span>
                  <span style={s.panelVal}>{formatDate(selected.maturity_date)}</span>
                </div>
              </div>

              <div style={s.panelSection}>
                <div style={s.panelSectionLabel}>Payment Info</div>
                <div style={s.panelRow}>
                  <span style={s.panelKey}>Payment status</span>
                  <span style={paymentStatusStyle(selected.payment_status)}>{selected.payment_status || '—'}</span>
                </div>
                <div style={s.panelRow}>
                  <span style={s.panelKey}>Last payment</span>
                  <span style={s.panelVal}>{formatDate(selected.last_payment_date)}</span>
                </div>
                <div style={s.panelRow}>
                  <span style={s.panelKey}>Next payment</span>
                  <span style={s.panelVal}>{formatDate(selected.next_payment_date)}</span>
                </div>
                <div style={s.panelRow}>
                  <span style={s.panelKey}>Days until next</span>
                  <span style={s.panelVal}>{daysUntil(selected.next_payment_date)}</span>
                </div>
                <div style={s.panelRow}>
                  <span style={s.panelKey}>Total payments made</span>
                  <span style={s.panelVal}>{selected.total_payments_made ?? '—'}</span>
                </div>
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
    </div>
  );
}
