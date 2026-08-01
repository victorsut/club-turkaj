// src/views/client/menu/AvatarEditor.jsx
// Foto de perfil EDITABLE (pedido del dueño 1-ago-2026): las cuentas
// Google nacen con la foto de la cuenta, pero cualquier miembro puede
// cambiarla desde Mi Cuenta. La imagen se recorta CUADRADA y se reduce
// a 512px en el cliente, sube por /api/upload-avatar (valida la sesión
// de miembro y escribe el bucket `avatars` con la service key) y la URL
// se guarda vía update_my_profile (whitelist SEC.C.1).
import { useRef, useState } from 'react';
import { sb } from '../../../lib/supabaseClient';
import { getMemberToken } from '../../../services/sessionTokens';
import { BRAND_ORANGE } from '../../../constants/styles';
import { Camera } from '../../../components/ui/Icons';

const MAX_SIDE = 512;

// Recorte cuadrado centrado + reducción → JPEG (payload muy por debajo
// del límite de 2 MB del bucket)
function squareJpeg(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const side = Math.min(img.width, img.height);
      const out = Math.min(side, MAX_SIDE);
      const cv = document.createElement('canvas');
      cv.width = cv.height = out;
      const g = cv.getContext('2d');
      g.imageSmoothingQuality = 'high';
      g.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, out, out);
      resolve(cv.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')); };
    img.src = url;
  });
}

export default function AvatarEditor({ ctx, TH }) {
  const { me, setMe, fire, sbConnected } = ctx;
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const initial = (me?.name || '?').trim().charAt(0).toUpperCase();

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo
    if (!file) return;
    if (!file.type.startsWith('image/')) { fire('El archivo debe ser una imagen', 'error'); return; }
    if (!sb || !sbConnected) { fire('Sin conexión', 'error'); return; }
    setBusy(true);
    try {
      const base64 = (await squareJpeg(file)).split(',')[1];
      const resp = await fetch('/api/upload-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: getMemberToken()?.token ?? null, contentType: 'image/jpeg', data: base64 }),
      });
      const out = await resp.json().catch(() => ({}));
      if (!resp.ok || !out.url) throw new Error(out.error || 'No se pudo subir la imagen');
      const { data, error } = await sb.rpc('update_my_profile', {
        p_session_token: getMemberToken()?.token ?? null,
        p_changes: { avatar_url: out.url },
      });
      const errMsg = error?.message || data?.error;
      if (errMsg) {
        throw new Error(errMsg === 'invalid_session'
          ? 'Tu sesión expiró — cerrá sesión y volvé a entrar' : errMsg);
      }
      setMe(p => ({ ...p, avatar: out.url }));
      fire('Foto de perfil actualizada', 'success');
    } catch (err) {
      fire(err.message || 'No se pudo actualizar la foto', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
      <button onClick={() => { if (!busy) fileRef.current?.click(); }} aria-label="Cambiar foto de perfil"
        style={{ position: 'relative', width: 92, height: 92, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}>
        <div style={{
          width: 92, height: 92, borderRadius: '50%', overflow: 'hidden',
          background: TH.iconBox, display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: busy ? .5 : 1,
        }}>
          {me?.avatar
            ? <img src={me.avatar} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 34, fontWeight: 900, color: '#fff', fontFamily: "'DM Sans'" }}>{initial}</span>}
        </div>
        {/* Insignia de acción: color sólido de marca (regla botón vs cuadro) */}
        <div style={{
          position: 'absolute', right: -2, bottom: -2, width: 32, height: 32, borderRadius: '50%',
          background: BRAND_ORANGE, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Camera size={15} />
        </div>
      </button>
      <div style={{ fontSize: 11, fontWeight: 700, color: TH.sub, marginTop: 8 }}>
        {busy ? 'Subiendo foto...' : 'Toca para cambiar tu foto'}
      </div>
      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />
    </div>
  );
}
