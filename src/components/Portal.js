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

function avgTurnaround(requests) {
  const completed = requests.filter(r => r.status?.toLowerCase() === 'completed' && r.created_at && r.completed_at);
  if (!completed.length) return '—';
  const avg = completed.reduce((sum, r) => {
    const diff = (new Date(r.completed_at) - new Date(r.created_at)) / 60000;
    return sum + diff;
  }, 0) / completed.length;
  if (avg < 60) return `${Math.round(avg)}m`;
  return `${Math.round(avg / 60)}hr`;
}

function turnaroundLabel(r) {
  if (!r.created_at || !r.completed_at) return '—';
  const mins = Math.round((new Date(r.completed_at) - new Date(r.created_at)) / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.round(mins / 60)}hr`;
}

const PAGE_SIZE = 15;
const COLS = '110px 130px 120px 1fr 80px 100px 100px 130px 160px';

const s = {
  page: { padding: '40px 60px', maxWidth: 1400, margin: '0 auto' },
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  heading: { fontSize: 24, fontWeight: 400, color: '#fff' },
  statRow: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 },
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
    whiteSpace: 'nowrap', marginLeft: 'auto',
  },
  card: { background: '#141414', border: '0.5px solid #222', borderRadius: 10, overflow: 'hidden' },
  thead: {
    display: 'grid',
    gridTemplateColumns: COLS,
    padding: '10px 20px',
    borderBottom: '0.5px solid #222',
    fontSize: 10, color: '#FFD700', textTransform: 'uppercase', letterSpacing: 0.8,
  },
  trow: {
    display: 'grid',
    gridTemplateColumns: COLS,
    padding: '13px 20px',
    borderBottom: '0.5px solid #1a1a1a',
    alignItems: 'center',
    fontSize: 12,
  },
  grey: { color: '#555' },
  badge: (color) => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 4,
    background: color === 'green' ? '#0a2416' : '#1f1800',
    color: color === 'green' ? '#34d399' : '#FFD700',
    border: `0.5px solid ${color === 'green' ? '#065f46' : '#78350f'}`,
    whiteSpace: 'nowrap',
  }),
  dlBtn: {
    display: 'inline-block', fontSize: 11, fontWeight: 500,
    padding: '5px 10px', borderRadius: 5,
    background: 'transparent', color: '#888',
    border: '0.5px solid #FFD700', cursor: 'pointer',
    textDecoration: 'none', whiteSpace: 'nowrap',
  },
  empty: { padding: '60px 20px', textAlign: 'center', color: '#444', fontSize: 14 },
  pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '0.5px solid #1a1a1a' },
  pageBtn: (disabled) => ({
    background: 'transparent', border: '0.5px solid #2a2a2a', borderRadius: 5,
    color: disabled ? '#333' : '#fff', fontSize: 12, padding: '6px 14px',
    cursor: disabled ? 'not-allowed' : 'pointer',
  }),
  pageInfo: { fontSize: 12, color: '#555' },
};

export default function Portal({ onSubmitRequest }) {
  const { user } = useUser();
  const [requests, setRequests] = useState([]);
  const [borrowerEmails, setBorrowerEmails] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

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
      r.borrower_name?.toLowerCase().includes(q) ||
      r.property_address?.toLowerCase().includes(q);
    const matchStatus =
      sort === 'completed' ? r.status?.toLowerCase() === 'completed' :
      sort === 'pending' ? r.status?.toLowerCase() !== 'completed' :
      true;
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
  const processed = requests.filter(r => r.status?.toLowerCase() === 'completed').length;
  const totalAmount = requests.reduce((sum, r) => sum + (parseFloat(r.total_due) || 0), 0);

  return (
    <div style={s.page}>
      <div style={s.topRow}>
        <div style={s.heading}>My Loans</div>
      </div>

      <div style={s.statRow}>
        <div style={s.statCard}>
          <div style={s.statLabel}>Processed Statements</div>
          <div style={s.statValue}>{processed}</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>Avg. Turnaround</div>
          <div style={s.statValue}>{avgTurnaround(requests)}</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>Total Amount Processed</div>
          <div style={s.statValue}>{formatCurrency(totalAmount)}</div>
        </div>
      </div>

      <div style={s.controlRow}>
        <input
          style={s.searchInput}
          placeholder="Search by loan ID, borrower, or property..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          style={s.select}
          value={sort}
          onChange={e => { setSort(e.target.value); setPage(1); }}
        >
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
        <button style={s.serviceBtn} onClick={onSubmitRequest}>+ Service a loan</button>
      </div>

      <div style={s.card}>
        <div style={s.thead}>
          <span>Date Serviced</span>
          <span>Loan ID</span>
          <span>Amount</span>
          <span>Property</span>
          <span>Turnaround</span>
          <span>Status</span>
          <span>Statement</span>
          <span>Borrower</span>
          <span>Borrower Email</span>
        </div>

        {loading && <div style={s.empty}>Loading your loans...</div>}
        {!loading && sorted.length === 0 && (
          <div style={s.empty}>{search ? 'No results found.' : 'No loans yet — service your first loan above.'}</div>
        )}

        {!loading && paginated.map(r => {
          const isCompleted = r.status?.toLowerCase() === 'completed';
          const borrowerEmail = borrowerEmails[r.loan_id_internal] || '—';
          return (
            <div key={r.id} style={s.trow}>
              <span style={s.grey}>{formatDate(r.created_at)}</span>
              <span style={s.grey}>{r.loan_id_internal || r.loan_id || '—'}</span>
              <span style={{ fontWeight: 600, color: '#fff' }}>{formatCurrency(r.total_due)}</span>
              <span style={s.grey}>{r.property_address || '—'}</span>
              <span style={s.grey}>{turnaroundLabel(r)}</span>
              <span>
                <span style={s.badge(isCompleted ? 'green' : 'yellow')}>
                  {isCompleted ? 'Completed' : 'Pending'}
                </span>
              </span>
              <span>
                {r.payoff_statement_url
                  ? <a href={r.payoff_statement_url} target="_blank" rel="noreferrer" style={s.dlBtn}>Download</a>
                  : <span style={s.grey}>—</span>
                }
              </span>
              <span style={s.grey}>{r.borrower_name || '—'}</span>
              <span style={{ ...s.grey, fontSize: 11 }}>{borrowerEmail}</span>
            </div>
          );
        })}

        {!loading && sorted.length > PAGE_SIZE && (
          <div style={s.pagination}>
            <button style={s.pageBtn(page === 1)} disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={s.pageInfo}>Page {page} of {totalPages} · {sorted.length} total</span>
            <button style={s.pageBtn(page === totalPages)} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
