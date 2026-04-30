// src/views/operator/OperatorLogin.jsx
// Login de operador validado contra Supabase via RPC `authenticate_operator`.
// La contraseña se valida server-side con bcrypt (extensions.crypt).

import { useState } from 'react';
import { inputStyle, btnStyle } from '../../constants/styles';
import { loginOperator } from '../../services/operatorAuthService';

export default function OperatorLogin(ctx) {
  const {
    opLoginGafete, setOpLoginGafete,
    opLoginDpi, setOpLoginDpi,
    opLoginUser, setOpLoginUser,
    opLoginPass, setOpLoginPass,
    authError, setAuthError, clearAuthErr,
    setAuthOp, setLoggedOp, fire,
  } = ctx;

  const [loading, setLoading] = useState(false);

  const doLogin = async () => {
    clearAuthErr();
    setLoading(true);

    const result = await loginOperator({
      gafete: opLoginGafete,
      dpi: opLoginDpi,
      username: opLoginUser,
      password: opLoginPass,
    });

    setLoading(false);

    if (!result.ok) {
      setAuthError(result.error);
      return;
    }

    setLoggedOp(result.operator);
    setAuthOp('logged');
    setOpLoginPass(''); // Limpiar contraseña por seguridad
    fire('Bienvenido ' + result.operator.name);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !loading) doLogin();
  };

  return (
    <div style={{ padding: '40px 24px 120px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>⛽</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#333' }}>Operador</div>
        <div style={{ fontSize: 13, color: '#9E9E9E', marginTop: 4 }}>Ingresa tus credenciales</div>
      </div>

      {authError && (
        <div style={{ background: '#FFEBEE', color: '#C62828', padding: '10px 14px', borderRadius: 12, fontSize: 12, fontWeight: 700, marginBottom: 16, textAlign: 'center' }}>
          {authError}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        <input
          placeholder="Número de gafete"
          value={opLoginGafete}
          onChange={e => { setOpLoginGafete(e.target.value); clearAuthErr(); }}
          onKeyDown={handleKeyDown}
          style={inputStyle}
          disabled={loading}
          inputMode="numeric"
          autoComplete="off"
        />
        <input
          placeholder="DPI"
          value={opLoginDpi}
          onChange={e => { setOpLoginDpi(e.target.value); clearAuthErr(); }}
          onKeyDown={handleKeyDown}
          style={inputStyle}
          disabled={loading}
          inputMode="numeric"
          autoComplete="off"
        />
        <input
          placeholder="Usuario"
          value={opLoginUser}
          onChange={e => { setOpLoginUser(e.target.value); clearAuthErr(); }}
          onKeyDown={handleKeyDown}
          style={inputStyle}
          disabled={loading}
          autoCapitalize="none"
          autoComplete="username"
        />
        <input
          placeholder="Contraseña"
          type="password"
          value={opLoginPass}
          onChange={e => { setOpLoginPass(e.target.value); clearAuthErr(); }}
          onKeyDown={handleKeyDown}
          style={inputStyle}
          disabled={loading}
          autoComplete="current-password"
        />
        <button
          onClick={doLogin}
          disabled={loading}
          style={{ ...btnStyle, background: '#FBBC04', color: '#0D0D0D', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Verificando...' : 'Iniciar Sesión'}
        </button>
      </div>

      <div style={{ textAlign: 'center', fontSize: 12, color: '#BDBDBD' }}>
        Gafete otorgado por gerencia
      </div>
    </div>
  );
}
