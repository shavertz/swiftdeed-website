import { useState, useRef, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
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

const STEPS = [
  'Uploading documents',
  'Extracting loan data',
  'Generating documents',
  'Sending to your inbox',
];

function LoadingScreen() {
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const stepDurations = [3000, 8000, 12000, 7000];
    let stepIndex = 0;
    let elapsed = 0;
    const total = stepDurations.reduce((a, b) => a + b, 0);

    const tick = setInterval(() => {
      elapsed += 100;
      setProgress(Math.min(98, (elapsed / total) * 100));
    }, 100);

    const advanceStep = () => {
      if (stepIndex < STEPS.length - 1) {
        stepIndex++;
        setActiveStep(stepIndex);
        setTimeout(advanceStep, stepDurations[stepIndex]);
      }
    };
    setTimeout(advanceStep, stepDurations[0]);

    return () => { clearInterval(tick); };
  }, []);

  return (
    <div style={{ background: '#0f0f0f', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ fontSize: 11, color: '#555', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 48 }}>SwiftDeed</div>

      <div style={{ position: 'relative', width: 64, height: 64, marginBottom: 32 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid #1e1e1e' }}></div>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#D4A017', animation: 'sd-spin 1.2s linear infinite' }}></div>
        <div style={{ position: 'absolute', inset: 10, borderRadius: '50%', background: '#161600', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, background: '#D4A017', opacity: 0.8, animation: 'sd-pulse 1.5s ease-in-out infinite' }}></div>
        </div>
      </div>

      <div style={{ fontSize: 20, fontWeight: 500, color: '#fff', marginBottom: 8 }}>Processing your loan</div>
      <div style={{ fontSize: 13, color: '#555', marginBottom: 36, textAlign: 'center', lineHeight: 1.7 }}>
        Extracting data and generating documents
      </div>

      <div style={{ width: '100%', maxWidth: 280, marginBottom: 10 }}>
        <div style={{ background: '#1a1a1a', borderRadius: 99, height: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#D4A017', borderRadius: 99, width: `${progress}%`, transition: 'width 0.3s ease' }}></div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 32, width: '100%', maxWidth: 280 }}>
        {STEPS.map((label, i) => {
          const done = i < activeStep;
          const active = i === activeStep;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', border: `0.5px solid ${done ? '#D4A017' : active ? '#555' : '#2a2a2a'}`, background: done ? '#1a1800' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.4s' }}>
                {done && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#D4A017' }}></div>}
                {active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#555', animation: 'sd-pulse 1.2s ease-in-out infinite' }}></div>}
              </div>
              <div style={{ fontSize: 13, color: done ? '#888' : active ? '#ccc' : '#333', transition: 'color 0.4s' }}>{label}</div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes sd-spin { to { transform: rotate(360deg); } }
        @keyframes sd-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  );
}

function SuccessScreen({ form, files, turnaround, onReset }) {
  return (
    <div style={{ background: '#0f0f0f', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ fontSize: 11, color: '#555', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 48 }}>SwiftDeed</div>

      <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#0d2e1a', border: '0.5px solid #1a4a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <polyline points="4,13 9,18 20,7" stroke="#4caf7d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div style={{ fontSize: 24, fontWeight: 500, color: '#fff', marginBottom: 8 }}>Loan serviced.</div>
      <div style={{ fontSize: 14, color: '#555', marginBottom: 32, textAlign: 'center', lineHeight: 1.7, maxWidth: 360 }}>
        Your documents have been processed and will arrive in your inbox shortly.
      </div>

      <div style={{ background: '#111', border: '0.5px solid #2a2a2a', borderRadius: 10, padding: '18px 22px', width: '100%', maxWidth: 340, marginBottom: 20 }}>
        {[
          ['Lender', form.name],
          ['Confirmation sent to', form.email],
          ['Turnaround', turnaround === 'standard' ? 'Within 24 hours' : 'Within 15 minutes'],
          ['Documents', `${files.length} file${files.length !== 1 ? 's' : ''} uploaded`],
        ].map(([label, value], i, arr) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '7px 0', borderBottom: i < arr.length - 1 ? '0.5px solid #1a1a1a' : 'none', color: '#555' }}>
            <span>{label}</span><span style={{ color: '#ccc' }}>{value}</span>
          </div>
        ))}
      </div>

      {form.borrowerEmail && (
        <div style={{ background: '#0d1a0d', border: '0.5px solid #1a3a1a', borderRadius: 8, padding: '12px 18px', fontSize: 12, color: '#4a7a4a', lineHeight: 1.6, width: '100%', maxWidth: 340, marginBottom: 28, boxSizing: 'border-box' }}>
          Borrower activation email sent to <span style={{ color: '#D4A017' }}>{form.borrowerEmail}</span>
        </div>
      )}

      <button
        style={{ background: 'transparent', color: '#FFD700', fontSize: 13, padding: '10px 24px', borderRadius: 7, border: '1px solid #FFD700', cursor: 'pointer' }}
        onClick={onReset}
      >
        Submit another request
      </button>
    </div>
  );
}

function PaymentForm({ turnaround, form, files, onSubmitting, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (skipPayment = false) => {
    if (!form.name || !form.email || !form.company || !form.phone || !form.borrowerName || !form.borrowerEmail) {
      setError('Please fill in all required fields.');
      return;
    }
    if (files.length === 0) {
      setError('Please upload at least one loan document.');
      return;
    }
    setError('');
    setSubmitting(true);
    onSubmitting(true);

    try {
      let paymentIntentId = null;

      if (!skipPayment) {
        const intentRes = await fetch('https://swiftdeed.vercel.app/api/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: PRICES[turnaround], borrowerName: form.name, propertyAddress: '' }),
        });
        const { clientSecret, paymentIntentId: pid } = await intentRes.json();
        paymentIntentId = pid;

        const { error: stripeError } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: { card: elements.getElement(CardElement), billing_details: { name: form.name, email: form.email } },
        });
        if (stripeError) {
          setError(stripeError.message);
          setSubmitting(false);
          onSubmitting(false);
          return;
        }
      }

      const uploadedUrls = [];
      for (const file of files) {
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const { error: uploadError } = await supabase.storage.from('loan-documents').upload(fileName, file, { contentType: 'application/pdf' });
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

      // Fire and forget — polling handles completion detection
      fetch('https://swiftdeed.vercel.app/api/submit', { method: 'POST', body: data }).catch(() => {});
    } catch (e) {
      setError('Something went wrong. Please try again.');
      console.error(e);
      setSubmitting(false);
      onSubmitting(false);
    }
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
        <button
          onClick={() => handleSubmit(true)}
          disabled={submitting}
          style={{ background: 'transparent', color: '#444', fontSize: 12, padding: '8px 16px', borderRadius: 7, border: '0.5px solid #2a2a2a', cursor: 'pointer' }}>
          Skip Payment (Test Mode)
        </button>
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
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', company: '', phone: '', borrowerEmail: '', borrowerName: '', notes: '' });
  const fileInputRef = useRef();

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const handlePhoneChange = (e) => setForm({ ...form, phone: formatPhone(e.target.value) });

  const addFiles = (newFiles) => {
    const pdfs = Array.from(newFiles).filter(f => f.type === 'application/pdf');
    setFiles(prev => [...prev, ...pdfs]);
  };
  const removeFile = (i) => setFiles(files.filter((_, idx) => idx !== i));
  const handleDrop = (e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); };

  const { user } = useUser();

  useEffect(() => {
    if (!user) return;
    const userEmail = user?.primaryEmailAddress?.emailAddress;
    if (!userEmail) return;
    async function fetchLenderInfo() {
      try {
        const res = await fetch(
          `${process.env.REACT_APP_SUPABASE_URL}/rest/v1/lenders?email=eq.${encodeURIComponent(userEmail)}&select=full_name,company_name,phone,email&limit=1`,
          { headers: { apikey: process.env.REACT_APP_SUPABASE_ANON_KEY, Authorization: `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}` } }
        );
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const l = data[0];
          setForm(prev => ({
            ...prev,
            name: l.full_name || prev.name,
            email: l.email || userEmail || prev.email,
            company: l.company_name || prev.company,
            phone: l.phone || prev.phone,
          }));
        }
      } catch (e) { console.error(e); }
    }
    fetchLenderInfo();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReset = () => {
    setSubmitted(false);
    setSubmitting(false);
    setFiles([]);
    setForm({ name: '', email: '', company: '', phone: '', borrowerEmail: '', borrowerName: '', notes: '' });
  };

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

  const handleSetSubmitting = (val) => {
    setSubmitting(val);
    if (val) {
      window.setTimeout(() => {
        setSubmitting(false);
        setSubmitted(true);
      }, 30000);
    }
  };



  if (submitting && !submitted) return <LoadingScreen />;
  if (submitted) return <SuccessScreen form={form} files={files} turnaround={turnaround} onReset={handleReset} />;

  return (
    <div style={s.wrap}>
      <div style={s.title}>Service your loan</div>
      <div style={s.sub}>Upload your loan documents and we'll deliver a fully prepared payoff statement to your inbox. Your card is authorized now and only charged after delivery.</div>

      <div style={s.card}>
        <div style={s.sectionLabel}>Your information</div>
        <div style={s.grid}>
          <div style={s.field}><div style={s.label}>Name <span style={s.req}>*</span></div><input style={s.input} value={form.name} onChange={set('name')} placeholder="John Davis" /></div>
          <div style={s.field}><div style={s.label}>Email <span style={s.req}>*</span></div><input style={s.input} type="email" value={form.email} onChange={set('email')} placeholder="john@company.com" /></div>
          <div style={s.field}><div style={s.label}>Company / Lender name <span style={s.req}>*</span></div><input style={s.input} value={form.company} onChange={set('company')} placeholder="Acme Lending LLC" /></div>
          <div style={s.field}><div style={s.label}>Phone number <span style={s.req}>*</span></div><input style={s.input} value={form.phone} onChange={handlePhoneChange} placeholder="(555) 000-0000" /></div>
          <div style={s.field}>
            <div style={s.label}>Borrower name <span style={s.req}>*</span></div>
            <input style={s.input} value={form.borrowerName} onChange={set('borrowerName')} placeholder="John Martinez or Acme LLC" />
          </div>
          <div style={s.field}>
            <div style={s.label}>Borrower email <span style={s.req}>*</span></div>
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
          <PaymentForm turnaround={turnaround} form={form} files={files} onSubmitting={handleSetSubmitting} onSuccess={() => setSubmitted(true)} />
        </Elements>
      </div>
    </div>
  );
}
