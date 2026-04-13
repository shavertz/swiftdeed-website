import { useState } from 'react';
import HomePage from './components/HomePage';
import RequestForm from './components/RequestForm';

export default function App() {
  const [page, setPage] = useState('home');

  const scrollTo = (id) => {
    setPage('home');
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

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
        <img src="/logo.png" alt="SwiftDeed logo" style={{ height: 36, width: 'auto', mixBlendMode: 'screen' }} />
        <span style={{ fontSize: 20, fontWeight: 500, letterSpacing: -0.3 }}>
          <span style={{ color: '#fff' }}>Swift</span><span style={{ color: '#FFD700' }}>Deed</span>
        </span>
      </div>

      {page === 'home' && (
        <div style={{ display: 'flex', gap: 32, alignItems: 'center', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          <span onClick={() => scrollTo('how')} style={{ fontSize: 14, color: '#FFD700', cursor: 'pointer' }}>How it works</span>
          <span onClick={() => scrollTo('pricing')} style={{ fontSize: 14, color: '#FFD700', cursor: 'pointer' }}>Pricing</span>
          <span onClick={() => scrollTo('why')} style={{ fontSize: 14, color: '#FFD700', cursor: 'pointer' }}>Why SwiftDeed</span>
        </div>
      )}

      {page === 'request' && (
        <button
          onClick={() => setPage('home')}
          style={{
            background: 'transparent', color: '#aaa', fontSize: 14,
            padding: '8px 0', border: 'none', cursor: 'pointer'
          }}
        >
          ← Back to home
        </button>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          style={{
            background: 'transparent', color: '#aaa', fontSize: 14,
            padding: '8px 18px', borderRadius: 6, border: '0.5px solid #2a2a2a', cursor: 'default'
          }}
        >
          Log in
        </button>
        <button
          onClick={() => setPage('request')}
          style={{
            background: '#FFD700', color: '#0f0f0f', fontSize: 14,
            fontWeight: 500, padding: '8px 18px', borderRadius: 6, border: 'none', cursor: 'pointer'
          }}
        >
          Submit a request
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ background: '#0f0f0f', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {nav}
      {page === 'home' && <HomePage onGetStarted={() => setPage('request')} />}
      {page === 'request' && <RequestForm />}
    </div>
  );
}
