// src/lib/backStack.js
// Botón físico/gesto de VOLVER (Android y navegador): cada capa de UI
// abierta (ventana, modal, sheet) registra su función de cierre en una
// pila y empuja una entrada al history del navegador. Al presionar
// volver, popstate cierra la capa SUPERIOR en vez de salir de la app;
// sin capas abiertas (inicio), el volver sale de la app como siempre.
// Integración React: hooks/useBackLayer.js.
const stack = [];
let swallow = 0; // entradas de history a consumir sin cerrar capas

function onPop() {
  if (swallow > 0) { swallow--; return; }
  const top = stack.pop();
  if (top) top.close();
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', onPop);
}

// Abre una capa: se registra y agrega SU entrada al history.
export function pushLayer(close) {
  const entry = { close };
  stack.push(entry);
  try { window.history.pushState({ pp: true }, ''); } catch { /* noop */ }
  return entry;
}

// La capa se cerró por la UI (flecha, tap fuera, Entendido…): sacarla
// de la pila y consumir su entrada del history sin disparar otro cierre.
// Si ya la cerró popstate (botón volver), no está en la pila y es no-op.
export function popLayer(entry) {
  const i = stack.indexOf(entry);
  if (i < 0) return;
  stack.splice(i, 1);
  swallow++;
  try { window.history.back(); } catch { swallow--; }
}
