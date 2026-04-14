import { useState, useEffect } from 'react';
import { useUser, useClerk, SignIn, SignUp } from '@clerk/clerk-react';
import HomePage from './components/HomePage';
import RequestForm from './components/RequestForm';
import Portal from './components/Portal';

export default function App() {
  const [page, setPage] = useState('home');
  const [authMode, setAuthMode] = useState('signup');
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();

  useEffect(() => {
    if (isSignedIn && page === 'auth') {
      setPage('choice');
    }
  }, [isSignedIn, page]);

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
  };

  const toggleBtn = (mode) => ({
    onClick: () => setAuthMode(mode),
    style: {
      background: authMode === mode ? '#FFD700' : 'transparent',
      color: authMode === mode ? '#0f0f0f' : '#fff',
      fontSize: 15, fontWeight: 600, padding: '10px 32px',
      borderRadius: 6, border: 'none', cursor: 'pointer',
      outline: 'none', fontFamily: 'system-ui, sans-serif',
    }
  });

  const nav = (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 60px', borderBottom: '0.5px solid #2a2a2a',
      background: '#0f0f0f', position: 'sticky', top: 0, zIndex: 100
    }}>
      <div
        onClick={() => setPage('home')}
        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
      >
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
            <span style={{ fontSize: 13, color: '#aaa' }}>
              {user.primaryEmailAddress?.emailAddress}
            </span>
            <button
              onClick={() => setPage('portal')}
              style={{
                background: '#FFD700', color: '#0f0f0f', fontSize: 14, fontWeight: 500,
                padding: '8px 18px', borderRadius: 6, border: 'none',
                cursor: 'pointer', outline: 'none'
              }}
            >
              My Requests
            </button>
            <button
              onClick={handleLogout}
              style={{
                background: 'transparent', color: '#fff', fontSize: 14,
                padding: '8px 18px', borderRadius: 6, border: '0.5px solid #2a2a2a',
                cursor: 'pointer', outline: 'none'
              }}
            >
              Log out
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => { setAuthMode('signin'); setPage('auth'); }}
              style={{
                background: 'transparent', color: '#fff', fontSize: 14,
                padding: '8px 18px', borderRadius: 6, border: '0.5px solid #2a2a2a',
                cursor: 'pointer', outline: 'none'
              }}
            >
              Log in
            </button>
            <button
              onClick={() => { setAuthMode('signup'); setPage('auth'); }}
              style={{
                background: '#FFD700', color: '#0f0f0f', fontSize: 14,
                fontWeight: 500, padding: '8px 18px', borderRadius: 6,
                border: 'none', cursor: 'pointer', outline: 'none'
              }}
            >
              Submit a request
            </button>
          </>
        )}
      </div>
    </div>
  );

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

  const choicePage = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 65px)', gap: 0 }}>
      <div style={{ marginBottom: 12, textAlign: 'center' }}>
        <div style={{ fontSize: 24, fontWeight: 600, color: '#fff', marginBottom: 8 }}>
          Welcome back!
        </div>
        <div style={{ fontSize: 14, color: '#555' }}>What would you like to do?</div>
      </div>

      <div style={{ display: 'flex', gap: 20, marginTop: 40 }}>
        <div
          onClick={() => setPage('request')}
          style={{
            background: '#141414', border: '0.5px solid #2a2a2a', borderRadius: 12,
            padding: '40px 48px', cursor: 'pointer', textAlign: 'center',
            transition: 'border-color 0.15s',
            width: 220,
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#FFD700'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a2a'}
        >
          <div style={{ fontSize: 32, marginBottom: 16 }}>📄</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 8 }}>Submit a request</div>
          <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>Upload your loan docs and get a payoff statement</div>
        </div>

        <div
          onClick={() => setPage('portal')}
          style={{
            background: '#141414', border: '0.5px solid #2a2a2a', borderRadius: 12,
            padding: '40px 48px', cursor: 'pointer', textAlign: 'center',
            transition: 'border-color 0.15s',
            width: 220,
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#FFD700'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a2a'}
        >
          <div style={{ fontSize: 32, marginBottom: 16 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 8 }}>View my requests</div>
          <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>Check the status of your existing requests</div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ background: '#0f0f0f', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {nav}
      {page === 'home' && <HomePage onGetStarted={() => { setAuthMode('signup'); setPage('auth'); }} />}
      {page === 'request' && <RequestForm />}
      {page === 'portal' && <Portal />}
      {page === 'choice' && choicePage}
      {page === 'auth' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60 }}>
          <div style={{
            display: 'flex', gap: 0, marginBottom: 32,
            background: '#1a1a1a', borderRadius: 8, padding: 4,
            border: '0.5px solid #2a2a2a', outline: 'none'
          }}>
            <button {...toggleBtn('signin')}>Log in</button>
            <button {...toggleBtn('signup')}>Sign up</button>
          </div>
          {authMode === 'signin'
            ? <SignIn appearance={clerkAppearance} routing="virtual" />
            : <SignUp appearance={clerkAppearance} routing="virtual" />
          }
        </div>
      )}
    </div>
  );
}
