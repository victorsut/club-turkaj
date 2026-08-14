// src/views/admin/AdminLogin.jsx
// Login de administrador validado contra Supabase via RPC `authenticate_admin`.
// La contraseña se valida server-side con bcrypt (extensions.crypt + pgcrypto).
// Admin v2.1 (6-ago-2026): pantalla DIVIDIDA en computadora/tablet —
// panel de marca a la izquierda + formulario centrado (máx 420px) a la
// derecha; en celular el panel se oculta y queda la columna única.
// FORMATO GENERAL: flat, sin emojis. La lógica de acceso no cambió.

import { useState } from 'react';
import { inputStyleDark, btnStyle, BRAND_ORANGE, adminTheme as AT } from '../../constants/styles';
import { Lock } from '../../components/ui/Icons';
import PasswordInput from '../../components/ui/PasswordInput';
import { loginAdmin } from '../../services/adminAuthService';

const sLbl = { display: 'block', fontSize: 10.5, fontWeight: 800, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 };

export default function AdminLogin(ctx) {
  const {
    adLoginDpi, setAdLoginDpi,
    adLoginGafete, setAdLoginGafete,
    adLoginEmail, setAdLoginEmail,
    adLoginPass, setAdLoginPass,
    authError, setAuthError, clearAuthErr,
    setAuthAdmin, fire, cfg,
    setLoggedAdmin, // opcional — solo si App.jsx lo provee
  } = ctx;

  const [loading, setLoading] = useState(false);

  const doLogin = async () => {
    clearAuthErr();
    setLoading(true);

    const result = await loginAdmin({
      dpi: adLoginDpi,
      gafete: adLoginGafete,
      email: adLoginEmail,
      password: adLoginPass,
    });

    setLoading(false);

    if (!result.ok) {
      setAuthError(result.error);
      return;
    }

    // Si App.jsx ya migró al nuevo state loggedAdmin, lo poblamos
    if (typeof setLoggedAdmin === 'function') {
      setLoggedAdmin(result.admin);
    }
    setAuthAdmin('logged');
    setAdLoginPass(''); // Limpiar contraseña por seguridad
    fire('Bienvenido ' + result.admin.name);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !loading) doLogin();
  };

  return (
    <div className="pp-alog">
      {/* ── Panel de marca (solo computadora/tablet) ── */}
      <div className="pp-alog-brand">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo.png" alt="Puntos Plus" style={{ width: 42, height: 42, borderRadius: 12 }} />
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>
              Puntos<span style={{ color: BRAND_ORANGE }}>Plus</span>
            </div>
            <div style={{ fontSize: 10, color: '#777', fontWeight: 700, letterSpacing: 1 }}>ADMINISTRACIÓN</div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 'clamp(30px, 3.4vw, 44px)', fontWeight: 800, color: '#fff', lineHeight: 1.15, letterSpacing: -1 }}>
            El panel de control<br />de tu programa<br />de lealtad
          </div>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: '#9E9E9E', marginTop: 14, lineHeight: 1.6, maxWidth: 420 }}>
            Miembros, premios, promociones, rifas y estadísticas de
            {' '}{cfg?.companyName || 'Gasolineras Turkaj'} en un solo lugar.
          </div>
          {/* Acento de marca minimalista */}
          <div style={{ display: 'flex', gap: 6, marginTop: 26 }}>
            <span style={{ width: 34, height: 5, borderRadius: 3, background: BRAND_ORANGE }} />
            <span style={{ width: 12, height: 5, borderRadius: 3, background: 'rgba(255,255,255,.22)' }} />
            <span style={{ width: 12, height: 5, borderRadius: 3, background: 'rgba(255,255,255,.12)' }} />
          </div>
        </div>

        <div style={{ fontSize: 11.5, fontWeight: 600, color: '#555' }}>
          {cfg?.companyName || 'Gasolineras Turkaj'} · {cfg?.companyLocation || 'Chichicastenango'}
        </div>
      </div>

      {/* ── Formulario ── */}
      <div className="pp-alog-form" style={{ background: '#1E1E1E' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ marginBottom: 26 }}>
            {/* En móvil el panel de marca no existe: el logo encabeza el form */}
            <img src="/logo.png" alt="Puntos Plus" className="pp-alog-logo" style={{ width: 56, height: 56, borderRadius: 16, marginBottom: 14 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: BRAND_ORANGE, display: 'flex' }}><Lock /></span>
              <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9E9E9E' }}>
                Acceso restringido
              </span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginTop: 6 }}>Iniciar sesión</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#777', marginTop: 4 }}>
              Ingresá con tus credenciales de administrador
            </div>
          </div>

          {authError && (
            <div style={{
              background: 'rgba(198,40,40,.15)', color: '#EF9A9A',
              padding: '10px 14px', borderRadius: 12, fontSize: 12,
              fontWeight: 700, marginBottom: 16, textAlign: 'center',
            }}>
              {authError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={sLbl}>DPI</label>
              <input
                value={adLoginDpi}
                onChange={e => { setAdLoginDpi(e.target.value); clearAuthErr(); }}
                onKeyDown={handleKeyDown}
                style={{ ...inputStyleDark, width: '100%', boxSizing: 'border-box' }}
                disabled={loading}
                inputMode="numeric"
                autoComplete="off"
              />
            </div>
            <div>
              <label style={sLbl}>Gafete</label>
              <input
                value={adLoginGafete}
                onChange={e => { setAdLoginGafete(e.target.value); clearAuthErr(); }}
                onKeyDown={handleKeyDown}
                style={{ ...inputStyleDark, width: '100%', boxSizing: 'border-box' }}
                disabled={loading}
                autoComplete="off"
              />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={sLbl}>Correo electrónico</label>
            <input
              type="email"
              value={adLoginEmail}
              onChange={e => { setAdLoginEmail(e.target.value); clearAuthErr(); }}
              onKeyDown={handleKeyDown}
              style={{ ...inputStyleDark, width: '100%', boxSizing: 'border-box' }}
              disabled={loading}
              autoCapitalize="none"
              autoComplete="email"
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={sLbl}>Contraseña</label>
            <PasswordInput
              value={adLoginPass}
              onChange={e => { setAdLoginPass(e.target.value); clearAuthErr(); }}
              onKeyDown={handleKeyDown}
              style={{ ...inputStyleDark, width: '100%', boxSizing: 'border-box', paddingRight: 50 }}
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <button
            onClick={doLogin}
            disabled={loading}
            style={{
              ...btnStyle,
              width: '100%',
              background: '#FBBC04',
              color: '#0D0D0D',
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Verificando...' : 'Iniciar Sesión'}
          </button>

          <div style={{ textAlign: 'center', fontSize: 12, color: '#555', marginTop: 22, fontWeight: 600 }}>
            Acceso solo autorizado · Puntos Plus
          </div>
        </div>
      </div>
    </div>
  );
}
