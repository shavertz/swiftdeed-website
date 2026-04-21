export default function PrivacyPage({ onHome }) {
  const s = {
    page: { background: '#0f0f0f', minHeight: '100vh', color: '#f0f0f0', fontFamily: 'inherit' },
    wrap: { maxWidth: 720, margin: '0 auto', padding: '60px 40px' },
    title: { fontSize: 32, fontWeight: 500, color: '#fff', marginBottom: 8, letterSpacing: -0.5 },
    updated: { fontSize: 13, color: '#555', marginBottom: 48 },
    section: { marginBottom: 40 },
    h2: { fontSize: 18, fontWeight: 500, color: '#fff', marginBottom: 12 },
    p: { fontSize: 15, color: '#888', lineHeight: 1.8, marginBottom: 12 },
    divider: { border: 'none', borderTop: '0.5px solid #1e1e1e', margin: '40px 0' },
    backBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#555', cursor: 'pointer', marginBottom: 48, background: 'none', border: 'none', padding: 0, fontFamily: 'inherit' },
  };

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <button style={s.backBtn} onClick={onHome}>← Back to SwiftDeed</button>

        <div style={s.title}>Privacy Policy</div>
        <div style={s.updated}>Last updated: April 2026</div>

        <div style={s.section}>
          <div style={s.h2}>1. Information we collect</div>
          <p style={s.p}>SwiftDeed collects information you provide directly to us when you create an account, submit loan requests, or contact us. This includes your name, email address, phone number, company name, and loan-related information such as borrower details and property addresses.</p>
          <p style={s.p}>We also collect information automatically when you use our platform, including log data, device information, and usage patterns.</p>
        </div>

        <hr style={s.divider} />

        <div style={s.section}>
          <div style={s.h2}>2. How we use your information</div>
          <p style={s.p}>We use the information we collect to provide, maintain, and improve our services — including generating payoff statements, maintaining borrower portals, and communicating with you about your account.</p>
          <p style={s.p}>We do not sell your personal information to third parties. We do not use your information for advertising purposes.</p>
        </div>

        <hr style={s.divider} />

        <div style={s.section}>
          <div style={s.h2}>3. Information sharing</div>
          <p style={s.p}>SwiftDeed shares information only as necessary to provide our services. Lender information may be shared with the borrowers associated with their loans, and vice versa, as part of the normal servicing process.</p>
          <p style={s.p}>We may share information with service providers who assist us in operating our platform, such as cloud storage and authentication providers. These providers are contractually required to protect your information.</p>
          <p style={s.p}>We may disclose information if required by law or to protect the rights and safety of SwiftDeed and its users.</p>
        </div>

        <hr style={s.divider} />

        <div style={s.section}>
          <div style={s.h2}>4. Data security</div>
          <p style={s.p}>SwiftDeed takes reasonable measures to protect your information from unauthorized access, alteration, or disclosure. We use industry-standard encryption and security practices for data storage and transmission.</p>
          <p style={s.p}>However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security of your data.</p>
        </div>

        <hr style={s.divider} />

        <div style={s.section}>
          <div style={s.h2}>5. Data retention</div>
          <p style={s.p}>We retain your information for as long as your account is active or as needed to provide our services. If you close your account, we may retain certain information as required by law or for legitimate business purposes.</p>
        </div>

        <hr style={s.divider} />

        <div style={s.section}>
          <div style={s.h2}>6. Your rights</div>
          <p style={s.p}>You have the right to access, correct, or delete your personal information. To exercise these rights, contact us at the email below. We will respond to your request within a reasonable timeframe.</p>
        </div>

        <hr style={s.divider} />

        <div style={s.section}>
          <div style={s.h2}>7. Cookies</div>
          <p style={s.p}>SwiftDeed uses cookies and similar technologies to maintain your session and improve your experience. You can control cookie settings through your browser, though disabling cookies may affect platform functionality.</p>
        </div>

        <hr style={s.divider} />

        <div style={s.section}>
          <div style={s.h2}>8. Changes to this policy</div>
          <p style={s.p}>We may update this Privacy Policy from time to time. We will notify you of significant changes by email or through the platform. Your continued use of SwiftDeed after changes are posted constitutes your acceptance of the updated policy.</p>
        </div>

        <hr style={s.divider} />

        <div style={s.section}>
          <div style={s.h2}>9. Contact</div>
          <p style={s.p}>If you have questions about this Privacy Policy, please contact us at <span style={{ color: '#4a90b8' }}>scott@theswiftdeed.com</span>.</p>
        </div>
      </div>
    </div>
  );
}
