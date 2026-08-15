// src/views/admin/settings/ApiKeyModal.jsx
// F7a: modal de llaves de la API externa (PROPER) — extraído de
// Settings.jsx en la división del 15-ago-2026 (regla de 500 líneas).
// La llave se muestra UNA sola vez: el hash bcrypt es lo único que
// queda en la BD. Si se pierde, se genera otra. El componente se
// monta al abrir y se desmonta al cerrar (Settings lo renderiza
// condicionalmente), así que el estado (llave mostrada) se limpia
// solo — mismo comportamiento que el reset manual anterior.
import { useState } from 'react';
import { sMono, adminTheme as AT, inputStyleDark } from '../../../constants/styles';
import { createApiClient } from '../../../services/adminAuthService';

export default function ApiKeyModal({ fire, onClose }) {
  const [apiName, setApiName] = useState('PROPER');
  const [apiKey, setApiKey] = useState('');
  const [apiBusy, setApiBusy] = useState(false);
  const genApiKey = async () => {
    if (!apiName.trim()) { fire('Poné un nombre para identificar el sistema', 'error'); return; }
    setApiBusy(true);
    const res = await createApiClient(apiName.trim());
    setApiBusy(false);
    if (res.error) { fire(res.error, 'error'); return; }
    setApiKey(res.api_key || '');
    fire('Llave generada — copiala ahora', 'success');
  };

  return (
    <div onClick={() => { if (!apiBusy) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: AT.bg, border: `1px solid ${AT.border}`, borderRadius: 20, padding: 24, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 8 }}>API externa (PROPER)</div>
        <div style={{ fontSize: 12, color: '#9E9E9E', lineHeight: 1.6, marginBottom: 16 }}>
          Generá una llave para que un sistema externo acumule puntos y consulte
          premios. La llave se muestra <strong style={{ color: '#FBBC04' }}>una sola vez</strong>:
          guardala antes de cerrar. Si se pierde, generá otra.
        </div>

        <label style={{ fontSize: 11, fontWeight: 700, color: '#9E9E9E', marginBottom: 6, display: 'block' }}>Nombre del sistema</label>
        <input value={apiName} onChange={e => setApiName(e.target.value)} placeholder="PROPER"
          style={{ ...inputStyleDark, width: '100%', marginBottom: 16, boxSizing: 'border-box' }} />

        {apiKey && (
          <div style={{ background: 'rgba(46,125,50,.12)', border: '1px solid rgba(46,125,50,.4)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#81C784', marginBottom: 8, letterSpacing: 1 }}>LLAVE GENERADA</div>
            <div style={{ ...sMono, fontSize: 12, color: '#fff', wordBreak: 'break-all', lineHeight: 1.6 }}>{apiKey}</div>
            <button onClick={() => {
              navigator.clipboard?.writeText(apiKey)
                .then(() => fire('Llave copiada', 'success'))
                .catch(() => fire('Copiala manualmente', 'warn'));
            }} style={{ marginTop: 10, padding: '8px 14px', borderRadius: 10, border: 'none', background: '#2E7D32', color: '#fff', fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Copiar</button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} disabled={apiBusy}
            style={{ flex: 1, padding: 14, borderRadius: 14, background: 'transparent', border: `1px solid ${AT.border}`, color: '#9E9E9E', fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {apiKey ? 'Listo' : 'Cancelar'}
          </button>
          <button onClick={genApiKey} disabled={apiBusy}
            style={{ flex: 1, padding: 14, borderRadius: 14, background: '#FBBC04', border: 'none', color: '#0D0D0D', fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
            {apiBusy ? 'Generando...' : apiKey ? 'Generar otra' : 'Generar llave'}
          </button>
        </div>
      </div>
    </div>
  );
}
