import { useState, useEffect } from 'react';
import { calculatePayment } from '../utils/calculatePayment';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

function fmt$(n) {
  if (n == null) return '—';
  return '$' + parseFloat(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(s) {
  if (!s) return '—';
  const d = new Date(s + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function today() {
  return new Date().toISOString().split('T')[0];
}

const s = {
  page: { background: '#0f0f0f', minHeight: '100vh', color: '#f0f0f0', fontFamily: 'DM Sans, system-ui, sans-serif', padding: '40px 60px' },
  h1: { fontSize: 22, fontWeight: 600, color: '#fff', marginBottom: 4 },
  sub: { fontSize: 13, color: '#555', marginBottom: 32 },
  card: { background: '#141414', border: '0.5px solid #2a2a2a', borderRadius: 10, padding: '24px 28px', marginBottom: 20 },
  label: { fontSize: 11, color: '#555', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 },
  value: { fontSize: 15, color: '#f0f0f0' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px 32px', marginBottom: 4 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px 32px' },
  sectionTitle: { fontSize: 13, fontWeight: 600, color: '#FFD700', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 16 },
  input: { background: '#1e1e1e', border: '0.5px solid #333', borderRadius: 6, color: '#fff', fontSize: 14, padding: '10px 14px', width: '100%', boxSizing: 'border-box', fontFamily: 'DM Sans, system-ui, sans-serif', outline: 'none' },
  btnPrimary: { background: '#FFD700', color: '#0f0f0f', fontSize: 14, fontWeight: 600, padding: '11px 28px', borderRadius: 7, border: 'none', cursor: 'pointer' },
  btnDanger: { background: '#c0392b', color: '#fff', fontSize: 14, fontWeight: 600, padding: '11px 28px', borderRadius: 7, border: 'none', cursor: 'pointer' },
  btnGhost: { background: 'transparent', color: '#aaa', fontSize: 14, padding: '11px 20px', borderRadius: 7, border: '0.5px solid #333', cursor: 'pointer' },
  tag: (color) => ({ display: 'inline-block', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 4, background: color === 'green' ? '#0d2e1a' : color === 'red' ? '#2e0d0d' : '#1a1400', color: color === 'green' ? '#2ecc71' : color === 'red' ? '#e74c3c' : '#FFD700', border: `0.5px solid ${color === 'green' ? '#2ecc71' : color === 'red' ? '#e74c3c' : '#FFD700'}` }),
  divider: { borderTop: '0.5px solid #2a2a2a', margin: '20px 0' },
  row: { display: 'flex', gap: 12, alignItems: 'center', marginTop: 20 },
  resultRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '0.5px solid #1e1e1e' },
  arrow: { color: '#555', fontSize: 13, margin: '0 8px' },
};

export default function PaymentTest() {
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentDate, setPaymentDate] = useState(today());
  const [overrideAmount, setOverrideAmount] = useState('');
  const [result, setResult] = useState(null);
  const [calcError, setCalcError] = useState(null);
  const [writing, setWriting] = useState(false);
  const [writeSuccess, setWriteSuccess] = useState(false);

  useEffect(() => { fetchLoan(); }, []);

  async function fetchLoan() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/borrowers?id=eq.20&select=*&limit=1`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
      );
      const data = await res.json();
      if (!data || data.length === 0) throw new Error('Borrower row not found');
      setLoan(data[0]);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  function runCalculation() {
    setCalcError(null);
    setResult(null);
    setWriteSuccess(false);
    const amount = overrideAmount ? parseFloat(overrideAmount) : null;
    const r = calculatePayment(loan, paymentDate, amount);
    if (r.error) { setCalcError(r.error); return; }
    setResult(r);
  }

  async function writeToSupabase() {
    if (!result) return;
    setWriting(true);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/borrowers?id=eq.20`,
        {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify(result.updates),
        }
      );
      if (!res.ok) throw new Error('Write failed');
      setWriteSuccess(true);
      await fetchLoan();
      setResult(null);
      setOverrideAmount('');
    } catch (e) {
      setCalcError('Write to Supabase failed: ' + e.message);
    }
    setWriting(false);
  }

  if (loading) return <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: '#555' }}>Loading loan data...</div></div>;
  if (error) return <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: '#e74c3c' }}>Error: {error}</div></div>;

  const { breakdown, updates } = result || {};

  return (
    <div style={s.page}>
      <div style={s.h1}>Payment Calculator — Test Utility</div>
      <div style={s.sub}>Admin only · Simulates a payment against live Supabase data · Does not charge anything</div>

      {/* Current Loan State */}
      <div style={s.card}>
        <div style={s.sectionTitle}>Current Loan State</div>
        <div style={s.grid}>
          <div><div style={s.label}>Borrower</div><div style={s.value}>{loan.legal_name}</div></div>
          <div><div style={s.label}>Loan ID</div><div style={s.value}>{loan.loan_id_internal}</div></div>
          <div><div style={s.label}>Loan Type</div><div style={s.value}><span style={s.tag('yellow')}>{loan.loan_type}</span></div></div>
          <div><div style={s.label}>Day Count</div><div style={s.value}>{loan.day_count_convention}</div></div>
        </div>
        <div style={s.divider} />
        <div style={s.grid}>
          <div><div style={s.label}>Principal Balance</div><div style={{ fontSize: 18, fontWeight: 600, color: '#2ecc71' }}>{fmt$(loan.principal_balance)}</div></div>
          <div><div style={s.label}>Interest Rate</div><div style={s.value}>{loan.interest_rate}%</div></div>
          <div><div style={s.label}>Per Diem</div><div style={s.value}>{fmt$(loan.per_diem)}/day</div></div>
          <div><div style={s.label}>Monthly Payment</div><div style={s.value}>{fmt$(loan.monthly_payment)}</div></div>
        </div>
        <div style={s.divider} />
        <div style={s.grid}>
          <div><div style={s.label}>Last Payment</div><div style={s.value}>{fmtDate(loan.last_payment_date)}</div></div>
          <div><div style={s.label}>Next Payment</div><div style={s.value}>{fmtDate(loan.next_payment_date)}</div></div>
          <div><div style={s.label}>Maturity Date</div><div style={s.value}>{fmtDate(loan.maturity_date)}</div></div>
          <div><div style={s.label}>Payment Status</div><div style={s.value}><span style={s.tag(loan.payment_status === 'Current' ? 'green' : loan.payment_status === 'Paid Off' ? 'green' : 'red')}>{loan.payment_status}</span></div></div>
        </div>
        <div style={s.divider} />
        <div style={s.grid3}>
          <div><div style={s.label}>Total Interest Paid</div><div style={s.value}>{fmt$(loan.total_interest_paid)}</div></div>
          <div><div style={s.label}>Total Payments Made</div><div style={s.value}>{loan.total_payments_made}</div></div>
          <div><div style={s.label}>Original Loan Amount</div><div style={s.value}>{fmt$(loan.original_loan_amount)}</div></div>
        </div>
      </div>

      {/* Payment Inputs */}
      <div style={s.card}>
        <div style={s.sectionTitle}>Simulate a Payment</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <div style={s.label}>Payment Initiation Date</div>
            <input
              type="date"
              value={paymentDate}
              onChange={e => { setPaymentDate(e.target.value); setResult(null); setWriteSuccess(false); }}
              style={s.input}
            />
            <div style={{ fontSize: 12, color: '#555', marginTop: 6 }}>Interest stops accruing on this date</div>
          </div>
          <div>
            <div style={s.label}>Override Payment Amount (optional)</div>
            <input
              type="number"
              placeholder={`Default: ${fmt$(loan.monthly_payment)}`}
              value={overrideAmount}
              onChange={e => { setOverrideAmount(e.target.value); setResult(null); setWriteSuccess(false); }}
              style={s.input}
            />
            <div style={{ fontSize: 12, color: '#555', marginTop: 6 }}>Leave blank for standard monthly payment</div>
          </div>
        </div>
        <div style={s.row}>
          <button style={s.btnPrimary} onClick={runCalculation}>Calculate</button>
          <button style={s.btnGhost} onClick={() => { setResult(null); setCalcError(null); setOverrideAmount(''); setPaymentDate(today()); setWriteSuccess(false); }}>Reset</button>
        </div>
        {calcError && <div style={{ marginTop: 16, color: '#e74c3c', fontSize: 13 }}>⚠ {calcError}</div>}
        {writeSuccess && <div style={{ marginTop: 16, color: '#2ecc71', fontSize: 13 }}>✓ Supabase updated successfully — loan state above has been refreshed</div>}
      </div>

      {/* Calculation Result */}
      {result && (
        <div style={s.card}>
          <div style={s.sectionTitle}>
            Calculation Breakdown
            {breakdown.isBalloon && <span style={{ ...s.tag('red'), marginLeft: 12 }}>BALLOON PAYMENT</span>}
            {breakdown.isPaidOff && <span style={{ ...s.tag('green'), marginLeft: 12 }}>LOAN PAID OFF</span>}
          </div>

          {/* Math breakdown */}
          <div style={{ marginBottom: 20 }}>
            <div style={s.resultRow}>
              <span style={{ color: '#aaa', fontSize: 14 }}>Days elapsed since last payment</span>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{breakdown.daysElapsed} days</span>
            </div>
            <div style={s.resultRow}>
              <span style={{ color: '#aaa', fontSize: 14 }}>Effective per diem ({loan.day_count_convention}-day convention)</span>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{fmt$(breakdown.effectivePerDiem)}/day</span>
            </div>
            <div style={s.resultRow}>
              <span style={{ color: '#aaa', fontSize: 14 }}>Interest portion ({breakdown.daysElapsed} days × {fmt$(breakdown.effectivePerDiem)})</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#e67e22' }}>{fmt$(breakdown.interestPortion)}</span>
            </div>
            <div style={s.resultRow}>
              <span style={{ color: '#aaa', fontSize: 14 }}>Principal portion</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#3498db' }}>{fmt$(breakdown.principalPortion)}</span>
            </div>
            <div style={{ ...s.resultRow, borderBottom: 'none' }}>
              <span style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>Total payment</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#FFD700' }}>{fmt$(breakdown.actualPayment)}</span>
            </div>
          </div>

          <div style={s.divider} />

          {/* What will change */}
          <div style={{ ...s.sectionTitle, marginTop: 16 }}>What Will Change in Supabase</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px 32px', marginBottom: 20 }}>
            {[
              { label: 'Principal Balance', old: loan.principal_balance, new: updates.principal_balance },
              { label: 'Total Interest Paid', old: loan.total_interest_paid, new: updates.total_interest_paid },
              { label: 'Total Payments Made', old: loan.total_payments_made, new: updates.total_payments_made, raw: true },
              { label: 'Last Payment Date', old: fmtDate(loan.last_payment_date), new: fmtDate(updates.last_payment_date), raw: true },
              { label: 'Next Payment Date', old: fmtDate(loan.next_payment_date), new: updates.next_payment_date ? fmtDate(updates.next_payment_date) : '—', raw: true },
              { label: 'Payment Status', old: loan.payment_status, new: updates.payment_status, raw: true },
            ].map(({ label, old: oldVal, new: newVal, raw }) => (
              <div key={label}>
                <div style={s.label}>{label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, color: '#555' }}>{raw ? oldVal : fmt$(oldVal)}</span>
                  <span style={s.arrow}>→</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{raw ? newVal : fmt$(newVal)}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={s.divider} />
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 16 }}>
            <button style={s.btnDanger} onClick={writeToSupabase} disabled={writing}>
              {writing ? 'Writing...' : 'Confirm — Write to Supabase'}
            </button>
            <button style={s.btnGhost} onClick={() => { setResult(null); setWriteSuccess(false); }}>Cancel</button>
            <span style={{ fontSize: 12, color: '#555' }}>This will update the live borrowers row and refresh both portals</span>
          </div>
        </div>
      )}
    </div>
  );
}
