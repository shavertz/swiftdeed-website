export default function HomePage({ onGetStarted }) {
  const s = {
    page: { background: '#0f0f0f', minHeight: '100vh', color: '#f0f0f0', fontFamily: 'inherit' },
    hero: { padding: '100px 60px 80px', textAlign: 'center', maxWidth: 800, margin: '0 auto' },
    badge: { display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1a1a1a', border: '0.5px solid #2e2e2e', padding: '6px 14px', borderRadius: 20, fontSize: 13, color: '#aaa', marginBottom: 28 },
    badgeDot: { width: 7, height: 7, borderRadius: '50%', background: '#4a90b8' },
    h1: { fontSize: 52, fontWeight: 500, lineHeight: 1.15, letterSpacing: -1, marginBottom: 20 },
    yellow: { color: '#FFD700' },
    heroP: { fontSize: 18, color: '#888', lineHeight: 1.7, marginBottom: 36, maxWidth: 560, margin: '0 auto 36px' },
    ctas: { display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 56 },
    btnPrimary: { background: '#FFD700', color: '#0f0f0f', fontSize: 15, fontWeight: 500, padding: '13px 28px', borderRadius: 7, border: 'none', cursor: 'pointer' },
    btnSecondary: { background: 'transparent', color: '#fff', fontSize: 15, padding: '13px 28px', borderRadius: 7, border: '0.5px solid #333', cursor: 'pointer' },
    statsRow: { display: 'flex', gap: 48, justifyContent: 'center', borderTop: '0.5px solid #1e1e1e', paddingTop: 40 },
    statNum: { fontSize: 28, fontWeight: 500, color: '#FFD700' },
    statLabel: { fontSize: 13, color: '#666', marginTop: 4 },
    howWrap: { background: '#111', borderTop: '0.5px solid #1e1e1e', borderBottom: '0.5px solid #1e1e1e', padding: '80px 60px' },
    howInner: { maxWidth: 1000, margin: '0 auto' },
    sectionLabel: { fontSize: 12, color: '#4a90b8', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 12 },
    sectionTitle: { fontSize: 34, fontWeight: 500, letterSpacing: -0.5, marginBottom: 16 },
    sectionSub: { fontSize: 16, color: '#666', lineHeight: 1.7, maxWidth: 500 },
    stepsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, marginTop: 56, borderTop: '0.5px solid #1e1e1e' },
    step: (last) => ({ padding: 32, borderRight: last ? 'none' : '0.5px solid #1e1e1e' }),
    stepNum: { fontSize: 12, color: '#444', marginBottom: 16, fontWeight: 500 },
    stepIcon: { width: 40, height: 40, borderRadius: 8, background: '#1a1a1a', border: '0.5px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, fontSize: 18 },
    stepH: { fontSize: 16, fontWeight: 500, marginBottom: 8 },
    stepP: { fontSize: 14, color: '#666', lineHeight: 1.6 },
    emailSection: { padding: '80px 60px', maxWidth: 1000, margin: '0 auto', textAlign: 'left' },
    emailBox: { background: '#111', border: '0.5px solid #2a2a2a', borderRadius: 12, padding: 32, maxWidth: 560, margin: '40px auto 0', textAlign: 'left' },
    emailTo: { fontSize: 12, color: '#444', marginBottom: 8 },
    emailAddr: { fontSize: 15, color: '#4a90b8', fontFamily: 'monospace', marginBottom: 20 },
    emailLabel: { fontSize: 12, color: '#555', marginBottom: 6 },
    emailSubject: { fontSize: 14, color: '#888', marginBottom: 16 },
    attachRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
    attachPill: { background: '#1a1a1a', border: '0.5px solid #2a2a2a', borderRadius: 6, padding: '6px 12px', fontSize: 12, color: '#aaa', display: 'flex', alignItems: 'center', gap: 6 },
    attachIcon: { width: 14, height: 14, background: '#4a90b8', borderRadius: 2, flexShrink: 0 },
    arrowRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, margin: '20px 0', color: '#444', fontSize: 13 },
    arrowLine: { flex: 1, height: 0.5, background: '#2a2a2a' },
    responseBox: { background: '#1a1a1a', border: '0.5px solid #FFD700', borderRadius: 10, padding: '20px 24px' },
    respHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    respTitle: { fontSize: 15, fontWeight: 500, color: '#fff' },
    respTime: { fontSize: 12, color: '#4a90b8' },
    respSectionLabel: { fontSize: 11, color: '#555', letterSpacing: '1px', textTransform: 'uppercase', margin: '14px 0 8px' },
    respRow: { display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '0.5px solid #242424', color: '#666' },
    respTotal: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTop: '0.5px solid #2e2e2e' },
    respFooter: { fontSize: 11, color: '#444', marginTop: 14, lineHeight: 1.5, borderTop: '0.5px solid #1e1e1e', paddingTop: 12 },
    dlBtn: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 14 },
    dlBtnInner: { background: '#222', border: '0.5px solid #333', borderRadius: 5, padding: '6px 12px', fontSize: 12, color: '#aaa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
    pricingSection: { borderTop: '0.5px solid #1e1e1e', padding: '80px 60px', maxWidth: 1000, margin: '0 auto' },
    pricingCards: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 48 },
    pricingCard: (featured) => ({ background: '#111', border: `0.5px solid ${featured ? '#FFD700' : '#2a2a2a'}`, borderRadius: 12, padding: 32, position: 'relative' }),
    featBadge: { position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#FFD700', color: '#0f0f0f', fontSize: 11, fontWeight: 500, padding: '4px 14px', borderRadius: 20, whiteSpace: 'nowrap' },
    priceName: { fontSize: 14, color: '#888', marginBottom: 8 },
    priceAmt: { fontSize: 42, fontWeight: 500, color: '#fff', letterSpacing: -1 },
    priceTime: { fontSize: 13, color: '#4a90b8', marginTop: 6 },
    priceDivider: { border: 'none', borderTop: '0.5px solid #1e1e1e', margin: '20px 0' },
    priceFeatures: { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 },
    priceFeat: { fontSize: 14, color: '#aaa', display: 'flex', gap: 10, alignItems: 'flex-start' },
    check: { color: '#4a90b8', fontSize: 14, flexShrink: 0 },
    priceBtn: (featured) => ({ width: '100%', marginTop: 28, padding: 12, borderRadius: 7, fontSize: 14, fontWeight: 500, cursor: 'pointer', background: featured ? '#FFD700' : 'transparent', color: featured ? '#0f0f0f' : '#fff', border: featured ? 'none' : '0.5px solid #333' }),
    whySection: { borderTop: '0.5px solid #1e1e1e', padding: '80px 60px', maxWidth: 1000, margin: '0 auto' },
    whyGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: '#1e1e1e', border: '0.5px solid #1e1e1e', borderRadius: 12, overflow: 'hidden', marginTop: 48 },
    whyItem: { background: '#111', padding: '28px 32px' },
    whyItemSecurity: { background: '#0d1a0d', padding: '28px 32px' },
    whyIcon: { fontSize: 20, marginBottom: 14 },
    whyH: { fontSize: 15, fontWeight: 500, marginBottom: 8 },
    whyP: { fontSize: 14, color: '#666', lineHeight: 1.6 },
    whyPSecurity: { fontSize: 14, color: '#3a5a3a', lineHeight: 1.6 },
    footer: { borderTop: '0.5px solid #1e1e1e', padding: '40px 60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    footerLogo: { fontSize: 18, fontWeight: 500 },
    footerCopy: { fontSize: 13, color: '#444' },
    footerLinks: { display: 'flex', gap: 24 },
    footerLink: { fontSize: 13, color: '#555', textDecoration: 'none', cursor: 'pointer' },
  };

  return (
    <div style={s.page}>
      <div style={s.hero}>
        
        <h1 style={s.h1}>The fastest way to get your <span style={s.yellow}>payoff statement</span></h1>
        <p style={s.heroP}>Send us your loan docs. We generate a fully prepared payoff statement and deliver it straight to your inbox — guaranteed within 2 hours.</p>
        <div style={s.ctas}>
          <button style={s.btnPrimary} onClick={onGetStarted}>Submit a request</button>
          <button style={s.btnSecondary}>How it works ↓</button>
        </div>
        <div style={s.statsRow}>
          <div style={{ textAlign: 'center' }}><div style={s.statNum}>2hr</div><div style={s.statLabel}>Standard turnaround</div></div>
          <div style={{ textAlign: 'center' }}><div style={s.statNum}>15min</div><div style={s.statLabel}>Rush turnaround</div></div>
          <div style={{ textAlign: 'center' }}><div style={s.statNum}>$35</div><div style={s.statLabel}>Starting price</div></div>
        </div>
      </div>

      <div id="how" style={s.howWrap}>
        <div style={s.howInner}>
          <div style={s.sectionLabel}>How it works</div>
          <div style={s.sectionTitle}>Three steps. That's it.</div>
          <div style={s.sectionSub}>Simple, fast, and secure. Upload your docs and receive your payoff statement — no back and forth needed.</div>
          <div style={s.stepsGrid}>
            <div style={s.step(false)}><div style={s.stepNum}>01</div><div style={s.stepIcon}>✉</div><div style={s.stepH}>Upload your loan docs</div><p style={s.stepP}>Submit your loan agreement, promissory note, or any supporting docs through our simple request form. PDF format.</p></div>
            <div style={s.step(false)}><div style={s.stepNum}>02</div><div style={s.stepIcon}>⚡</div><div style={s.stepH}>We extract & calculate</div><p style={s.stepP}>Our system reads your documents, extracts key loan details, and calculates the exact payoff amount including accrued interest.</p></div>
            <div style={s.step(true)}><div style={s.stepNum}>03</div><div style={s.stepIcon}>📄</div><div style={s.stepH}>Receive your statement</div><p style={s.stepP}>A professionally formatted payoff statement PDF lands in your inbox. Guaranteed in 2 hours, or 15 minutes for rush requests.</p></div>
          </div>
        </div>
      </div>

      <div style={s.emailSection}>
        <div style={s.sectionLabel}>The process</div>
        <div style={s.sectionTitle}>As simple as sending a form</div>
        <div style={s.sectionSub}>No accounts required. Submit your docs, get your statement back — with everything calculated and ready to use.</div>
        <div style={s.emailBox}>
          <div style={s.emailTo}>To:</div>
          <div style={s.emailAddr}>scott@theswiftdeed.com</div>
          <div style={s.emailLabel}>Subject:</div>
          <div style={s.emailSubject}>Payoff Request — 123 House Street, Atlanta GA</div>
          <div style={s.emailLabel}>Attachments:</div>
          <div style={s.attachRow}>
            <div style={s.attachPill}><div style={s.attachIcon}></div> Loan_Agreement.pdf</div>
            <div style={s.attachPill}><div style={s.attachIcon}></div> Promissory_Note.pdf</div>
          </div>
          <div style={s.arrowRow}><div style={s.arrowLine}></div><span>within 2 hours</span><div style={s.arrowLine}></div></div>
          <div style={s.responseBox}>
            <div style={s.respHeader}><span style={s.respTitle}>Payoff Statement</span><span style={s.respTime}>Delivered in 30 min</span></div>
            <div style={s.respSectionLabel}>Borrower information</div>
            <div style={s.respRow}><span>Borrower</span><span style={{ color: '#ccc' }}>Sample - 145 LLC</span></div>
            <div style={s.respRow}><span>Property</span><span style={{ color: '#ccc' }}>123 House Street, Atlanta GA 30316</span></div>
            <div style={s.respRow}><span>Loan ID</span><span style={{ color: '#ccc' }}>SD-2026-279206</span></div>
            <div style={s.respRow}><span>Lender</span><span style={{ color: '#ccc' }}>CL-LM RESI Purchaser Trust 1</span></div>
            <div style={s.respSectionLabel}>Payoff details</div>
            <div style={s.respRow}><span>Unpaid principal balance</span><span style={{ color: '#ccc' }}>$123,750.00</span></div>
            <div style={s.respRow}><span>Interest due (26 days @ $33.90/day)</span><span style={{ color: '#ccc' }}>$881.51</span></div>
            <div style={{ ...s.respRow, borderBottom: 'none' }}><span>Servicer fee</span><span style={{ color: '#ccc' }}>$618.75</span></div>
            <div style={s.respTotal}><span style={{ fontSize: 13, fontWeight: 500, color: '#aaa' }}>Total payoff amount</span><span style={{ fontSize: 20, fontWeight: 500, color: '#FFD700', letterSpacing: -0.5 }}>$125,250.26</span></div>
            <div style={s.dlBtn}><div style={s.dlBtnInner}>↓ Download statement</div><span style={{ fontSize: 12, color: '#444' }}>PDF · SD-2026-279206</span></div>
            <div style={s.respFooter}>This payoff statement is subject to final lender verification. All payments must be made via wire transfer or certified funds.</div>
          </div>
        </div>
      </div>

      <div id="pricing" style={s.pricingSection}>
        <div style={s.sectionLabel}>Pricing</div>
        <div style={s.sectionTitle}>Simple, flat pricing</div>
        <div style={s.sectionSub}>No hidden fees. No subscriptions. Pay per statement.</div>
        <div style={s.pricingCards}>
          <div style={s.pricingCard(false)}>
            <div style={s.priceName}>Standard</div>
            <div style={s.priceAmt}><sup style={{ fontSize: 20, verticalAlign: 'top', marginTop: 10, display: 'inline-block' }}>$</sup>35</div>
            <div style={s.priceTime}>Delivered within 2 hours</div>
            <hr style={s.priceDivider} />
            <ul style={s.priceFeatures}>
              {['Professionally formatted PDF', 'Principal, interest & fee breakdown', 'Delivered directly to your inbox', 'Works with any loan documents'].map(f => <li key={f} style={s.priceFeat}><span style={s.check}>✓</span>{f}</li>)}
            </ul>
            <button style={s.priceBtn(false)} onClick={onGetStarted}>Get started</button>
          </div>
          <div style={s.pricingCard(true)}>
            <div style={s.featBadge}>Rush — fastest option</div>
            <div style={s.priceName}>Rush</div>
            <div style={s.priceAmt}><sup style={{ fontSize: 20, verticalAlign: 'top', marginTop: 10, display: 'inline-block' }}>$</sup>45</div>
            <div style={s.priceTime}>Delivered within 15 minutes</div>
            <hr style={s.priceDivider} />
            <ul style={s.priceFeatures}>
              {['Everything in Standard', 'Priority processing', 'Ideal for same-day closings', "15-minute guarantee or it's free"].map(f => <li key={f} style={s.priceFeat}><span style={s.check}>✓</span>{f}</li>)}
            </ul>
            <button style={s.priceBtn(true)} onClick={onGetStarted}>Get started</button>
          </div>
        </div>
      </div>

      <div id="why" style={s.whySection}>
        <div style={s.sectionLabel}>Why SwiftDeed</div>
        <div style={s.sectionTitle}>Built for speed. Built for lenders.</div>
        <div style={s.sectionSub}>We do one thing and we do it fast. No bloated loan servicing platform. Just payoff statements.</div>
        <div style={s.whyGrid}>
          <div style={s.whyItem}>
            <div style={s.whyIcon}>⚡</div>
            <div style={s.whyH}>Guaranteed turnaround</div>
            <p style={s.whyP}>2-hour standard or 15-minute rush. If we miss the window, you don't pay. Simple as that.</p>
          </div>
          <div style={s.whyItemSecurity}>
            <div style={s.whyIcon}>🔒</div>
            <div style={{ ...s.whyH, color: '#4a9a4a' }}>Bank-level security</div>
            <p style={s.whyPSecurity}>Your documents are encrypted in transit and at rest. We never share your files with third parties — ever.</p>
          </div>
          <div style={s.whyItem}>
            <div style={s.whyIcon}>📬</div>
            <div style={s.whyH}>Simple submission</div>
            <p style={s.whyP}>Simple, fast, and secure. Upload your docs and receive your payoff statement — no back and forth needed.</p>
          </div>
          <div style={s.whyItem}>
            <div style={s.whyIcon}>💼</div>
            <div style={s.whyH}>Flat, transparent pricing</div>
            <p style={s.whyP}>$35 per statement. No subscriptions, no monthly fees, no surprises. Perfect for lenders of any size.</p>
          </div>
        </div>
      </div>

      <div style={s.footer}>
        <div>
          <div style={s.footerLogo}><span style={{ color: '#fff' }}>Swift</span><span style={{ color: '#FFD700' }}>Deed</span></div>
          <div style={{ fontSize: 12, color: '#333', marginTop: 4 }}>theswiftdeed.com</div>
        </div>
        <div style={s.footerCopy}>© 2026 SwiftDeed. All rights reserved.</div>
        <div style={s.footerLinks}>
          <a style={s.footerLink} href="/privacy">Privacy</a>
          <a style={s.footerLink} href="/terms">Terms</a>
          <a style={s.footerLink} href="mailto:scott@theswiftdeed.com">Contact</a>
        </div>
      </div>
    </div>
  );
}
