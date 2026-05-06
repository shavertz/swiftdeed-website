export default function HomePage({ onLenderLogin, onBorrowerLogin, onTerms, onPrivacy, activePortalType }) {
  const borrowerDisabled = activePortalType === 'lender';
  const lenderDisabled = activePortalType === 'borrower';

  const s = {
    page: { background: '#0f0f0f', minHeight: '100vh', color: '#f0f0f0', fontFamily: 'inherit' },
    hero: { padding: '40px 60px 80px', textAlign: 'center', maxWidth: 860, margin: '0 auto' },
    h1: { fontSize: 52, fontWeight: 500, lineHeight: 1.15, letterSpacing: -1, marginBottom: 20 },
    yellow: { color: '#FFD700' },
    heroP: { fontSize: 18, color: '#888', lineHeight: 1.7, marginBottom: 42, maxWidth: 700, margin: '0 auto 42px' },
    ctas: { display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    btnPrimary: { background: '#FFD700', color: '#0f0f0f', fontSize: 15, fontWeight: 500, padding: '13px 28px', borderRadius: 7, border: 'none', cursor: 'pointer', transition: 'background 0.15s' },
    btnSecondary: { background: '#FFD700', color: '#0f0f0f', fontSize: 15, fontWeight: 500, padding: '13px 28px', borderRadius: 7, border: 'none', cursor: 'pointer', transition: 'background 0.15s' },
    portalNote: { fontSize: 12, color: '#444', marginBottom: 40 },
    statsRow: { display: 'flex', gap: 48, justifyContent: 'center', marginBottom: 0 },
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
    stepIcon: { width: 40, height: 40, borderRadius: 8, background: '#1a1a1a', border: '0.5px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
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
    pbBorrower: { background: '#FFD700', color: '#0f0f0f', border: 'none', borderRadius: 7, padding: 13, fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'background 0.15s' },
    pbLender: { background: '#FFD700', color: '#0f0f0f', border: 'none', borderRadius: 7, padding: 13, fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'background 0.15s' },
    disabledBtn: { opacity: 0.35, cursor: 'not-allowed', boxShadow: 'none' },
    pricingSection: { borderTop: '0.5px solid #1e1e1e', padding: '80px 60px', maxWidth: 1000, margin: '0 auto' },
    pricingCards: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginTop: 48 },
    pricingCard: (accent) => ({ background: '#111', border: `0.5px solid ${accent}`, borderRadius: 12, padding: 30, position: 'relative' }),
    priceName: (color) => ({ fontSize: 16, color, marginBottom: 4, fontWeight: 500 }),
    priceRange: { fontSize: 13, color: '#666', marginBottom: 26 },
    priceAmt: { fontSize: 42, fontWeight: 500, color: '#fff', letterSpacing: -1 },
    priceTime: { fontSize: 13, color: '#888', marginTop: 6 },
    priceDivider: { border: 'none', borderTop: '0.5px solid #1e1e1e', margin: '20px 0' },
    priceFeatures: { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 },
    priceFeat: { fontSize: 14, color: '#aaa', display: 'flex', gap: 10, alignItems: 'flex-start' },
    check: (color) => ({ color, fontSize: 14, flexShrink: 0 }),
    addonCard: { background: '#111', border: '0.5px solid #2a2a2a', borderRadius: 12, padding: '26px 34px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center', marginTop: 30 },
    addonName: { fontSize: 17, fontWeight: 500, color: '#fff', marginBottom: 6 },
    addonText: { fontSize: 14, color: '#777', lineHeight: 1.45, maxWidth: 620 },
    addonPrice: { fontSize: 32, fontWeight: 500, color: '#fff', textAlign: 'right' },
    addonUnit: { fontSize: 12, color: '#666', textAlign: 'right', marginTop: 2 },
    whySection: { borderTop: '0.5px solid #1e1e1e', padding: '80px 60px', maxWidth: 1000, margin: '0 auto' },
    whyGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: '#1e1e1e', border: '0.5px solid #1e1e1e', borderRadius: 12, overflow: 'hidden', marginTop: 48 },
    whyItem: { background: '#111', padding: '28px 32px' },
    whyIcon: { width: 36, height: 36, borderRadius: 7, background: '#1a1a1a', border: '0.5px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    whyH: { fontSize: 15, fontWeight: 500, marginBottom: 8 },
    whyP: { fontSize: 14, color: '#666', lineHeight: 1.6 },
    footer: { borderTop: '0.5px solid #1e1e1e', padding: '40px 60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    footerLogo: { fontSize: 18, fontWeight: 500 },
    footerCopy: { fontSize: 13, color: '#444' },
    footerLinks: { display: 'flex', gap: 24 },
    footerLink: { fontSize: 13, color: '#555', textDecoration: 'none', cursor: 'pointer' },
  };

  const hovSolid = {
    onMouseEnter: e => { e.currentTarget.style.background = '#FFD700'; e.currentTarget.style.boxShadow = '0 0 16px rgba(255, 215, 0, 0.45)'; },
    onMouseLeave: e => { e.currentTarget.style.background = '#FFD700'; e.currentTarget.style.boxShadow = 'none'; },
  };

  return (
    <div style={s.page}>

      {/* HERO */}
      <div className="home-hero" style={s.hero}>
        <h1 className="home-hero-title" style={s.h1}>Swift. Serviced. <span style={s.yellow}>Secure.</span></h1>
        <p className="home-hero-copy" style={s.heroP}>Stop managing loans from a spreadsheet. SwiftDeed services private loans with monthly payment collection, borrower statements, delinquency monitoring, and payoff support in one lender portal.</p>
        <div style={s.ctas}>
          <button disabled={borrowerDisabled} style={{ ...s.btnPrimary, ...(borrowerDisabled ? s.disabledBtn : {}) }} onClick={onBorrowerLogin} {...(!borrowerDisabled ? hovSolid : {})}>I'm a borrower</button>
          <button disabled={lenderDisabled} style={{ ...s.btnSecondary, ...(lenderDisabled ? s.disabledBtn : {}) }} onClick={onLenderLogin} {...(!lenderDisabled ? hovSolid : {})}>I'm a lender</button>
        </div>
        <div style={s.portalNote}>New here? Create an account in seconds.</div>
        <div className="home-stats-row" style={s.statsRow}>
          <div style={{ textAlign: 'center' }}><div style={s.statNum}>$0</div><div style={s.statLabel}>Setup fee</div></div>
          <div style={{ textAlign: 'center' }}><div style={s.statNum}>Monthly</div><div style={s.statLabel}>Per-loan pricing</div></div>
          <div style={{ textAlign: 'center' }}><div style={s.statNum}>Add-ons</div><div style={s.statLabel}>Payoff statements available</div></div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div id="how" className="home-band" style={s.howWrap}>
        <div style={s.howInner}>
          <div style={s.sectionLabel}>How it works</div>
          <div style={s.sectionTitle}>Loans managed. Borrowers informed. Always.</div>
          <div style={s.sectionSub}>Upload your documents and your loan is live in minutes. No forms, no back and forth. SwiftDeed handles the rest from day one.</div>
          <div className="home-steps-grid" style={s.stepsGrid}>
            <div style={s.step(false)}>
              <div style={s.stepNum}>01</div>
              <div style={s.stepIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <div style={s.stepH}>Onboard your loan</div>
              <p style={s.stepP}>Upload loan documents. SwiftDeed reads the terms and prepares the loan for servicing.</p>
            </div>
            <div style={s.step(false)}>
              <div style={s.stepNum}>02</div>
              <div style={s.stepIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>
              <div style={s.stepH}>We service it monthly</div>
              <p style={s.stepP}>Payments, statements, borrower notifications, and monitoring run through the platform.</p>
            </div>
            <div style={s.step(true)}>
              <div style={s.stepNum}>03</div>
              <div style={s.stepIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"/>
                  <rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/>
                </svg>
              </div>
              <div style={s.stepH}>You manage the portfolio</div>
              <p style={s.stepP}>Track balances, payments, maturities, delinquencies, invoices, and loan activity from one dashboard.</p>
            </div>
          </div>
        </div>
      </div>

      {/* PORTAL PREVIEW */}
      <div className="home-section home-platform-section" style={s.portalSection}>
        <div style={s.sectionLabel}>The platform</div>
        <div style={s.sectionTitle}>Your loan. Fully serviced.</div>
        <div style={{ ...s.sectionSub, marginBottom: 48 }}>Lenders manage their loan portfolio. Borrowers stay informed and in control. Everyone gets what they need.</div>

        <div className="home-portal-grid" style={s.portalGrid}>
          <div style={s.portalCard(true)}>
            <div style={s.cardHeader}>
              <div style={s.cardTitle}>Borrower portal</div>
              <span style={s.badgeBorrower}>Your account</span>
            </div>
            <div className="home-card-body" style={s.cardBody}>
              <div className="home-loan-bar" style={s.loanBar}>
                <div style={s.loanStat(false)}><div style={s.loanStatLabel}>Homeowner</div><div style={s.loanStatVal}>J. Martinez</div></div>
                <div style={s.loanStat(false)}><div style={s.loanStatLabel}>Interest rate</div><div style={s.loanStatVal}>8.500%</div></div>
                <div style={s.loanStat(false)}><div style={s.loanStatLabel}>Principal balance</div><div style={{ ...s.loanStatVal, color: '#FFD700' }}>$124,500</div></div>
                <div style={s.loanStat(true)}><div style={s.loanStatLabel}>Per diem</div><div style={s.loanStatVal}>$33.90</div></div>
              </div>
              <div className="home-chart-pay-row" style={s.chartPayRow}>
                <div className="home-borrower-chart">
                  <svg className="home-chart-svg" width="120" height="120" viewBox="0 0 120 120">
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
                <div className="home-pay-panel">
                  <div className="home-pay-grid" style={s.payGrid}>
                    <div style={s.payBox}><div style={s.payLabel}>Last payment</div><div style={s.payVal}>$2,306</div><div style={s.paySub}>04/01/2026</div></div>
                    <div style={s.payBox}><div style={s.payLabel}>Due date</div><div style={s.payVal}>05/01/2026</div><div style={s.paySub}>Next payment</div></div>
                    <div style={s.payBox}><div style={s.payLabel}>Interest accrued</div><div style={{ ...s.payVal, color: '#FFD700' }}>$881</div><div style={s.paySub}>This period</div></div>
                    <div style={s.payBox}><div style={s.payLabel}>Statement</div><div style={{ ...s.payVal, color: '#4a9a4a', fontSize: 13 }}>Ready</div><div style={s.paySub}>Apr 2026</div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={s.portalCard(false)}>
            <div style={s.cardHeader}>
              <div style={s.cardTitle}>Lender portal</div>
              <span style={s.badgeLender}>Your dashboard</span>
            </div>
            <div className="home-card-body" style={s.cardBody}>
              <div className="home-lender-table-head" style={s.tableHead}>
                <span style={s.th}>Loan ID</span>
                <span style={s.th}>Borrower</span>
                <span style={s.th}>Status</span>
              </div>
              <div className="home-lender-table-row" style={{ ...s.tableRow, borderBottom: '0.5px solid #1a1a1a' }}>
                <span style={s.tdId}>SD-2026-4421</span>
                <span style={s.tdName}>J. Martinez</span>
                <span style={s.statusReady}>Statement ready</span>
              </div>
              <div className="home-lender-table-row" style={{ ...s.tableRow, borderBottom: '0.5px solid #1a1a1a' }}>
                <span style={s.tdId}>SD-2026-3817</span>
                <span style={s.tdName}>R. Thompson</span>
                <span style={s.statusActive}>Active</span>
              </div>
              <div className="home-lender-table-row" style={{ ...s.tableRow, borderBottom: 'none' }}>
                <span style={s.tdId}>SD-2026-3102</span>
                <span style={s.tdName}>K. Patel</span>
                <span style={s.statusActive}>Active</span>
              </div>
              <div style={s.divider}></div>
              <div className="home-lender-summary" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: '#555' }}>3 active loans · 1 statement ready</div>
                <div style={{ fontSize: 12, color: '#4a90b8', cursor: 'pointer' }}>View all →</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PRICING */}
      <div id="pricing" className="home-section home-pricing-section" style={s.pricingSection}>
        <div style={s.sectionLabel}>Pricing</div>
        <div style={s.sectionTitle}>Simple pricing per active loan</div>
        <div style={s.sectionSub}>Pay only for the loans you service. Add payoff statements and other services when you need them.</div>
        <div className="home-pricing-cards" style={s.pricingCards}>
          <div style={s.pricingCard('#23456f')}>
            <div style={s.priceName('#4a90ff')}>Starter</div>
            <div style={s.priceRange}>1-4 loans</div>
            <div style={s.priceAmt}><sup style={{ fontSize: 20, verticalAlign: 'top', marginTop: 10, display: 'inline-block' }}>$</sup>45</div>
            <div style={s.priceTime}>per loan / month</div>
            <hr style={s.priceDivider} />
            <ul style={s.priceFeatures}>
              {['Lender portal', 'Borrower portal', 'ACH payment collection', 'Monthly statements', 'Delinquency monitoring'].map(f => <li key={f} style={s.priceFeat}><span style={s.check('#4a90ff')}>✓</span>{f}</li>)}
            </ul>
          </div>
          <div style={s.pricingCard('#FFD700')}>
            <div style={s.priceName('#FFD700')}>Growth</div>
            <div style={s.priceRange}>5-9 loans</div>
            <div style={s.priceAmt}><sup style={{ fontSize: 20, verticalAlign: 'top', marginTop: 10, display: 'inline-block' }}>$</sup>40</div>
            <div style={s.priceTime}>per loan / month</div>
            <hr style={s.priceDivider} />
            <ul style={s.priceFeatures}>
              {['Everything in Starter', 'Portfolio dashboard', 'Maturity alerts', 'Document management', 'Invoice history'].map(f => <li key={f} style={s.priceFeat}><span style={s.check('#FFD700')}>✓</span>{f}</li>)}
            </ul>
          </div>
          <div style={s.pricingCard('#1f6f3a')}>
            <div style={s.priceName('#21c55d')}>Portfolio</div>
            <div style={s.priceRange}>10+ loans</div>
            <div style={s.priceAmt}><sup style={{ fontSize: 20, verticalAlign: 'top', marginTop: 10, display: 'inline-block' }}>$</sup>35</div>
            <div style={s.priceTime}>per loan / month</div>
            <hr style={s.priceDivider} />
            <ul style={s.priceFeatures}>
              {['Everything in Growth', 'Portfolio-level reporting', 'Tax document archive', 'Priority support'].map(f => <li key={f} style={s.priceFeat}><span style={s.check('#21c55d')}>✓</span>{f}</li>)}
            </ul>
          </div>
        </div>
        <div className="home-addon-card" style={s.addonCard}>
          <div>
            <div style={s.addonName}>Payoff statement</div>
            <div style={s.addonText}>Generated on demand with principal, accrued interest, per diem, and good-through date.</div>
          </div>
          <div>
            <div style={s.addonPrice}>$30</div>
            <div style={s.addonUnit}>per statement</div>
          </div>
        </div>
      </div>

      {/* WHY SWIFTDEED */}
      <div id="why" className="home-section home-why-section" style={s.whySection}>
        <div style={s.sectionLabel}>Why SwiftDeed</div>
        <div style={s.sectionTitle}>Why private lenders choose SwiftDeed</div>
        <div style={s.sectionSub}>Most lenders start servicing loans themselves. Then it becomes a second job. SwiftDeed is the infrastructure that lets you grow without the overhead.</div>
        <div className="home-why-grid" style={s.whyGrid}>
          <div style={s.whyItem}>
            <div style={s.whyIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <div style={s.whyH}>Ditch the spreadsheet</div>
            <p style={s.whyP}>Most private lenders track payments, balances, and due dates in Excel. That works for one loan. It breaks down at five. SwiftDeed replaces your spreadsheet with a real servicing platform from day one.</p>
          </div>
          <div style={s.whyItem}>
            <div style={s.whyIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div style={s.whyH}>Live in minutes, not days</div>
            <p style={s.whyP}>Upload your loan documents and SwiftDeed extracts every term automatically: rate, schedule, maturity, payment amount, and more. Your loan is actively serviced before you close the tab.</p>
          </div>
          <div style={s.whyItem}>
            <div style={s.whyIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </div>
            <div style={s.whyH}>Never get caught off guard</div>
            <p style={s.whyP}>Automated reminders go to borrowers before payments are due. Delinquency alerts hit your dashboard when a payment is missed. Maturity dates surface early so you always have time to act.</p>
          </div>
          <div style={s.whyItem}>
            <div style={s.whyIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <div style={s.whyH}>One monthly fee per active loan</div>
            <p style={s.whyP}>A single monthly charge per active loan. Nothing hidden, nothing variable. You always know what SwiftDeed costs, and you can calculate it before you ever sign up.</p>
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
