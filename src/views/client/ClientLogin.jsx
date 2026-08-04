// src/views/client/ClientLogin.jsx
// FORMATO GENERAL (referencia maestra): encabezado tipográfico grande a la
// izquierda como el home, campos rellenos sin borde, paleta de marca
// naranja/negro/blanco. "Regístrate" entra DIRECTO al wizard (la bienvenida
// intermedia se eliminó — decisión del dueño 22-jul).
import { useState, useEffect, useRef } from 'react';
import { sb } from '../../lib/supabaseClient';
import { inputFlat, btnStyle, BRAND_ORANGE } from '../../constants/styles';
import { GoogleLogo, Phone, Lock, Fingerprint, HelpCircle, Eye, EyeOff } from '../../components/ui/Icons';
import { phoneMask } from '../../lib/inputMasks';
import { signInWithPhone } from '../../services/authService';
import { mapMember } from '../../hooks/useSupabaseData';
import { biometricsAvailable, loginBiometric, isUserCancel } from '../../lib/webauthnClient';
import Wordmark from '../../components/ui/Wordmark';
import LegalFooter from '../../components/ui/LegalFooter';
import ModeToggle from '../../components/ui/ModeToggle';
import SupportSheet from '../../components/ui/SupportSheet';

export default function ClientLogin(ctx) {
  const { loginPhone, setLoginPhone, loginPass, setLoginPass, authError, setAuthError,
    clearAuthErr, setAuthScreen, setMe, setRegProfile, setGoogleStep, custs, fire,
    dark, setUiMode, cfg } = ctx;

  // Canal de asistencia (4-ago): disponible desde el login
  const [supportOpen, setSupportOpen] = useState(false);

  // Ver/ocultar contraseña (regla 4-ago: todo campo de contraseña
  // lleva el ojito a la derecha)
  const [showPass, setShowPass] = useState(false);

  const ink = dark ? '#fff' : '#0D0D0D';
  const sub = dark ? 'rgba(255,255,255,.55)' : '#9E9E9E';
  // Campos rellenos: versión oscura del inputFlat (#F5F5F7 en claro)
  const field = { ...inputFlat, background: dark ? 'rgba(255,255,255,.08)' : '#F5F5F7', color: ink };

  // "¿Olvidaste tu contraseña?" aparece unos segundos después de
  // escribir el teléfono completo (8 dígitos).
  const [showForgot, setShowForgot] = useState(false);
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

  // Recuperación por WhatsApp (decisión del dueño 4-ago — sustituye al
  // sheet SMS/correo "próximamente"): abre el chat del canal de
  // asistencia con la solicitud pre-escrita y el número que digitó.
  const requestPasswordReset = () => {
    const support = (cfg?.supportPhone || '49741067').replace(/\D/g, '');
    const phone = (loginPhone || '').replace(/\D/g, '');
    const msg = `Hola, olvidé mi contraseña de Puntos Plus y quiero restablecerla. Mi número registrado es ${phoneMask.format(phone)}.`;
    window.open(`https://wa.me/502${support}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  };

  // SEC-lite (25-jul): la contraseña se verifica en el SERVIDOR
  // (RPC authenticate_member, bcrypt). Antes solo se buscaba el
  // teléfono en la lista local — cualquier contraseña entraba.
  const [loggingIn, setLoggingIn] = useState(false);
  const doLogin = async () => {
    if (loggingIn) return;
    clearAuthErr();
    if (!loginPhone || !loginPass) { setAuthError('Ingresa teléfono y contraseña'); return; }
    setLoggingIn(true);
    try {
      const res = await signInWithPhone(loginPhone, loginPass);
      if (!res.ok) { setAuthError(res.error); return; }
      // SEC.C.1: el perfil viene del servidor con la sesión; custs queda
      // como fallback transitorio (RPC vieja sin member).
      const found = res.member ? mapMember(res.member) : custs.find(c => c.id === res.memberId);
      if (!found) { setAuthError('No se pudo cargar tu perfil. Recargá la app e intentá de nuevo.'); return; }
      setMe(found); setAuthScreen('logged'); fire('Bienvenido ' + found.name, 'success');
    } finally {
      setLoggingIn(false);
    }
  };

  const doGoogle = () => {
    if (sb) sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    else setAuthError('Supabase no disponible');
  };

  // ── Biometría (passkeys): el botón solo aparece si el navegador
  // soporta autenticador de plataforma (in-app browsers no) ──
  const [bioAvail, setBioAvail] = useState(false);
  const [bioBusy, setBioBusy]   = useState(false);
  useEffect(() => { biometricsAvailable().then(setBioAvail); }, []);

  const doBiometric = async () => {
    if (bioBusy) return;
    clearAuthErr();
    setBioBusy(true);
    try {
      const res = await loginBiometric();
      const found = res.member ? mapMember(res.member) : custs.find(c => c.id === res.memberId);
      if (!found) { setAuthError('No se pudo cargar tu perfil. Recargá la app e intentá de nuevo.'); return; }
      setMe(found); setAuthScreen('logged'); fire('Bienvenido ' + found.name, 'success');
    } catch (err) {
      if (!isUserCancel(err)) setAuthError(err.message || 'No se pudo verificar tu identidad');
    } finally {
      setBioBusy(false);
    }
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
    setRegProfile({ name: '', nickname: '', dpi: '', plate: '', email: '', bday: '', nit: '', phone: '' });
    setGoogleStep('step1');
    setAuthError('');
    setAuthScreen('googleProfile');
  };

  const iconBox = { position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#9E9E9E', display: 'flex', zIndex: 1 };

  return (
    <div style={{ padding: '48px 24px 120px', position: 'relative', zIndex: 1 }}>
      {/* Header — como el saludo del home: logo arriba, tipografía grande a la
          izquierda; sol/luna arriba a la derecha (modo claro/oscuro). */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <img src="/logo.png" alt="Puntos Plus" style={{ width: 64, height: 64, borderRadius: 16, display: 'block' }} />
          {/* Ayuda + modo claro/oscuro — la ayuda vive en el header
              (como en el home) para no confundirse con "Regístrate" */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setSupportOpen(true)} aria-label="Asistencia y ayuda"
              style={{ width: 38, height: 38, border: 'none', cursor: 'pointer', background: 'none', color: ink, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
              <HelpCircle />
            </button>
            <ModeToggle dark={dark} setUiMode={setUiMode} />
          </div>
        </div>
        <div style={{ fontSize: 24, fontWeight: 900, color: ink, lineHeight: 1.15 }}>Bienvenido a</div>
        <div style={{ lineHeight: 1.1, marginBottom: 10 }}>
          <Wordmark size={38} color={ink} accent={BRAND_ORANGE} />
        </div>
        <div style={{ fontSize: 14, color: sub }}>Inicia sesión para continuar</div>
      </div>

      {/* Error */}
      {authError && (
        <div style={{
          background: dark ? 'rgba(214,40,26,.18)' : '#FFEBEE', color: dark ? '#FF8A80' : '#C62828', padding: '10px 14px',
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
            onChange={e => { setLoginPhone(phoneMask.clean(e.target.value)); clearAuthErr(); }} style={{ ...field, paddingLeft: 44 }} />
        </div>
        <div style={{ position: 'relative' }}>
          <div style={iconBox}><Lock /></div>
          <input placeholder="Contraseña" type={showPass ? 'text' : 'password'} value={loginPass}
            onChange={e => { setLoginPass(e.target.value); clearAuthErr(); }} style={{ ...field, paddingLeft: 44, paddingRight: 50 }} />
          <button type="button" onClick={() => setShowPass(p => !p)} aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9E9E9E', display: 'flex', padding: 2 }}>
            {showPass ? <EyeOff /> : <Eye />}
          </button>
        </div>
        {showForgot && (
          <button onClick={requestPasswordReset}
            style={{ background: 'none', border: 'none', cursor: 'pointer', alignSelf: 'flex-end', padding: 0, fontSize: 12, fontWeight: 700, color: BRAND_ORANGE, fontFamily: "'DM Sans'", animation: 'fadeIn .3s ease' }}>
            ¿Olvidaste tu contraseña?
          </button>
        )}
        <button onClick={doLogin} disabled={loggingIn} style={{ ...btnStyle, background: BRAND_ORANGE, color: '#fff', opacity: loggingIn ? .7 : 1 }}>
          {loggingIn ? 'Ingresando...' : 'Iniciar sesión'}
        </button>
      </div>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
        <div style={{ flex: 1, height: 1, background: dark ? 'rgba(255,255,255,.12)' : '#F0F0F0' }} />
        <span style={{ fontSize: 12, color: sub, fontWeight: 600 }}>o continuar con</span>
        <div style={{ flex: 1, height: 1, background: dark ? 'rgba(255,255,255,.12)' : '#F0F0F0' }} />
      </div>

      {/* OAuth */}
      <button onClick={doGoogle} style={{
        ...btnStyle,
        background: dark ? 'rgba(255,255,255,.08)' : '#fff',
        border: dark ? '1.5px solid rgba(255,255,255,.14)' : '1.5px solid #ECECEE',
        color: dark ? '#fff' : '#333',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24,
      }}>
        <GoogleLogo /> Continuar con Google
      </button>

      {/* Biometría (passkey): huella / rostro / patrón del celular */}
      {bioAvail && (
        <button onClick={doBiometric} disabled={bioBusy} style={{
          ...btnStyle,
          background: dark ? 'rgba(255,255,255,.08)' : '#fff',
          border: dark ? '1.5px solid rgba(255,255,255,.14)' : '1.5px solid #ECECEE',
          color: dark ? '#fff' : '#333',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          marginTop: -14, marginBottom: 24, opacity: bioBusy ? .7 : 1,
        }}>
          <span style={{ color: BRAND_ORANGE, display: 'flex' }}><Fingerprint /></span>
          {bioBusy ? 'Verificando...' : 'Usar huella o rostro'}
        </button>
      )}

      {/* Registro — link de texto, directo al wizard */}
      <div style={{ textAlign: 'center' }}>
        <span style={{ fontSize: 13, color: sub }}>¿No tienes cuenta? </span>
        <button onClick={startRegister}
          style={{ background: 'none', border: 'none', color: BRAND_ORANGE, fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans'", padding: 0 }}>
          Regístrate
        </button>
      </div>

      {/* Disclaimer legal D28 */}
      <LegalFooter />

      {/* Canal de asistencia (WhatsApp / llamada + horario en vivo) */}
      {supportOpen && (
        <SupportSheet onClose={() => setSupportOpen(false)} dark={dark} phone={cfg?.supportPhone} />
      )}
    </div>
  );
}
