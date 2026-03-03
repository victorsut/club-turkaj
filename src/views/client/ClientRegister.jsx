// src/views/client/ClientRegister.jsx
import { inputStyle, btnStyle } from '../../constants/styles';
import { Back } from '../../components/ui/Icons';

export default function ClientRegister(ctx) {
  const { regPhone, setRegPhone, regPass, setRegPass, regPass2, setRegPass2,
    regVerifyMethod, setRegVerifyMethod, regCode, setRegCode, regSentCode, setRegSentCode,
    authError, setAuthError, clearAuthErr, setAuthScreen, custs, fire } = ctx;

  const doSend = () => {
    clearAuthErr();
    if (!regPhone) { setAuthError('Ingresa tu número'); return; }
    if (!regPass || regPass.length < 6) { setAuthError('Contraseña mínimo 6 caracteres'); return; }
    if (regPass !== regPass2) { setAuthError('Las contraseñas no coinciden'); return; }
    if (custs.find(c => c.phone === regPhone)) { setAuthError('Este número ya está registrado'); return; }
    setRegSentCode(true);
    fire(regVerifyMethod === 'whatsapp' ? '📱 Código enviado por WhatsApp' : '📱 Código enviado por SMS');
  };

  const doVerify = () => {
    if (regCode.length >= 4) { setAuthScreen('profile'); fire('✅ Número verificado'); }
    else setAuthError('Código inválido');
  };

  // Verify step
  if (regSentCode) {
    return (
      <div style={{ padding: '40px 24px 120px', position: 'relative', zIndex: 1 }}>
        <button onClick={() => { setRegSentCode(false); setAuthScreen('register'); setAuthError(''); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#9E9E9E', fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600, marginBottom: 20 }}>
          <Back /> Atrás
        </button>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{regVerifyMethod === 'whatsapp' ? '💬' : '📱'}</div>
          <div style={{ fontSize: 20, fontWeight: 900 }}>Verificar Número</div>
          <div style={{ fontSize: 13, color: '#9E9E9E', marginTop: 8 }}>
            Enviamos un código a {regPhone} por {regVerifyMethod === 'whatsapp' ? 'WhatsApp' : 'SMS'}
          </div>
        </div>

        {authError && (
          <div style={{ background: '#FFEBEE', color: '#C62828', padding: '10px 14px', borderRadius: 12, fontSize: 12, fontWeight: 700, marginBottom: 16, textAlign: 'center' }}>
            {authError}
          </div>
        )}

        <input placeholder="Código de verificación" value={regCode}
          onChange={e => { setRegCode(e.target.value); clearAuthErr(); }}
          style={{ ...inputStyle, textAlign: 'center', fontSize: 24, fontWeight: 800, letterSpacing: 8, marginBottom: 16 }}
          maxLength={6} />

        <button onClick={doVerify} style={{ ...btnStyle, background: '#FBBC04', color: '#0D0D0D' }}>
          Verificar
        </button>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button onClick={doSend}
            style={{ background: 'none', border: 'none', color: '#FBBC04', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans'" }}>
            Reenviar código
          </button>
        </div>
      </div>
    );
  }

  // Register step
  return (
    <div style={{ padding: '40px 24px 120px', position: 'relative', zIndex: 1 }}>
      <button onClick={() => { setAuthScreen('login'); setAuthError(''); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#9E9E9E', fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600, marginBottom: 20 }}>
        <Back /> Atrás
      </button>

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🆕</div>
        <div style={{ fontSize: 22, fontWeight: 900 }}>Crear Cuenta</div>
        <div style={{ fontSize: 13, color: '#9E9E9E', marginTop: 4 }}>Únete a Club Turkaj</div>
      </div>

      {authError && (
        <div style={{ background: '#FFEBEE', color: '#C62828', padding: '10px 14px', borderRadius: 12, fontSize: 12, fontWeight: 700, marginBottom: 16, textAlign: 'center' }}>
          {authError}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        <input placeholder="Número de teléfono" value={regPhone}
          onChange={e => { setRegPhone(e.target.value); clearAuthErr(); }} style={inputStyle} />
        <input placeholder="Crear contraseña" type="password" value={regPass}
          onChange={e => { setRegPass(e.target.value); clearAuthErr(); }} style={inputStyle} />
        <input placeholder="Confirmar contraseña" type="password" value={regPass2}
          onChange={e => { setRegPass2(e.target.value); clearAuthErr(); }} style={inputStyle} />
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#424242' }}>
          Verificar número por:
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {['whatsapp', 'sms'].map(m => (
            <button key={m} onClick={() => setRegVerifyMethod(m)} style={{
              flex: 1, padding: '14px 16px', borderRadius: 14,
              border: regVerifyMethod === m ? '2px solid #FBBC04' : '2px solid #eee',
              background: regVerifyMethod === m ? '#FFF8E1' : '#fff',
              cursor: 'pointer', fontFamily: "'DM Sans'", fontWeight: 700, fontSize: 13,
              color: regVerifyMethod === m ? '#F0A500' : '#9E9E9E',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {m === 'whatsapp' ? '💬 WhatsApp' : '📱 SMS'}
            </button>
          ))}
        </div>
      </div>

      <button onClick={doSend} style={{ ...btnStyle, background: '#FBBC04', color: '#0D0D0D' }}>
        Enviar Código
      </button>
    </div>
  );
}
