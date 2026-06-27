// ============================================================
// Club Turkaj / Puntos+ — Session Expiry Bridge (SEC.B.8.2)
// ============================================================
// Puente mínimo entre la capa de SERVICIOS (rpcServices.js, que
// detecta el rechazo de sesión del server con ERRCODE 28000) y la
// capa de REACT (App.jsx, que tiene expireSession: logout + redirect
// al login + aviso). Los servicios son puros y no conocen React;
// este singleton invierte la dependencia.
//
// FLUJO: App.jsx registra su handler con setSessionExpiredHandler al
// montar (y lo desregistra en cleanup). Cuando una RPC sensible
// rechaza con 28000 (B.8.1), el servicio llama notifySessionExpired()
// y el handler registrado dispara expireSession en la capa React.
//
// notifySessionExpired() es no-op silencioso si no hay handler
// registrado (p.ej. una llamada antes del montaje): nunca rompe.
// ============================================================

let handler = null;

/**
 * Registra (o limpia, con null) el handler que se ejecuta cuando el
 * server rechaza una sesión con ERRCODE 28000. Lo setea App.jsx.
 * @param {Function|null} fn
 */
export function setSessionExpiredHandler(fn) {
  handler = fn;
}

/**
 * Avisa que el server rechazó la sesión (28000). Invoca el handler
 * registrado si existe; si no, no-op silencioso (no rompe).
 */
export function notifySessionExpired() {
  if (handler) handler();
}
