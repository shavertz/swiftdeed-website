import { useState } from 'react';
import { useUser } from '@clerk/clerk-react';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
  'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
  'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
  'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire',
  'New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio',
  'Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota',
  'Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia',
  'Wisconsin','Wyoming'
];

const s = {
  wrap: { minHeight: 'calc(100vh - 65px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' },
  card: { background: '#111', border: '0.5px solid #2a2a2a', borderRadius: 14, padding: '44px 48px', width: '100%', maxWidth: 480 },
  topLabel: { fontSize: 12, color: '#4a90b8', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 10 },
  title: { fontSize: 24, fontWeight: 500, color: '#fff', marginBottom: 8 },
  sub: { fontSize: 14, color: '#555', lineHeight: 1.6, marginBottom: 32 },
  fieldLabel: { fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 7, display: 'block' },
  input: { width: '100%', background: '#1a1a1a', border: '0.5px solid #2a2a2a', borderRadius: 7, padding: '11px 14px', fontSize: 14, color: '#fff', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 18 },
  inputFocus: { border: '0.5px solid #D4A017' },
  select: { width: '100%', background: '#1a1a1a', border: '0.5px solid #2a2a2a', borderRadius: 7, padding: '11px 14px', fontSize: 14, color: '#fff', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 18, appearance: 'none', cursor: 'pointer' },
  termsRow: { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 28, marginTop: 4 },
  checkbox: { marginTop: 2, accentColor: '#FFD700', width: 15, height: 15, flexShrink: 0, cursor: 'pointer' },
  termsText: { fontSize: 13, color: '#555', lineHeight: 1.6 },
  termsLink: { color: '#4a90b8', cursor: 'pointer', textDecoration: 'none' },
  btn: { width: '100%', background: '#FFD700', color: '#0f0f0f', border: 'none', borderRadius: 7, padding: 13, fontSize: 15, fontWeight: 500, cursor: 'pointer' },
  btnDisabled: { width: '100%', background: '#3a3000', color: '#888', border: 'none', borderRadius: 7, padding: 13, fontSize: 15, fontWeight: 500, cursor: 'not-allowed' },
  errorMsg: { fontSize: 13, color: '#c0392b', background: '#1a0a0a', border: '0.5px solid #3a1010', borderRadius: 7, padding: '10px 14px', marginBottom: 16 },
};

export default function LenderOnboarding({ onComplete }) {
  const { user } = useUser();
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(null);

  function formatPhone(val) {
    const digits = val.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  const isValid = fullName.trim() && companyName.trim() && phone.trim() && state && agreed;

  async function handleSubmit() {
    if (!isValid) return;
    setLoading(true);
    setError('');

    const email = user?.primaryEmailAddress?.emailAddress;

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/lenders`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          email,
          full_name: fullName.trim(),
          company_name: companyName.trim(),
          phone: phone.trim(),
          state,
          agreed_to_terms: true,
        }),
      });

      if (!res.ok) {
        setError('Something went wrong. Please try again.');
        setLoading(false);
        return;
      }

      onComplete();
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.topLabel}>Welcome to SwiftDeed</div>
        <div style={s.title}>Let's get you onboarded.</div>
        <div style={s.sub}>Just a few details before you get started. This only takes a minute.</div>

        {error && <div style={s.errorMsg}>{error}</div>}

        <label style={s.fieldLabel}>Full legal name</label>
        <input
          style={{ ...s.input, ...(focused === 'name' ? s.inputFocus : {}) }}
          placeholder="e.g. Robert J. Martinez"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          onFocus={() => setFocused('name')}
          onBlur={() => setFocused(null)}
        />

        <label style={s.fieldLabel}>Company / fund name</label>
        <input
          style={{ ...s.input, ...(focused === 'company' ? s.inputFocus : {}) }}
          placeholder="e.g. Martinez Capital LLC"
          value={companyName}
          onChange={e => setCompanyName(e.target.value)}
          onFocus={() => setFocused('company')}
          onBlur={() => setFocused(null)}
        />

        <label style={s.fieldLabel}>Phone number</label>
        <input
          style={{ ...s.input, ...(focused === 'phone' ? s.inputFocus : {}) }}
          placeholder="e.g. (801) 555-0123"
          value={phone}
          onChange={e => setPhone(formatPhone(e.target.value))}
          onFocus={() => setFocused('phone')}
          onBlur={() => setFocused(null)}
        />

        <label style={s.fieldLabel}>State you lend in</label>
        <select
          style={s.select}
          value={state}
          onChange={e => setState(e.target.value)}
        >
          <option value="">Select a state...</option>
          {US_STATES.map(st => <option key={st} value={st}>{st}</option>)}
        </select>

        <div style={s.termsRow}>
          <input
            type="checkbox"
            style={s.checkbox}
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
          />
          <div style={s.termsText}>
            I agree to SwiftDeed's{' '}
            <a href="/terms" style={s.termsLink} target="_blank" rel="noreferrer">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" style={s.termsLink} target="_blank" rel="noreferrer">Privacy Policy</a>.
          </div>
        </div>

        <button
          style={isValid && !loading ? s.btn : s.btnDisabled}
          onClick={handleSubmit}
          disabled={!isValid || loading}
        >
          {loading ? 'Setting up your account...' : 'Get started →'}
        </button>
      </div>
    </div>
  );
}
