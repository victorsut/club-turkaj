// src/lib/motionOrigin.js
// R1b (D35) — Helpers del container transform: capturan el punto del
// cuadro/pestaña presionado para que la ventana que abre "salga" de
// ahí (transform-origin) y al cerrar "se guarde" en el mismo lugar.

const CONT_MAX = 480; // maxWidth del contenedor de la app

// Centro del elemento presionado, en coordenadas del contenedor
// (para sheets full-screen y pantallas que ocupan el contenedor).
export function originFromEvent(e) {
  try {
    const r = e.currentTarget.getBoundingClientRect();
    const contLeft = Math.max(0, (window.innerWidth - CONT_MAX) / 2);
    return {
      x: Math.round(r.left + r.width / 2 - contLeft),
      y: Math.round(r.top + r.height / 2),
    };
  } catch { return null; }
}

// Delta del centro del elemento respecto al centro del viewport
// (para modales centrados con flex: transform-origin calc(50% + dx)).
export function centerDeltaFromEvent(e) {
  try {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      dx: Math.round(r.left + r.width / 2 - window.innerWidth / 2),
      dy: Math.round(r.top + r.height / 2 - window.innerHeight / 2),
    };
  } catch { return null; }
}
