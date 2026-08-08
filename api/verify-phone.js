// ============================================================
// Puntos Plus — /api/verify-phone (8-ago-2026, v2 mismo día)
// ============================================================
// Verificación OTP del teléfono AL REGISTRARSE (cambio de método
// decidido por el dueño: la verificación es SOLO en el registro;
// el cambio de número se solicita por WhatsApp y lo aplica el
// ADMIN desde la ficha del miembro). Cumple la promesa del wizard:
// "Verificaremos este número al finalizar tu registro".
//
// Flujo (sin sesión — el miembro aún no existe):
//   POST { action:'start', phone }        → envía el código SMS
//   POST { action:'check', phone, code }  → verifica y deja la
//     aprobación en phone_verifications (service key); luego
//     register_member la exige y la CONSUME (interruptor
//     program_config 'phone_verification', migración 20260808c).
//
// Abuso: el endpoint es público por naturaleza (registro). Twilio
// Verify limita por número destino (5 envíos / 10 min, bloqueos
// progresivos) y el código expira solo — aquí no se guarda ningún
// código, solo la APROBACIÓN final.
//
// Env (Vercel): TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
//               TWILIO_VERIFY_SERVICE_SID (servicio Verify).
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const TW_SID = process.env.TWILIO_ACCOUNT_SID;
const TW_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TW_VERIFY = process.env.TWILIO_VERIFY_SERVICE_SID;

// Llamada REST a Twilio Verify (sin SDK — form-urlencoded + basic auth)
async function twilioVerify(path, params) {
  const res = await fetch(`https://verify.twilio.com/v2/Services/${TW_VERIFY}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${TW_SID}:${TW_TOKEN}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params).toString(),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

// Errores de Twilio con mensaje humano (código → texto)
const TW_ERRORS = {
  60203: 'Demasiados envíos a ese número — esperá 10 minutos e intentá de nuevo',
  60202: 'Demasiados intentos de código — pedí un código nuevo',
  60200: 'Número de teléfono inválido',
  20404: 'El código expiró — pedí uno nuevo',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_KEY no configurada en Vercel' });
  }
  if (!TW_SID || !TW_TOKEN || !TW_VERIFY) {
    // El wizard interpreta este mensaje como "OTP apagado" y sigue sin
    // código (coherente con el interruptor server-side en OFF).
    return res.status(500).json({ error: 'Verificación no configurada (faltan variables TWILIO_* en Vercel)' });
  }

  try {
    const { action, phone, code } = req.body || {};
    if (action !== 'start' && action !== 'check') {
      return res.status(400).json({ error: 'Acción inválida' });
    }
    const cleanPhone = String(phone || '').replace(/\D/g, '');
    if (!/^\d{8}$/.test(cleanPhone)) {
      return res.status(400).json({ error: 'El teléfono debe tener 8 dígitos' });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // ── El número no puede estar ya registrado ──
    const { data: dup, error: dupErr } = await sb
      .from('members')
      .select('id')
      .eq('phone', cleanPhone)
      .maybeSingle();
    if (dupErr) return res.status(500).json({ error: dupErr.message });
    if (dup) return res.status(409).json({ error: 'Este número ya está registrado. Si ya tenés cuenta, iniciá sesión.' });

    const to = `+502${cleanPhone}`;

    // ── start: enviar el código SMS ──
    if (action === 'start') {
      const tw = await twilioVerify('Verifications', { To: to, Channel: 'sms', Locale: 'es' });
      if (!tw.ok) {
        const msg = TW_ERRORS[tw.json?.code] || tw.json?.message || 'No se pudo enviar el código';
        return res.status(502).json({ error: msg });
      }
      return res.status(200).json({ ok: true });
    }

    // ── check: verificar el código y dejar la APROBACIÓN ──
    if (!/^\d{4,8}$/.test(String(code || ''))) {
      return res.status(400).json({ error: 'Código inválido' });
    }
    const tw = await twilioVerify('VerificationCheck', { To: to, Code: String(code) });
    if (!tw.ok) {
      const msg = TW_ERRORS[tw.json?.code] || tw.json?.message || 'No se pudo verificar el código';
      return res.status(502).json({ error: msg });
    }
    if (tw.json?.status !== 'approved') {
      return res.status(400).json({ error: 'Código incorrecto' });
    }

    // Aprobación de un solo uso: register_member la exige (con el
    // interruptor encendido) y la consume al crear la cuenta.
    const { error: upErr } = await sb
      .from('phone_verifications')
      .upsert({ phone: cleanPhone, verified_at: new Date().toISOString() });
    if (upErr) return res.status(500).json({ error: upErr.message });

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
