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
  const completed = requests.filter(r => r.status?.toLowerCase() === 'completed' && r.created_at && r.updated_at);
  if (!completed.length) return '—';
  const avg = completed.reduce((sum, r) => {
    const diff = (new Date(r.updated_at) - new Date(r.created_at)) / 60000;
    return sum + diff;
  }, 0) / completed.length;
  if (avg < 60) return `${Math.round(avg)}m`;
  return `${Math.round(avg / 60)}hr`;
}

const s = {
  page: { padding: '48px 60px', maxWidth: 1100, margin: '0 auto' },
  heading: { fontSize: 24, fontWeight: 600, color: '#fff', marginBottom: 4 },
  sub: { fontSize: 13, color: '#555', marginBottom: 36 },
  statRow: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 32 },
  statCard: {
    background: '#141414', border: '0.5px solid #222',
    borderRadius: 10, padding: '22px 26px'
  },
  statLabel: { fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  statValue: { fontSize: 26, fontWeight: 600, color: '#fff' },
  card: { background: '#141414', border: '0.5px solid #222', borderRadius: 10, overflow: 'hidden' },
  thead: {
    display: 'grid',
    gridTemplateColumns: '130px 140px 1fr 130px 110px 100px 80px',
    padding: '10px 20px',
    borderBottom: '0.5px solid #222',
    fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: 0.8
  },
  trow: {
    display: 'grid',
    gridTemplateColumns: '130px 140px 1fr 130px 110px 100px 80px',
    padding: '16px 20px',
    borderBottom: '0.5px solid #1a1a1a',
    alignItems: 'center',
    fontSize: 13,
  },
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
    background: 'transparent', color: '#FFD700',
    border: '0.5px solid #FFD700', cursor: 'pointer',
    textDecoration: 'none', whiteSpace: 'nowrap',
  },
  empty: { padding: '60px 20px', textAlign: 'center', color: '#444', fontSize: 14 },
};

export default function Portal() {
  const { user } = useUser();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const email = user?.primaryEmailAddress?.emailAddress;

  useEffect(() => {
    if (!email) return;
    async function load() {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/payoff_requests?from_email=eq.${encodeURIComponent(email)}&order=created_at.desc`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            }
          }
        );
        const data = await res.json();
        setRequests(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [email]);

  const processed = requests.filter(r => r.status?.toLowerCase() === 'completed').length;
  const totalAmount = requests.reduce((sum, r) => sum + (parseFloat(r.total_due) || 0), 0);

  return (
    <div style={s.page}>
      <div style={s.heading}>My Requests</div>
      <div style={s.sub}>{email}</div>

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

      <div style={s.card}>
        <div style={s.thead}>
          <span>Date</span>
          <span>SD Loan ID</span>
          <span>Property</span>
          <span>Total Processed</span>
          <span>Status</span>
          <span>Statement</span>
          
          <span>Invoice</span>
        </div>

        {loading && <div style={s.empty}>Loading your requests...</div>}
        {!loading && requests.length === 0 && (
          <div style={s.empty}>No requests yet — submit your first request above.</div>
        )}

        {!loading && requests.map(r => {
          const isCompleted = r.status?.toLowerCase() === 'completed';
          return (
            <div key={r.id} style={s.trow}>
              <span style={{ color: '#555', fontSize: 12 }}>{formatDate(r.created_at)}</span>
              <span style={{ color: '#FFD700', fontSize: 12, fontFamily: 'monospace' }}>{r.loan_id || '—'}</span>
              <span style={{ color: '#aaa', fontSize: 12, paddingRight: 12 }}>{r.property_address || '—'}</span>
              <span style={{ fontWeight: 600, color: '#fff' }}>{formatCurrency(r.total_due)}</span>
              <span>
                <span style={s.badge(isCompleted ? 'green' : 'yellow')}>
                  {isCompleted ? 'Completed' : 'Pending'}
                </span>
              </span>
              <span>
                {r.payoff_statement_url
                  ? <a href={r.payoff_statement_url} target="_blank" rel="noreferrer" style={s.dlBtn}>Download</a>
                  : <span style={{ color: '#333', fontSize: 12 }}>Pending</span>
                }
              </span>
              
              <span>
                {r.invoice_url
                  ? <a href={r.invoice_url} target="_blank" rel="noreferrer" style={s.dlBtn}>View</a>
                  : <span style={{ color: '#333', fontSize: 12 }}>—</span>
                }
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
