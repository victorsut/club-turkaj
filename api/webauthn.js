// ============================================================
// Puntos Plus — /api/webauthn (biometría con passkeys)
// ============================================================
// Login del miembro con huella/rostro/patrón del celular (WebAuthn).
// La llave privada vive en el chip seguro del teléfono; acá solo se
// generan desafíos y se verifican firmas contra la llave pública
// guardada en member_credentials (tablas cerradas por RLS — solo la
// service key entra).
//
// SEGURIDAD del registro: activar la huella exige la CONTRASEÑA del
// miembro (se verifica con el RPC authenticate_member) — sin eso,
// cualquiera podría registrar una llave para la cuenta de otro.
// El desafío es de un solo uso y expira a los 10 minutos.
//
// rpID/origin se derivan del host de la petición → funciona en
// puntosplus.vercel.app, en el dominio transicional y en un dominio
// propio futuro sin tocar código (las llaves son POR dominio).
//
// Acciones (POST, body JSON con `action`):
//   register-options {memberId, password} → opciones para el navegador
//   register-verify  {memberId, response, label} → guarda la llave
//   login-options    {} → opciones de autenticación (usernameless)
//   login-verify     {response} → {ok, memberId, name}
import { createClient } from '@supabase/supabase-js';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RP_NAME = 'Puntos Plus';
const CHALLENGE_TTL_MS = 10 * 60 * 1000;

// Desafío que el navegador firmó (viaja en clientDataJSON, base64url)
function challengeFromResponse(response) {
  try {
    const json = JSON.parse(Buffer.from(response.response.clientDataJSON, 'base64url').toString('utf8'));
    return json.challenge || null;
  } catch { return null; }
}

