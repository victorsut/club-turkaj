// src/hooks/useSessionGuard.js
// Ciclo de vida de las sesiones: logout manual, expiración proactiva
// (SEC.B.6.4 — sesión zombi al arrancar o al volver del reposo) y
// reactiva (SEC.B.8.2 — el server rechaza con ERRCODE 28000). Extraído
// de App.jsx en la división etapa 3 (12-ago-2026) SIN cambios de
// lógica. Devuelve logout (ctx).
import { useEffect, useCallback } from 'react';
import { sb } from '../lib/supabaseClient';
import { logoutMember, logoutOperator, logoutAdmin } from '../services';
import { getOperatorToken, getAdminToken } from '../services/sessionTokens';
import { setSessionExpiredHandler } from '../services/sessionExpiry';

export default function useSessionGuard({
  view, viewRef, fire, loggedOp, loggedAdmin,
  setMe, setGoogleStep, setMySurveyCount, setLoggedOp, setAuthScreen,
  setCScr, setCompanyPicked, setLoginPhone, setLoginPass, setAuthError,
  setAuthOp, setOScr, setAuthAdmin, setLoggedAdmin, setScr,
}) {
  const isC = view === 'client';
  const isO = view === 'operator';
  const isA = view === 'admin';

  // SEC.B.6.4: helper reutilizable para terminar una sesión de operador/admin.
  // Encapsula la revocación server-side (logoutOperator/logoutAdmin, B.6.3) +
  // el reset del estado React + el aviso. Lo invocan: (1) el logout manual con
  // reason 'cerrada', (2) el cierre proactivo de sesión expirada
  // (checkSessionAlive) con reason 'expirada', y (3) — a futuro — B.8.2 cuando
  // el server rechace con error.code 28000, también con 'expirada'.
  // El toast es un overlay fijo en el root de App (fuera del subárbol de cada
  // pantalla), así que persiste visible tras el cambio a la pantalla de login.
  // El CLIENTE no usa este helper (su sesión la maneja Supabase Auth nativo):
  // se queda en la rama isC de logout, intacta.
  const expireSession = useCallback((role, { reason } = {}) => {
    const msg = reason === 'expirada'
      ? '⏱️ Tu sesión expiró, iniciá sesión de nuevo'
      : '👋 Sesión cerrada';
    if (role === 'operator') {
      logoutOperator(); setAuthOp('login'); setLoggedOp(null); setOScr('ohome');
    } else if (role === 'admin') {
      logoutAdmin(); setAuthAdmin('login'); setLoggedAdmin(null); setScr('dash');
    }
    setAuthError(''); fire(msg);
  }, [fire]);

  const logout = useCallback(() => {
    if (sb) sb.auth.signOut({ scope: 'local' });
    setMe(null); setGoogleStep('welcome'); setMySurveyCount(0); setLoggedOp(null);
    if (isC) {
      logoutMember(); // SEC.C.1: revoca member_sessions y limpia el token
      localStorage.removeItem('ct_me'); setAuthScreen('login'); setCScr('home');
      setCompanyPicked(false); // el selector de empresa se pide de nuevo
      setLoginPhone(''); setLoginPass(''); setMe(null);
      setAuthError(''); fire('👋 Sesión cerrada');
    }
    else if (isO) expireSession('operator', { reason: 'cerrada' });
    else if (isA) expireSession('admin', { reason: 'cerrada' });
  }, [view, fire, expireSession]);

  // SEC.B.6.4: detecta la "sesión zombi" (objeto de sesión presente pero token
  // vencido) y dispara el cierre proactivo. La invocan los dos enganches de la
  // Parte 3: el arranque de la app y el evento visibilitychange.
  //
  // Lee viewRef.current (NO `view`): el listener de visibilidad se registra una
  // vez y capturaría un `view` stale; viewRef.current siempre tiene el rol
  // vigente (el codebase ya usa este patrón en el efecto de auth).
  //
  // CONDICIÓN CONJUNTA por rol — "objeto de sesión presente Y token vivo null":
  //   - getOperatorToken()/getAdminToken() devuelven null si el token venció
  //     (y de paso auto-limpian su clave, sessionTokens.js).
  //   - Solo el caso MIXTO (loggedOp/loggedAdmin truthy + token null) = zombi.
  //   - Ambos presentes = sesión sana → no tocar.
  //   - Ninguno presente = ya deslogueado → no tocar.
  const checkSessionAlive = useCallback(() => {
    const role = viewRef.current;
    if (role === 'operator') {
      if (loggedOp && getOperatorToken() === null) {
        expireSession('operator', { reason: 'expirada' });
      }
    } else if (role === 'admin') {
      if (loggedAdmin && getAdminToken() === null) {
        expireSession('admin', { reason: 'expirada' });
      }
    }
    // role === 'client' (o cualquier otro valor): no-op deliberado.
  }, [loggedOp, loggedAdmin, expireSession]);

  // SEC.B.6.4 — Enganche 1: chequeo al MONTAR (corre una vez). Cubre el caso
  // "el operador vuelve al día siguiente y abre/recarga la app": al arrancar,
  // loggedOp/loggedAdmin se siembran de localStorage y, si el token venció,
  // checkSessionAlive lo manda al login limpio en vez de dejar la sesión zombi.
  useEffect(() => { checkSessionAlive(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // SEC.B.6.4 — Enganche 2: listener de visibilitychange (patrón idéntico al de
  // ClientHome.jsx). Cubre el caso "la app quedó abierta, el dispositivo entró
  // en reposo, el operador enciende la pantalla al día siguiente".
  //
  // El efecto DEPENDE de checkSessionAlive: cuando loggedOp/loggedAdmin cambian
  // (p.ej. el operador inicia sesión DESPUÉS del arranque), checkSessionAlive se
  // recrea, el cleanup quita el handler viejo (que cerraba sobre loggedOp stale)
  // y se registra uno nuevo con los valores frescos. Sin esta dependencia, un
  // listener registrado una sola vez con [] capturaría el loggedOp=null del
  // primer render y nunca detectaría la zombi de una sesión iniciada después.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      checkSessionAlive();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [checkSessionAlive]);

  // SEC.B.8.2: handler del rechazo reactivo de sesión. Lo dispara la capa de
  // servicios (notifySessionExpired) cuando una RPC sensible rechaza con
  // ERRCODE 28000 (B.8.1). Reutiliza expireSession de B.6.4 (logout + redirect
  // al login + aviso "Tu sesión expiró"). El rol sale de viewRef.current (no de
  // un closure ni de un parámetro): resuelve el doble vector de
  // buy_raffle_tickets sin tocar firmas. Cliente = no-op redundante (nunca
  // recibe 28000: su único flujo que toca el helper es la rama 1a, sin RAISE).
  const handleSessionExpired = useCallback(() => {
    const role = viewRef.current;
    if (role === 'operator') {
      expireSession('operator', { reason: 'expirada' });
    } else if (role === 'admin') {
      expireSession('admin', { reason: 'expirada' });
    }
    // role === 'client' (o cualquier otro): no-op deliberado.
  }, [expireSession]);

  // SEC.B.8.2: registra el handler en el singleton sessionExpiry al montar y lo
  // limpia en el cleanup. Dep [handleSessionExpired]: si su identidad cambia
  // (cambiaría si expireSession cambiara, que depende de fire), se re-registra
  // la versión fresca — mismo razonamiento de stale closure que B.6.4. En la
  // práctica fire/expireSession son estables, así que registra una vez.
  useEffect(() => {
    setSessionExpiredHandler(handleSessionExpired);
    return () => setSessionExpiredHandler(null);
  }, [handleSessionExpired]);

  return { logout };
}
