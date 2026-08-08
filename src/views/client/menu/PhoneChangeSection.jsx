// src/views/client/menu/PhoneChangeSection.jsx
// Cambio de TELÉFONO con verificación OTP (8-ago-2026, pedido del
// dueño): el número actual se muestra BLOQUEADO; para cambiarlo, el
// cliente ingresa el número nuevo, recibe un código SMS en ESE
// número (/api/verify-phone → Twilio Verify) y lo confirma. Sin
// código correcto no hay cambio — update_my_profile ya no acepta
// phone. Reintento con espera de 30 s.
import { useState, useEffect, useRef } from 'react';
import { inputFlat, btnStyle, bento, BRAND_ORANGE } from '../../../constants/styles';
import { Phone, Lock, Chev } from '../../../components/ui/Icons';
import { getMemberToken } from '../../../services/sessionTokens';
import { phoneMask } from '../../../lib/inputMasks';

export default function PhoneChangeSection({ ctx, TH }) {
  const { me, setMe, fire } = ctx;

  const [open, setOpen]         = useState(false);
  const [stage, setStage]       = useState('input'); // input | code
  const [newPhone, setNewPhone] = useState('');
  const [code, setCode]         = useState('');
  const [busy, setBusy]         = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef(null);

  useEffect(() => () => clearInterval(timer.current), []);
  const startCooldown = (s) => {
    setCooldown(s);
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      setCooldown(c => { if (c <= 1) { clearInterval(timer.current); return 0; } return c - 1; });
    }, 1000);
  };

  const call = async (payload) => {
    const res = await fetch('/api/verify-phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: getMemberToken()?.token ?? null, ...payload }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.error) throw new Error(json.error || 'No se pudo completar la verificación');
    return json;
  };

  const sendCode = async () => {
    const p = newPhone.trim();
    if (!/^\d{8}$/.test(p)) { fire('El teléfono debe tener 8 dígitos', 'error'); return; }
    if (p === me?.phone) { fire('Ese ya es tu número actual', 'error'); return; }
    setBusy(true);
    try {
      await call({ action: 'start', phone: p });
      setStage('code'); setCode('');
      startCooldown(30);
      fire('Código enviado por SMS al número nuevo', 'success');
    } catch (err) {
      fire(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const confirmCode = async () => {
    if (!/^\d{4,8}$/.test(code.trim())) { fire('Ingresa el código que recibiste por SMS', 'error'); return; }
    setBusy(true);
    try {
      const { phone } = await call({ action: 'check', phone: newPhone.trim(), code: code.trim() });
      setMe(prev => ({ ...prev, phone }));
      setOpen(false); setStage('input'); setNewPhone(''); setCode('');
      fire('Teléfono actualizado', 'success');
    } catch (err) {
      fire(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const field = { ...inputFlat, background: TH.isDark ? 'rgba(255,255,255,.08)' : '#fff', color: TH.header, paddingLeft: 44 };
  const label = { fontSize: 11, fontWeight: 800, color: TH.sub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 };
  const iconL = { position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: TH.sub, display: 'flex', zIndex: 1 };
  const btnPrimary = { ...btnStyle, background: BRAND_ORANGE, color: '#fff', padding: 14, borderRadius: 12, fontSize: 14 };

  return (
    <div style={{ marginBottom: 14 }}>
      {/* Número actual — bloqueado como el DPI */}
      <div style={label}>Teléfono</div>
      <div style={{ ...field, display: 'flex', alignItems: 'center', color: TH.sub, position: 'relative' }}>
        <div style={iconL}><Phone /></div>
        <span style={{ flex: 1, fontVariantNumeric: 'tabular-nums' }}>{me?.phone ? phoneMask.format(me.phone) : '—'}</span>
        <span style={{ display: 'flex', color: TH.sub, opacity: .6 }}><Lock /></span>
      </div>

      <button onClick={() => { setOpen(o => !o); setStage('input'); setCode(''); }}
        style={{ width: '100%', marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 14, border: 'none', background: TH.surface, fontFamily: "'DM Sans'", cursor: 'pointer', textAlign: 'left' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: TH.header }}>Cambiar teléfono</div>
          <div style={{ fontSize: 11, color: TH.sub, marginTop: 2 }}>Te enviaremos un código SMS al número nuevo</div>
        </div>
        <span style={{ color: TH.sub, display: 'flex', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}><Chev /></span>
      </button>

      {open && (
        <div style={{ background: TH.surface, borderRadius: 16, padding: 16, marginTop: 8 }}>
          {stage === 'input' ? (
            <>
              <div style={label}>Número nuevo</div>
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: TH.sub, fontWeight: 700, zIndex: 1 }}>+502</div>
                <input placeholder="Teléfono 8 dígitos" inputMode="numeric"
                  value={phoneMask.format(newPhone)}
                  onChange={e => setNewPhone(phoneMask.clean(e.target.value))}
                  style={{ ...field, paddingLeft: 62 }} />
              </div>
              <button onClick={sendCode} disabled={busy} style={{ ...btnPrimary, opacity: busy ? .7 : 1 }}>
                {busy ? 'Enviando...' : 'Enviar código'}
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 12, color: TH.sub, lineHeight: 1.55, marginBottom: 12 }}>
                Enviamos un código por SMS al <b style={{ color: TH.header }}>+502 {phoneMask.format(newPhone)}</b>.
                Ingresalo para confirmar el cambio.
              </div>
              <div style={label}>Código de verificación</div>
              <input placeholder="000000" inputMode="numeric" autoComplete="one-time-code" value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                style={{ ...field, paddingLeft: 16, marginBottom: 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, letterSpacing: 6, textAlign: 'center' }} />
              <button onClick={confirmCode} disabled={busy} style={{ ...btnPrimary, opacity: busy ? .7 : 1 }}>
                {busy ? 'Verificando...' : 'Confirmar cambio'}
              </button>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                <button onClick={() => { setStage('input'); setCode(''); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 700, color: TH.sub, padding: 4 }}>
                  Cambiar el número
                </button>
                <button onClick={sendCode} disabled={busy || cooldown > 0}
                  style={{ background: 'none', border: 'none', cursor: cooldown ? 'default' : 'pointer', fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 700, color: cooldown ? TH.sub : BRAND_ORANGE, padding: 4 }}>
                  {cooldown > 0 ? `Reenviar en ${cooldown}s` : 'Reenviar código'}
                </button>
              </div>
            </>
          )}
          <div style={{ fontSize: 11, color: TH.sub, lineHeight: 1.5, marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'flex', color: bento.green, flexShrink: 0, transform: 'scale(.8)' }}><Lock /></span>
            Por tu seguridad, el número solo cambia con el código correcto.
          </div>
        </div>
      )}
    </div>
  );
}
