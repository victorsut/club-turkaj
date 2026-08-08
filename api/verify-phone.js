// ============================================================
// Puntos Plus — /api/verify-phone (8-ago-2026)
// ============================================================
// Cambio de TELÉFONO del miembro con verificación OTP (pedido del
// dueño: "para cambiar el teléfono deberá verificarlo"). El código
// viaja por SMS al NÚMERO NUEVO vía Twilio Verify (genera, expira
// y limita reintentos server-side de Twilio — aquí no se guarda
// ningún código). update_my_profile ya NO acepta cambios de phone:
// este endpoint es el ÚNICO camino.
//
// Flujo:
//   POST { action:'start', token, phone }        → envía el código
//   POST { action:'check', token, phone, code }  → verifica y aplica
//
// Seguridad:
//   · Sesión de MIEMBRO obligatoria (member_sessions, patrón
//     /api/upload-avatar: vigente, no revocada, no expirada).
//   · Unicidad del número comprobada en start Y de nuevo en check
//     (carrera entre dos clientes registrando el mismo número).
//   · El UPDATE de members.phone se hace con la service key SOLO
//     tras status 'approved' de Twilio.
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
    return res.status(500).json({ error: 'Verificación no configurada (faltan variables TWILIO_* en Vercel)' });
  }

  try {
    const { action, token, phone, code } = req.body || {};
    if (!token) return res.status(401).json({ error: 'Sesión requerida' });
    if (action !== 'start' && action !== 'check') {
      return res.status(400).json({ error: 'Acción inválida' });
    }
    const cleanPhone = String(phone || '').replace(/\D/g, '');
    if (!/^\d{8}$/.test(cleanPhone)) {
      return res.status(400).json({ error: 'El teléfono debe tener 8 dígitos' });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // ── Sesión de miembro (espejo de validate_session_token) ──
    const { data: session, error: sesErr } = await sb
      .from('member_sessions')
      .select('member_id, expires_at, revoked_at')
      .eq('token', token)
      .maybeSingle();
    if (sesErr) return res.status(500).json({ error: sesErr.message });
    if (!session || session.revoked_at || new Date(session.expires_at) <= new Date()) {
      return res.status(401).json({ error: 'Sesión inválida o expirada' });
    }
    const memberId = session.member_id;

    // ── Unicidad: el número no puede pertenecer a OTRA cuenta ──
    const { data: dup, error: dupErr } = await sb
      .from('members')
      .select('id')
      .eq('phone', cleanPhone)
      .neq('id', memberId)
      .maybeSingle();
    if (dupErr) return res.status(500).json({ error: dupErr.message });
    if (dup) return res.status(409).json({ error: 'Ese teléfono ya está registrado en otra cuenta' });

    const to = `+502${cleanPhone}`;

    // ── start: enviar el código SMS al número NUEVO ──
    if (action === 'start') {
      const tw = await twilioVerify('Verifications', { To: to, Channel: 'sms', Locale: 'es' });
      if (!tw.ok) {
        const msg = TW_ERRORS[tw.json?.code] || tw.json?.message || 'No se pudo enviar el código';
        return res.status(502).json({ error: msg });
      }
      return res.status(200).json({ ok: true });
    }

    // ── check: verificar el código y APLICAR el cambio ──
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

    const { error: upErr } = await sb
      .from('members')
      .update({ phone: cleanPhone, updated_at: new Date().toISOString() })
      .eq('id', memberId);
    if (upErr) return res.status(500).json({ error: upErr.message });

    return res.status(200).json({ ok: true, phone: cleanPhone });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