// Consume el desafío (single-use): lo busca vigente y lo borra.
async function consumeChallenge(sb, challenge, kind, memberId) {
  if (!challenge) return null;
  let q = sb.from('webauthn_challenges').select('id, member_id, created_at')
    .eq('challenge', challenge).eq('kind', kind);
  if (memberId) q = q.eq('member_id', memberId);
  const { data: row } = await q.maybeSingle();
  if (!row) return null;
  await sb.from('webauthn_challenges').delete().eq('id', row.id);
  if (Date.now() - new Date(row.created_at).getTime() > CHALLENGE_TTL_MS) return null;
  return row;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_KEY no configurada en Vercel' });
  }

  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  if (!host) return res.status(400).json({ error: 'Host desconocido' });
  const rpID = host.split(':')[0];
  const expectedOrigin = (rpID === 'localhost' ? 'http://' : 'https://') + host;

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const { action } = req.body || {};

  try {
    // Limpieza oportunista de desafíos vencidos
    await sb.from('webauthn_challenges').delete()
      .lt('created_at', new Date(Date.now() - CHALLENGE_TTL_MS).toISOString());

    // ── Registro: opciones (exige contraseña O sesión de Google) ──
    if (action === 'register-options') {
      const { memberId, password, oauthToken } = req.body;
      if (!memberId || (!password && !oauthToken)) return res.status(400).json({ error: 'Faltan datos' });

      const { data: member } = await sb.from('members')
        .select('id, name, phone, auth_provider_id').eq('id', memberId).maybeSingle();
      if (!member) return res.status(404).json({ error: 'Miembro no encontrado' });

      // Re-autenticación real: contraseña (bcrypt server-side) o el
      // token de Supabase Auth de la sesión de Google — verificado en
      // servidor y atado al auth_provider_id de ESTE miembro.
      if (oauthToken) {
        const { data: userData, error: uErr } = await sb.auth.getUser(oauthToken);
        const uid = userData?.user?.id;
        if (uErr || !uid || uid !== member.auth_provider_id) {
          return res.status(401).json({ error: 'Sesión de Google inválida — volvé a iniciar sesión' });
        }
      } else {
        const { data: auth, error: authErr } = await sb.rpc('authenticate_member', {
          p_phone: member.phone, p_password: password,
        });
        if (authErr || !auth?.ok || auth.member_id !== member.id) {
          return res.status(401).json({ error: 'Contraseña incorrecta' });
        }
      }

      const { data: existing } = await sb.from('member_credentials')
        .select('credential_id, transports').eq('member_id', member.id);

      const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID,
        userName: member.phone || member.name,
        attestationType: 'none',
        excludeCredentials: (existing || []).map(c => ({
          id: c.credential_id, transports: c.transports || undefined,
        })),
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'required',
          authenticatorAttachment: 'platform',
        },
      });

      await sb.from('webauthn_challenges').insert({
        challenge: options.challenge, kind: 'reg', member_id: member.id,
      });
      return res.status(200).json(options);
    }

    // ── Registro: verificación y guardado de la llave ──
    if (action === 'register-verify') {
      const { memberId, response, label } = req.body;
      if (!memberId || !response) return res.status(400).json({ error: 'Faltan datos' });

      const challenge = challengeFromResponse(response);
      const row = await consumeChallenge(sb, challenge, 'reg', memberId);
      if (!row) return res.status(400).json({ error: 'Desafío inválido o vencido — intentá de nuevo' });

      const { verified, registrationInfo } = await verifyRegistrationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin,
        expectedRPID: rpID,
      });
      if (!verified || !registrationInfo) {
        return res.status(400).json({ error: 'No se pudo verificar el registro' });
      }

      const { credential } = registrationInfo;
      const { error: insErr } = await sb.from('member_credentials').insert({
        member_id: memberId,
        credential_id: credential.id,
        public_key: Buffer.from(credential.publicKey).toString('base64url'),
        counter: credential.counter,
        transports: credential.transports || null,
        device_label: (label || '').slice(0, 120) || null,
      });
      if (insErr) return res.status(500).json({ error: insErr.message });
      return res.status(200).json({ ok: true });
    }

    // ── Login: opciones (usernameless — el celular ofrece la llave) ──
    if (action === 'login-options') {
      const options = await generateAuthenticationOptions({
        rpID,
        userVerification: 'required',
      });
      await sb.from('webauthn_challenges').insert({
        challenge: options.challenge, kind: 'auth', member_id: null,
      });
      return res.status(200).json(options);
    }

    // ── Login: verificación de firma → identidad del miembro ──
    if (action === 'login-verify') {
      const { response } = req.body;
      if (!response?.id) return res.status(400).json({ error: 'Faltan datos' });

      const challenge = challengeFromResponse(response);
      const row = await consumeChallenge(sb, challenge, 'auth', null);
      if (!row) return res.status(400).json({ error: 'Desafío inválido o vencido — intentá de nuevo' });

      const { data: cred } = await sb.from('member_credentials')
        .select('id, member_id, public_key, counter, transports')
        .eq('credential_id', response.id).maybeSingle();
      if (!cred) return res.status(404).json({ error: 'Huella no registrada — activala desde Mi Cuenta' });

      const { verified, authenticationInfo } = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin,
        expectedRPID: rpID,
        credential: {
          id: response.id,
          publicKey: new Uint8Array(Buffer.from(cred.public_key, 'base64url')),
          counter: Number(cred.counter) || 0,
          transports: cred.transports || undefined,
        },
      });
      if (!verified) return res.status(401).json({ error: 'Verificación fallida' });

      await sb.from('member_credentials').update({
        counter: authenticationInfo.newCounter,
        last_used_at: new Date().toISOString(),
      }).eq('id', cred.id);

      const { data: member } = await sb.from('members')
        .select('id, name').eq('id', cred.member_id).maybeSingle();
      if (!member) return res.status(404).json({ error: 'Miembro no encontrado' });
      return res.status(200).json({ ok: true, memberId: member.id, name: member.name });
    }

    return res.status(400).json({ error: 'Acción desconocida' });
  } catch (err) {
    console.error('[webauthn]', err);
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
}
