import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

const s = {
  page: { background: '#0f0f0f', minHeight: '100vh', color: '#f0f0f0', fontFamily: 'inherit' },
  nav: { display: 'none' },
  alertBar: { background: '#1a1800', borderBottom: '0.5px solid #3a3000', padding: '10px 32px', display: 'flex', alignItems: 'center', gap: 10 },
  alertDot: { width: 7, height: 7, borderRadius: '50%', background: '#D4A017', flexShrink: 0 },
  alertText: { fontSize: 13, color: '#D4A017' },
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
  btnPay: { width: '100%', background: '#D4A017', color: '#0f0f0f', border: 'none', borderRadius: 7, padding: 12, fontSize: 14, fontWeight: 500, cursor: 'pointer', marginBottom: 8 },
  btnAutopay: { width: '100%', background: 'transparent', color: '#fff', border: '0.5px solid #333', borderRadius: 7, padding: 10, fontSize: 13, cursor: 'pointer' },
  divider: { border: 'none', borderTop: '0.5px solid #1e1e1e', margin: '14px 0' },
  accrualBar: { background: '#1a1800', border: '0.5px solid #3a3000', borderRadius: 8, padding: '14px 16px', marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  accLabel: { fontSize: 12, color: '#888' },
  accSub: { fontSize: 11, color: '#555', marginTop: 2 },
  accVal: { fontSize: 15, fontWeight: 500, color: '#D4A017', textAlign: 'right' },
  accValSub: { fontSize: 11, color: '#555', marginTop: 2, textAlign: 'right' },
  chartRow: { display: 'grid', gridTemplateColumns: '130px 1fr', gap: 16, alignItems: 'center' },
  legend: { display: 'flex', flexDirection: 'column', gap: 7, marginTop: 12 },
  legItem: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#666' },
  legDot: { width: 9, height: 9, borderRadius: '50%', flexShrink: 0 },
  infoRow: { display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '0.5px solid #1a1a1a' },
  irLabel: { fontSize: 13, color: '#555' },
  irVal: { fontSize: 13, color: '#ccc' },
  histHead: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, paddingBottom: 8, borderBottom: '0.5px solid #1e1e1e', marginBottom: 2 },
  hh: { fontSize: 11, color: '#444', textTransform: 'uppercase', letterSpacing: '0.4px' },
  histRow: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, padding: '10px 0', borderBottom: '0.5px solid #1a1a1a', alignItems: 'center' },
  stmtRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '0.5px solid #1a1a1a' },
  stmtInfo: { display: 'flex', flexDirection: 'column', gap: 2 },
  stmtName: { fontSize: 13, color: '#ccc' },
  stmtDate: { fontSize: 11, color: '#555' },
  stmtBtn: { background: '#1a1a1a', border: '0.5px solid #2a2a2a', color: '#4a90b8', fontSize: 12, padding: '5px 12px', borderRadius: 5, cursor: 'pointer' },
  emptyWrap: { textAlign: 'center', padding: '80px 40px' },
  emptyTitle: { fontSize: 18, fontWeight: 500, color: '#fff', marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#555', lineHeight: 1.7, maxWidth: 400, margin: '0 auto' },
};

function fmt$(v) {
  if (v == null) return '—';
  return '$' + parseFloat(v).toLocaleString('en-US', { minimumFractionDigits: 2 });
}

