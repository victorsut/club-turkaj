// src/hooks/useCountUp.js
// R1b (D35) — Anima un número hacia su valor (count-up de puntos).
// Respeta prefers-reduced-motion (salta directo al valor final).
import { useEffect, useRef, useState } from 'react';

export default function useCountUp(target, duration = 600) {
  const [val, setVal] = useState(0);
  const prevRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const t = Number(target) || 0;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const from = prevRef.current;
    prevRef.current = t;
    if (reduce || from === t) { setVal(t); return undefined; }

    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cúbico
      setVal(Math.round(from + (t - from) * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return val;
}
