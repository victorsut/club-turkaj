// src/components/ui/ChipScroller.jsx
// R1b.4 — Sistema de chips desplazables del FORMATO GENERAL (feedback
// 21-jul): cuando los chips no caben en una fila, se desplazan en
// horizontal SIN barra visible (clase pp-chip-scroll en global.css).
// La señal de "hay más" es un desvanecido en el borde correspondiente
// (mask-image, funciona sobre cualquier fondo — incluida la galaxia
// BLACK) + el chip cortado en el borde. Con snap suave al arrastrar.
import { useRef, useState, useEffect } from 'react';

export default function ChipScroller({ children, padding = '10px 14px 16px', gap = 7 }) {
  const ref = useRef(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const update = () => {
    const el = ref.current;
    if (!el) return;
    const left = el.scrollLeft > 4;
    const right = el.scrollLeft < el.scrollWidth - el.clientWidth - 4;
    setEdges(e => (e.left === left && e.right === right) ? e : { left, right });
  };

  useEffect(() => {
    update();
    // Re-medir cuando cambia el tamaño y tras cargar la fuente
    const el = ref.current;
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    if (el && ro) ro.observe(el);
    const t = setTimeout(update, 400);
    return () => { if (ro) ro.disconnect(); clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mask = `linear-gradient(to right, ${edges.left ? 'transparent 0, #000 28px' : '#000 0'}, ${edges.right ? '#000 calc(100% - 28px), transparent 100%' : '#000 100%'})`;

  return (
    <div ref={ref} onScroll={update} className="pp-chip-scroll" style={{
      display: 'flex', gap, padding, overflowX: 'auto',
      WebkitMaskImage: mask, maskImage: mask,
      scrollSnapType: 'x proximity',
    }}>
      {children}
    </div>
  );
}
