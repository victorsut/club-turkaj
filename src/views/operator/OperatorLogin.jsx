// src/views/operator/OperatorLogin.jsx
import { inputStyle, btnStyle } from '../../constants/styles';

export default function OperatorLogin(ctx) {
  const { opLoginGafete, setOpLoginGafete, opLoginDpi, setOpLoginDpi,
    opLoginUser, setOpLoginUser, opLoginPass, setOpLoginPass,
    authError, setAuthError, clearAuthErr, setAuthOp, setLoggedOp, operators, fire } = ctx;

  const doLogin = () => {
    clearAuthErr();
    if (!opLoginGafete || !opLoginDpi || !opLoginUser || !opLoginPass) {
      setAuthError('Completa todos los campos'); return;
    }
    const found = operators.find(o =>
      o.gafete === opLoginGafete && o.dpi === opLoginDpi &&
      o.user === opLoginUser && o.password === opLoginPass
    );
    if (!found) { setAuthError('Credenciales incorrectas'); return; }
    if (!found.active) { setAuthError('Operador inactivo, contacta a gerencia'); return; }
    setLoggedOp(found); setAuthOp('logged'); fire('👋 Bienvenido ' + found.name);
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
        <input placeholder="Número de gafete" value={opLoginGafete}
          onChange={e => { setOpLoginGafete(e.target.value); clearAuthErr(); }} style={inputStyle} />
        <input placeholder="DPI" value={opLoginDpi}
          onChange={e => { setOpLoginDpi(e.target.value); clearAuthErr(); }} style={inputStyle} />
        <input placeholder="Usuario" value={opLoginUser}
          onChange={e => { setOpLoginUser(e.target.value); clearAuthErr(); }} style={inputStyle} />
        <input placeholder="Contraseña" type="password" value={opLoginPass}
          onChange={e => { setOpLoginPass(e.target.value); clearAuthErr(); }} style={inputStyle} />
        <button onClick={doLogin} style={{ ...btnStyle, background: '#FBBC04', color: '#0D0D0D' }}>
          Iniciar Sesión
        </button>
      </div>

      <div style={{ textAlign: 'center', fontSize: 12, color: '#BDBDBD' }}>
        Gafete otorgado por gerencia
      </div>
    </div>
  );
}
