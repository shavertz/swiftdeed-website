import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

const s = {
  page: { background: '#0f0f0f', minHeight: '100vh', color: '#f0f0f0', fontFamily: 'inherit' },
  main: { padding: '28px 32px' },
  loanHeader: { marginBottom: 20 },
  loanLabel: { fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 },
  loanName: { fontSize: 20, fontWeight: 500, color: '#fff' },
  loanId: { fontSize: 14, color: '#555', fontWeight: 400 },
  loanAddress: { fontSize: 13, color: '#555', marginTop: 2 },
  loanBar: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', border: '0.5px solid #2a2a2a', borderRadius: 10, overflow: 'hidden', marginBottom: 24 },
  loanStat: (last) => ({ padding: '16px 18px', borderRight: last ? 'none' : '0.5px solid #1e1e1e', background: '#111' }),
  lsLabel: { fontSize: 11, color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' },
  lsVal: { fontSize: 15, fontWeight: 500, color: '#fff' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 2fr 2fr', gap: 20, marginBottom: 20 },
  card: { background: '#111', border: '0.5px solid #2a2a2a', borderRadius: 10, overflow: 'hidden' },
  cardHead: { padding: '14px 18px', borderBottom: '0.5px solid #1e1e1e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 13, fontWeight: 500, color: '#fff' },
  cardBody: { padding: 18 },
  statGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  statBox: { background: '#1a1a1a', borderRadius: 8, padding: '12px 14px' },
  sbLabel: { fontSize: 11, color: '#555', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.4px' },
  sbVal: { fontSize: 16, fontWeight: 500, color: '#fff' },
  sbSub: { fontSize: 11, color: '#444', marginTop: 3 },
  payTitle: { fontSize: 12, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 },
  payBig: { fontSize: 32, fontWeight: 500, color: '#fff', marginBottom: 4 },
  payDue: { fontSize: 13, color: '#888', marginBottom: 16 },
  btnPay: { width: '100%', background: '#D4A017', color: '#0f0f0f', border: 'none', borderRadius: 7, padding: 12, fontSize: 14, fontWeight: 500, cursor: 'pointer', marginBottom: 8, transition: 'box-shadow 0.15s' },
  btnAutopay: { width: '100%', background: 'transparent', color: '#fff', border: '0.5px solid #FFD700', borderRadius: 7, padding: 10, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' },
  divider: { border: 'none', borderTop: '0.5px solid #1e1e1e', margin: '14px 0' },
  accrualBar: { background: '#1a1800', border: '0.5px solid #3a3000', borderRadius: 8, padding: '14px 16px', marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  accLabel: { fontSize: 12, color: '#888' },
  accSub: { fontSize: 11, color: '#555', marginTop: 2 },
  accVal: { fontSize: 15, fontWeight: 500, color: '#D4A017', textAlign: 'right' },
  accValSub: { fontSize: 11, color: '#555', marginTop: 2, textAlign: 'right' },
  infoRow: { display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '0.5px solid #1a1a1a', alignItems: 'center' },
  irLabel: { fontSize: 13, color: '#555' },
  irVal: { fontSize: 13, color: '#ccc' },
  stmtRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '0.5px solid #1a1a1a' },
  stmtInfo: { display: 'flex', flexDirection: 'column', gap: 2 },
  stmtName: { fontSize: 13, color: '#ccc' },
  stmtDate: { fontSize: 11, color: '#555' },
  stmtBtn: { background: 'transparent', border: '0.5px solid #FFD700', color: '#888', fontSize: 12, padding: '5px 12px', borderRadius: 5, cursor: 'pointer', transition: 'all 0.15s' },
  emptyWrap: { textAlign: 'center', padding: '80px 40px' },
  emptyTitle: { fontSize: 18, fontWeight: 500, color: '#fff', marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#555', lineHeight: 1.7, maxWidth: 400, margin: '0 auto' },
  editInput: { background: '#1a1a1a', border: '0.5px solid #2a2a2a', borderRadius: 6, padding: '6px 10px', fontSize: 13, color: '#fff', fontFamily: 'inherit', outline: 'none', width: '200px' },
  editBtn: { background: '#D4A017', color: '#0f0f0f', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', marginLeft: 8 },
  cancelBtn: { background: 'transparent', color: '#555', border: '0.5px solid #2a2a2a', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer', marginLeft: 4 },
  editIcon: { fontSize: 11, color: '#4a90b8', cursor: 'pointer', marginLeft: 8 },
  wireRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid #1a1a1a', alignItems: 'center' },
  wireLabel: { fontSize: 13, color: '#555' },
  wireVal: { fontSize: 13, color: '#ccc', textAlign: 'right' },
  wireRef: { fontSize: 13, color: '#D4A017', textAlign: 'right', fontFamily: 'monospace' },
  wireNote: { fontSize: 12, color: '#444', marginTop: 14, lineHeight: 1.6, background: '#1a1800', border: '0.5px solid #3a3000', borderRadius: 6, padding: '10px 12px' },
};

function fmt$(v) {
  if (v == null) return '—';
  return '$' + parseFloat(v).toLocaleString('en-US', { minimumFractionDigits: 2 });
}

function fmtPct(v) {
  if (v == null) return '—';
  const n = parseFloat(v);
  return (n % 1 === 0 ? n.toFixed(0) : n % 0.1 === 0 ? n.toFixed(1) : n.toFixed(3)) + '%';
}

function fmtDate(str) {
  if (!str) return '—';
  const d = new Date(str + 'T00:00:00');
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtStatus(str) {
  if (!str) return 'Active';
  return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatPhone(val) {
  const digits = val.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function getAlertConfig(daysUntil) {
  if (daysUntil < 0) return { bg: '#1a0000', border: '#3a0000', dot: '#ef4444', text: '#ef4444' };
  if (daysUntil === 0) return { bg: '#1a0000', border: '#3a0000', dot: '#ef4444', text: '#ef4444' };
  if (daysUntil <= 7) return { bg: '#1a0d00', border: '#3a1a00', dot: '#f97316', text: '#f97316' };
  return { bg: '#1a1800', border: '#3a3000', dot: '#D4A017', text: '#D4A017' };
}

function DonutChart({ principal, interestPaid, original }) {
  if (!original || original === 0) return null;
  const principalPaid = Math.max(0, original - principal);
  const remainingPct = Math.min(100, Math.max(0, (principal / original) * 100));
  const principalPaidPct = Math.min(100, Math.max(0, (principalPaid / original) * 100));
  const interestPct = Math.min(100, Math.max(0, (interestPaid / original) * 100));
  const circumference = 2 * Math.PI * 75;
  const remainingDash = (remainingPct / 100) * circumference;
  const principalDash = (principalPaidPct / 100) * circumference;
  const interestDash = (interestPct / 100) * circumference;
  const principalOffset = -(remainingDash);
  const interestOffset = -(remainingDash + principalDash);
  return (
    <svg width="200" height="200" viewBox="0 0 200 200">
      <circle cx="100" cy="100" r="75" fill="none" stroke="#1a1a1a" strokeWidth="22"/>
      <circle cx="100" cy="100" r="75" fill="none" stroke="#2a2a2a" strokeWidth="22"
        strokeDasharray={`${remainingDash} ${circumference - remainingDash}`}
        strokeDashoffset={0} transform="rotate(-90 100 100)"/>
      {principalDash > 0 && (
        <circle cx="100" cy="100" r="75" fill="none" stroke="#4a90b8" strokeWidth="22"
          strokeDasharray={`${principalDash} ${circumference - principalDash}`}
          strokeDashoffset={principalOffset} transform="rotate(-90 100 100)"/>
      )}
      {interestDash > 0 && (
        <circle cx="100" cy="100" r="75" fill="none" stroke="#D4A017" strokeWidth="22"
          strokeDasharray={`${interestDash} ${circumference - interestDash}`}
          strokeDashoffset={interestOffset} transform="rotate(-90 100 100)"/>
      )}
      <text x="100" y="94" textAnchor="middle" fontSize="13" fill="#555">Remaining</text>
      <text x="100" y="114" textAnchor="middle" fontSize="18" fontWeight="500" fill="#fff">
        {remainingPct.toFixed(1)}%
      </text>
    </svg>
  );
}

function WireInstructionsCard({ loanIdInternal }) {
  const [wire, setWire] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!loanIdInternal) return;
    async function fetchWire() {
      try {
        const reqRes = await fetch(
          `${SUPABASE_URL}/rest/v1/payoff_requests?loan_id_internal=eq.${encodeURIComponent(loanIdInternal)}&select=from_email&limit=1`,
          { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
        );
        const reqData = await reqRes.json();
        if (!Array.isArray(reqData) || reqData.length === 0) { setLoading(false); return; }
        const lenderEmail = reqData[0].from_email;
        if (!lenderEmail) { setLoading(false); return; }

        const lenderRes = await fetch(
          `${SUPABASE_URL}/rest/v1/lenders?email=eq.${encodeURIComponent(lenderEmail)}&select=wire_bank_name,wire_routing_number,wire_account_number,wire_account_name,wire_bank_address&limit=1`,
          { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
        );
        const lenderData = await lenderRes.json();
        if (Array.isArray(lenderData) && lenderData.length > 0) {
          setWire(lenderData[0]);
        }
      } catch (e) {
        console.error('Wire fetch error:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchWire();
  }, [loanIdInternal]);

  const hasWire = wire && wire.wire_bank_name && wire.wire_routing_number && wire.wire_account_number;

  return (
    <div style={{ ...s.card, marginBottom: 20 }}>
      <div style={s.cardHead}>
        <div style={s.cardTitle}>Wire instructions</div>
        <span style={{ fontSize: 12, color: '#555' }}>For balloon & payoff payments</span>
      </div>
      <div style={s.cardBody}>
        {loading ? (
          <div style={{ fontSize: 13, color: '#555', textAlign: 'center', padding: '16px 0' }}>Loading...</div>
        ) : !hasWire ? (
          <div style={{ fontSize: 13, color: '#555', textAlign: 'center', padding: '16px 0' }}>
            Wire details not on file yet. Contact your lender directly.
          </div>
        ) : (
          <>
            <div style={s.wireRow}>
              <span style={s.wireLabel}>Bank</span>
              <span style={s.wireVal}>{wire.wire_bank_name}</span>
            </div>
            <div style={s.wireRow}>
              <span style={s.wireLabel}>Account name</span>
              <span style={s.wireVal}>{wire.wire_account_name}</span>
            </div>
            <div style={s.wireRow}>
              <span style={s.wireLabel}>Routing number</span>
              <span style={s.wireVal}>{wire.wire_routing_number}</span>
            </div>
            <div style={s.wireRow}>
              <span style={s.wireLabel}>Account number</span>
              <span style={s.wireVal}>{wire.wire_account_number}</span>
            </div>
            {wire.wire_bank_address && (
              <div style={s.wireRow}>
                <span style={s.wireLabel}>Bank address</span>
                <span style={s.wireVal}>{wire.wire_bank_address}</span>
              </div>
            )}
            <div style={{ ...s.wireRow, borderBottom: 'none' }}>
              <span style={s.wireLabel}>Reference / memo</span>
              <span style={s.wireRef}>{loanIdInternal}</span>
            </div>
            <div style={s.wireNote}>
              Always include your loan ID in the memo field of your wire. Contact your lender to confirm receipt before closing.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function BorrowerPortal({ onHome }) {
  const { user } = useUser();
  const [borrower, setBorrower] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchBorrower();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchBorrower() {
    setLoading(true);
    const userEmail = user?.primaryEmailAddress?.emailAddress;
    const hash = window.location.hash;
    const token = hash.startsWith('#activate=') ? hash.slice('#activate='.length) : null;

    if (token) {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/borrowers?verification_token=eq.${token}&limit=1&select=*`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        await fetch(`${SUPABASE_URL}/rest/v1/borrowers?id=eq.${data[0].id}`, {
          method: 'PATCH',
          headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify({ borrower_email: userEmail }),
        });
        setBorrower({ ...data[0], borrower_email: userEmail });
        setLoading(false);
        return;
      }
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/borrowers?borrower_email=ilike.${encodeURIComponent(userEmail)}&limit=1&select=*`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    const data = await res.json();
    if (data && data.length > 0) setBorrower(data[0]);
    setLoading(false);
  }

  const email = user?.primaryEmailAddress?.emailAddress || '';
  const isPaidOff = parseFloat(borrower?.principal_balance) === 0 || borrower?.status === 'paid_off';
  const perDiem = isPaidOff ? 0 : (borrower?.per_diem || 0);
  const today = new Date();
  const nextPayment = borrower?.next_payment_date ? new Date(borrower.next_payment_date + 'T00:00:00') : null;
  const daysUntil = nextPayment && !isNaN(nextPayment.getTime()) ? Math.ceil((nextPayment - today) / (1000 * 60 * 60 * 24)) : null;
  const showAlert = borrower && !isPaidOff && daysUntil !== null && daysUntil <= 14;
  const alertConfig = daysUntil !== null ? getAlertConfig(daysUntil) : null;
  const docUrls = borrower?.loan_document_urls ? borrower.loan_document_urls.split(',').map(u => u.trim()).filter(Boolean) : [];

  return (
    <div style={s.page}>
      {showAlert && alertConfig && (
        <div style={{ background: alertConfig.bg, borderBottom: `0.5px solid ${alertConfig.border}`, padding: '10px 32px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: alertConfig.dot, flexShrink: 0 }}></div>
          <div style={{ fontSize: 13, color: alertConfig.text }}>
            {daysUntil < 0
              ? <>Your payment of <strong>{fmt$(borrower.last_payment_amount)}</strong> was due on <strong>{fmtDate(borrower.next_payment_date)}</strong> — <strong>overdue.</strong></>
              : daysUntil === 0
              ? <>Your payment of <strong>{fmt$(borrower.last_payment_amount)}</strong> is due <strong>today.</strong></>
              : <>Your next payment of <strong>{fmt$(borrower.last_payment_amount)}</strong> is due on <strong>{fmtDate(borrower.next_payment_date)}</strong> — {daysUntil} day{daysUntil !== 1 ? 's' : ''} away.</>
            }
          </div>
        </div>
      )}

      <div style={s.main}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#555', fontSize: 14 }}>Loading your loan...</div>
        ) : !borrower ? (
          <div style={s.emptyWrap}>
            <div style={s.emptyTitle}>Your loan hasn't been processed yet</div>
            <div style={s.emptyText}>
              Once your lender submits your loan documents to SwiftDeed, your account will be activated and you'll receive a confirmation email at <strong style={{ color: '#D4A017' }}>{email}</strong>.
            </div>
          </div>
        ) : (
          <>
            <div style={s.loanHeader}>
              <div style={s.loanLabel}>Loan account</div>
              <div style={s.loanName}>
                {borrower.legal_name}
                <span style={s.loanId}> · {borrower.loan_id_internal}</span>
              </div>
              <div style={s.loanAddress}>{borrower.property_address}</div>
            </div>

            <div style={s.loanBar}>
              <div style={s.loanStat(false)}>
                <div style={s.lsLabel}>Principal balance</div>
                <div style={{ ...s.lsVal, color: isPaidOff ? '#4a9a4a' : '#D4A017' }}>{isPaidOff ? '$0.00' : fmt$(borrower.principal_balance)}</div>
              </div>
              <div style={s.loanStat(false)}>
                <div style={s.lsLabel}>Interest rate</div>
                <div style={s.lsVal}>{fmtPct(borrower.interest_rate)}</div>
              </div>
              <div style={s.loanStat(false)}>
                <div style={s.lsLabel}>Per diem</div>
                <div style={s.lsVal}>{isPaidOff ? '$0.00' : `${fmt$(perDiem)} / day`}</div>
              </div>
              <div style={s.loanStat(false)}>
                <div style={s.lsLabel}>Next payment</div>
                <div style={s.lsVal}>{isPaidOff ? '—' : fmtDate(borrower.next_payment_date)}</div>
              </div>
              <div style={s.loanStat(true)}>
                <div style={s.lsLabel}>Loan status</div>
                <div style={{ ...s.lsVal, color: '#4a9a4a' }}>{fmtStatus(borrower.status)}</div>
              </div>
            </div>

            <div style={s.grid2}>
              <div style={s.card}>
                <div style={s.cardHead}>
                  <div style={s.cardTitle}>{isPaidOff ? 'Loan summary' : 'Make a payment'}</div>
                  {!isPaidOff && <span style={{ fontSize: 11, color: '#4a9a4a' }}>ACH / Wire</span>}
                </div>
                <div style={s.cardBody}>
                  {isPaidOff ? (
                    <>
                      <div style={{ textAlign: 'center', padding: '20px 0 24px' }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
                        <div style={{ fontSize: 16, fontWeight: 500, color: '#4a9a4a', marginBottom: 6 }}>Loan paid in full</div>
                        <div style={{ fontSize: 13, color: '#555' }}>All payments have been received. Thank you.</div>
                      </div>
                      <div style={s.divider}></div>
                      <div style={s.statGrid}>
                        <div style={s.statBox}>
                          <div style={s.sbLabel}>Final payment</div>
                          <div style={s.sbVal}>{fmt$(borrower.last_payment_amount)}</div>
                          <div style={s.sbSub}>{fmtDate(borrower.last_payment_date)}</div>
                        </div>
                        <div style={s.statBox}>
                          <div style={s.sbLabel}>Total payments</div>
                          <div style={s.sbVal}>{borrower.total_payments_made ?? '—'}</div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={s.payTitle}>Amount due</div>
                      <div style={s.payBig}>{fmt$(borrower.last_payment_amount)}</div>
                      <div style={s.payDue}>Due {fmtDate(borrower.next_payment_date)} · Monthly payment</div>
                      <button style={s.btnPay}
                        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 16px rgba(255, 215, 0, 0.45)'; }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
                      >Make a one-time payment</button>
                      <button style={s.btnAutopay}
                        onMouseEnter={e => { e.currentTarget.style.background = '#1e1a00'; e.currentTarget.style.color = '#FFD700'; e.currentTarget.style.boxShadow = '0 0 16px rgba(255, 215, 0, 0.3)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.boxShadow = 'none'; }}
                      >Set up autopay</button>
                      <div style={s.divider}></div>
                      <div style={s.statGrid}>
                        <div style={s.statBox}>
                          <div style={s.sbLabel}>Last payment</div>
                          <div style={s.sbVal}>{fmt$(borrower.last_payment_amount)}</div>
                          <div style={s.sbSub}>{fmtDate(borrower.last_payment_date)}</div>
                        </div>
                        <div style={s.statBox}>
                          <div style={s.sbLabel}>Loan start</div>
                          <div style={{ ...s.sbVal, fontSize: 13 }}>{fmtDate(borrower.loan_start_date)}</div>
                        </div>
                      </div>
                      <div style={s.accrualBar}>
                        <div>
                          <div style={s.accLabel}>Interest accruing today</div>
                          <div style={s.accSub}>Updates daily at midnight</div>
                        </div>
                        <div>
                          <div style={s.accVal}>+{fmt$(perDiem)}</div>
                          <div style={s.accValSub}>{fmt$(perDiem * today.getDate())} this period</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div style={s.card}>
                <div style={s.cardHead}><div style={s.cardTitle}>Loan breakdown</div></div>
                <div style={s.cardBody}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                    <DonutChart principal={borrower.principal_balance} interestPaid={borrower.total_interest_paid || 0} original={borrower.original_loan_amount} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#666' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 9, height: 9, borderRadius: '50%', background: '#2a2a2a', flexShrink: 0 }}></div>Remaining balance</div>
                      <span style={{ color: '#888' }}>{fmt$(borrower.principal_balance)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#666' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 9, height: 9, borderRadius: '50%', background: '#4a90b8', flexShrink: 0 }}></div>Principal paid</div>
                      <span style={{ color: '#888' }}>{fmt$(borrower.original_loan_amount ? borrower.original_loan_amount - borrower.principal_balance : null)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#666' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 9, height: 9, borderRadius: '50%', background: '#D4A017', flexShrink: 0 }}></div>Interest paid</div>
                      <span style={{ color: '#888' }}>{fmt$(borrower.total_interest_paid)}</span>
                    </div>
                  </div>
                  <div style={s.statGrid}>
                    <div style={s.statBox}><div style={s.sbLabel}>Principal balance</div><div style={{ ...s.sbVal, color: '#D4A017' }}>{fmt$(borrower.principal_balance)}</div></div>
                    <div style={s.statBox}><div style={s.sbLabel}>Interest rate</div><div style={s.sbVal}>{fmtPct(borrower.interest_rate)}</div></div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={s.card}>
                  <div style={s.cardHead}><div style={s.cardTitle}>Loan details</div></div>
                  <div style={s.cardBody}>
                    <div style={s.infoRow}>
                      <span style={s.irLabel}>Loan ID</span>
                      <span style={{ ...s.irVal, color: '#4a90b8', fontFamily: 'monospace', fontSize: 12 }}>{borrower.loan_id_internal}</span>
                    </div>
                    <div style={s.infoRow}>
                      <span style={s.irLabel}>Origination date</span>
                      <span style={s.irVal}>{fmtDate(borrower.loan_start_date)}</span>
                    </div>
                    <div style={s.infoRow}>
                      <span style={s.irLabel}>Interest rate</span>
                      <span style={s.irVal}>{fmtPct(borrower.interest_rate)}</span>
                    </div>
                    <div style={s.infoRow}>
                      <span style={s.irLabel}>Per diem</span>
                      <span style={s.irVal}>{isPaidOff ? '$0.00' : `${fmt$(perDiem)} / day`}</span>
                    </div>
                    <div style={{ ...s.infoRow, borderBottom: 'none' }}>
                      <span style={s.irLabel}>Servicer</span>
                      <span style={{ ...s.irVal, color: '#D4A017' }}>SwiftDeed LLC</span>
                    </div>
                  </div>
                </div>
                <div style={s.card}>
                  <div style={s.cardHead}><div style={s.cardTitle}>Loan documents</div></div>
                  <div style={s.cardBody}>
                    {docUrls.length === 0 ? (
                      <div style={{ fontSize: 13, color: '#555', textAlign: 'center', padding: '20px 0' }}>No documents available yet</div>
                    ) : docUrls.map((url, i) => {
                      const name = url.split('/').pop().replace(/^\d+_/, '').replace(/[-_]/g, ' ').replace('.pdf', '').replace(/\s+/g, ' ').trim();
                      return (
                        <div key={i} style={{ ...s.stmtRow, borderBottom: i === docUrls.length - 1 ? 'none' : '0.5px solid #1a1a1a' }}>
                          <div style={s.stmtInfo}>
                            <div style={s.stmtName}>{name}</div>
                            <div style={s.stmtDate}>Loan document</div>
                          </div>
                          <button style={s.stmtBtn} onClick={() => window.open(url, '_blank')}
                            onMouseEnter={e => { e.currentTarget.style.background = '#1e1a00'; e.currentTarget.style.color = '#FFD700'; e.currentTarget.style.boxShadow = '0 0 16px rgba(255, 215, 0, 0.3)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#888'; e.currentTarget.style.boxShadow = 'none'; }}
                          >Download PDF</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ ...s.card, marginBottom: 20 }}>
              <div style={s.cardHead}>
                <div style={s.cardTitle}>Statements</div>
                <span style={{ fontSize: 12, color: '#555' }}>Monthly statements coming soon</span>
              </div>
              <div style={{ padding: '32px', textAlign: 'center', color: '#555', fontSize: 13 }}>
                Monthly statements will appear here once generated. Your first statement will be sent to <span style={{ color: '#D4A017' }}>{email}</span>.
              </div>
            </div>

            <WireInstructionsCard loanIdInternal={borrower.loan_id_internal} />


          </>
        )}
      </div>
    </div>
  );
}
