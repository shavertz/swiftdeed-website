import { useState } from 'react';
import { useUser } from '@clerk/clerk-react';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

const s = {
  wrap: { minHeight: 'calc(100vh - 65px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' },
  card: { background: '#111', border: '0.5px solid #2a2a2a', borderRadius: 14, padding: '44px 48px', width: '100%', maxWidth: 520 },
  topLabel: { fontSize: 12, color: '#4a90b8', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 10 },
  title: { fontSize: 24, fontWeight: 500, color: '#fff', marginBottom: 8 },
  sub: { fontSize: 14, color: '#555', lineHeight: 1.6, marginBottom: 32 },
  sectionTitle: { fontSize: 13, fontWeight: 500, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16, marginTop: 8, paddingBottom: 8, borderBottom: '0.5px solid #1e1e1e' },
  fieldLabel: { fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 7, display: 'block' },
  input: { width: '100%', background: '#1a1a1a', border: '0.5px solid #2a2a2a', borderRadius: 7, padding: '11px 14px', fontSize: 14, color: '#fff', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 18 },
  inputFocus: { border: '0.5px solid #D4A017' },
  optionalTag: { fontSize: 11, color: '#444', marginLeft: 6 },
  btn: { width: '100%', background: '#FFD700', color: '#0f0f0f', border: 'none', borderRadius: 7, padding: 13, fontSize: 15, fontWeight: 500, cursor: 'pointer', marginTop: 8 },
  btnDisabled: { width: '100%', background: '#3a3000', color: '#888', border: 'none', borderRadius: 7, padding: 13, fontSize: 15, fontWeight: 500, cursor: 'not-allowed', marginTop: 8 },
  errorMsg: { fontSize: 13, color: '#c0392b', background: '#1a0a0a', border: '0.5px solid #3a1010', borderRadius: 7, padding: '10px 14px', marginBottom: 16 },
};

function formatPhone(val) {
  const digits = val.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function BorrowerOnboarding({ borrowerId, onComplete }) {
  const { user } = useUser();
  const [fullName, setFullName] = useState('');
  const [emailConfirm, setEmailConfirm] = useState('');
  const [phone, setPhone] = useState('');
  const [mailingAddress, setMailingAddress] = useState('');
  const [guarantorName, setGuarantorName] = useState('');
  const [guarantorPhone, setGuarantorPhone] = useState('');
  const [guarantorEmail, setGuarantorEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(null);

  const userEmail = user?.primaryEmailAddress?.emailAddress || '';
  const hasGuarantor = guarantorName.trim() || guarantorPhone.trim() || guarantorEmail.trim();

  const isValid =
    fullName.trim() &&
    emailConfirm.trim().toLowerCase() === userEmail.toLowerCase() &&
    phone.trim() &&
    mailingAddress.trim() &&
    (!hasGuarantor || (guarantorName.trim() && guarantorPhone.trim() && guarantorEmail.trim()));

  async function handleSubmit() {
    if (!isValid) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/borrowers?id=eq.${borrowerId}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          legal_name: fullName.trim(),
          phone: phone.trim(),
          mailing_address: mailingAddress.trim(),
          guarantor_name: guarantorName.trim() || null,
          guarantor_phone: guarantorPhone.trim() || null,
          guarantor_email: guarantorEmail.trim() || null,
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

  const inputStyle = (field) => ({ ...s.input, ...(focused === field ? s.inputFocus : {}) });

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.topLabel}>Step 2 of 2 · Welcome to SwiftDeed</div>
        <div style={s.title}>Verify your information.</div>
        <div style={s.sub}>Please confirm your details so we can connect you to your loan account.</div>

        {error && <div style={s.errorMsg}>{error}</div>}

        <div style={s.sectionTitle}>Your information</div>

        <label style={s.fieldLabel}>Full legal name</label>
        <input
          style={inputStyle('name')}
          placeholder="As it appears on your loan documents"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          onFocus={() => setFocused('name')}
          onBlur={() => setFocused(null)}
        />

        <label style={s.fieldLabel}>Confirm email address</label>
        <input
          style={inputStyle('email')}
          placeholder={userEmail}
          value={emailConfirm}
          onChange={e => setEmailConfirm(e.target.value)}
          onFocus={() => setFocused('email')}
          onBlur={() => setFocused(null)}
        />
        {emailConfirm && emailConfirm.toLowerCase() !== userEmail.toLowerCase() && (
          <div style={{ fontSize: 12, color: '#c0392b', marginTop: -12, marginBottom: 16 }}>Email doesn't match your account email.</div>
        )}

        <label style={s.fieldLabel}>Phone number</label>
        <input
          style={inputStyle('phone')}
          placeholder="e.g. (801) 555-0123"
          value={phone}
          onChange={e => setPhone(formatPhone(e.target.value))}
          onFocus={() => setFocused('phone')}
          onBlur={() => setFocused(null)}
        />

        <label style={s.fieldLabel}>Mailing address</label>
        <input
          style={inputStyle('address')}
          placeholder="e.g. 123 Main St, Salt Lake City UT 84101"
          value={mailingAddress}
          onChange={e => setMailingAddress(e.target.value)}
          onFocus={() => setFocused('address')}
          onBlur={() => setFocused(null)}
        />

        <div style={s.sectionTitle}>
          Guarantor information
          <span style={s.optionalTag}>— optional</span>
        </div>
        <div style={{ fontSize: 13, color: '#444', marginBottom: 20, marginTop: -8 }}>If your loan has a personal guarantor, enter their details below. Check your loan documents if unsure.</div>

        <label style={s.fieldLabel}>Guarantor full name</label>
        <input
          style={inputStyle('gname')}
          placeholder="e.g. John R. Smith"
          value={guarantorName}
          onChange={e => setGuarantorName(e.target.value)}
          onFocus={() => setFocused('gname')}
          onBlur={() => setFocused(null)}
        />

        <label style={s.fieldLabel}>Guarantor phone</label>
        <input
          style={inputStyle('gphone')}
          placeholder="e.g. (801) 555-0123"
          value={guarantorPhone}
          onChange={e => setGuarantorPhone(formatPhone(e.target.value))}
          onFocus={() => setFocused('gphone')}
          onBlur={() => setFocused(null)}
        />

        <label style={s.fieldLabel}>Guarantor email</label>
        <input
          style={inputStyle('gemail')}
          placeholder="e.g. john@example.com"
          value={guarantorEmail}
          onChange={e => setGuarantorEmail(e.target.value)}
          onFocus={() => setFocused('gemail')}
          onBlur={() => setFocused(null)}
        />

        <button
          style={isValid && !loading ? s.btn : s.btnDisabled}
          onClick={handleSubmit}
          disabled={!isValid || loading}
        >
          {loading ? 'Saving your information...' : 'Access my loan portal →'}
        </button>
      </div>
    </div>
  );
}
