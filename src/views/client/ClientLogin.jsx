// src/views/client/ClientLogin.jsx
// FORMATO GENERAL (referencia maestra): encabezado tipográfico grande a la
// izquierda como el home, campos rellenos sin borde, paleta de marca
// naranja/negro/blanco. Jerarquía: CTA naranja > Google blanco > registro negro.
import { sb } from '../../lib/supabaseClient';
import { inputFlat, btnStyle, BRAND_ORANGE } from '../../constants/styles';
import { GoogleLogo, Phone, Lock } from '../../components/ui/Icons';
import Wordmark from '../../components/ui/Wordmark';
import LegalFooter from '../../components/ui/LegalFooter';

export default function ClientLogin(ctx) {
  const { loginPhone, setLoginPhone, loginPass, setLoginPass, authError, setAuthError,
    clearAuthErr, setAuthScreen, setMe, custs, fire, cTier } = ctx;

  const isDark = cTier?.name === 'BLACK';
  const ink = isDark ? '#fff' : '#0D0D0D';

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

  const iconBox = { position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#9E9E9E', display: 'flex', zIndex: 1 };

  return (
    <div style={{ padding: '48px 24px 120px', position: 'relative', zIndex: 1 }}>
      {/* Header — como el saludo del home: logo arriba, tipografía grande a la izquierda */}
      <div style={{ marginBottom: 36 }}>
        <img src="/logo.png" alt="Puntos Plus" style={{ width: 64, height: 64, borderRadius: 16, display: 'block', marginBottom: 20 }} />
        <div style={{ fontSize: 24, fontWeight: 900, color: ink, lineHeight: 1.15 }}>Bienvenido a</div>
        <div style={{ lineHeight: 1.1, marginBottom: 10 }}>
          <Wordmark size={38} color={ink} accent={BRAND_ORANGE} />
        </div>
        <div style={{ fontSize: 14, color: '#9E9E9E' }}>Inicia sesión para continuar</div>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <div style={iconBox}><Phone /></div>
          <input placeholder="Número de teléfono" value={loginPhone} inputMode="numeric"
            onChange={e => { setLoginPhone(e.target.value); clearAuthErr(); }} style={{ ...inputFlat, paddingLeft: 44 }} />
        </div>
        <div style={{ position: 'relative' }}>
          <div style={iconBox}><Lock /></div>
          <input placeholder="Contraseña" type="password" value={loginPass}
            onChange={e => { setLoginPass(e.target.value); clearAuthErr(); }} style={{ ...inputFlat, paddingLeft: 44 }} />
        </div>
        <button onClick={doLogin} style={{ ...btnStyle, background: BRAND_ORANGE, color: '#fff' }}>
          Iniciar sesión
        </button>
      </div>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
        <div style={{ flex: 1, height: 1, background: isDark ? 'rgba(255,255,255,.12)' : '#F0F0F0' }} />
        <span style={{ fontSize: 12, color: '#9E9E9E', fontWeight: 600 }}>o continuar con</span>
        <div style={{ flex: 1, height: 1, background: isDark ? 'rgba(255,255,255,.12)' : '#F0F0F0' }} />
      </div>

      {/* OAuth */}
      <button onClick={doGoogle} style={{
        ...btnStyle, background: '#fff', border: '1.5px solid #ECECEE', color: '#333',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 28,
      }}>
        <GoogleLogo /> Continuar con Google
      </button>

      {/* Registro — el negro de la marca como segunda acción fuerte */}
      <div style={{ fontSize: 13, color: '#9E9E9E', textAlign: 'center', marginBottom: 10 }}>¿No tienes cuenta?</div>
      <button onClick={() => { setAuthScreen('register'); setAuthError(''); }}
        style={{ ...btnStyle, background: '#0D0D0D', color: '#fff' }}>
        Crear cuenta nueva
      </button>

      {/* Disclaimer legal D28 */}
      <LegalFooter />
    </div>
  );
}
