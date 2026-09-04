// src/hooks/useSwipeTrack.js
// Carrusel que SIGUE AL DEDO (nacido en Vehículos el 3-sep-2026 y
// compartido con la Rifa el 4-sep): el carril lleva translateX(-idx*100%)
// y durante el arrastre suma los px del dedo; el eje se decide tras 8 px
// (touch-action: pan-y deja el scroll vertical al navegador), hay
// resistencia 0.35 en los extremos y al soltar >60 px (o >20 px con
// velocidad) encaja con rebote suave — si no, vuelve a su sitio.
// `dirRef` (+1 siguiente / −1 anterior) queda disponible para que la
// información de abajo entre desde la dirección del cambio (slideIn).
import { useEffect, useRef } from 'react';

export const SNAP_EASE = 'cubic-bezier(.32,1.2,.4,1)';

export default function useSwipeTrack({ count, idx, setIdx }) {
  const trackRef = useRef(null);
  const dirRef = useRef(1);
  const touch = useRef(null);

  const setTrack = (dxPx, animate) => {
    const el = trackRef.current; if (!el) return;
    el.style.transition = animate ? `transform .42s ${SNAP_EASE}` : 'none';
    el.style.transform = `translateX(calc(${-idx * 100}% + ${dxPx}px))`;
  };
  const onTouchStart = (e) => {
    touch.current = { x0: e.touches[0].clientX, y0: e.touches[0].clientY, t0: Date.now(), axis: null, dx: 0 };
  };
  const onTouchMove = (e) => {
    const t = touch.current; if (!t) return;
    const dx = e.touches[0].clientX - t.x0, dy = e.touches[0].clientY - t.y0;
    if (!t.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      t.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (t.axis !== 'x') return;
    // resistencia en los extremos (no hay más tarjetas hacia ese lado)
    const atEdge = (dx > 0 && idx === 0) || (dx < 0 && idx === count - 1);
    t.dx = atEdge ? dx * 0.35 : dx;
    setTrack(t.dx, false);
  };
  const onTouchEnd = () => {
    const t = touch.current; touch.current = null;
    if (!t || t.axis !== 'x') return;
    const v = Math.abs(t.dx) / Math.max(1, Date.now() - t.t0); // px/ms
    const step = (Math.abs(t.dx) > 60 || (Math.abs(t.dx) > 20 && v > 0.5)) ? (t.dx < 0 ? 1 : -1) : 0;
    const next = Math.max(0, Math.min(count - 1, idx + step));
    if (next === idx) { setTrack(0, true); return; }
    dirRef.current = step;
    setIdx(next);
  };
  // al cambiar idx (gesto, puntos, flechas o foco) el carril encaja animado
  useEffect(() => { setTrack(0, true); }, [idx]);

  // ir a un índice fijando la dirección (puntos / flechas)
  const go = (i) => {
    const next = Math.max(0, Math.min(count - 1, i));
    if (next === idx) return;
    dirRef.current = next > idx ? 1 : -1;
    setIdx(next);
  };

  return {
    trackRef, dirRef, go,
    handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd },
    // contenedor: recorte + el navegador se queda el scroll vertical
    viewportStyle: { overflow: 'hidden', touchAction: 'pan-y' },
    trackStyle: { display: 'flex', willChange: 'transform', transform: `translateX(${-idx * 100}%)` },
    // tarjeta activa a escala completa; vecinas atrás y atenuadas
    slideStyle: (i) => ({
      minWidth: '100%', boxSizing: 'border-box',
      transform: i === idx ? 'scale(1)' : 'scale(.93)',
      opacity: i === idx ? 1 : .55,
      transition: `transform .42s ${SNAP_EASE}, opacity .35s ease`,
    }),
  };
}

// La INFORMACIÓN entra desde la dirección del cambio (Web Animations API
// sobre nodos vivos — sin remontar). `els` = nodos (los null se ignoran);
// cada uno con retraso escalonado `stagger` ms a partir de `delay`.
export function slideIn(els, dir, { delay = 0, stagger = 45, duration = 380, scale = true } = {}) {
  const from = `${dir * 28}px`;
  els.filter(Boolean).forEach((el, i) => el.animate(
    [{ opacity: 0, transform: `translateX(${from})${scale ? ' scale(.96)' : ''}` }, { opacity: 1, transform: 'none' }],
    { duration, delay: delay + i * stagger, easing: SNAP_EASE, fill: 'backwards' },
  ));
}
