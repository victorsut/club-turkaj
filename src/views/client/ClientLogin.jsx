// src/views/client/ClientLogin.jsx
// FORMATO GENERAL: flat sin sombras, iconos SVG en los campos,
// acción primaria en rojo de marca.
import { sb } from '../../lib/supabaseClient';
import { inputStyle, btnStyle, BRAND_RED } from '../../constants/styles';
import { GoogleLogo, Phone, Lock } from '../../components/ui/Icons';
import Wordmark from '../../components/ui/Wordmark';
import LegalFooter from '../../components/ui/LegalFooter';

export default function ClientLogin(ctx) {
  const { loginPhone, setLoginPhone, loginPass, setLoginPass, authError, setAuthError,
    clearAuthErr, setAuthScreen, setMe, custs, fire, cTier } = ctx;

  const doLogin = () => {
    clearAuthErr();
    if (!loginPhone || !loginPass) { setAuthError('Ingresa teléfono y contraseña'); return; }
    const found = custs.find(c => c.phone === loginPhone);
    if (!found) { setAuthError('Número no registrado'); return; }
    setMe(found); setAuthScreen('logged'); fire('Bienvenido ' + found.name, 'success');
  };

  const doGoogle = () => {
    if (sb) sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    else setAuthError('Supabase no disponible');
  };

  const iconBox = { position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9E9E9E', display: 'flex', zIndex: 1 };

  return (
    <div style={{ padding: '40px 24px 120px', position: 'relative', zIndex: 1 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <img src="/logo.png" alt="Puntos Plus" style={{ width: 72, height: 72, borderRadius: 20, marginBottom: 12 }} />
        <br />
        <Wordmark size={28} color={cTier.name === 'BLACK' ? '#fff' : '#0D0D0D'} />
        <div style={{ fontSize: 13, color: '#9E9E9E', marginTop: 8 }}>
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
        <div style={{ position: 'relative' }}>
          <div style={iconBox}><Phone /></div>
          <input placeholder="Número de teléfono" value={loginPhone} inputMode="numeric"
            onChange={e => { setLoginPhone(e.target.value); clearAuthErr(); }} style={{ ...inputStyle, paddingLeft: 42 }} />
        </div>
        <div style={{ position: 'relative' }}>
          <div style={iconBox}><Lock /></div>
          <input placeholder="Contraseña" type="password" value={loginPass}
            onChange={e => { setLoginPass(e.target.value); clearAuthErr(); }} style={{ ...inputStyle, paddingLeft: 42 }} />
        </div>
        <button onClick={doLogin} style={{ ...btnStyle, background: BRAND_RED, color: '#fff' }}>
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
      <div style={{ marginBottom: 24 }}>
        <button onClick={doGoogle} style={{
          ...btnStyle, width: '100%', background: '#fff', border: '1.5px solid #E0E0E0', color: '#333',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <GoogleLogo /> Continuar con Google
        </button>
      </div>

      {/* Register link */}
      <div style={{ textAlign: 'center' }}>
        <span style={{ fontSize: 13, color: '#9E9E9E' }}>¿No tienes cuenta? </span>
        <button onClick={() => { setAuthScreen('register'); setAuthError(''); }}
          style={{ background: 'none', border: 'none', color: BRAND_RED, fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans'" }}>
          Regístrate
        </button>
      </div>

      {/* Disclaimer legal D28 */}
      <LegalFooter />
    </div>
  );
}
