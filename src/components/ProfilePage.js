import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

const s = {
  page: { padding: '40px 60px', maxWidth: 800, margin: '0 auto' },
  heading: { fontSize: 24, fontWeight: 400, color: '#fff', marginBottom: 32 },
  card: { background: '#141414', border: '0.5px solid #222', borderRadius: 10, padding: '28px 32px', marginBottom: 16 },
  sectionLabel: { fontSize: 9, color: '#FFD700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 20 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 40px' },
  fieldLabel: { fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  fieldVal: { fontSize: 14, color: '#ccc' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  editBtn: { background: 'transparent', border: '0.5px solid #2a2a2a', borderRadius: 4, color: '#555', fontSize: 11, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' },
  input: { width: '100%', background: '#1a1a1a', border: '0.5px solid #2a2a2a', borderRadius: 6, padding: '9px 12px', fontSize: 13, color: '#fff', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 14 },
  inputFocus: { border: '0.5px solid #D4A017' },
  inputLabel: { fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4, display: 'block' },
  optionalTag: { fontSize: 10, color: '#444', marginLeft: 6, textTransform: 'none', letterSpacing: 0 },
  btnRow: { display: 'flex', gap: 8, marginTop: 4 },
  saveBtn: { flex: 1, background: '#FFD700', color: '#0f0f0f', fontSize: 13, fontWeight: 600, padding: '8px', borderRadius: 6, border: 'none', cursor: 'pointer', transition: 'box-shadow 0.15s' },
  cancelBtn: { flex: 1, background: 'transparent', color: '#fff', fontSize: 13, padding: '8px', borderRadius: 6, border: '0.5px solid #2a2a2a', cursor: 'pointer' },
  successMsg: { fontSize: 12, color: '#34d399', marginTop: 10 },
  errorMsg: { fontSize: 12, color: '#f87171', marginBottom: 10 },
  noWire: { fontSize: 13, color: '#444', lineHeight: 1.6 },
  backBtn: { background: 'transparent', border: 'none', color: '#555', fontSize: 13, cursor: 'pointer', padding: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' },
};

export default function ProfilePage({ onBack }) {
  const { user } = useUser();
  const [lender, setLender] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [focused, setFocused] = useState(null);
  const [form, setForm] = useState({
    wire_bank_name: '',
    wire_routing_number: '',
    wire_account_number: '',
    wire_account_name: '',
    wire_bank_address: '',
  });

  const email = user?.primaryEmailAddress?.emailAddress;

  useEffect(() => {
    if (!email) return;
    async function fetchLender() {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/lenders?email=eq.${encodeURIComponent(email)}&limit=1`,
          { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
        );
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setLender(data[0]);
          setForm({
            wire_bank_name: data[0].wire_bank_name || '',
            wire_routing_number: data[0].wire_routing_number || '',
            wire_account_number: data[0].wire_account_number || '',
            wire_account_name: data[0].wire_account_name || '',
            wire_bank_address: data[0].wire_bank_address || '',
          });
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchLender();
  }, [email]);

  const hasWire = lender?.wire_bank_name && lender?.wire_routing_number && lender?.wire_account_number;

  async function handleSave() {
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/lenders?email=eq.${encodeURIComponent(email)}`,
        {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify(form),
        }
      );
      if (!res.ok) throw new Error('Save failed');
      const updated = await res.json();
      if (Array.isArray(updated) && updated.length > 0) {
        setLender(updated[0]);
      } else {
        setLender(l => ({ ...l, ...form }));
      }
      setEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setForm({
      wire_bank_name: lender?.wire_bank_name || '',
      wire_routing_number: lender?.wire_routing_number || '',
      wire_account_number: lender?.wire_account_number || '',
      wire_account_name: lender?.wire_account_name || '',
      wire_bank_address: lender?.wire_bank_address || '',
    });
    setEditing(false);
    setSaveError('');
  }

  return (
    <div style={s.page}>
      <button style={s.backBtn}
        onClick={onBack}
        onMouseEnter={e => e.currentTarget.style.color = '#fff'}
        onMouseLeave={e => e.currentTarget.style.color = '#555'}
      >← Back to loans</button>

      <div style={s.heading}>My Profile</div>

      {/* Account Info */}
      <div style={s.card}>
        <div style={s.sectionLabel}>Account info</div>
        <div style={s.grid}>
          <div>
            <div style={s.fieldLabel}>Full name</div>
            <div style={s.fieldVal}>{lender?.full_name || '—'}</div>
          </div>
          <div>
            <div style={s.fieldLabel}>Company</div>
            <div style={s.fieldVal}>{lender?.company_name || '—'}</div>
          </div>
          <div>
            <div style={s.fieldLabel}>Email</div>
            <div style={s.fieldVal}>{email || '—'}</div>
          </div>
          <div>
            <div style={s.fieldLabel}>Phone</div>
            <div style={s.fieldVal}>{lender?.phone || '—'}</div>
          </div>
          <div>
            <div style={s.fieldLabel}>State</div>
            <div style={s.fieldVal}>{lender?.state || '—'}</div>
          </div>
        </div>
      </div>

      {/* Wire Details */}
      <div style={s.card}>
        <div style={s.sectionHeader}>
          <div style={s.sectionLabel}>Wire receiving details</div>
          {!editing && (
            <button
              style={s.editBtn}
              onClick={() => setEditing(true)}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#FFD700'; e.currentTarget.style.color = '#FFD700'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#555'; }}
            >{hasWire ? 'Edit' : 'Add'}</button>
          )}
        </div>

        {!editing && !hasWire && (
          <div style={s.noWire}>No wire details on file. These appear on all payoff statements so borrowers know where to send payments.</div>
        )}

        {!editing && hasWire && (
          <>
            <div style={s.grid}>
              <div>
                <div style={s.fieldLabel}>Bank</div>
                <div style={s.fieldVal}>{lender.wire_bank_name}</div>
              </div>
              <div>
                <div style={s.fieldLabel}>Account name</div>
                <div style={s.fieldVal}>{lender.wire_account_name}</div>
              </div>
              <div>
                <div style={s.fieldLabel}>Routing</div>
                <div style={s.fieldVal}>••••{lender.wire_routing_number?.slice(-4)}</div>
              </div>
              <div>
                <div style={s.fieldLabel}>Account</div>
                <div style={s.fieldVal}>••••{lender.wire_account_number?.slice(-4)}</div>
              </div>
              {lender.wire_bank_address && (
                <div>
                  <div style={s.fieldLabel}>Bank address</div>
                  <div style={s.fieldVal}>{lender.wire_bank_address}</div>
                </div>
              )}
            </div>
            {saveSuccess && <div style={s.successMsg}>✓ Wire details saved successfully</div>}
          </>
        )}

        {editing && (
          <div>
            {saveError && <div style={s.errorMsg}>{saveError}</div>}
            <label style={s.inputLabel}>Bank name</label>
            <input style={{ ...s.input, ...(focused === 'bank' ? s.inputFocus : {}) }} value={form.wire_bank_name} onChange={e => setForm(f => ({ ...f, wire_bank_name: e.target.value }))} placeholder="e.g. JPMorgan Chase" onFocus={() => setFocused('bank')} onBlur={() => setFocused(null)} />
            <label style={s.inputLabel}>Routing number</label>
            <input style={{ ...s.input, ...(focused === 'routing' ? s.inputFocus : {}) }} value={form.wire_routing_number} onChange={e => setForm(f => ({ ...f, wire_routing_number: e.target.value.replace(/\D/g, '').slice(0, 9) }))} placeholder="9-digit routing number" maxLength={9} onFocus={() => setFocused('routing')} onBlur={() => setFocused(null)} />
            <label style={s.inputLabel}>Account number</label>
            <input style={{ ...s.input, ...(focused === 'account' ? s.inputFocus : {}) }} value={form.wire_account_number} onChange={e => setForm(f => ({ ...f, wire_account_number: e.target.value }))} placeholder="Account number" onFocus={() => setFocused('account')} onBlur={() => setFocused(null)} />
            <label style={s.inputLabel}>Account name</label>
            <input style={{ ...s.input, ...(focused === 'accountname' ? s.inputFocus : {}) }} value={form.wire_account_name} onChange={e => setForm(f => ({ ...f, wire_account_name: e.target.value }))} placeholder="Name on account" onFocus={() => setFocused('accountname')} onBlur={() => setFocused(null)} />
            <label style={s.inputLabel}>Bank address <span style={s.optionalTag}>optional</span></label>
            <input style={{ ...s.input, ...(focused === 'address' ? s.inputFocus : {}) }} value={form.wire_bank_address} onChange={e => setForm(f => ({ ...f, wire_bank_address: e.target.value }))} placeholder="Bank branch address" onFocus={() => setFocused('address')} onBlur={() => setFocused(null)} />
            <div style={s.btnRow}>
              <button style={s.saveBtn} onClick={handleSave} disabled={saving}
                onMouseEnter={e => { if (!saving) e.currentTarget.style.boxShadow = '0 0 12px rgba(255,215,0,0.4)'; }}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >{saving ? 'Saving...' : 'Save'}</button>
              <button style={s.cancelBtn} onClick={handleCancel} disabled={saving}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#555'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a2a'}
              >Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
