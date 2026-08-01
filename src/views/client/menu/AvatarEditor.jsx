// src/views/client/menu/AvatarEditor.jsx
// Foto de perfil EDITABLE (pedido del dueño 1-ago-2026): las cuentas
// Google nacen con la foto de la cuenta, pero cualquier miembro puede
// cambiarla desde Mi Cuenta. Al elegir la imagen se abre un RECORTADOR
// (bottom sheet): arrastrar encuadra, pellizcar o el deslizador acerca;
// la vista previa es circular como el avatar. El recorte sale a 512px
// JPEG, sube por /api/upload-avatar (valida la sesión de miembro y
// escribe el bucket `avatars` con la service key) y la URL se guarda
// vía update_my_profile (whitelist SEC.C.1).
import { useRef, useState } from 'react';
import { sb } from '../../../lib/supabaseClient';
import { getMemberToken } from '../../../services/sessionTokens';
import { BRAND_ORANGE } from '../../../constants/styles';
import { Camera } from '../../../components/ui/Icons';
import useBackLayer from '../../../hooks/useBackLayer';

const OUT_SIDE = 512;
const MAX_ZOOM = 4;

export default function AvatarEditor({ ctx, TH }) {
  const { me, setMe, fire, sbConnected } = ctx;
  const fileRef = useRef(null);
  const imgRef = useRef(null);        // Image del archivo elegido
  const ptrs = useRef(new Map());     // punteros activos (pan / pinch)
  const [busy, setBusy] = useState(false);
  const [crop, setCrop] = useState(null);      // { url, w, h, V } | null
  const [t, setT] = useState(null);            // { s, min, tx, ty }
  const [closing, setClosing] = useState(false);

  const initial = (me?.name || '?').trim().charAt(0).toUpperCase();

  // ── Abrir el recortador con el archivo elegido ──
  const onFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo
    if (!file) return;
    if (!file.type.startsWith('image/')) { fire('El archivo debe ser una imagen', 'error'); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const V = Math.min(window.innerWidth - 80, 300);
      const min = Math.max(V / img.width, V / img.height);
      setCrop({ url, w: img.width, h: img.height, V });
      setT({ s: min, min, tx: (V - img.width * min) / 2, ty: (V - img.height * min) / 2 });
    };
    img.onerror = () => { URL.revokeObjectURL(url); fire('No se pudo leer la imagen', 'error'); };
    img.src = url;
  };

  const closeCrop = () => {
    setClosing(true);
    setTimeout(() => {
      if (crop) URL.revokeObjectURL(crop.url);
      imgRef.current = null; ptrs.current.clear();
      setCrop(null); setT(null); setClosing(false);
    }, 200);
  };
  useBackLayer(!!crop, closeCrop);

  // Mantener la imagen cubriendo SIEMPRE el viewport completo
  const clampT = (n) => {
    const { w, h, V } = crop;
    return {
      ...n,
      tx: Math.min(0, Math.max(V - w * n.s, n.tx)),
      ty: Math.min(0, Math.max(V - h * n.s, n.ty)),
    };
  };

  // ── Gestos: 1 puntero arrastra, 2 pellizcan (ancla en el punto medio) ──
  const onPtrDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };
  const onPtrMove = (e) => {
    const prev = ptrs.current.get(e.pointerId);
    if (!prev || !t) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const all = [...ptrs.current.entries()];
    if (all.length === 1) {
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      setT(n => clampT({ ...n, tx: n.tx + dx, ty: n.ty + dy }));
    } else {
      const [idA, a0] = all[0], [idB, b0] = all[1];
      const aN = idA === e.pointerId ? { x: e.clientX, y: e.clientY } : a0;
      const bN = idB === e.pointerId ? { x: e.clientX, y: e.clientY } : b0;
      const d0 = Math.hypot(b0.x - a0.x, b0.y - a0.y) || 1;
      const d1 = Math.hypot(bN.x - aN.x, bN.y - aN.y) || 1;
      const m0x = (a0.x + b0.x) / 2 - rect.left, m0y = (a0.y + b0.y) / 2 - rect.top;
      const m1x = (aN.x + bN.x) / 2 - rect.left, m1y = (aN.y + bN.y) / 2 - rect.top;
      ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      setT(n => {
        const s2 = Math.min(Math.max(n.s * (d1 / d0), n.min), n.min * MAX_ZOOM);
        const r = s2 / n.s;
        return clampT({ s: s2, min: n.min, tx: m1x - (m0x - n.tx) * r, ty: m1y - (m0y - n.ty) * r });
      });
    }
  };
  const onPtrEnd = (e) => { ptrs.current.delete(e.pointerId); };

  // Deslizador de zoom (ancla en el centro del viewport)
  const zoomTo = (s2) => {
    if (!t || !crop) return;
    const { V } = crop;
    setT(n => {
      const r = s2 / n.s;
      return clampT({ ...n, s: s2, tx: V / 2 - (V / 2 - n.tx) * r, ty: V / 2 - (V / 2 - n.ty) * r });
    });
  };

  // ── Confirmar: recortar el encuadre elegido y subir ──
  const confirmCrop = async () => {
    if (!crop || !t || !imgRef.current || busy) return;
    if (!sb || !sbConnected) { fire('Sin conexión', 'error'); return; }
    setBusy(true);
    try {
      const srcSide = crop.V / t.s;
      const out = Math.min(OUT_SIDE, Math.round(srcSide));
      const cv = document.createElement('canvas');
      cv.width = cv.height = out;
      const g = cv.getContext('2d');
      g.imageSmoothingQuality = 'high';
      g.drawImage(imgRef.current, -t.tx / t.s, -t.ty / t.s, srcSide, srcSide, 0, 0, out, out);
      const base64 = cv.toDataURL('image/jpeg', 0.85).split(',')[1];

      const resp = await fetch('/api/upload-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: getMemberToken()?.token ?? null, contentType: 'image/jpeg', data: base64 }),
      });
      const outR = await resp.json().catch(() => ({}));
      if (!resp.ok || !outR.url) throw new Error(outR.error || 'No se pudo subir la imagen');
      const { data, error } = await sb.rpc('update_my_profile', {
        p_session_token: getMemberToken()?.token ?? null,
        p_changes: { avatar_url: outR.url },
      });
      const errMsg = error?.message || data?.error;
      if (errMsg) {
        throw new Error(errMsg === 'invalid_session'
          ? 'Tu sesión expiró — cerrá sesión y volvé a entrar' : errMsg);
      }
      setMe(p => ({ ...p, avatar: outR.url }));
      fire('Foto de perfil actualizada', 'success');
      closeCrop();
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
        Toca para cambiar tu foto
      </div>
      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />

      {/* ── Recortador (bottom sheet): elegir el encuadre de la imagen ── */}
      {crop && t && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: closing ? 'ppFadeOut .2s ease forwards' : 'fadeIn .2s ease' }}>
          <div style={{ background: TH.isDark ? '#16161A' : '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '24px 20px 36px', animation: closing ? 'slideDownOut .22s ease forwards' : 'slideUp .25s ease' }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: TH.header, marginBottom: 4 }}>Ajusta tu foto</div>
            <div style={{ fontSize: 13, color: TH.sub, lineHeight: 1.5, marginBottom: 16 }}>
              Arrastra para encuadrar y acerca con dos dedos o el control.
            </div>

            {/* Viewport cuadrado con máscara circular (así se verá el avatar) */}
            <div
              onPointerDown={onPtrDown} onPointerMove={onPtrMove}
              onPointerUp={onPtrEnd} onPointerCancel={onPtrEnd}
              style={{
                position: 'relative', width: crop.V, height: crop.V, margin: '0 auto',
                overflow: 'hidden', borderRadius: 16, touchAction: 'none', userSelect: 'none',
                background: '#000', cursor: 'grab',
              }}>
              <img src={crop.url} alt="" draggable={false} style={{
                position: 'absolute', left: 0, top: 0, width: crop.w, maxWidth: 'none',
                transform: `translate(${t.tx}px, ${t.ty}px) scale(${t.s})`, transformOrigin: '0 0',
                pointerEvents: 'none',
              }} />
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%', pointerEvents: 'none',
                boxShadow: '0 0 0 999px rgba(0,0,0,.45)', border: '2px solid rgba(255,255,255,.9)',
              }} />
            </div>

            <input
              type="range" min={t.min} max={t.min * MAX_ZOOM} step={t.min / 50}
              value={t.s} onChange={e => zoomTo(parseFloat(e.target.value))}
              aria-label="Acercar o alejar"
              style={{ width: '100%', margin: '18px 0 16px', accentColor: BRAND_ORANGE }}
            />

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={closeCrop} disabled={busy}
                style={{ flex: 1, padding: 14, borderRadius: 14, border: 'none', background: TH.isDark ? 'rgba(255,255,255,.08)' : '#F5F5F7', color: TH.sub, fontFamily: "'DM Sans'", fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                Cancelar
              </button>
              <button onClick={confirmCrop} disabled={busy}
                style={{ flex: 2, padding: 14, borderRadius: 14, border: 'none', background: BRAND_ORANGE, color: '#fff', fontFamily: "'DM Sans'", fontWeight: 800, cursor: 'pointer', fontSize: 14, opacity: busy ? .7 : 1 }}>
                {busy ? 'Subiendo foto...' : 'Usar foto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
