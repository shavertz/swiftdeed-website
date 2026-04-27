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
import PaymentTest from './components/PaymentTest';
import ProfilePage from './components/ProfilePage';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const ACTIVATION_TOKEN = window.location.hash.startsWith('#activate=') ? window.location.hash.slice('#activate='.length) : null;

const loadingScreen = (
  <div style={{ background: '#0f0f0f', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
    <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: -0.5 }}>
      <span style={{ color: '#fff' }}>Swift</span><span style={{ color: '#D4A017' }}>Deed</span>
    </div>
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 10, height: 10, borderRadius: '50%', background: '#D4A017',
          animation: 'dotPulse 1.4s ease-in-out infinite',
          animationDelay: `${i * 0.2}s`
        }} />
      ))}
    </div>
    <style>{`
      @keyframes dotPulse {
        0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
        40% { opacity: 1; transform: scale(1); }
      }
    `}</style>
  </div>
);

const hov = {
  solid: {
    onMouseEnter: e => { e.currentTarget.style.background = '#FFD700'; e.currentTarget.style.boxShadow = '0 0 16px rgba(255, 215, 0, 0.45)'; },
    onMouseLeave: e => { e.currentTarget.style.background = '#FFD700'; e.currentTarget.style.boxShadow = 'none'; },
  },
  outline: {
    onMouseEnter: e => { e.currentTarget.style.background = '#1e1a00'; e.currentTarget.style.color = '#FFD700'; e.currentTarget.style.boxShadow = '0 0 16px rgba(255, 215, 0, 0.3)'; },
    onMouseLeave: e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.boxShadow = 'none'; },
  },
};

const BorrowerIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const LenderIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
  </svg>
);

const ProfileIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

