// src/views/client/PhoneVerifyStep.jsx
// Paso de VERIFICACIÓN del teléfono al finalizar el registro
// (8-ago-2026): el wizard ya envió el código SMS al número digitado
// (/api/verify-phone action start); acá el cliente lo ingresa y, con
// el código aprobado, GoogleProfile completa el alta (register_member
// exige la aprobación cuando el interruptor server-side está
// encendido). Reenvío con espera de 30 s.
import { useState, useEffect, useRef } from 'react';
import { inputFlat, btnStyle, BRAND_ORANGE } from '../../constants/styles';
import { phoneMask } from '../../lib/inputMasks';

export default function PhoneVerifyStep({ phone, dark, onVerified, onBack }) {
  const ink = dark ? '#fff' : '#0D0D0D';
  const fieldFlat = { ...inputFlat, background: dark ? 'rgba(255,255,255,.08)' : '#F5F5F7', color: ink };

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [cooldown, setCooldown] = useState(30);
  const timer = useRef(null);

  const startCooldown = (s) => {
    setCooldown(s);
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      setCooldown(c => { if (c <= 1) { clearInterval(timer.current); return 0; } return c - 1; });
    }, 1000);
  };
  useEffect(() => { startCooldown(30); return () => clearInterval(timer.current); }, []);

  const call = async (payload) => {
    const res = await fetch('/api/verify-phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.error) throw new Error(json.error || 'No se pudo completar la verificación');
    return json;
  };

  const resend = async () => {
    if (busy || cooldown > 0) return;
    setBusy(true); setErr('');
    try {
      await call({ action: 'start', phone });
      startCooldown(30);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!/^\d{4,8}$/.test(code.trim())) { setErr('Ingresa el código que recibiste por SMS'); return; }
    setBusy(true); setErr('');
    try {
      await call({ action: 'check', phone, code: code.trim() });
      onVerified();
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: '24px 24px 120px' }}>
      <div style={{ marginBottom: 24, marginTop: 12 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: ink, marginBottom: 4 }}>Verificá tu número</div>
        <div style={{ fontSize: 13, color: '#9E9E9E', lineHeight: 1.5 }}>
          Enviamos un código por SMS al <b style={{ color: ink }}>+502 {phoneMask.format(phone || '')}</b>.
          Ingresalo para finalizar tu registro.
        </div>
      </div>

      {err && (
        <div style={{ background: dark ? 'rgba(214,40,26,.18)' : '#FFEBEE', color: dark ? '#FF8A80' : '#C62828', padding: '10px 14px', borderRadius: 12, fontSize: 12, fontWeight: 700, marginBottom: 16, textAlign: 'center' }}>{err}</div>
      )}

      <input placeholder="000000" inputMode="numeric" autoComplete="one-time-code" autoFocus value={code}
        onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 8)); setErr(''); }}
        style={{ ...fieldFlat, marginBottom: 16, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 20, letterSpacing: 8, textAlign: 'center' }} />

      <button onClick={confirm} disabled={busy} style={{ ...btnStyle, background: BRAND_ORANGE, color: '#fff', opacity: busy ? .7 : 1 }}>
        {busy ? 'Verificando...' : 'Verificar y finalizar'}
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
        <button onClick={onBack} disabled={busy}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 700, color: '#9E9E9E', padding: 4 }}>
          Corregir mi número
        </button>
        <button onClick={resend} disabled={busy || cooldown > 0}
          style={{ background: 'none', border: 'none', cursor: cooldown ? 'default' : 'pointer', fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 700, color: cooldown ? '#9E9E9E' : BRAND_ORANGE, padding: 4 }}>
          {cooldown > 0 ? `Reenviar en ${cooldown}s` : 'Reenviar código'}
        </button>
      </div>
    </div>
  );
}
