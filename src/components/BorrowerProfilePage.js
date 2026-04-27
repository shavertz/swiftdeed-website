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
  infoRow: { display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '0.5px solid #1e1e1e', alignItems: 'center' },
  irLabel: { fontSize: 13, color: '#555' },
  irVal: { fontSize: 13, color: '#ccc' },
  editIcon: { fontSize: 11, color: '#4a90b8', cursor: 'pointer', marginLeft: 8 },
  editInput: { background: '#1a1a1a', border: '0.5px solid #2a2a2a', borderRadius: 6, padding: '6px 10px', fontSize: 13, color: '#fff', fontFamily: 'inherit', outline: 'none', width: '200px' },
  editBtn: { background: '#FFD700', color: '#0f0f0f', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', marginLeft: 8 },
  cancelBtn: { background: 'transparent', color: '#555', border: '0.5px solid #2a2a2a', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer', marginLeft: 4 },
  backBtn: { background: 'transparent', border: 'none', color: '#555', fontSize: 13, cursor: 'pointer', padding: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' },
  saveMsg: { fontSize: 12, color: '#34d399' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
};

function fmt$(v) {
  if (v == null) return '—';
  return '$' + parseFloat(v).toLocaleString('en-US', { minimumFractionDigits: 2 });
}

function fmtPct(v) {
  if (v == null) return '—';
  const n = parseFloat(v);
  return (n % 1 === 0 ? n.toFixed(0) : n.toFixed(3)) + '%';
}

function fmtDate(str) {
  if (!str) return '—';
  const d = new Date(str + 'T00:00:00');
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatPhone(val) {
  const digits = val.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function EditableRow({ label, value, field, onSave, isLast }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || '');

  function handleSave() { onSave(field, val); setEditing(false); }

  return (
    <div style={{ ...s.infoRow, borderBottom: isLast ? 'none' : '0.5px solid #1e1e1e' }}>
      <span style={s.irLabel}>{label}</span>
      {editing ? (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <input
            style={s.editInput}
            value={val}
            onChange={e => field.includes('phone') ? setVal(formatPhone(e.target.value)) : setVal(e.target.value)}
            autoFocus
          />
          <button style={s.editBtn} onClick={handleSave}>Save</button>
          <button style={s.cancelBtn} onClick={() => setEditing(false)}>Cancel</button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={s.irVal}>{value || '—'}</span>
          <span style={s.editIcon} onClick={() => { setVal(value || ''); setEditing(true); }}>Edit</span>
        </div>
      )}
    </div>
  );
}

export default function BorrowerProfilePage({ onBack }) {
  const { user } = useUser();
  const [borrower, setBorrower] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveMsg, setSaveMsg] = useState('');

  const email = user?.primaryEmailAddress?.emailAddress;

  useEffect(() => {
    if (!email) return;
    async function fetchBorrower() {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/borrowers?borrower_email=ilike.${encodeURIComponent(email)}&limit=1&select=*`,
          { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
        );
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) setBorrower(data[0]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchBorrower();
  }, [email]);

  async function handleSaveField(field, value) {
    if (!borrower) return;
    await fetch(`${SUPABASE_URL}/rest/v1/borrowers?id=eq.${borrower.id}`, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ [field]: value }),
    });
    setBorrower(prev => ({ ...prev, [field]: value }));
    setSaveMsg('Saved.');
    setTimeout(() => setSaveMsg(''), 2000);
  }

  if (loading) return (
    <div style={{ padding: 80, textAlign: 'center', color: '#555', fontSize: 14 }}>Loading...</div>
  );

  return (
    <div style={s.page}>
      <button style={s.backBtn}
        onClick={onBack}
        onMouseEnter={e => e.currentTarget.style.color = '#fff'}
        onMouseLeave={e => e.currentTarget.style.color = '#555'}
      >← Back to my loan</button>

      <div style={s.heading}>My Profile</div>

      {/* Loan Info — read only */}
      <div style={s.card}>
        <div style={s.sectionLabel}>Loan info</div>
        <div style={s.grid}>
          <div>
            <div style={s.fieldLabel}>Loan ID</div>
            <div style={{ ...s.fieldVal, color: '#4a90b8', fontFamily: 'monospace', fontSize: 13 }}>{borrower?.loan_id_internal || '—'}</div>
          </div>
          <div>
            <div style={s.fieldLabel}>Property address</div>
            <div style={s.fieldVal}>{borrower?.property_address || '—'}</div>
          </div>
          <div>
            <div style={s.fieldLabel}>Interest rate</div>
            <div style={s.fieldVal}>{fmtPct(borrower?.interest_rate)}</div>
          </div>
          <div>
            <div style={s.fieldLabel}>Per diem</div>
            <div style={s.fieldVal}>{fmt$(borrower?.per_diem)} / day</div>
          </div>
          <div>
            <div style={s.fieldLabel}>Loan start</div>
            <div style={s.fieldVal}>{fmtDate(borrower?.loan_start_date)}</div>
          </div>
          <div>
            <div style={s.fieldLabel}>Maturity date</div>
            <div style={s.fieldVal}>{fmtDate(borrower?.maturity_date)}</div>
          </div>
          <div>
            <div style={s.fieldLabel}>Principal balance</div>
            <div style={{ ...s.fieldVal, color: '#D4A017' }}>{fmt$(borrower?.principal_balance)}</div>
          </div>
          <div>
            <div style={s.fieldLabel}>Servicer</div>
            <div style={{ ...s.fieldVal, color: '#D4A017' }}>SwiftDeed LLC</div>
          </div>
        </div>
      </div>

      {/* Contact Info — editable */}
      <div style={s.card}>
        <div style={{ ...s.sectionHeader }}>
          <div style={s.sectionLabel}>Contact info</div>
          {saveMsg && <span style={s.saveMsg}>{saveMsg}</span>}
        </div>
        <EditableRow label="Full legal name" value={borrower?.legal_name} field="legal_name" onSave={handleSaveField} />
        <EditableRow label="Phone" value={borrower?.phone} field="phone" onSave={handleSaveField} />
        <EditableRow label="Email" value={borrower?.borrower_email} field="borrower_email" onSave={handleSaveField} />
        <EditableRow label="Mailing address" value={borrower?.mailing_address} field="mailing_address" onSave={handleSaveField} isLast />
      </div>

      {/* Guarantor Info — editable */}
      <div style={s.card}>
        <div style={s.sectionLabel}>Guarantor info</div>
        <EditableRow label="Guarantor name" value={borrower?.guarantor_name} field="guarantor_name" onSave={handleSaveField} />
        <EditableRow label="Guarantor phone" value={borrower?.guarantor_phone} field="guarantor_phone" onSave={handleSaveField} />
        <EditableRow label="Guarantor email" value={borrower?.guarantor_email} field="guarantor_email" onSave={handleSaveField} isLast />
      </div>
    </div>
  );
}