function fmtPct(v) {
  if (v == null) return '—';
  return parseFloat(v).toFixed(3) + '%';
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
    const fullName = user?.fullName || '';

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('activate');

    if (token) {
      const { data, error } = await supabase
        .from('borrowers')
        .select('*')
        .eq('verification_token', token)
        .limit(1)
        .single();
      if (!error && data) {
        await supabase
          .from('borrowers')
          .update({ borrower_email: userEmail })
          .eq('verification_token', token);
        setBorrower({ ...data, borrower_email: userEmail });
        setLoading(false);
        return;
      }
    }

    const { data, error } = await supabase
      .from('borrowers')
      .select('*')
      .or(`borrower_email.ilike.${userEmail},legal_name.ilike.${fullName}`)
      .limit(1)
      .single();
    if (!error && data) setBorrower(data);
    setLoading(false);
  }

  const email = user?.primaryEmailAddress?.emailAddress || '';

  const perDiem = borrower?.per_diem || 0;
  const today = new Date();
  const nextPayment = borrower?.next_payment_date
    ? new Date(borrower.next_payment_date)
    : null;
  const daysUntil = nextPayment
    ? Math.ceil((nextPayment - today) / (1000 * 60 * 60 * 24))
    : null;

  const docUrls = borrower?.loan_document_urls
    ? borrower.loan_document_urls.split(',').map(u => u.trim()).filter(Boolean)
    : [];

  return (
    <div style={{ background: '#0f0f0f', minHeight: '100vh', color: '#f0f0f0', fontFamily: 'inherit' }}>

      {borrower && daysUntil !== null && daysUntil <= 14 && (
        <div style={s.alertBar}>
          <div style={s.alertDot}></div>
          <div style={s.alertText}>
            Your next payment of <strong>{fmt$(borrower.last_payment_amount)}</strong> is due on <strong>{borrower.next_payment_date}</strong>
            {daysUntil > 0 ? ` — ${daysUntil} day${daysUntil !== 1 ? 's' : ''} away.` : ' — due today.'}
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
                <div style={{ ...s.lsVal, color: '#D4A017' }}>{fmt$(borrower.principal_balance)}</div>
              </div>
              <div style={s.loanStat(false)}>
                <div style={s.lsLabel}>Interest rate</div>
                <div style={s.lsVal}>{fmtPct(borrower.interest_rate)}</div>
              </div>
              <div style={s.loanStat(false)}>
                <div style={s.lsLabel}>Per diem</div>
                <div style={s.lsVal}>{fmt$(perDiem)} / day</div>
              </div>
              <div style={s.loanStat(false)}>
                <div style={s.lsLabel}>Next payment</div>
                <div style={s.lsVal}>{borrower.next_payment_date || '—'}</div>
              </div>
              <div style={s.loanStat(true)}>
                <div style={s.lsLabel}>Loan status</div>
                <div style={{ ...s.lsVal, color: '#4a9a4a' }}>{borrower.status || 'Active'}</div>
              </div>
            </div>

            <div style={s.grid2}>
              <div style={s.card}>
                <div style={s.cardHead}>
                  <div style={s.cardTitle}>Make a payment</div>
                  <span style={{ fontSize: 11, color: '#4a9a4a' }}>ACH / Wire</span>
                </div>
                <div style={s.cardBody}>
                  <div style={s.payTitle}>Amount due</div>
                  <div style={s.payBig}>{fmt$(borrower.last_payment_amount)}</div>
                  <div style={s.payDue}>Due {borrower.next_payment_date || '—'} · Monthly payment</div>
                  <button style={s.btnPay}>Make a one-time payment</button>
                  <button style={s.btnAutopay}>Set up autopay</button>
                  <div style={s.divider}></div>
                  <div style={s.statGrid}>
                    <div style={s.statBox}>
                      <div style={s.sbLabel}>Last payment</div>
                      <div style={s.sbVal}>{fmt$(borrower.last_payment_amount)}</div>
                      <div style={s.sbSub}>{borrower.last_payment_date || '—'}</div>
                    </div>
                    <div style={s.statBox}>
                      <div style={s.sbLabel}>Loan start</div>
                      <div style={{ ...s.sbVal, fontSize: 13, fontWeight: 500, color: '#fff' }}>{borrower.loan_start_date || '—'}</div>
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
                </div>
              </div>

              <div style={s.card}>
                <div style={s.cardHead}>
                  <div style={s.cardTitle}>Loan breakdown</div>
                </div>
                <div style={s.cardBody}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                    <svg width="200" height="200" viewBox="0 0 200 200">
                      <circle cx="100" cy="100" r="75" fill="none" stroke="#1a1a1a" strokeWidth="22"/>
                      <circle cx="100" cy="100" r="75" fill="none" stroke="#2a2a2a" strokeWidth="22" strokeDasharray="471 0" transform="rotate(-90 100 100)"/>
                      <text x="100" y="94" textAnchor="middle" fontSize="13" fill="#555">Remaining</text>
                      <text x="100" y="114" textAnchor="middle" fontSize="18" fontWeight="500" fill="#fff">100%</text>
                    </svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#666' }}><div style={{ width: 9, height: 9, borderRadius: '50%', background: '#2a2a2a', flexShrink: 0 }}></div>Remaining balance</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#666' }}><div style={{ width: 9, height: 9, borderRadius: '50%', background: '#4a90b8', flexShrink: 0 }}></div>Principal paid</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#666' }}><div style={{ width: 9, height: 9, borderRadius: '50%', background: '#D4A017', flexShrink: 0 }}></div>Interest paid</div>
                  </div>
                  <div style={s.statGrid}>
                    <div style={s.statBox}><div style={s.sbLabel}>Principal balance</div><div style={{ ...s.sbVal, color: '#D4A017' }}>{fmt$(borrower.principal_balance)}</div></div>
                    <div style={s.statBox}><div style={s.sbLabel}>Interest rate</div><div style={s.sbVal}>{fmtPct(borrower.interest_rate)}</div></div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={s.card}>
                  <div style={s.cardHead}>
                    <div style={s.cardTitle}>Loan details</div>
                  </div>
                  <div style={s.cardBody}>
                    <div style={s.infoRow}>
                      <span style={s.irLabel}>Loan ID</span>
                      <span style={{ ...s.irVal, color: '#4a90b8', fontFamily: 'monospace', fontSize: 12 }}>{borrower.loan_id_internal}</span>
                    </div>
                    <div style={s.infoRow}>
                      <span style={s.irLabel}>Origination date</span>
                      <span style={s.irVal}>{borrower.loan_start_date || '—'}</span>
                    </div>
                    <div style={s.infoRow}>
                      <span style={s.irLabel}>Interest rate</span>
                      <span style={s.irVal}>{fmtPct(borrower.interest_rate)}</span>
                    </div>
                    <div style={s.infoRow}>
                      <span style={s.irLabel}>Per diem</span>
                      <span style={s.irVal}>{fmt$(perDiem)} / day</span>
                    </div>
                    <div style={{ ...s.infoRow, borderBottom: 'none' }}>
                      <span style={s.irLabel}>Servicer</span>
                      <span style={{ ...s.irVal, color: '#D4A017' }}>SwiftDeed LLC</span>
                    </div>
                  </div>
                </div>
                <div style={s.card}>
                  <div style={s.cardHead}>
                    <div style={s.cardTitle}>Loan documents</div>
                  </div>
                  <div style={s.cardBody}>
                    {docUrls.length === 0 ? (
                      <div style={{ fontSize: 13, color: '#555', textAlign: 'center', padding: '20px 0' }}>No documents available yet</div>
                    ) : docUrls.map((url, i) => {
                      const name = url.split('/').pop().replace(/^\d+_/, '').replace(/-/g, ' ').replace('.pdf', '');
                      return (
                        <div key={i} style={{ ...s.stmtRow, borderBottom: i === docUrls.length - 1 ? 'none' : '0.5px solid #1a1a1a' }}>
                          <div style={s.stmtInfo}>
                            <div style={s.stmtName}>{name}</div>
                            <div style={s.stmtDate}>Loan document</div>
                          </div>
                          <button style={s.stmtBtn} onClick={() => window.open(url, '_blank')}>Download PDF</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div style={s.card}>
              <div style={s.cardHead}>
                <div style={s.cardTitle}>Statements</div>
                <span style={{ fontSize: 12, color: '#555' }}>Monthly statements coming soon</span>
              </div>
              <div style={{ padding: '32px', textAlign: 'center', color: '#555', fontSize: 13 }}>
                Monthly statements will appear here once generated. Your first statement will be sent to <span style={{ color: '#D4A017' }}>{email}</span>.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
