import { useState, useEffect } from 'react';
import { useUser, useClerk, SignIn, SignUp } from '@clerk/clerk-react';
import HomePage from './components/HomePage';
import RequestForm from './components/RequestForm';
import Portal from './components/Portal';
import BorrowerPortal from './components/BorrowerPortal';
import BorrowerOnboarding from './components/BorrowerOnboarding';
import LenderOnboarding from './components/LenderOnboarding';
import TermsPage from './components/TermsPage';
import PrivacyPage from './components/PrivacyPage';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const ACTIVATION_TOKEN = new URLSearchParams(window.location.search).get('activate');

export default function App() {
  const [page, setPage] = useState(() => ACTIVATION_TOKEN ? 'auth' : 'home');
  const [authMode, setAuthMode] = useState(() => ACTIVATION_TOKEN ? 'signup' : 'signin');
  const [portalType, setPortalType] = useState(() => ACTIVATION_TOKEN ? 'borrower' : null);
  const [borrowerOnboardingId, setBorrowerOnboardingId] = useState(null);
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();

  useEffect(() => {
    if (!isSignedIn || !user) return;

    // Activation token always wins — route to borrower onboarding
    if (ACTIVATION_TOKEN) {
      checkBorrowerOnboarding(ACTIVATION_TOKEN);
      return;
    }

    // Borrower without activation token — no access
    if (portalType === 'borrower') {
      setPage('borrower-no-access');
      return;
    }

    // Lender — check onboarding
    checkLenderOnboarding();
  }, [isSignedIn, user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function checkBorrowerOnboarding(token) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/borrowers?verification_token=eq.${token}&select=id,phone,mailing_address&limit=1`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const borrower = data[0];
        if (!borrower.phone || !borrower.mailing_address) {
          setBorrowerOnboardingId(borrower.id);
          setPage('borrower-onboarding');
        } else {
          setPortalType('borrower');
          setPage('borrower-portal');
        }
      } else {
        setPortalType('borrower');
        setPage('borrower-portal');
      }
    } catch {
      setPortalType('borrower');
      setPage('borrower-portal');
    }
  }

  async function checkLenderOnboarding() {
    const email = user?.primaryEmailAddress?.emailAddress;
    if (!email) { setPage('choice'); return; }
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/lenders?email=eq.${encodeURIComponent(email)}&select=id&limit=1`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setPortalType('lender');
        setPage('choice');
      } else {
        setPortalType('lender');
        setPage('onboarding');
      }
    } catch {
      setPortalType('lender');
      setPage('choice');
    }
  }

  const scrollTo = (id) => {
    setPage('home');
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleLogout = () => {
    signOut();
    setPage('home');
    setPortalType(null);
  };

  const goToAuth = (mode, type = null) => {
    setAuthMode(mode);
    setPortalType(type);
    setPage('auth');
  };

  const clerkAppearance = {
    variables: {
      colorPrimary: '#FFD700',
      colorBackground: '#1a1a1a',
      colorText: '#fff',
      colorInputBackground: '#2a2a2a',
      colorInputText: '#fff',
      colorTextOnPrimaryBackground: '#0f0f0f',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
    },
    elements: {
      footerAction: { display: 'none' },
      footer: { display: 'none' },
      socialButtonsBlockButton: { background: '#fff', color: '#0f0f0f', border: '0.5px solid #ddd' },
      socialButtonsBlockButtonText: { color: '#0f0f0f', fontWeight: 500 },
      formFieldAction: { display: 'none' },
      formFieldHintText: { display: 'none' },
    }
  };

  const nav = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 60px', borderBottom: '0.5px solid #2a2a2a', background: '#0f0f0f', position: 'sticky', top: 0, zIndex: 100 }}>
      <div onClick={() => { setPage('home'); setPortalType(null); }} style={{ cursor: 'pointer' }}>
        <span style={{ fontSize: 20, fontWeight: 500, letterSpacing: -0.3 }}>
          <span style={{ color: '#fff' }}>Swift</span><span style={{ color: '#FFD700' }}>Deed</span>
        </span>
      </div>

      {page === 'home' && (
        <div style={{ display: 'flex', gap: 32, alignItems: 'center', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          <span onClick={() => scrollTo('how')} style={{ fontSize: 16, color: '#FFD700', cursor: 'pointer' }}>How it works</span>
          <span onClick={() => scrollTo('pricing')} style={{ fontSize: 16, color: '#FFD700', cursor: 'pointer' }}>Pricing</span>
          <span onClick={() => scrollTo('why')} style={{ fontSize: 16, color: '#FFD700', cursor: 'pointer' }}>Why SwiftDeed</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {isSignedIn ? (
          <>
            <span style={{ fontSize: 13, color: '#aaa' }}>{user.primaryEmailAddress?.emailAddress}</span>
            {portalType === 'borrower' ? (
              <button onClick={() => setPage('borrower-portal')} style={{ background: '#FFD700', color: '#0f0f0f', fontSize: 14, fontWeight: 500, padding: '8px 18px', borderRadius: 6, border: 'none', cursor: 'pointer' }}>My loan</button>
            ) : (
              <button onClick={() => setPage('portal')} style={{ background: '#FFD700', color: '#0f0f0f', fontSize: 14, fontWeight: 500, padding: '8px 18px', borderRadius: 6, border: 'none', cursor: 'pointer' }}>My requests</button>
            )}
            <button onClick={handleLogout} style={{ background: 'transparent', color: '#fff', fontSize: 14, padding: '8px 18px', borderRadius: 6, border: '0.5px solid #2a2a2a', cursor: 'pointer' }}>Log out</button>
          </>
        ) : (
          <>
            <button onClick={() => goToAuth('signin')} style={{ background: 'transparent', color: '#fff', fontSize: 14, padding: '8px 18px', borderRadius: 6, border: '0.5px solid #2a2a2a', cursor: 'pointer' }}>Log in</button>
            <button onClick={() => goToAuth('signup')} style={{ background: '#FFD700', color: '#0f0f0f', fontSize: 14, fontWeight: 500, padding: '8px 18px', borderRadius: 6, border: 'none', cursor: 'pointer' }}>Sign up</button>
          </>
        )}
      </div>
    </div>
  );

  // Activation flow — clean, no cards, no toggle
  const activationAuthPage = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 52, paddingBottom: 80 }}>
      <div style={{ marginBottom: 28, textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: '#4a90b8', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 8 }}>Borrower Activation</div>
        <div style={{ fontSize: 20, fontWeight: 500, color: '#fff', marginBottom: 8 }}>You've been invited</div>
        <div style={{ fontSize: 14, color: '#555', lineHeight: 1.7 }}>Create your account to access your loan portal.</div>
      </div>
      <SignUp appearance={clerkAppearance} routing="virtual" />
    </div>
  );

  // Standard auth page — toggle + lender/borrower selector
  const standardAuthPage = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 52, paddingBottom: 80 }}>
      <div style={{ display: 'flex', gap: 0, marginBottom: 32, background: '#1a1a1a', borderRadius: 8, padding: 4, border: '0.5px solid #2a2a2a' }}>
        <button onClick={() => setAuthMode('signin')} style={{ background: authMode === 'signin' ? '#FFD700' : 'transparent', color: authMode === 'signin' ? '#0f0f0f' : '#fff', fontSize: 15, fontWeight: 600, padding: '10px 32px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'system-ui, sans-serif' }}>Log in</button>
        <button onClick={() => { setAuthMode('signup'); if (portalType === 'borrower') setPortalType(null); }} style={{ background: authMode === 'signup' ? '#FFD700' : 'transparent', color: authMode === 'signup' ? '#0f0f0f' : '#fff', fontSize: 15, fontWeight: 600, padding: '10px 32px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'system-ui, sans-serif' }}>Sign up</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28, width: '100%', maxWidth: 420 }}>
        {authMode === 'signin' ? (
          <div onClick={() => setPortalType('borrower')} style={{ background: portalType === 'borrower' ? '#171400' : '#141414', border: portalType === 'borrower' ? '1.5px solid #FFD700' : '0.5px solid #2a2a2a', borderRadius: 10, padding: '20px 16px', cursor: 'pointer', textAlign: 'center' }}>
            <div style={{ fontSize: 22, marginBottom: 10 }}>🏠</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#fff', marginBottom: 4 }}>Borrower</div>
            <div style={{ fontSize: 12, color: '#555', lineHeight: 1.4 }}>View your loan & statements</div>
          </div>
        ) : (
          <div style={{ background: '#0d0d0d', border: '0.5px solid #2a2a2a', borderRadius: 10, padding: '20px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, marginBottom: 10 }}>🏠</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#666', marginBottom: 8 }}>Borrower</div>
            <div style={{ fontSize: 12, color: '#FFD700', lineHeight: 1.5 }}>⚠️ <em>Activation email required — contact your lender</em></div>
          </div>
        )}
        <div onClick={() => setPortalType('lender')} style={{ background: portalType === 'lender' ? '#171400' : '#141414', border: portalType === 'lender' ? '1.5px solid #FFD700' : '0.5px solid #2a2a2a', borderRadius: 10, padding: '20px 16px', cursor: 'pointer', textAlign: 'center' }}>
          <div style={{ fontSize: 22, marginBottom: 10 }}>🏦</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#fff', marginBottom: 4 }}>Lender</div>
          <div style={{ fontSize: 12, color: '#555', lineHeight: 1.4 }}>Submit requests & manage loans</div>
        </div>
      </div>

      {portalType === 'lender' && authMode === 'signup' && (
        <div style={{ marginBottom: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#4a90b8', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 6 }}>Step 1 of 2</div>
          <div style={{ fontSize: 14, color: '#555' }}>Create your account — then we'll set up your lender profile.</div>
        </div>
      )}

      {portalType ? (
        authMode === 'signin'
          ? <SignIn appearance={clerkAppearance} routing="virtual" />
          : <SignUp appearance={clerkAppearance} routing="virtual" />
      ) : (
        <div style={{ fontSize: 14, color: '#444', marginTop: 8 }}>Select an option above to continue.</div>
      )}
    </div>
  );

  const choicePage = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 65px)' }}>
      <div style={{ marginBottom: 12, textAlign: 'center' }}>
        <div style={{ fontSize: 24, fontWeight: 600, color: '#fff', marginBottom: 8 }}>Welcome back!</div>
        <div style={{ fontSize: 14, color: '#555' }}>What would you like to do?</div>
      </div>
      <div style={{ display: 'flex', gap: 20, marginTop: 40 }}>
        <div onClick={() => setPage('request')} style={{ background: '#141414', border: '0.5px solid #2a2a2a', borderRadius: 12, padding: '40px 48px', cursor: 'pointer', textAlign: 'center', width: 220 }} onMouseEnter={e => e.currentTarget.style.borderColor = '#FFD700'} onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a2a'}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>📄</div>
          <div style={{ fontSize: 16, fontWeight: 400, color: '#fff', marginBottom: 8 }}>Submit a request</div>
          <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>Upload your loan docs and get a payoff statement</div>
        </div>
        <div onClick={() => setPage('portal')} style={{ background: '#141414', border: '0.5px solid #2a2a2a', borderRadius: 12, padding: '40px 48px', cursor: 'pointer', textAlign: 'center', width: 220 }} onMouseEnter={e => e.currentTarget.style.borderColor = '#FFD700'} onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a2a'}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: 400, color: '#fff', marginBottom: 8 }}>View my requests</div>
          <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>Check the status of your existing requests</div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ background: '#0f0f0f', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {nav}
      {page === 'home' && (
        <HomePage
          onLenderLogin={() => { if (isSignedIn) { checkLenderOnboarding(); } else { goToAuth('signup', 'lender'); } }}
          onBorrowerLogin={() => { if (isSignedIn) { setPage('borrower-no-access'); } else { goToAuth('signin', 'borrower'); } }}
          onTerms={() => setPage('terms')}
          onPrivacy={() => setPage('privacy')}
        />
      )}
      {page === 'auth' && (ACTIVATION_TOKEN ? activationAuthPage : standardAuthPage)}
      {page === 'request' && <RequestForm />}
      {page === 'portal' && <Portal onSubmitRequest={() => setPage('request')} />}
      {page === 'borrower-portal' && <BorrowerPortal onHome={() => setPage('home')} />}
      {page === 'borrower-onboarding' && (
        <BorrowerOnboarding
          borrowerId={borrowerOnboardingId}
          onComplete={() => {
            setPortalType('borrower');
            setPage('borrower-portal');
          }}
        />
      )}
      {page === 'borrower-no-access' && (
        <div style={{ minHeight: 'calc(100vh - 65px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <div style={{ textAlign: 'center', maxWidth: 440 }}>
            <div style={{ fontSize: 20, fontWeight: 500, color: '#fff', marginBottom: 12 }}>Access your loan portal</div>
            <div style={{ fontSize: 14, color: '#555', lineHeight: 1.7 }}>To access your borrower portal, please use the activation link sent to your email by your lender. If you haven't received one, contact your lender directly.</div>
          </div>
        </div>
      )}
      {page === 'choice' && choicePage}
      {page === 'onboarding' && <LenderOnboarding onComplete={() => setPage('choice')} />}
      {page === 'terms' && <TermsPage onHome={() => setPage('home')} />}
      {page === 'privacy' && <PrivacyPage onHome={() => setPage('home')} />}
    </div>
  );
}
