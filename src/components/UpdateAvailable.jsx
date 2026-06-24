// src/components/UpdateAvailable.jsx
// ============================================================
// Banner que avisa cuando hay una version nueva de la app
// disponible (nuevo Service Worker en espera). Al pulsar
// "Recargar" se activa el SW nuevo y se recarga la pagina.
// ============================================================

import { useState, useEffect } from 'react';
import { setUpdateAvailableCallback, applyUpdate } from '../lib/swRegistration';

export default function UpdateAvailable() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setUpdateAvailableCallback(() => setVisible(true));
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 16,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 10000,
      background: '#1E1E1E',
      color: '#fff',
      padding: '14px 20px',
      borderRadius: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      maxWidth: '90vw',
      fontFamily: "'DM Sans'",
      fontSize: 14,
      animation: 'slideUpFade 400ms ease-out',
    }}>
      <span>✨ Nueva versión disponible</span>
      <button
        onClick={applyUpdate}
        style={{
          background: '#FBBC04',
          color: '#000',
          border: 'none',
          padding: '8px 16px',
          borderRadius: 8,
          fontWeight: 700,
          cursor: 'pointer',
          fontSize: 13,
        }}
      >
        Recargar
      </button>
      <style>{`
        @keyframes slideUpFade {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}
