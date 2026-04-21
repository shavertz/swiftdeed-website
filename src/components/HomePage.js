export default function HomePage({ onLenderLogin, onBorrowerLogin, onTerms, onPrivacy }) {
  const s = {
    page: { background: '#0f0f0f', minHeight: '100vh', color: '#f0f0f0', fontFamily: 'inherit' },
    hero: { padding: '40px 60px 80px', textAlign: 'center', maxWidth: 800, margin: '0 auto' },
    h1: { fontSize: 52, fontWeight: 500, lineHeight: 1.15, letterSpacing: -1, marginBottom: 20 },
    yellow: { color: '#FFD700' },
    heroP: { fontSize: 18, color: '#888', lineHeight: 1.7, marginBottom: 36, maxWidth: 560, margin: '0 auto 36px' },
    ctas: { display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    btnPrimary: { background: '#FFD700', color: '#0f0f0f', fontSize: 15, fontWeight: 500, padding: '13px 28px', borderRadius: 7, border: 'none', cursor: 'pointer' },
    btnSecondary: { background: 'transparent', color: '#fff', fontSize: 15, padding: '13px 28px', borderRadius: 7, border: '1px solid #FFD700', cursor: 'pointer' },
    portalNote: { fontSize: 12, color: '#444', marginBottom: 56 },
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
    portalSection: { padding: '80px 60px', maxWidth: 1000, margin: '0 auto' },
    portalGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'stretch' },
    portalCard: (accent) => ({ background: '#111', border: `0.5px solid ${accent ? '#2a2a3a' : '#2a2a2a'}`, borderRadius: 12, overflow: 'hidden' }),
    cardHeader: { padding: '14px 20px', borderBottom: '0.5px solid #1e1e1e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontSize: 13, fontWeight: 500, color: '#fff' },
    badgeLender: { fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#1a2a1a', color: '#4a9a4a' },
    badgeBorrower: { fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#1a1a2a', color: '#4a70b8' },
    cardBody: { padding: 20 },
    tableHead: { display: 'grid', gridTemplateColumns: '1fr 1.4fr 0.9fr', gap: 8, paddingBottom: 8, borderBottom: '0.5px solid #1e1e1e', marginBottom: 4 },
    th: { fontSize: 11, color: '#444', letterSpacing: '0.5px', textTransform: 'uppercase' },
    tableRow: { display: 'grid', gridTemplateColumns: '1fr 1.4fr 0.9fr', gap: 8, padding: '10px 0', borderBottom: '0.5px solid #1a1a1a', alignItems: 'center' },
    tdId: { fontSize: 11, color: '#4a90b8', fontFamily: 'monospace' },
    tdName: { fontSize: 13, color: '#ccc' },
    statusReady: { fontSize: 11, padding: '3px 8px', borderRadius: 4, display: 'inline-block', background: '#1a2a1a', color: '#4a9a4a' },
    statusActive: { fontSize: 11, padding: '3px 8px', borderRadius: 4, display: 'inline-block', background: '#1e1e1e', color: '#555' },
    divider: { border: 'none', borderTop: '0.5px solid #1e1e1e', margin: '14px 0' },
    loanBar: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '0.5px solid #1e1e1e', marginBottom: 16 },
    loanStat: (last) => ({ padding: '12px 14px', borderRight: last ? 'none' : '0.5px solid #1e1e1e' }),
    loanStatLabel: { fontSize: 11, color: '#555', marginBottom: 4 },
    loanStatVal: { fontSize: 13, fontWeight: 500, color: '#ccc' },
    chartPayRow: { display: 'grid', gridTemplateColumns: '140px 1fr', gap: 16, alignItems: 'center', marginBottom: 16 },
    payGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
    payBox: { background: '#1a1a1a', borderRadius: 8, padding: '12px 14px' },
    payLabel: { fontSize: 11, color: '#555', marginBottom: 4 },
    payVal: { fontSize: 15, fontWeight: 500, color: '#fff' },
    paySub: { fontSize: 11, color: '#444', marginTop: 2 },
    portalBtns: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 48 },
    pbBorrower: { background: '#FFD700', color: '#0f0f0f', border: 'none', borderRadius: 7, padding: 13, fontSize: 14, fontWeight: 500, cursor: 'pointer' },
    pbLender: { background: 'transparent', color: '#fff', border: '1px solid #FFD700', borderRadius: 7, padding: 13, fontSize: 14, fontWeight: 500, cursor: 'pointer' },
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
    whySection: { borderTop: '0.5px solid #1e1e1e', padding: '80px 60px', maxWidth: 1000, margin: '0 auto' },
    whyGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: '#1e1e1e', border: '0.5px solid #1e1e1e', borderRadius: 12, overflow: 'hidden', marginTop: 48 },
    whyItem: { background: '#111', padding: '28px 32px' },
    whyIcon: { fontSize: 20, marginBottom: 14 },
    whyH: { fontSize: 15, fontWeight: 500, marginBottom: 8 },
    whyP: { fontSize: 14, color: '#666', lineHeight: 1.6 },
    footer: { borderTop: '0.5px solid #1e1e1e', padding: '40px 60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    footerLogo: { fontSize: 18, fontWeight: 500 },
    footerCopy: { fontSize: 13, color: '#444' },
    footerLinks: { display: 'flex', gap: 24 },
    footerLink: { fontSize: 13, color: '#555', textDecoration: 'none', cursor: 'pointer' },
  };

  return (
    <div style={s.page}>

      {/* HERO */}
      <div style={s.hero}>
        <h1 style={s.h1}>Swift. Serviced. <span style={s.yellow}>Secure.</span></h1>
        <p style={s.heroP}>We handle the servicing so you can focus on lending. Your borrowers stay informed, your statements are always on time.</p>
        <div style={s.ctas}>
          <button style={s.btnPrimary} onClick={onBorrowerLogin}>I'm a borrower</button>
          <button style={s.btnSecondary} onClick={onLenderLogin}>I'm a lender</button>
        </div>
        <div style={s.portalNote}>New here? Create an account in seconds.</div>
        <div style={s.statsRow}>
          <div style={{ textAlign: 'center' }}><div style={s.statNum}>15min</div><div style={s.statLabel}>Rush turnaround</div></div>
          <div style={{ textAlign: 'center' }}><div style={s.statNum}>24hr</div><div style={s.statLabel}>Standard turnaround</div></div>
          <div style={{ textAlign: 'center' }}><div style={s.statNum}>$40</div><div style={s.statLabel}>Starting price</div></div>
        </div>
      </div>

      {/* TRUST BAR */}
      <div style={{ padding: '0 60px 60px', maxWidth: 860, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: '#2a2a2a', border: '0.5px solid #2a2a2a', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ background: '#111', padding: '18px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#FFD700', marginBottom: 4 }}>Same-day</div>
            <div style={{ fontSize: 12, color: '#555' }}>Statement delivery</div>
          </div>
          <div style={{ background: '#111', padding: '18px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#FFD700', marginBottom: 4 }}>$0 setup fees</div>
            <div style={{ fontSize: 12, color: '#555' }}>No monthly costs</div>
          </div>
          <div style={{ background: '#111', padding: '18px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#FFD700', marginBottom: 4 }}>No contracts</div>
            <div style={{ fontSize: 12, color: '#555' }}>Cancel anytime</div>
          </div>
          <div style={{ background: '#111', padding: '18px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#FFD700', marginBottom: 4 }}>24/7 access</div>
            <div style={{ fontSize: 12, color: '#555' }}>Lender & borrower portals</div>
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div id="how" style={s.howWrap}>
        <div style={s.howInner}>
          <div style={s.sectionLabel}>How it works</div>
          <div style={s.sectionTitle}>Loans managed. Borrowers informed. Always.</div>
          <div style={s.sectionSub}>Simple, fast, and secure. Onboard your loan and we handle the rest — no back and forth needed.</div>
          <div style={s.stepsGrid}>
            <div style={s.step(false)}>
              <div style={s.stepNum}>01</div>
              <div style={s.stepIcon}>🏠</div>
              <div style={s.stepH}>Onboard your loan</div>
              <p style={s.stepP}>Send us the loan details once through your lender portal. Setup takes under two minutes.</p>
            </div>
            <div style={s.step(false)}>
              <div style={s.stepNum}>02</div>
              <div style={s.stepIcon}>⚙️</div>
              <div style={s.stepH}>We manage the servicing</div>
              <p style={s.stepP}>Statements, borrower communications, and payment tracking — handled automatically on your behalf.</p>
            </div>
            <div style={s.step(true)}>
              <div style={s.stepNum}>03</div>
              <div style={s.stepIcon}>📊</div>
              <div style={s.stepH}>You stay in control</div>
              <p style={s.stepP}>Monitor every loan in your portal. Your borrowers get what they need, when they need it.</p>
            </div>
          </div>
        </div>
      </div>

      {/* PORTAL PREVIEW */}
      <div style={s.portalSection}>
        <div style={s.sectionLabel}>The platform</div>
        <div style={s.sectionTitle}>Your loan. Fully serviced.</div>
        <div style={{ ...s.sectionSub, marginBottom: 48 }}>Lenders manage their loan portfolio. Borrowers stay informed and in control. Everyone gets what they need.</div>

        <div style={s.portalGrid}>

          {/* BORROWER CARD */}
          <div style={s.portalCard(true)}>
            <div style={s.cardHeader}>
              <div style={s.cardTitle}>Borrower portal</div>
              <span style={s.badgeBorrower}>Your account</span>
            </div>
            <div style={s.cardBody}>
              <div style={s.loanBar}>
                <div style={s.loanStat(false)}><div style={s.loanStatLabel}>Homeowner</div><div style={s.loanStatVal}>J. Martinez</div></div>
                <div style={s.loanStat(false)}><div style={s.loanStatLabel}>Interest rate</div><div style={s.loanStatVal}>8.500%</div></div>
                <div style={s.loanStat(false)}><div style={s.loanStatLabel}>Principal balance</div><div style={{ ...s.loanStatVal, color: '#FFD700' }}>$124,500</div></div>
                <div style={s.loanStat(true)}><div style={s.loanStatLabel}>Per diem</div><div style={s.loanStatVal}>$33.90</div></div>
              </div>
              <div style={s.chartPayRow}>
                <div>
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="45" fill="none" stroke="#1a1a1a" strokeWidth="18"/>
                    <circle cx="60" cy="60" r="45" fill="none" stroke="#4a90b8" strokeWidth="18" strokeDasharray="169 114" strokeDashoffset="0" transform="rotate(-90 60 60)"/>
                    <circle cx="60" cy="60" r="45" fill="none" stroke="#FFD700" strokeWidth="18" strokeDasharray="28 255" strokeDashoffset="-169" transform="rotate(-90 60 60)"/>
                    <circle cx="60" cy="60" r="45" fill="none" stroke="#2a2a2a" strokeWidth="18" strokeDasharray="86 197" strokeDashoffset="-197" transform="rotate(-90 60 60)"/>
                    <text x="60" y="56" textAnchor="middle" fontSize="11" fill="#555">Balance</text>
                    <text x="60" y="70" textAnchor="middle" fontSize="13" fontWeight="500" fill="#fff">$124.5k</text>
                  </svg>
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#555' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4a90b8', flexShrink: 0 }}></div>Principal paid</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#555' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFD700', flexShrink: 0 }}></div>Interest paid</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#555' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2a2a2a', flexShrink: 0 }}></div>Remaining</div>
                  </div>
                </div>
                <div>
                  <div style={s.payGrid}>
                    <div style={s.payBox}><div style={s.payLabel}>Last payment</div><div style={s.payVal}>$2,306</div><div style={s.paySub}>04/01/2026</div></div>
                    <div style={s.payBox}><div style={s.payLabel}>Due date</div><div style={s.payVal}>05/01/2026</div><div style={s.paySub}>Next payment</div></div>
                    <div style={s.payBox}><div style={s.payLabel}>Interest accrued</div><div style={{ ...s.payVal, color: '#FFD700' }}>$881</div><div style={s.paySub}>This period</div></div>
                    <div style={s.payBox}><div style={s.payLabel}>Statement</div><div style={{ ...s.payVal, color: '#4a9a4a', fontSize: 13 }}>Ready</div><div style={s.paySub}>Apr 2026</div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* LENDER CARD */}
          <div style={s.portalCard(false)}>
            <div style={s.cardHeader}>
              <div style={s.cardTitle}>Lender portal</div>
              <span style={s.badgeLender}>Your dashboard</span>
            </div>
            <div style={s.cardBody}>
              <div style={s.tableHead}>
                <span style={s.th}>Loan ID</span>
                <span style={s.th}>Borrower</span>
                <span style={s.th}>Status</span>
              </div>
              <div style={{ ...s.tableRow, borderBottom: '0.5px solid #1a1a1a' }}>
                <span style={s.tdId}>SD-2026-4421</span>
                <span style={s.tdName}>J. Martinez</span>
                <span style={s.statusReady}>Statement ready</span>
              </div>
              <div style={{ ...s.tableRow, borderBottom: '0.5px solid #1a1a1a' }}>
                <span style={s.tdId}>SD-2026-3817</span>
                <span style={s.tdName}>R. Thompson</span>
                <span style={s.statusActive}>Active</span>
              </div>
              <div style={{ ...s.tableRow, borderBottom: 'none' }}>
                <span style={s.tdId}>SD-2026-3102</span>
                <span style={s.tdName}>K. Patel</span>
                <span style={s.statusActive}>Active</span>
              </div>
              <div style={s.divider}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: '#555' }}>3 active loans · 1 statement ready</div>
                <div style={{ fontSize: 12, color: '#4a90b8', cursor: 'pointer' }}>View all →</div>
              </div>
            </div>
          </div>

        </div>

        <div style={s.portalBtns}>
          <button style={s.pbBorrower} onClick={onBorrowerLogin}>I'm a borrower</button>
          <button style={s.pbLender} onClick={onLenderLogin}>I'm a lender</button>
        </div>
      </div>

      {/* PRICING */}
      <div id="pricing" style={s.pricingSection}>
        <div style={s.sectionLabel}>Pricing</div>
        <div style={s.sectionTitle}>Simple, flat pricing</div>
        <div style={s.sectionSub}>No hidden fees. No subscriptions. Pay per statement.</div>
        <div style={s.pricingCards}>
          <div style={s.pricingCard(false)}>
            <div style={s.priceName}>Standard</div>
            <div style={s.priceAmt}><sup style={{ fontSize: 20, verticalAlign: 'top', marginTop: 10, display: 'inline-block' }}>$</sup>40</div>
            <div style={s.priceTime}>Delivered within 24 hours</div>
            <hr style={s.priceDivider} />
            <ul style={s.priceFeatures}>
              {['Professionally formatted PDF', 'Principal, interest & fee breakdown', 'Delivered directly to your inbox', 'Works with any loan documents'].map(f => <li key={f} style={s.priceFeat}><span style={s.check}>✓</span>{f}</li>)}
            </ul>
          </div>
          <div style={s.pricingCard(true)}>
            <div style={s.featBadge}>Most popular</div>
            <div style={s.priceName}>Rush</div>
            <div style={s.priceAmt}><sup style={{ fontSize: 20, verticalAlign: 'top', marginTop: 10, display: 'inline-block' }}>$</sup>50</div>
            <div style={s.priceTime}>Delivered within 15 minutes</div>
            <hr style={s.priceDivider} />
            <ul style={s.priceFeatures}>
              {['Everything in Standard', 'Priority processing', 'Ideal for same-day closings', "15-minute guarantee or it's free"].map(f => <li key={f} style={s.priceFeat}><span style={s.check}>✓</span>{f}</li>)}
            </ul>
          </div>
        </div>
      </div>

      {/* WHY SWIFTDEED */}
      <div id="why" style={s.whySection}>
        <div style={s.sectionLabel}>Why SwiftDeed</div>
        <div style={s.sectionTitle}>Why onboard with SwiftDeed?</div>
        <div style={s.sectionSub}>Private lenders come to us when servicing starts getting in the way of lending.</div>
        <div style={s.whyGrid}>
          <div style={s.whyItem}>
            <div style={s.whyIcon}>📋</div>
            <div style={s.whyH}>Focus on lending, not paperwork</div>
            <p style={s.whyP}>Most private lenders manage servicing in-house until it becomes a second job. Statements, borrower calls, payment tracking — we take all of it off your plate so you can focus on closing deals.</p>
          </div>
          <div style={s.whyItem}>
            <div style={s.whyIcon}>⚡</div>
            <div style={s.whyH}>Same-day turnaround, every time</div>
            <p style={s.whyP}>Most servicers take 3–5 days. We deliver payoff statements same-day, rush requests in 15 minutes. Your deals don't wait on us.</p>
          </div>
          <div style={s.whyItem}>
            <div style={s.whyIcon}>🎯</div>
            <div style={s.whyH}>Deep expertise, zero fluff</div>
            <p style={s.whyP}>We know private lending inside and out. Every feature we've built exists because private lenders asked for it. Nothing more, nothing less.</p>
          </div>
          <div style={s.whyItem}>
            <div style={s.whyIcon}>💰</div>
            <div style={s.whyH}>Predictable flat pricing</div>
            <p style={s.whyP}>No monthly fees, no setup costs, no surprises. You pay per statement. At $40–$50 per payoff, you're getting enterprise-level servicing at a fraction of the cost of in-house staff.</p>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={s.footer}>
        <div>
          <div style={s.footerLogo}><span style={{ color: '#fff' }}>Swift</span><span style={{ color: '#FFD700' }}>Deed</span></div>
          <div style={{ fontSize: 12, color: '#333', marginTop: 4 }}>theswiftdeed.com</div>
        </div>
        <div style={s.footerCopy}>© 2026 SwiftDeed. All rights reserved.</div>
        <div style={s.footerLinks}>
          <span style={{ ...s.footerLink, cursor: 'pointer' }} onClick={onPrivacy}>Privacy</span>
          <span style={{ ...s.footerLink, cursor: 'pointer' }} onClick={onTerms}>Terms</span>
          <a style={s.footerLink} href="mailto:scott@theswiftdeed.com">Contact</a>
        </div>
      </div>

    </div>
  );
}
