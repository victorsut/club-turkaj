// src/views/client/ClientLogin.jsx
// FORMATO GENERAL (referencia maestra): encabezado tipográfico grande a la
// izquierda como el home, campos rellenos sin borde, paleta de marca
// naranja/negro/blanco. "Regístrate" entra DIRECTO al wizard (la bienvenida
// intermedia se eliminó — decisión del dueño 22-jul).
import { useState, useEffect, useRef } from 'react';
import { sb } from '../../lib/supabaseClient';
import { inputFlat, btnStyle, BRAND_ORANGE } from '../../constants/styles';
import { GoogleLogo, Phone, Lock, Mail, Chev } from '../../components/ui/Icons';
import { phoneMask } from '../../lib/inputMasks';
import Wordmark from '../../components/ui/Wordmark';
import LegalFooter from '../../components/ui/LegalFooter';
import useBackLayer from '../../hooks/useBackLayer';

export default function ClientLogin(ctx) {
  const { loginPhone, setLoginPhone, loginPass, setLoginPass, authError, setAuthError,
    clearAuthErr, setAuthScreen, setMe, setRegProfile, setGoogleStep, custs, fire, cTier } = ctx;

  const isDark = cTier?.name === 'BLACK';
  const ink = isDark ? '#fff' : '#0D0D0D';

  // "¿Olvidaste tu contraseña?" aparece unos segundos después de
  // escribir el teléfono completo (8 dígitos).
  const [showForgot, setShowForgot] = useState(false);
  const [fpSheet, setFpSheet]       = useState(false);
  const [fpClosing, setFpClosing]   = useState(false);
  const fpTimer = useRef(null);

  useEffect(() => {
    clearTimeout(fpTimer.current);
    if ((loginPhone || '').replace(/\D/g, '').length >= 8) {
      fpTimer.current = setTimeout(() => setShowForgot(true), 1500);
    } else {
      setShowForgot(false);
    }
    return () => clearTimeout(fpTimer.current);
  }, [loginPhone]);

  const closeFpSheet = () => {
    setFpClosing(true);
    setTimeout(() => { setFpSheet(false); setFpClosing(false); }, 200);
  };
  useBackLayer(fpSheet, closeFpSheet);

  const pickRecovery = via => {
    closeFpSheet();
    fire(via === 'sms'
      ? 'Muy pronto podrás recuperar tu contraseña por mensaje SMS'
      : 'Muy pronto podrás recuperar tu contraseña por correo', 'info');
  };

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

  // Registro directo al wizard: crea el usuario temporal y abre el paso 1
  const startRegister = () => {
    setMe({
      id: 'temp-' + Date.now(),
      name: '', email: '', phone: '', avatar: '',
      dpi: '', plate: '', nit: '', bday: '',
      points: 0, gallons: 0, spent: 0, visits: 0,
      tickets: 0, redeemed: 0, referrals: 0,
      registered: new Date().toISOString().split('T')[0],
      lastBuy: '', station: '', cardId: '',
      supabaseUser: false, authProvider: 'manual',
    });
    setRegProfile({ name: '', dpi: '', plate: '', email: '', bday: '', nit: '', phone: '' });
    setGoogleStep('step1');
    setAuthError('');
    setAuthScreen('googleProfile');
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
          <input placeholder="Número de teléfono" value={phoneMask.format(loginPhone || '')} inputMode="numeric"
            onChange={e => { setLoginPhone(phoneMask.clean(e.target.value)); clearAuthErr(); }} style={{ ...inputFlat, paddingLeft: 44 }} />
        </div>
        <div style={{ position: 'relative' }}>
          <div style={iconBox}><Lock /></div>
          <input placeholder="Contraseña" type="password" value={loginPass}
            onChange={e => { setLoginPass(e.target.value); clearAuthErr(); }} style={{ ...inputFlat, paddingLeft: 44 }} />
        </div>
        {showForgot && (
          <button onClick={() => setFpSheet(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', alignSelf: 'flex-end', padding: 0, fontSize: 12, fontWeight: 700, color: BRAND_ORANGE, fontFamily: "'DM Sans'", animation: 'fadeIn .3s ease' }}>
            ¿Olvidaste tu contraseña?
          </button>
        )}
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
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24,
      }}>
        <GoogleLogo /> Continuar con Google
      </button>

      {/* Registro — link de texto, directo al wizard */}
      <div style={{ textAlign: 'center' }}>
        <span style={{ fontSize: 13, color: '#9E9E9E' }}>¿No tienes cuenta? </span>
        <button onClick={startRegister}
          style={{ background: 'none', border: 'none', color: BRAND_ORANGE, fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans'", padding: 0 }}>
          Regístrate
        </button>
      </div>

      {/* Disclaimer legal D28 */}
      <LegalFooter />

      {/* Sheet de recuperación de contraseña (funcionalidad pendiente) */}
      {fpSheet && (
        <div onClick={closeFpSheet}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: fpClosing ? 'ppFadeOut .2s ease forwards' : 'fadeIn .2s ease' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '24px 20px 36px', animation: fpClosing ? 'slideDownOut .22s ease forwards' : 'slideUp .25s ease' }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#0D0D0D', marginBottom: 4 }}>Recuperar contraseña</div>
            <div style={{ fontSize: 13, color: '#9E9E9E', marginBottom: 18 }}>Elige cómo quieres recuperar el acceso a tu cuenta</div>
            {[
              { k: 'sms',   icon: <Phone />, bg: BRAND_ORANGE, title: 'Mensaje al teléfono', desc: 'Te enviaremos un código por SMS' },
              { k: 'email', icon: <Mail />,  bg: '#0D0D0D',    title: 'Correo electrónico',  desc: 'Recibirás un enlace de recuperación' },
            ].map(o => (
              <button key={o.k} onClick={() => pickRecovery(o.k)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, background: '#F5F5F7', border: 'none', borderRadius: 16, padding: '14px 16px', marginBottom: 10, cursor: 'pointer', fontFamily: "'DM Sans'", textAlign: 'left' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: o.bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{o.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0D0D0D' }}>{o.title}</div>
                  <div style={{ fontSize: 12, color: '#9E9E9E', marginTop: 2 }}>{o.desc}</div>
                </div>
                <span style={{ color: '#BDBDBD', display: 'flex' }}><Chev /></span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
