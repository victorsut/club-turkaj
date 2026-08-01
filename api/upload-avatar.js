// ============================================================
// Puntos Plus — /api/upload-avatar (1-ago-2026)
// ============================================================
// Sube la foto de perfil de un MIEMBRO al bucket `avatars`.
// Mismo modelo que /api/upload-promo-image: el bucket no tiene
// policies de escritura (solo service_role bypasa RLS), así que la
// apikey anon del front no puede subir directo — este endpoint
// valida el TOKEN DE SESIÓN DE MIEMBRO (member_sessions, patrón
// SEC.C.1: vigente, no revocado, no expirado) y recién entonces
// sube con la service key. Los archivos viven en la carpeta
// <member_id>/ y la foto anterior se BORRA antes de subir la nueva
// (un solo objeto por miembro — sin huérfanos en Storage).
//
// El guardado de la URL en members.avatar_url lo hace el CLIENTE
// después, vía update_my_profile (whitelist con sesión).
//
// Body JSON: { token, contentType, data (base64 sin prefijo dataURL) }
// Respuesta: { url } pública del objeto subido.
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const MAX_BYTES = 2 * 1024 * 1024; // espeja el file_size_limit del bucket
const MIME_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_KEY no configurada en Vercel' });
  }

  try {
    const { token, contentType, data } = req.body || {};
    if (!token) return res.status(401).json({ error: 'Sesión requerida' });
    const ext = MIME_EXT[contentType];
    if (!ext) return res.status(400).json({ error: 'Formato no soportado (JPEG, PNG o WebP)' });
    if (!data) return res.status(400).json({ error: 'Imagen vacía' });

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // ── Validación de sesión de miembro (espejo de validate_session_token) ──
    const { data: session, error: sesErr } = await sb
      .from('member_sessions')
      .select('member_id, expires_at, revoked_at')
      .eq('token', token)
      .maybeSingle();
    if (sesErr) return res.status(500).json({ error: sesErr.message });
    if (!session || session.revoked_at || new Date(session.expires_at) <= new Date()) {
      return res.status(401).json({ error: 'Sesión inválida o expirada' });
    }

    const buffer = Buffer.from(data, 'base64');
    if (buffer.length === 0) return res.status(400).json({ error: 'Imagen vacía' });
    if (buffer.length > MAX_BYTES) {
      return res.status(413).json({ error: 'La imagen supera 2 MB' });
    }

    // ── Borrar la foto anterior del miembro (carpeta propia) ──
    const folder = session.member_id;
    const { data: prev } = await sb.storage.from('avatars').list(folder);
    if (prev?.length) {
      await sb.storage.from('avatars').remove(prev.map(f => `${folder}/${f.name}`));
    }

    const path = `${folder}/${randomUUID()}.${ext}`;
    const { error: upErr } = await sb.storage
      .from('avatars')
      .upload(path, buffer, { contentType, upsert: false });
    if (upErr) return res.status(500).json({ error: upErr.message });

    const { data: pub } = sb.storage.from('avatars').getPublicUrl(path);
    return res.status(200).json({ url: pub.publicUrl });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
