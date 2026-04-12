import { useState } from 'react';
import HomePage from './components/HomePage';
import RequestForm from './components/RequestForm';

export default function App() {
  const [page, setPage] = useState('home');

  const nav = (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '18px 60px', borderBottom: '0.5px solid #2a2a2a',
      background: '#0f0f0f', position: 'sticky', top: 0, zIndex: 100
    }}>
      <div
        onClick={() => setPage('home')}
        style={{ fontSize: 20, fontWeight: 500, letterSpacing: -0.3, cursor: 'pointer' }}
      >
        <span style={{ color: '#fff' }}>Swift</span><span style={{ color: '#FFD700' }}>Deed</span>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          onClick={() => setPage('home')}
          style={{
            background: 'transparent', color: '#aaa', fontSize: 14,
            padding: '8px 18px', borderRadius: 6, border: '0.5px solid #2a2a2a', cursor: 'pointer'
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
