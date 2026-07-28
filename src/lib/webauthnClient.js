// src/lib/webauthnClient.js
// Biometría con passkeys (huella / rostro / patrón del celular).
// El navegador habla con el chip seguro del teléfono; este módulo
// solo orquesta contra /api/webauthn. La biometría NUNCA sale del
// dispositivo — solo viajan firmas criptográficas.
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
} from '@simplewebauthn/browser';
import { setMemberToken } from '../services/sessionTokens';

const post = async (body) => {
  const r = await fetch('/api/webauthn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Error de conexión');
  return data;
};

// ¿Este navegador/celular puede usar biometría? (in-app browsers de
// WhatsApp/Instagram suelen NO soportarla → el botón no se muestra)
export async function biometricsAvailable() {
  try {
    return browserSupportsWebAuthn() && await platformAuthenticatorIsAvailable();
  } catch {
    return false;
  }
}

// Cancelación del usuario en el diálogo del sistema (no es un error)
export const isUserCancel = (err) =>
  err?.name === 'NotAllowedError' || err?.name === 'AbortError';

// Activar en este dispositivo. `auth` = { password } para cuentas de
// teléfono, o { oauthToken } (sesión de Supabase Auth) para Google.
export async function registerBiometric(memberId, auth) {
  const options = await post({ action: 'register-options', memberId, ...auth });
  const response = await startRegistration({ optionsJSON: options });
  return post({
    action: 'register-verify', memberId, response,
    label: (navigator.userAgent || '').slice(0, 120),
  });
}

// Iniciar sesión con la llave del dispositivo → { ok, memberId, name }
export async function loginBiometric() {
  const options = await post({ action: 'login-options' });
  const response = await startAuthentication({ optionsJSON: options });
  const res = await post({ action: 'login-verify', response });
  // SEC.C.1: el endpoint emite sesión de miembro y devuelve el perfil
  // completo (members ya no es legible por la API abierta).
  if (res?.session?.token) {
    setMemberToken({ token: res.session.token, expiresAt: res.session.expiresAt });
  }
  return res;
}
