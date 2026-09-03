// src/components/ui/BottomSheet.jsx
// Hoja inferior con APERTURA y CIERRE animados (3-sep-2026, pedido del
// dueño para las hojas de Vehículos): entra con slideUp con leve rebote,
// sale con slideDownOut + fundido del fondo, y se puede ARRASTRAR hacia
// abajo para cerrarla (sigue el dedo cuando el contenido está arriba del
// todo; suelta >120 px o con velocidad → se va; si no, rebota). Tocar
// fuera y el botón físico de volver cierran con la misma animación.
// Uso: <BottomSheet dark onClose={fn}>{(close) => ...}</BottomSheet>
//   · close()      cierra animado y luego llama onClose
//   · close(cb)    cierra animado y luego llama cb (ej. onSaved)
import { useEffect, useRef, useState } from 'react';
import useBackLayer from '../../hooks/useBackLayer';

const CLOSE_MS = 220;

export default function BottomSheet({ dark, onClose, maxWidth = 480, maxHeight = '92vh', padding = '18px 20px 28px', children }) {
  const panel = useRef(null);
  const back = useRef(null);
  const [closing, setClosing] = useState(false);
  const done = useRef(false);
  const drag = useRef(null); // { y0, t0, canDrag, dy }

  // cierre por botón/tap fuera/volver: animación CSS + callback al terminar
  const close = (cb) => {
    if (done.current) return;
    done.current = true;
    setClosing(true);
    setTimeout(() => (typeof cb === 'function' ? cb : onClose)?.(), CLOSE_MS);
  };
  useBackLayer(true, () => close());

  // ── arrastre para cerrar ──
  const onTouchStart = (e) => {
    const el = panel.current;
    if (!el || done.current) return;
    drag.current = { y0: e.touches[0].clientY, t0: Date.now(), canDrag: el.scrollTop <= 0, dy: 0 };
    el.style.transition = 'none';
  };
  const onTouchEnd = () => {
    const d = drag.current; drag.current = null;
    const el = panel.current, bk = back.current;
    if (!d || !el || done.current) return;
    const v = d.dy / Math.max(1, Date.now() - d.t0); // px/ms
    if (d.dy > 120 || (d.dy > 40 && v > 0.6)) {
      // se va desde donde quedó (sin la animación de teclas: continuidad del gesto)
      done.current = true;
      el.style.transition = 'transform .2s ease-in';
      el.style.transform = 'translateY(105%)';
      if (bk) { bk.style.transition = 'opacity .2s ease-in'; bk.style.opacity = '0'; }
      setTimeout(() => onClose?.(), 200);
      return;
    }
    el.style.transition = 'transform .28s cubic-bezier(.32,1.2,.4,1)';
    el.style.transform = '';
    if (bk) { bk.style.transition = 'opacity .25s ease-out'; bk.style.opacity = ''; }
  };
  useEffect(() => {
    // touchmove NO pasivo: hay que frenar el scroll/pull-to-refresh de la
    // página mientras la hoja sigue al dedo (React registra touchmove pasivo)
    const el = panel.current;
    if (!el) return undefined;
    const onMove = (e) => {
      const d = drag.current;
      if (!d || !d.canDrag || done.current) return;
      const dy = e.touches[0].clientY - d.y0;
      if (dy <= 0) { d.dy = 0; el.style.transform = ''; return; }
      d.dy = dy;
      el.style.transform = `translateY(${dy}px)`;
      if (back.current) back.current.style.opacity = String(Math.max(0, 1 - dy / 420));
      if (e.cancelable) e.preventDefault();
    };
    el.addEventListener('touchmove', onMove, { passive: false });
    return () => el.removeEventListener('touchmove', onMove);
  }, []);

  return (
    <div ref={back} onClick={() => close()} style={{
      position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.55)',
      backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      animation: closing ? `ppFadeOut ${CLOSE_MS}ms ease-in forwards` : 'ppFade .25s ease-out',
    }}>
      <div ref={panel} onClick={e => e.stopPropagation()} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd} style={{
        width: '100%', maxWidth, maxHeight, overflowY: 'auto', overscrollBehavior: 'contain',
        background: dark ? '#141417' : '#fff', borderRadius: '24px 24px 0 0', padding,
        boxSizing: 'border-box', willChange: 'transform',
        animation: closing ? `slideDownOut ${CLOSE_MS}ms ease-in forwards` : 'slideUp .32s cubic-bezier(.32,1.2,.4,1)',
      }}>
        <div aria-hidden style={{ width: 44, height: 5, borderRadius: 3, background: dark ? 'rgba(255,255,255,.2)' : '#E0E0E0', margin: '0 auto 14px' }} />
        {typeof children === 'function' ? children(close) : children}
      </div>
    </div>
  );
}
