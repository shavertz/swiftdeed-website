import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const STRIPE_PUBLISHABLE_KEY = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;

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
  wireRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid #1a1a1a', alignItems: 'center' },
  wireLabel: { fontSize: 13, color: '#555' },
  wireVal: { fontSize: 13, color: '#ccc', textAlign: 'right' },
  wireRef: { fontSize: 13, color: '#D4A017', textAlign: 'right', fontFamily: 'monospace' },
  wireNote: { fontSize: 12, color: '#444', marginTop: 14, lineHeight: 1.6, background: '#1a1800', border: '0.5px solid #3a3000', borderRadius: 6, padding: '10px 12px' },
  emptyWrap: { textAlign: 'center', padding: '80px 40px' },
  emptyTitle: { fontSize: 18, fontWeight: 500, color: '#fff', marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#555', lineHeight: 1.7, maxWidth: 400, margin: '0 auto' },
  stmtBtn: { background: 'transparent', border: '0.5px solid #FFD700', color: '#888', fontSize: 11, padding: '4px 10px', borderRadius: 5, cursor: 'pointer', transition: 'all 0.15s' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#111', border: '0.5px solid #2a2a2a', borderRadius: 12, width: 420, maxHeight: '90vh', overflowY: 'auto' },
  modalHead: { padding: '16px 20px', borderBottom: '0.5px solid #1e1e1e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 14, fontWeight: 500, color: '#fff' },
  modalClose: { fontSize: 20, color: '#555', cursor: 'pointer', background: 'none', border: 'none', lineHeight: 1 },
  modalBody: { padding: 20 },
  inputLabel: { fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, display: 'block' },
  inputWrap: { position: 'relative', marginBottom: 6 },
  inputPrefix: { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#888', fontSize: 14 },
  input: { width: '100%', background: '#1a1a1a', border: '0.5px solid #333', borderRadius: 7, padding: '11px 12px 11px 24px', fontSize: 15, color: '#fff', fontWeight: 500, boxSizing: 'border-box', outline: 'none' },
  breakdownBox: { background: '#1a1a1a', borderRadius: 7, padding: '12px 14px', marginBottom: 20 },
  breakdownRow: { display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 },
  breakdownTotal: { borderTop: '0.5px solid #2a2a2a', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 12 },
  wireWarning: { background: '#0f1a0f', border: '0.5px solid #1a3a1a', borderRadius: 7, padding: '10px 12px', marginBottom: 16, fontSize: 12, color: '#555', lineHeight: 1.6 },
  btnConfirm: { width: '100%', background: '#D4A017', color: '#0f0f0f', border: 'none', borderRadius: 7, padding: 13, fontSize: 14, fontWeight: 500, cursor: 'pointer', marginBottom: 8 },
  btnConfirmDisabled: { width: '100%', background: '#2a2a2a', color: '#555', border: 'none', borderRadius: 7, padding: 13, fontSize: 14, fontWeight: 500, cursor: 'not-allowed', marginBottom: 8 },
  btnCancel: { width: '100%', background: 'transparent', color: '#555', border: '0.5px solid #2a2a2a', borderRadius: 7, padding: 11, fontSize: 13, cursor: 'pointer' },
  successBox: { textAlign: 'center', padding: '32px 20px' },
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

function getAlertConfig(daysUntil) {
  if (daysUntil < 0) return { bg: '#1a0000', border: '#3a0000', dot: '#ef4444', text: '#ef4444' };
  if (daysUntil === 0) return { bg: '#1a0000', border: '#3a0000', dot: '#ef4444', text: '#ef4444' };
  if (daysUntil <= 7) return { bg: '#1a0d00', border: '#3a1a00', dot: '#f97316', text: '#f97316' };
  return { bg: '#1a1800', border: '#3a3000', dot: '#D4A017', text: '#D4A017' };
}

function calcBreakdown(amount, borrower) {
  const principal = parseFloat(borrower.principal_balance) || 0;
  const rate = parseFloat(borrower.interest_rate) || 0;
  const lastDate = borrower.last_payment_date || borrower.loan_start_date;
  if (!lastDate) return { interest: 0, principalPortion: 0, balanceAfter: principal };
  const from = new Date(lastDate + 'T00:00:00');
  const to = new Date();
  const days = Math.max(0, Math.floor((to - from) / (1000 * 60 * 60 * 24)));
  const dailyRate = rate / 100 / 365;
  const interest = parseFloat((principal * dailyRate * days).toFixed(2));
  const paid = parseFloat(amount) || 0;
  const principalPortion = parseFloat(Math.max(0, paid - interest).toFixed(2));
  const balanceAfter = parseFloat(Math.max(0, principal - principalPortion).toFixed(2));
  return { interest, principalPortion, balanceAfter };
}

function nextMonthDate(fromDate) {
  const d = fromDate ? new Date(fromDate + 'T00:00:00') : new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().split('T')[0];
}

function PaymentModal({ borrower, onClose, onSuccess }) {
  const { user } = useUser();
  const [amount, setAmount] = useState(String(borrower.last_payment_amount || ''));
  const [step, setStep] = useState('amount'); // amount | bank | confirm | processing | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const [stripeObj, setStripeObj] = useState(null);
  const [elements, setElements] = useState(null);
  const [customerId, setCustomerId] = useState(borrower.stripe_customer_id || null);
  const [paymentMethodId, setPaymentMethodId] = useState(borrower.stripe_payment_method_id || null);
  const [bankName, setBankName] = useState(null);

  const amountNum = parseFloat(amount) || 0;
  const overLimit = amountNum >= 25000;
  const breakdown = calcBreakdown(amount, borrower);

  // Load Stripe.js once
  useEffect(() => {
    if (window.Stripe) { setStripeObj(window.Stripe(STRIPE_PUBLISHABLE_KEY)); return; }
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.onload = () => setStripeObj(window.Stripe(STRIPE_PUBLISHABLE_KEY));
    document.head.appendChild(script);
  }, []);

  // If borrower already has a payment method, skip bank step
  useEffect(() => {
    if (paymentMethodId) setBankName('Bank on file');
  }, [paymentMethodId]);

  async function handleConnectBank() {
    if (!stripeObj) return;
    setStep('processing');
    setErrorMsg('');
    try {
      const res = await fetch('/api/stripe-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          borrowerEmail: user?.primaryEmailAddress?.emailAddress,
          borrowerName: borrower.legal_name,
          loanIdInternal: borrower.loan_id_internal,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Setup failed');
      setCustomerId(data.customerId);

      const { setupIntent, error } = await stripeObj.collectBankAccountForSetup({
        clientSecret: data.clientSecret,
        params: {
          payment_method_type: 'us_bank_account',
          payment_method_data: {
            billing_details: {
              name: borrower.legal_name || '',
              email: user?.primaryEmailAddress?.emailAddress || '',
            },
          },
        },
      });

      if (error) throw new Error(error.message);
      if (setupIntent.status === 'requires_confirmation') {
        const { setupIntent: confirmed, error: confirmError } = await stripeObj.confirmUsBankAccountSetup(data.clientSecret);
        if (confirmError) throw new Error(confirmError.message);
        setPaymentMethodId(confirmed.payment_method);
        setBankName('Bank account connected');
        setStep('confirm');
      } else {
        setPaymentMethodId(setupIntent.payment_method);
        setBankName('Bank account connected');
        setStep('confirm');
      }
    } catch (e) {
      setErrorMsg(e.message);
      setStep('amount');
    }
  }

  async function handleConfirmPayment() {
    setStep('processing');
    setErrorMsg('');
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch('/api/stripe-charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          paymentMethodId,
          amount: amountNum,
          borrowerId: borrower.id,
          loanIdInternal: borrower.loan_id_internal,
          borrowerName: borrower.legal_name,
          borrowerEmail: user?.primaryEmailAddress?.emailAddress,
          lenderEmail: null,
          interestPortion: breakdown.interest,
          principalPortion: breakdown.principalPortion,
          principalBalanceAfter: breakdown.balanceAfter,
          nextPaymentDate: nextMonthDate(today),
          totalPaymentsMade: (borrower.total_payments_made || 0) + 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment failed');
      setStep('success');
    } catch (e) {
      setErrorMsg(e.message);
      setStep('amount');
    }
  }

  return (
    <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={s.modal}>
        <div style={s.modalHead}>
          <div style={s.modalTitle}>
            {step === 'success' ? 'Payment submitted' : 'Make a payment'}
          </div>
          <button style={s.modalClose} onClick={onClose}>×</button>
        </div>

        {step === 'success' && (
          <div style={s.successBox}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#4a9a4a', marginBottom: 8 }}>Payment submitted</div>
            <div style={{ fontSize: 13, color: '#555', marginBottom: 24, lineHeight: 1.6 }}>
              Your ACH payment of <strong style={{ color: '#fff' }}>{fmt$(amountNum)}</strong> has been submitted. ACH payments typically settle in 2–3 business days.
            </div>
            <button style={s.btnConfirm} onClick={() => { onClose(); onSuccess(); }}>Done</button>
          </div>
        )}

        {step === 'processing' && (
          <div style={{ padding: 40, textAlign: 'center', color: '#555', fontSize: 14 }}>Processing...</div>
        )}

        {(step === 'amount' || step === 'bank' || step === 'confirm') && (
          <div style={s.modalBody}>

            {/* Amount */}
            <label style={s.inputLabel}>Payment amount</label>
            <div style={s.inputWrap}>
              <span style={s.inputPrefix}>$</span>
              <input
                style={s.input}
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            <div style={{ fontSize: 11, color: '#555', marginBottom: 16 }}>
              Monthly payment pre-filled · Pay more to reduce principal
            </div>

            {/* Breakdown */}
            {amountNum > 0 && !overLimit && (
              <div style={s.breakdownBox}>
                <div style={s.breakdownRow}>
                  <span style={{ color: '#555' }}>Interest</span>
                  <span style={{ color: '#ccc' }}>{fmt$(breakdown.interest)}</span>
                </div>
                <div style={s.breakdownRow}>
                  <span style={{ color: '#555' }}>Principal</span>
                  <span style={{ color: '#ccc' }}>{fmt$(breakdown.principalPortion)}</span>
                </div>
                <div style={s.breakdownTotal}>
                  <span style={{ color: '#888' }}>Total</span>
                  <span style={{ color: '#fff', fontWeight: 500 }}>{fmt$(amountNum)}</span>
                </div>
              </div>
            )}

            {/* Wire warning */}
            {overLimit && (
              <div style={{ ...s.wireWarning, background: '#1a0000', border: '0.5px solid #3a0000', color: '#888' }}>
                Payments of $25,000 or more must be sent via wire transfer. Use the wire instructions on your portal.
              </div>
            )}

            {errorMsg && (
              <div style={{ ...s.wireWarning, background: '#1a0000', border: '0.5px solid #3a0000', color: '#ef4444', marginBottom: 16 }}>
                {errorMsg}
              </div>
            )}

            {/* Bank account display if already connected */}
            {paymentMethodId && step !== 'bank' && (
              <div style={{ background: '#1a1a1a', border: '0.5px solid #2a2a2a', borderRadius: 7, padding: '12px 14px', marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 6, fontWeight: 500 }}>Connected bank account</div>
                <div style={{ fontSize: 13, color: '#ccc' }}>{bankName || 'Bank on file'}</div>
                <button
                  style={{ fontSize: 11, color: '#555', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 4 }}
                  onClick={() => { setPaymentMethodId(null); setBankName(null); }}
                >Change bank account</button>
              </div>
            )}

            {/* Actions */}
            {overLimit ? (
              <button style={s.btnConfirmDisabled} disabled>Use wire transfer for this amount</button>
            ) : paymentMethodId ? (
              <button style={s.btnConfirm} onClick={handleConfirmPayment}>
                Confirm payment · {fmt$(amountNum)}
              </button>
            ) : (
              <button style={s.btnConfirm} onClick={handleConnectBank}>
                Connect bank &amp; pay {fmt$(amountNum)}
              </button>
            )}
            <button style={s.btnCancel} onClick={onClose}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
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
        if (Array.isArray(lenderData) && lenderData.length > 0) setWire(lenderData[0]);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    fetchWire();
  }, [loanIdInternal]);

  const hasWire = wire && wire.wire_bank_name && wire.wire_routing_number && wire.wire_account_number;

  return (
    <div style={s.card}>
      <div style={{ ...s.cardHead }}>
        <div style={s.cardTitle}>Wire instructions</div>
        <span style={{ fontSize: 11, color: '#555' }}>Balloon & payoff</span>
      </div>
      <div style={s.cardBody}>
        {loading ? (
          <div style={{ fontSize: 13, color: '#555', textAlign: 'center', padding: '12px 0' }}>Loading...</div>
        ) : !hasWire ? (
          <div style={{ fontSize: 13, color: '#555', textAlign: 'center', padding: '12px 0' }}>Contact your lender for wire details.</div>
        ) : (
          <>
            <div style={s.wireRow}><span style={s.wireLabel}>Bank</span><span style={s.wireVal}>{wire.wire_bank_name}</span></div>
            <div style={s.wireRow}><span style={s.wireLabel}>Account name</span><span style={s.wireVal}>{wire.wire_account_name}</span></div>
            <div style={s.wireRow}><span style={s.wireLabel}>Routing</span><span style={s.wireVal}>{wire.wire_routing_number}</span></div>
            <div style={s.wireRow}><span style={s.wireLabel}>Account</span><span style={s.wireVal}>{wire.wire_account_number}</span></div>
            {wire.wire_bank_address && <div style={s.wireRow}><span style={s.wireLabel}>Bank address</span><span style={s.wireVal}>{wire.wire_bank_address}</span></div>}
            <div style={{ ...s.wireRow, borderBottom: 'none' }}><span style={s.wireLabel}>Reference / memo</span><span style={s.wireRef}>{loanIdInternal}</span></div>
            <div style={s.wireNote}>Always include your loan ID in the memo field. Contact your lender to confirm receipt before closing.</div>
          </>
        )}
      </div>
    </div>
  );
}

function PaymentHistoryCard({ loanIdInternal }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!loanIdInternal) return;
    async function fetchPayments() {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/payments?loan_id_internal=eq.${encodeURIComponent(loanIdInternal)}&order=payment_date.desc`,
          { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
        );
        const data = await res.json();
        setPayments(Array.isArray(data) ? data : []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    fetchPayments();
  }, [loanIdInternal]);

  const headStyle = { fontSize: 10, color: '#D4A017', textTransform: 'uppercase', letterSpacing: 0.6, padding: '8px 8px', borderBottom: '0.5px solid #2a2a2a', textAlign: 'right' };
  const colStyle = { fontSize: 12, color: '#555', padding: '10px 8px', borderBottom: '0.5px solid #1a1a1a' };
  const valStyle = { fontSize: 12, color: '#ccc', padding: '10px 8px', borderBottom: '0.5px solid #1a1a1a', textAlign: 'right' };

  return (
    <div style={{ ...s.card, marginBottom: 20 }}>
      <div style={s.cardHead}>
        <div style={s.cardTitle}>Payment history</div>
        <span style={{ fontSize: 12, color: '#555' }}>{payments.length} payment{payments.length !== 1 ? 's' : ''}</span>
      </div>
      <div style={s.cardBody}>
        {loading ? (
          <div style={{ fontSize: 13, color: '#555', textAlign: 'center', padding: '16px 0' }}>Loading...</div>
        ) : payments.length === 0 ? (
          <div style={{ fontSize: 13, color: '#555', textAlign: 'center', padding: '16px 0' }}>No payments recorded yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...headStyle, textAlign: 'left' }}>Date</th>
                  <th style={headStyle}>Amount</th>
                  <th style={headStyle}>Method</th>
                  <th style={headStyle}>Interest</th>
                  <th style={headStyle}>Balance after</th>
                  <th style={headStyle}>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, i) => (
                  <tr key={p.id || i}>
                    <td style={{ ...colStyle, textAlign: 'left' }}>{fmtDate(p.payment_date)}</td>
                    <td style={{ ...valStyle, color: '#fff', fontWeight: 500 }}>{fmt$(p.amount)}</td>
                    <td style={valStyle}>{p.method || '—'}</td>
                    <td style={valStyle}>{fmt$(p.interest_portion)}</td>
                    <td style={valStyle}>{fmt$(p.principal_balance_after)}</td>
                    <td style={{ ...valStyle, borderBottom: i === payments.length - 1 ? 'none' : '0.5px solid #1a1a1a' }}>
                      {p.invoice_url ? (
                        <a href={p.invoice_url} target="_blank" rel="noreferrer"
                          style={{ background: 'transparent', border: '0.5px solid #FFD700', color: '#888', fontSize: 11, padding: '4px 10px', borderRadius: 5, cursor: 'pointer', textDecoration: 'none' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#1e1a00'; e.currentTarget.style.color = '#FFD700'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#888'; }}
                        >Download</a>
                      ) : <span style={{ fontSize: 11, color: '#333' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function LoanDocumentsCard({ docUrls }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ ...s.card, marginBottom: 20 }}>
      <div style={{ ...s.cardHead, cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <div style={s.cardTitle}>Loan documents</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#555' }}>{docUrls.length} document{docUrls.length !== 1 ? 's' : ''}</span>
          <span style={{ fontSize: 12, color: '#555', transition: 'transform 0.2s', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
        </div>
      </div>
      {open && (
        <div style={s.cardBody}>
          {docUrls.length === 0 ? (
            <div style={{ fontSize: 13, color: '#555', textAlign: 'center', padding: '16px 0' }}>No documents available yet.</div>
          ) : docUrls.map((url, i) => {
            const name = url.split('/').pop().replace(/^\d+_/, '').replace(/[-_]/g, ' ').replace('.pdf', '').replace(/\s+/g, ' ').trim();
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i === docUrls.length - 1 ? 'none' : '0.5px solid #1a1a1a' }}>
                <div>
                  <div style={{ fontSize: 13, color: '#ccc' }}>{name}</div>
                  <div style={{ fontSize: 11, color: '#555' }}>Loan document</div>
                </div>
                <button style={s.stmtBtn} onClick={() => window.open(url, '_blank')}
                  onMouseEnter={e => { e.currentTarget.style.background = '#1e1a00'; e.currentTarget.style.color = '#FFD700'; e.currentTarget.style.boxShadow = '0 0 16px rgba(255,215,0,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#888'; e.currentTarget.style.boxShadow = 'none'; }}
                >Download PDF</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function BorrowerPortal({ onHome }) {
  const { user } = useUser();
  const [borrower, setBorrower] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const fetchBorrower = useCallback(async () => {
    if (!user) return;
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
  }, [user]);

  useEffect(() => { fetchBorrower(); }, [fetchBorrower]);

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
      {showPaymentModal && borrower && (
        <PaymentModal
          borrower={borrower}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => { setShowPaymentModal(false); fetchBorrower(); }}
        />
      )}

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
              {/* Payment card */}
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
                      {(borrower.last_payment_interest != null || borrower.last_payment_principal != null) && (
                        <div style={{ background: '#1a1a1a', borderRadius: 7, padding: '10px 12px', marginBottom: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                            <span style={{ color: '#555' }}>Interest</span>
                            <span style={{ color: '#ccc' }}>{fmt$(borrower.last_payment_interest)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                            <span style={{ color: '#555' }}>Principal</span>
                            <span style={{ color: '#ccc' }}>{fmt$(borrower.last_payment_principal)}</span>
                          </div>
                          <div style={{ borderTop: '0.5px solid #2a2a2a', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                            <span style={{ color: '#888' }}>Total</span>
                            <span style={{ color: '#fff', fontWeight: 500 }}>{fmt$(borrower.last_payment_amount)}</span>
                          </div>
                        </div>
                      )}
                      <button style={s.btnPay}
                        onClick={() => setShowPaymentModal(true)}
                        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 16px rgba(255,215,0,0.45)'; }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
                      >Make a one-time payment</button>
                      <button style={s.btnAutopay}
                        onClick={() => setShowPaymentModal(true)}
                        onMouseEnter={e => { e.currentTarget.style.background = '#1e1a00'; e.currentTarget.style.color = '#FFD700'; e.currentTarget.style.boxShadow = '0 0 16px rgba(255,215,0,0.3)'; }}
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

              {/* Loan breakdown */}
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

              {/* Right column */}
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
                      <span style={s.irLabel}>Maturity date</span>
                      <span style={s.irVal}>{fmtDate(borrower.maturity_date)}</span>
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
                <WireInstructionsCard loanIdInternal={borrower.loan_id_internal} />
              </div>
            </div>

            <PaymentHistoryCard loanIdInternal={borrower.loan_id_internal} />
            <LoanDocumentsCard docUrls={docUrls} />
          </>
        )}
      </div>
    </div>
  );
}
