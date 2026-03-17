// src/views/admin/AdminLogin.jsx
import { inputStyleDark, btnStyle } from '../../constants/styles';

// TODO: Migrate ADMIN_CRED to Supabase `admins` table with bcrypt
const ADMIN_CRED = { dpi: '1', gafete: '1', email: '1', password: '1' };

export default function AdminLogin(ctx) {
  const { adLoginDpi, setAdLoginDpi, adLoginGafete, setAdLoginGafete,
    adLoginEmail, setAdLoginEmail, adLoginPass, setAdLoginPass,
    authError, setAuthError, clearAuthErr, setAuthAdmin, fire } = ctx;

  const doLogin = () => {
    clearAuthErr();
    if (!adLoginDpi || !adLoginGafete || !adLoginEmail || !adLoginPass) {
      setAuthError('Completa todos los campos'); return;
    }
    if (adLoginDpi === ADMIN_CRED.dpi && adLoginGafete === ADMIN_CRED.gafete &&
        adLoginEmail === ADMIN_CRED.email && adLoginPass === ADMIN_CRED.password) {
      setAuthAdmin('logged'); fire('🔧 Sesión de administrador');
    } else {
      setAuthError('Credenciales incorrectas');
    }
  };

  return (
    <div style={{ padding: '40px 24px 120px', background: '#1E1E1E', minHeight: '80vh' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🔧</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#FBBC04' }}>Administrador</div>
        <div style={{ fontSize: 13, color: '#777', marginTop: 4 }}>Acceso restringido</div>
      </div>

      {authError && (
        <div style={{ background: 'rgba(198,40,40,.15)', color: '#EF9A9A', padding: '10px 14px', borderRadius: 12, fontSize: 12, fontWeight: 700, marginBottom: 16, textAlign: 'center' }}>
          {authError}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        <input placeholder="DPI" value={adLoginDpi}
          onChange={e => { setAdLoginDpi(e.target.value); clearAuthErr(); }} style={inputStyleDark} />
        <input placeholder="Número de gafete" value={adLoginGafete}
          onChange={e => { setAdLoginGafete(e.target.value); clearAuthErr(); }} style={inputStyleDark} />
        <input placeholder="Correo electrónico" value={adLoginEmail}
          onChange={e => { setAdLoginEmail(e.target.value); clearAuthErr(); }} style={inputStyleDark} />
        <input placeholder="Contraseña" type="password" value={adLoginPass}
          onChange={e => { setAdLoginPass(e.target.value); clearAuthErr(); }} style={inputStyleDark} />
        <button onClick={doLogin} style={{ ...btnStyle, background: '#FBBC04', color: '#0D0D0D' }}>
          Iniciar Sesión
        </button>
      </div>
    </div>
  );
}