export default function App() {
  const [page, setPage] = useState(() => ACTIVATION_TOKEN ? 'auth' : 'home');
  const [authMode, setAuthMode] = useState(() => ACTIVATION_TOKEN ? 'signup' : 'signin');
  const [portalType, setPortalType] = useState(() => ACTIVATION_TOKEN ? 'borrower' : null);
  const [borrowerOnboardingId, setBorrowerOnboardingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isSignedIn, isLoaded, user } = useUser();
  const { signOut } = useClerk();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { setLoading(false); return; }

    setLoading(true);

    if (ACTIVATION_TOKEN) {
      checkBorrowerOnboarding(ACTIVATION_TOKEN);
      return;
    }

    if (!user) return;

    const email = user.primaryEmailAddress?.emailAddress;
    if (!email) return;

    routeByEmail(email);
  }, [isSignedIn, isLoaded, user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function routeByEmail(email) {
    try {
      const borrowerRes = await fetch(
        `${SUPABASE_URL}/rest/v1/borrowers?borrower_email=eq.${encodeURIComponent(email)}&select=id,phone,mailing_address&limit=1`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
      );

      if (!borrowerRes.ok) throw new Error('Borrower fetch failed');
      const borrowerData = await borrowerRes.json();

      if (Array.isArray(borrowerData) && borrowerData.length > 0) {
        const borrower = borrowerData[0];
        setPortalType('borrower');
        if (!borrower.phone || !borrower.mailing_address) {
          setBorrowerOnboardingId(borrower.id);
          setPage('borrower-onboarding');
        } else {
          setPage('borrower-portal');
        }
        setLoading(false);
        return;
      }

      const lenderRes = await fetch(
        `${SUPABASE_URL}/rest/v1/lenders?email=eq.${encodeURIComponent(email)}&select=id&limit=1`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
      );

      if (!lenderRes.ok) throw new Error('Lender fetch failed');
      const lenderData = await lenderRes.json();

      setPortalType('lender');
      if (Array.isArray(lenderData) && lenderData.length > 0) {
        setPage('choice');
      } else {
        setPage('onboarding');
      }
    } catch (err) {
      console.error('Routing error:', err);
      setPage('routing-error');
    }
    setLoading(false);
  }

  async function checkBorrowerOnboarding(token) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/borrowers?verification_token=eq.${token}&select=id,phone,mailing_address,borrower_email&limit=1`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
      );
      const data = await res.json();

      if (data && data.length > 0) {
        const borrower = data[0];
        const signedInEmail = user?.primaryEmailAddress?.emailAddress;
        if (signedInEmail && borrower.borrower_email &&
            signedInEmail.toLowerCase() !== borrower.borrower_email.toLowerCase()) {
          setPortalType('borrower');
          setPage('borrower-wrong-account');
          setLoading(false);
          return;
        }

        setPortalType('borrower');
        if (!borrower.phone || !borrower.mailing_address) {
          setBorrowerOnboardingId(borrower.id);
          setPage('borrower-onboarding');
        } else {
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
    setLoading(false);
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
      <div onClick={() => setPage('home')} style={{ cursor: 'pointer' }}>
        <span style={{ fontSize: 20, fontWeight: 500, letterSpacing: -0.3 }}>
          <span style={{ color: '#fff' }}>Swift</span><span style={{ color: '#FFD700' }}>Deed</span>
        </span>
      </div>

      {page === 'home' && (
        <div style={{ display: 'flex', gap: 32, alignItems: 'center', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          {['how', 'pricing', 'why'].map((id, i) => (
            <span
              key={id}
              onClick={() => scrollTo(id)}
              style={{ fontSize: 16, color: '#FFD700', cursor: 'pointer', transition: 'opacity 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              {['How it works', 'Pricing', 'Why SwiftDeed'][i]}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {isSignedIn ? (
          <>
            {portalType === 'borrower' ? (
              <button
                onClick={() => routeByEmail(user.primaryEmailAddress?.emailAddress)}
                style={{ background: '#FFD700', color: '#0f0f0f', fontSize: 14, fontWeight: 500, padding: '8px 18px', borderRadius: 6, border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                {...hov.solid}
              >My loan</button>
            ) : (
              <>
                <button
                  onClick={() => setPage('portal')}
                  style={{ background: '#FFD700', color: '#0f0f0f', fontSize: 14, fontWeight: 500, padding: '8px 18px', borderRadius: 6, border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                  {...hov.solid}
                >My loans</button>
                <button
                  onClick={() => setPage('profile')}
                  title="Profile"
                  style={{ background: 'transparent', color: '#aaa', fontSize: 14, padding: '7px 10px', borderRadius: 6, border: '0.5px solid #2a2a2a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#FFD700'; e.currentTarget.style.color = '#FFD700'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#aaa'; }}
                ><ProfileIcon /></button>
                <button
                  onClick={() => setPage('payment-test')}
                  style={{ background: 'transparent', color: '#555', fontSize: 12, padding: '6px 12px', borderRadius: 6, border: '0.5px solid #2a2a2a', cursor: 'pointer' }}
                >⚡ Test</button>
              </>
            )}
            <button
              onClick={handleLogout}
              style={{ background: 'transparent', color: '#fff', fontSize: 14, padding: '8px 18px', borderRadius: 6, border: '0.5px solid #FFD700', cursor: 'pointer', transition: 'all 0.15s' }}
              {...hov.outline}
            >Log out</button>
          </>
        ) : (
          <>
            <button
              onClick={() => goToAuth('signin')}
              style={{ background: 'transparent', color: '#fff', fontSize: 14, padding: '8px 18px', borderRadius: 6, border: '0.5px solid #FFD700', cursor: 'pointer', transition: 'all 0.15s' }}
              {...hov.outline}
            >Log in</button>
            <button
              onClick={() => goToAuth('signup')}
              style={{ background: '#FFD700', color: '#0f0f0f', fontSize: 14, fontWeight: 500, padding: '8px 18px', borderRadius: 6, border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}
              {...hov.solid}
            >Sign up</button>
          </>
        )}
      </div>
    </div>
  );

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

  const standardAuthPage = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 52, paddingBottom: 80 }}>
      <div style={{ display: 'flex', gap: 0, marginBottom: 32, background: '#1a1a1a', borderRadius: 8, padding: 4, border: '0.5px solid #2a2a2a' }}>
        <button onClick={() => setAuthMode('signin')} style={{ background: authMode === 'signin' ? '#FFD700' : 'transparent', color: authMode === 'signin' ? '#0f0f0f' : '#fff', fontSize: 15, fontWeight: 600, padding: '10px 32px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'system-ui, sans-serif' }}>Log in</button>
        <button onClick={() => { setAuthMode('signup'); if (portalType === 'borrower') setPortalType(null); }} style={{ background: authMode === 'signup' ? '#FFD700' : 'transparent', color: authMode === 'signup' ? '#0f0f0f' : '#fff', fontSize: 15, fontWeight: 600, padding: '10px 32px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'system-ui, sans-serif' }}>Sign up</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28, width: '100%', maxWidth: 420 }}>
        {authMode === 'signin' ? (
          <div
            onClick={() => setPortalType('borrower')}
            style={{ background: portalType === 'borrower' ? '#171400' : '#141414', border: portalType === 'borrower' ? '1.5px solid #FFD700' : '0.5px solid #2a2a2a', borderRadius: 10, padding: '20px 16px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1e1a00'; e.currentTarget.style.borderColor = '#FFD700'; }}
            onMouseLeave={e => { e.currentTarget.style.background = portalType === 'borrower' ? '#171400' : '#141414'; e.currentTarget.style.borderColor = portalType === 'borrower' ? '#FFD700' : '#2a2a2a'; }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: '#1a1a1a', border: '0.5px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BorrowerIcon />
              </div>
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#fff', marginBottom: 4 }}>Borrower</div>
            <div style={{ fontSize: 12, color: '#555', lineHeight: 1.4 }}>View your loan & statements</div>
          </div>
        ) : (
          <div style={{ background: '#0d0d0d', border: '0.5px solid #2a2a2a', borderRadius: 10, padding: '20px 16px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: '#1a1a1a', border: '0.5px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BorrowerIcon />
              </div>
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#666', marginBottom: 8 }}>Borrower</div>
            <div style={{ fontSize: 12, color: '#FFD700', lineHeight: 1.5 }}>⚠️ <em>Activation email required — contact your lender</em></div>
          </div>
        )}
        <div
          onClick={() => setPortalType('lender')}
          style={{ background: portalType === 'lender' ? '#171400' : '#141414', border: portalType === 'lender' ? '1.5px solid #FFD700' : '0.5px solid #2a2a2a', borderRadius: 10, padding: '20px 16px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#1e1a00'; e.currentTarget.style.borderColor = '#FFD700'; }}
          onMouseLeave={e => { e.currentTarget.style.background = portalType === 'lender' ? '#171400' : '#141414'; e.currentTarget.style.borderColor = portalType === 'lender' ? '#FFD700' : '#2a2a2a'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: '#1a1a1a', border: '0.5px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LenderIcon />
            </div>
          </div>
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
        <div
          onClick={() => setPage('request')}
          style={{ background: '#141414', border: '0.5px solid #2a2a2a', borderRadius: 12, padding: '40px 48px', cursor: 'pointer', textAlign: 'center', width: 220, transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#1e1a00'; e.currentTarget.style.borderColor = '#FFD700'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#141414'; e.currentTarget.style.borderColor = '#2a2a2a'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <rect width="44" height="44" rx="10" fill="#1e1a00"/>
              <path d="M22 28V16M22 16L18 20M22 16L26 20" stroke="#FFD700" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15 29H29" stroke="#FFD700" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M17 22H14C13.4 22 13 22.4 13 23V30C13 30.6 13.4 31 14 31H30C30.6 31 31 30.6 31 30V23C31 22.4 30.6 22 30 22H27" stroke="#FFD700" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ fontSize: 16, fontWeight: 400, color: '#fff', marginBottom: 8 }}>Service a loan</div>
          <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>Upload loan docs and get a payoff statement</div>
        </div>
        <div
          onClick={() => setPage('portal')}
          style={{ background: '#141414', border: '0.5px solid #2a2a2a', borderRadius: 12, padding: '40px 48px', cursor: 'pointer', textAlign: 'center', width: 220, transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#1e1a00'; e.currentTarget.style.borderColor = '#FFD700'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#141414'; e.currentTarget.style.borderColor = '#2a2a2a'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <rect width="44" height="44" rx="10" fill="#1e1a00"/>
              <rect x="13" y="14" width="18" height="3" rx="1.5" fill="#FFD700"/>
              <rect x="13" y="20" width="18" height="3" rx="1.5" fill="#FFD700" opacity="0.6"/>
              <rect x="13" y="26" width="12" height="3" rx="1.5" fill="#FFD700" opacity="0.3"/>
            </svg>
          </div>
          <div style={{ fontSize: 16, fontWeight: 400, color: '#fff', marginBottom: 8 }}>View my loans</div>
          <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>Check the status of your serviced loans</div>
        </div>
      </div>
    </div>
  );

  if (loading) return loadingScreen;

  return (
    <div style={{ background: '#0f0f0f', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {nav}
      {page === 'home' && (
        <HomePage
          onLenderLogin={() => { if (isSignedIn) { routeByEmail(user.primaryEmailAddress?.emailAddress); } else { goToAuth('signup', 'lender'); } }}
          onBorrowerLogin={() => { if (isSignedIn) { routeByEmail(user.primaryEmailAddress?.emailAddress); } else { goToAuth('signin', 'borrower'); } }}
          onTerms={() => setPage('terms')}
          onPrivacy={() => setPage('privacy')}
        />
      )}
      {page === 'auth' && (ACTIVATION_TOKEN ? activationAuthPage : standardAuthPage)}
      {page === 'request' && <RequestForm />}
      {page === 'portal' && <Portal onSubmitRequest={() => setPage('request')} />}
      {page === 'profile' && <ProfilePage onBack={() => setPage('portal')} />}
      {page === 'borrower-portal' && <BorrowerPortal onHome={() => setPage('home')} />}
      {page === 'borrower-onboarding' && (
        <BorrowerOnboarding
          borrowerId={borrowerOnboardingId}
          onComplete={() => { setPortalType('borrower'); setPage('borrower-portal'); }}
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
      {page === 'borrower-wrong-account' && (
        <div style={{ minHeight: 'calc(100vh - 65px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <div style={{ textAlign: 'center', maxWidth: 440 }}>
            <div style={{ fontSize: 20, fontWeight: 500, color: '#fff', marginBottom: 12 }}>Wrong account</div>
            <div style={{ fontSize: 14, color: '#555', lineHeight: 1.7 }}>This activation link was sent to a different email address. Please log out and sign up with the email address that received the activation link.</div>
            <button
              onClick={handleLogout}
              style={{ marginTop: 24, background: '#FFD700', color: '#0f0f0f', fontSize: 14, fontWeight: 500, padding: '10px 24px', borderRadius: 7, border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}
              {...hov.solid}
            >Log out</button>
          </div>
        </div>
      )}
      {page === 'routing-error' && (
        <div style={{ minHeight: 'calc(100vh - 65px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <div style={{ textAlign: 'center', maxWidth: 440 }}>
            <div style={{ fontSize: 20, fontWeight: 500, color: '#fff', marginBottom: 12 }}>Something went wrong</div>
            <div style={{ fontSize: 14, color: '#555', lineHeight: 1.7, marginBottom: 24 }}>We had trouble loading your account. Please try logging out and back in. If the issue continues, contact support.</div>
            <button
              onClick={handleLogout}
              style={{ background: '#FFD700', color: '#0f0f0f', fontSize: 14, fontWeight: 500, padding: '10px 24px', borderRadius: 7, border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}
              {...hov.solid}
            >Log out</button>
          </div>
        </div>
      )}
      {page === 'choice' && choicePage}
      {page === 'onboarding' && <LenderOnboarding onComplete={() => { setPortalType('lender'); setPage('choice'); }} />}
      {page === 'terms' && <TermsPage onHome={() => setPage('home')} />}
      {page === 'privacy' && <PrivacyPage onHome={() => setPage('home')} />}
      {page === 'payment-test' && <PaymentTest />}
    </div>
  );
}
