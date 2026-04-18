import { useState, useRef } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { createClient } from '@supabase/supabase-js';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);
const supabase = createClient(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_ANON_KEY);

const PRICES = { standard: 4000, rush: 5000 };

const formatPhone = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};

function PaymentForm({ turnaround, form, files, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (skipPayment = false) => {
    if (!form.name || !form.email || !form.company || !form.phone) {
      setError('Please fill in all required fields.');
      return;
    }
    if (files.length === 0) {
      setError('Please upload at least one loan document.');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      let paymentIntentId = null;

      if (!skipPayment) {
        const intentRes = await fetch('https://swiftdeed.vercel.app/api/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: PRICES[turnaround],
            borrowerName: form.name,
            propertyAddress: '',
          }),
        });
        const { clientSecret, paymentIntentId: pid } = await intentRes.json();
        paymentIntentId = pid;

        const { error: stripeError } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: { card: elements.getElement(CardElement), billing_details: { name: form.name, email: form.email } },
        });
        if (stripeError) {
          setError(stripeError.message);
          setSubmitting(false);
          return;
        }
      }

      const uploadedUrls = [];
      for (const file of files) {
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const { error: uploadError } = await supabase.storage
          .from('loan-documents')
          .upload(fileName, file, { contentType: 'application/pdf' });
        if (uploadError) throw new Error('File upload failed: ' + uploadError.message);
        const { data: urlData } = supabase.storage.from('loan-documents').getPublicUrl(fileName);
        if (urlData?.publicUrl) uploadedUrls.push(urlData.publicUrl);
      }

      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => data.append(k, v));
      data.append('turnaround', turnaround);
      data.append('paymentIntentId', paymentIntentId || '');
      data.append('skipPayment', skipPayment ? 'true' : 'false');
      data.append('fileUrls', JSON.stringify(uploadedUrls));

      const res = await fetch('https://swiftdeed.vercel.app/api/submit', { method: 'POST', body: data });
      if (!res.ok) throw new Error('Submission failed');
      onSuccess();
    } catch (e) {
      setError('Something went wrong. Please try again.');
      console.error(e);
    }
    setSubmitting(false);
  };

  const cardStyle = {
    style: {
      base: { color: '#f0f0f0', fontFamily: 'inherit', fontSize: '14px', '::placeholder': { color: '#444' } },
      invalid: { color: '#e08080' },
    },
  };

  return (
    <div>
      <div style={{ background: '#111', border: '0.5px solid #2a2a2a', borderRadius: 10, padding: '20px 24px', marginTop: 8 }}>
        <div style={{ fontSize: 11, color: '#555', letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: 16 }}>Card details</div>
        <CardElement options={cardStyle} />
        <div style={{ marginTop: 16, fontSize: 12, color: '#444', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>🔒</span> Your card will be authorized but not charged until your statement is delivered.
        </div>
      </div>

      {error && (
        <div style={{ background: '#2e1010', border: '0.5px solid #5a2020', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#e08080', marginTop: 16 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, paddingTop: 24, borderTop: '0.5px solid #1e1e1e' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={() => handleSubmit(true)}
            disabled={submitting}
            style={{ background: 'transparent', color: '#444', fontSize: 12, padding: '8px 16px', borderRadius: 7, border: '0.5px solid #2a2a2a', cursor: 'pointer' }}>
            Skip Payment (Test Mode)
          </button>
        </div>
        <button
          onClick={() => handleSubmit(false)}
          disabled={submitting || !stripe}
          style={{ background: submitting ? '#a08800' : '#FFD700', color: '#0f0f0f', fontSize: 14, fontWeight: 500, padding: '13px 32px', borderRadius: 7, border: 'none', cursor: submitting ? 'not-allowed' : 'pointer' }}>
          {submitting ? 'Processing…' : `Pay $${turnaround === 'rush' ? '50' : '40'} & Submit →`}
        </button>
      </div>
    </div>
  );
}

export default function RequestForm() {
  const [turnaround, setTurnaround] = useState('standard');
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', company: '', phone: '', loanId: '', borrowerEmail: '', notes: '' });
  const fileInputRef = useRef();

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handlePhoneChange = (e) => {
    setForm({ ...form, phone: formatPhone(e.target.value) });
  };

  const addFiles = (newFiles) => {
    const pdfs = Array.from(newFiles).filter(f => f.type === 'application/pdf');
    setFiles(prev => [...prev, ...pdfs]);
  };
  const removeFile = (i) => setFiles(files.filter((_, idx) => idx !== i));
  const handleDrop = (e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); };

  const s = {
    wrap: { maxWidth: 640, margin: '0 auto', padding: '52px 24px 80px' },
    title: { fontSize: 26, fontWeight: 500, letterSpacing: -0.5, marginBottom: 6, color: '#f0f0f0' },
    sub: { fontSize: 14, color: '#555', marginBottom: 36, lineHeight: 1.7 },
    card: { background: '#111', border: '0.5px solid #2a2a2a', borderRadius: 14, padding: 36 },
    sectionLabel: { fontSize: 11, color: '#555', letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: 18 },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
    field: { display: 'flex', flexDirection: 'column', gap: 6 },
    fieldFull: { display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / -1' },
    label: { fontSize: 12, color: '#666' },
    req: { color: '#4a90b8', marginLeft: 2 },
    opt: { color: '#444', marginLeft: 4, fontSize: 11 },
    input: { background: '#181818', border: '0.5px solid #2a2a2a', borderRadius: 7, padding: '11px 14px', fontSize: 14, color: '#f0f0f0', fontFamily: 'inherit', outline: 'none' },
    textarea: { background: '#181818', border: '0.5px solid #2a2a2a', borderRadius: 7, padding: '11px 14px', fontSize: 14, color: '#f0f0f0', fontFamily: 'inherit', resize: 'vertical', minHeight: 90, outline: 'none' },
    divider: { border: 'none', borderTop: '0.5px solid #1e1e1e', margin: '28px 0' },
    uploadZone: { border: `0.5px dashed ${dragging ? '#4a90b8' : '#2e2e2e'}`, borderRadius: 9, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', background: dragging ? '#161e26' : '#141414' },
    uploadIconWrap: { width: 40, height: 40, borderRadius: 9, background: '#1a1a1a', border: '0.5px solid #2a2a2a', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a90b8', fontSize: 20 },
    uploadTitle: { fontSize: 14, color: '#aaa', marginBottom: 4 },
    uploadSub: { fontSize: 12, color: '#3a3a3a' },
    uploadBrowse: { color: '#4a90b8', cursor: 'pointer' },
    filePill: { display: 'flex', alignItems: 'center', gap: 10, background: '#181818', border: '0.5px solid #2a2a2a', borderRadius: 7, padding: '10px 14px', marginTop: 8 },
    fileIcon: { width: 28, height: 28, background: '#1a2535', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    fileIconInner: { width: 12, height: 14, background: '#4a90b8', borderRadius: 2 },
    fileName: { fontSize: 13, color: '#ccc', flex: 1 },
    fileSize: { fontSize: 11, color: '#444' },
    fileRemove: { fontSize: 14, color: '#444', cursor: 'pointer', padding: '0 4px' },
    tOption: (selected) => ({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: selected ? '#171400' : '#141414', border: `0.5px solid ${selected ? '#FFD700' : '#2a2a2a'}`, borderRadius: 9, padding: '16px 20px', cursor: 'pointer', marginBottom: 10 }),
    tName: { fontSize: 14, fontWeight: 500, color: '#e0e0e0' },
    tDesc: { fontSize: 12, color: '#555', marginTop: 3 },
    tPrice: { fontSize: 16, fontWeight: 500, color: '#fff', marginRight: 14 },
    radio: (on) => ({ width: 17, height: 17, borderRadius: '50%', border: `1.5px solid ${on ? '#FFD700' : '#333'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }),
    radioDot: { width: 8, height: 8, borderRadius: '50%', background: '#FFD700' },
    securityNote: { background: '#0d1a0d', border: '0.5px solid #1a3a1a', borderRadius: 8, padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12, marginTop: 20 },
    securityText: { fontSize: 12, color: '#4a7a4a', lineHeight: 1.6 },
  };

  if (submitted) {
    return (
      <div style={s.wrap}>
        <div style={{ textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#0d2e1a', border: '0.5px solid #1a4a2a', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#4caf7d' }}>✓</div>
          <div style={{ fontSize: 22, fontWeight: 500, marginBottom: 10, color: '#f0f0f0' }}>Request submitted</div>
          <div style={{ fontSize: 14, color: '#555', lineHeight: 1.7, maxWidth: 420, margin: '0 auto 28px' }}>
            We've received your documents and will deliver your payoff statement within your selected timeframe. Check your inbox for a confirmation email.
            {form.borrowerEmail && (
              <span> An activation email has been sent to your borrower at <strong style={{ color: '#D4A017' }}>{form.borrowerEmail}</strong>.</span>
            )}
          </div>
          <div style={{ background: '#111', border: '0.5px solid #2a2a2a', borderRadius: 10, padding: '20px 24px', maxWidth: 380, margin: '0 auto 28px', textAlign: 'left' }}>
            {[
              ['Name', form.name],
              ['Confirmation sent to', form.email],
              ['Turnaround', turnaround === 'standard' ? 'Within 24 hours' : 'Within 15 minutes'],
              ['Documents', `${files.length} file${files.length !== 1 ? 's' : ''} uploaded`],
            ].map(([label, value], i, arr) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: i < arr.length - 1 ? '0.5px solid #1a1a1a' : 'none', color: '#666' }}>
                <span>{label}</span><span style={{ color: '#ccc' }}>{value}</span>
              </div>
            ))}
          </div>
          <button style={{ background: 'transparent', color: '#aaa', fontSize: 14, padding: '10px 24px', borderRadius: 7, border: '0.5px solid #2a2a2a', cursor: 'pointer' }}
            onClick={() => { setSubmitted(false); setFiles([]); setForm({ name: '', email: '', company: '', phone: '', loanId: '', borrowerEmail: '', notes: '' }); }}>
            Submit another request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.wrap}>
      <div style={s.title}>Submit a payoff request</div>
      <div style={s.sub}>Upload your loan documents and we'll deliver a fully prepared payoff statement to your inbox. Your card is authorized now and only charged after delivery.</div>

      <div style={s.card}>
        <div style={s.sectionLabel}>Your information</div>
        <div style={s.grid}>
          <div style={s.field}><div style={s.label}>Name <span style={s.req}>*</span></div><input style={s.input} value={form.name} onChange={set('name')} placeholder="John Davis" /></div>
          <div style={s.field}><div style={s.label}>Email <span style={s.req}>*</span></div><input style={s.input} type="email" value={form.email} onChange={set('email')} placeholder="john@company.com" /></div>
          <div style={s.field}><div style={s.label}>Company / Lender name <span style={s.req}>*</span></div><input style={s.input} value={form.company} onChange={set('company')} placeholder="Acme Lending LLC" /></div>
          <div style={s.field}><div style={s.label}>Phone number <span style={s.req}>*</span></div><input style={s.input} value={form.phone} onChange={handlePhoneChange} placeholder="(555) 000-0000" /></div>
          <div style={s.field}><div style={s.label}>Borrower ID <span style={s.opt}>optional</span></div><input style={s.input} value={form.loanId} onChange={set('loanId')} placeholder="If known" /></div>
          <div style={s.field}>
            <div style={s.label}>Borrower email <span style={s.opt}>optional</span></div>
            <input style={s.input} type="email" value={form.borrowerEmail} onChange={set('borrowerEmail')} placeholder="borrower@email.com" />
            <div style={{ fontSize: 11, color: '#444', marginTop: 3 }}>We'll send the borrower an activation link for their portal</div>
          </div>
          <div style={s.fieldFull}><div style={s.label}>Additional notes <span style={s.opt}>optional</span></div><textarea style={s.textarea} value={form.notes} onChange={set('notes')} placeholder="Anything else we should know…" /></div>
        </div>

        <hr style={s.divider} />
        <div style={s.sectionLabel}>Documents <span style={s.req}>*</span></div>
        <div style={s.uploadZone} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop} onClick={() => fileInputRef.current.click()}>
          <input ref={fileInputRef} type="file" accept="application/pdf" multiple style={{ display: 'none' }} onChange={(e) => addFiles(e.target.files)} />
          <div style={s.uploadIconWrap}>↑</div>
          <div style={s.uploadTitle}>Drag & drop your loan documents here</div>
          <div style={s.uploadSub}>or <span style={s.uploadBrowse}>browse to upload</span> · PDF only · Max 25MB per file</div>
        </div>
        {files.map((f, i) => (
          <div key={i} style={s.filePill}>
            <div style={s.fileIcon}><div style={s.fileIconInner}></div></div>
            <span style={s.fileName}>{f.name}</span>
            <span style={s.fileSize}>{(f.size / 1024).toFixed(0)} KB</span>
            <span style={s.fileRemove} onClick={() => removeFile(i)}>✕</span>
          </div>
        ))}

        <hr style={s.divider} />
        <div style={s.sectionLabel}>Turnaround</div>
        <div style={s.tOption(turnaround === 'standard')} onClick={() => setTurnaround('standard')}>
          <div><div style={s.tName}>Standard — within 24 hours</div><div style={s.tDesc}>Best for most requests</div></div>
          <div style={{ display: 'flex', alignItems: 'center' }}><span style={s.tPrice}>$40</span><div style={s.radio(turnaround === 'standard')}>{turnaround === 'standard' && <div style={s.radioDot}></div>}</div></div>
        </div>
        <div style={s.tOption(turnaround === 'rush')} onClick={() => setTurnaround('rush')}>
          <div><div style={s.tName}>Rush — within 15 minutes</div><div style={s.tDesc}>For same-day closings and urgent requests</div></div>
          <div style={{ display: 'flex', alignItems: 'center' }}><span style={s.tPrice}>$50</span><div style={s.radio(turnaround === 'rush')}>{turnaround === 'rush' && <div style={s.radioDot}></div>}</div></div>
        </div>

        <div style={s.securityNote}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>🔒</span>
          <div style={s.securityText}>Your documents are encrypted in transit and at rest. Your card is authorized now and only charged once your payoff statement is delivered.</div>
        </div>

        <hr style={s.divider} />
        <div style={s.sectionLabel}>Payment</div>
        <Elements stripe={stripePromise}>
          <PaymentForm turnaround={turnaround} form={form} files={files} onSuccess={() => setSubmitted(true)} />
        </Elements>
      </div>
    </div>
  );
}
