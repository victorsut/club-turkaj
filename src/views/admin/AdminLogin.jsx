// src/views/admin/AdminLogin.jsx
// Login de administrador validado contra Supabase via RPC `authenticate_admin`.
// La contraseña se valida server-side con bcrypt (extensions.crypt + pgcrypto).
// Patrón espejo de OperatorLogin.jsx.

import { useState } from 'react';
import { inputStyleDark, btnStyle } from '../../constants/styles';
import { Eye, EyeOff } from '../../components/ui/Icons';
import { loginAdmin } from '../../services/adminAuthService';

export default function AdminLogin(ctx) {
  const {
    adLoginDpi, setAdLoginDpi,
    adLoginGafete, setAdLoginGafete,
    adLoginEmail, setAdLoginEmail,
    adLoginPass, setAdLoginPass,
    authError, setAuthError, clearAuthErr,
    setAuthAdmin, fire,
    setLoggedAdmin, // opcional — solo si App.jsx lo provee
  } = ctx;

  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false); // ojito de contraseña

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
    <div style={{ padding: '40px 24px 120px', background: '#1E1E1E', minHeight: '80vh' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <img src="/logo.png" alt="Puntos Plus" style={{ width: 64, height: 64, borderRadius: 18, marginBottom: 10 }} />
        <div style={{ fontSize: 22, fontWeight: 900, color: '#FBBC04' }}>Administrador</div>
        <div style={{ fontSize: 13, color: '#777', marginTop: 4 }}>Acceso restringido</div>
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        <input
          placeholder="DPI"
          value={adLoginDpi}
          onChange={e => { setAdLoginDpi(e.target.value); clearAuthErr(); }}
          onKeyDown={handleKeyDown}
          style={inputStyleDark}
          disabled={loading}
          inputMode="numeric"
          autoComplete="off"
        />
        <input
          placeholder="Número de gafete"
          value={adLoginGafete}
          onChange={e => { setAdLoginGafete(e.target.value); clearAuthErr(); }}
          onKeyDown={handleKeyDown}
          style={inputStyleDark}
          disabled={loading}
          autoComplete="off"
        />
        <input
          placeholder="Correo electrónico"
          type="email"
          value={adLoginEmail}
          onChange={e => { setAdLoginEmail(e.target.value); clearAuthErr(); }}
          onKeyDown={handleKeyDown}
          style={inputStyleDark}
          disabled={loading}
          autoCapitalize="none"
          autoComplete="email"
        />
        <div style={{ position: 'relative' }}>
          <input
            placeholder="Contraseña"
            type={showPass ? 'text' : 'password'}
            value={adLoginPass}
            onChange={e => { setAdLoginPass(e.target.value); clearAuthErr(); }}
            onKeyDown={handleKeyDown}
            style={{ ...inputStyleDark, paddingRight: 50 }}
            disabled={loading}
            autoComplete="current-password"
          />
          <button type="button" onClick={() => setShowPass(p => !p)} aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9E9E9E', display: 'flex', padding: 2 }}>
            {showPass ? <EyeOff /> : <Eye />}
          </button>
        </div>
        <button
          onClick={doLogin}
          disabled={loading}
          style={{
            ...btnStyle,
            background: '#FBBC04',
            color: '#0D0D0D',
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Verificando...' : 'Iniciar Sesión'}
        </button>
      </div>

      <div style={{ textAlign: 'center', fontSize: 12, color: '#555' }}>
        Acceso solo autorizado · Puntos Plus
      </div>
    </div>
  );
}
