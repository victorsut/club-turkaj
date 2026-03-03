// src/views/client/ClientLogin.jsx
import { sb } from '../../lib/supabaseClient';
import { inputStyle, btnStyle } from '../../constants/styles';
import { Back, GoogleLogo, AppleLogo } from '../../components/ui/Icons';

export default function ClientLogin(ctx) {
  const { loginPhone, setLoginPhone, loginPass, setLoginPass, authError, setAuthError,
    clearAuthErr, setAuthScreen, setMe, custs, fire, cTier } = ctx;

  const doLogin = () => {
    clearAuthErr();
    if (!loginPhone || !loginPass) { setAuthError('Ingresa teléfono y contraseña'); return; }
    const found = custs.find(c => c.phone === loginPhone);
    if (!found) { setAuthError('Número no registrado'); return; }
    setMe(found); setAuthScreen('logged'); fire('👋 Bienvenido ' + found.name);
  };

  const doGoogle = () => {
    if (sb) sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    else setAuthError('Supabase no disponible');
  };

  const doApple = () => {
    if (sb) sb.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo: window.location.origin } });
    else setAuthError('Supabase no disponible');
  };

  return (
    <div style={{ padding: '40px 24px 120px', position: 'relative', zIndex: 1 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>⛽</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: cTier.name === 'BLACK' ? '#fff' : '#0D0D0D' }}>
          Club Turkaj
        </div>
        <div style={{ fontSize: 13, color: '#9E9E9E', marginTop: 4 }}>
          Inicia sesión para continuar
        </div>
      </div>

      {/* Error */}
      {authError && (
        <div style={{
          background: '#FFEBEE', color: '#C62828', padding: '10px 14px',
          borderRadius: 12, fontSize: 12, fontWeight: 700, marginBottom: 16, textAlign: 'center',
        }}>
          {authError}
        </div>
      )}

      {/* Phone + Password */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        <input placeholder="Número de teléfono" value={loginPhone}
          onChange={e => { setLoginPhone(e.target.value); clearAuthErr(); }} style={inputStyle} />
        <input placeholder="Contraseña" type="password" value={loginPass}
          onChange={e => { setLoginPass(e.target.value); clearAuthErr(); }} style={inputStyle} />
        <button onClick={doLogin} style={{ ...btnStyle, background: '#FBBC04', color: '#0D0D0D' }}>
          Iniciar Sesión
        </button>
      </div>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
        <div style={{ flex: 1, height: 1, background: '#eee' }} />
        <span style={{ fontSize: 12, color: '#9E9E9E', fontWeight: 600 }}>o continuar con</span>
        <div style={{ flex: 1, height: 1, background: '#eee' }} />
      </div>

      {/* OAuth */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button onClick={doGoogle} style={{
          ...btnStyle, flex: 1, background: '#fff', border: '2px solid #eee', color: '#333',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <GoogleLogo /> Google
        </button>
        <button onClick={doApple} style={{
          ...btnStyle, flex: 1, background: '#000', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <AppleLogo /> Apple
        </button>
      </div>

      {/* Register link */}
      <div style={{ textAlign: 'center' }}>
        <span style={{ fontSize: 13, color: '#9E9E9E' }}>¿No tienes cuenta? </span>
        <button onClick={() => { setAuthScreen('register'); setAuthError(''); }}
          style={{ background: 'none', border: 'none', color: '#FBBC04', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans'" }}>
          Regístrate
        </button>
      </div>
    </div>
  );
}
