export default function TermsPage({ onHome }) {
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

        <div style={s.title}>Terms of Service</div>
        <div style={s.updated}>Last updated: April 2026</div>

        <div style={s.section}>
          <div style={s.h2}>1. Agreement to terms</div>
          <p style={s.p}>By accessing or using SwiftDeed's services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services. These terms apply to all users of the platform, including lenders and borrowers.</p>
        </div>

        <hr style={s.divider} />

        <div style={s.section}>
          <div style={s.h2}>2. Description of services</div>
          <p style={s.p}>SwiftDeed LLC provides private loan servicing technology for private lenders and their borrowers. Our services include payoff statement generation, borrower portal access, payment tracking, and related loan administration tools.</p>
          <p style={s.p}>SwiftDeed is a loan servicing company, not a lender, broker, or debt collector. We do not originate loans, provide credit, or make lending decisions.</p>
        </div>

        <hr style={s.divider} />

        <div style={s.section}>
          <div style={s.h2}>3. User accounts</div>
          <p style={s.p}>To access certain features, you must create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You agree to provide accurate and complete information when creating your account.</p>
          <p style={s.p}>SwiftDeed reserves the right to suspend or terminate accounts that violate these terms or engage in fraudulent activity.</p>
        </div>

        <hr style={s.divider} />

        <div style={s.section}>
          <div style={s.h2}>4. Lender responsibilities</div>
          <p style={s.p}>Lenders who use SwiftDeed represent that they have the legal right to service the loans they submit through our platform. Lenders are responsible for the accuracy of loan information provided to SwiftDeed and for ensuring their lending activities comply with applicable state and federal laws.</p>
          <p style={s.p}>Lenders agree to pay the applicable service fees for each statement or service request submitted through the platform.</p>
        </div>

        <hr style={s.divider} />

        <div style={s.section}>
          <div style={s.h2}>5. Fees and payment</div>
          <p style={s.p}>SwiftDeed charges a flat fee per payoff statement. Current pricing is displayed on our website and may be updated from time to time with notice. All fees are due at the time of service. SwiftDeed does not charge monthly fees, setup fees, or cancellation fees.</p>
        </div>

        <hr style={s.divider} />

        <div style={s.section}>
          <div style={s.h2}>6. Accuracy of information</div>
          <p style={s.p}>SwiftDeed uses information provided by lenders to generate payoff statements and related documents. While we strive for accuracy, SwiftDeed is not responsible for errors resulting from inaccurate or incomplete information submitted by lenders. Lenders and borrowers should independently verify all figures before completing any transaction.</p>
        </div>

        <hr style={s.divider} />

        <div style={s.section}>
          <div style={s.h2}>7. Limitation of liability</div>
          <p style={s.p}>SwiftDeed's liability to any user for any claim arising out of or related to these terms or our services shall not exceed the total fees paid by that user in the three months preceding the claim. SwiftDeed is not liable for any indirect, incidental, or consequential damages.</p>
        </div>

        <hr style={s.divider} />

        <div style={s.section}>
          <div style={s.h2}>8. Termination</div>
          <p style={s.p}>Either party may terminate their use of SwiftDeed services at any time. SwiftDeed reserves the right to suspend or terminate access for violations of these terms. Upon termination, your right to access the platform ceases immediately.</p>
        </div>

        <hr style={s.divider} />

        <div style={s.section}>
          <div style={s.h2}>9. Governing law</div>
          <p style={s.p}>These terms are governed by the laws of the State of Utah, without regard to conflict of law principles. Any disputes arising under these terms shall be resolved in the courts of Utah.</p>
        </div>

        <hr style={s.divider} />

        <div style={s.section}>
          <div style={s.h2}>10. Contact</div>
          <p style={s.p}>If you have questions about these Terms of Service, please contact us at <span style={{ color: '#4a90b8' }}>scott@theswiftdeed.com</span>.</p>
        </div>
      </div>
    </div>
  );
}
