// src/hooks/useCountUp.js
// R1b (D35) — Anima un número hacia su valor (count-up de puntos).
// Respeta prefers-reduced-motion (salta directo al valor final).
//
// Reglas de calma (feedback del dueño 22-jul: el número "enloquecía"
// al abrir la app):
// 1. Al montar arranca EN el valor actual — sin vuelo 0→N. Al abrir la
//    app los puntos cambian varias veces seguidas (localStorage → fila
//    fresca de Supabase → bonus festivo → realtime) y cada restart se
//    veía como subidas y bajadas erráticas.
// 2. Si el objetivo cambia a media animación, continúa desde el valor
//    MOSTRADO (antes partía del objetivo anterior y el número saltaba).
// Resultado: el número solo anima cuando los puntos cambian de verdad
// con la tarjeta a la vista (compra, canje, bonus) — un deslizamiento
// suave del valor viejo al nuevo.
import { useEffect, useRef, useState } from 'react';

export default function useCountUp(target, duration = 600) {
  const initial = Number(target) || 0;
  const [val, setVal] = useState(initial);
  const shownRef = useRef(initial);   // lo que se está mostrando ahora
  const rafRef = useRef(null);

  useEffect(() => {
    const t = Number(target) || 0;
    const from = shownRef.current;
    if (from === t) return undefined;

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduce) { shownRef.current = t; setVal(t); return undefined; }

    cancelAnimationFrame(rafRef.current);
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cúbico
      const v = Math.round(from + (t - from) * eased);
      shownRef.current = v;
      setVal(v);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return val;
}
