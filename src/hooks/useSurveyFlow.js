// src/hooks/useSurveyFlow.js
// Flujo de la Encuesta de Satisfacción (extraído VERBATIM de ClientHome
// en la división 14-ago): encuesta pendiente persistida en localStorage
// pp_survey_pending, reclamo de puntos y modal de resultado.
//
// La espera se asume completada tras SURVEY_WAIT segundos en la página
// de Shell (el cliente NO ve el tiempo — sin contadores). Compartida
// entre SurveyStationsModal y OpRatingModal (paso 2). Persiste en
// localStorage: en móvil el SO suele RECARGAR la PWA mientras el
// cliente pasa el tiempo en Shell; sin persistencia el estado moría y
// los puntos nunca se otorgaban.
import { useState, useEffect, useRef, useCallback } from 'react';
import { SURVEY_WAIT } from '../constants/config';

export default function useSurveyFlow({ me, doSurvey, setShowSurveys }) {
  const [surveyPending, setSurveyPendingState] = useState(() => {
    try {
      const p = JSON.parse(localStorage.getItem('pp_survey_pending'));
      return (p && typeof p.openedAt === 'number') ? p : null;
    } catch { return null; }
  }); // { openedAt, stationName }
  const setSurveyPending = useCallback((p) => {
    setSurveyPendingState(p);
    try {
      if (p) localStorage.setItem('pp_survey_pending', JSON.stringify(p));
      else localStorage.removeItem('pp_survey_pending');
    } catch { /* storage no disponible (in-app browsers) */ }
  }, []);

  // Resultado de la encuesta — modal PERSISTENTE (14-ago): el toast se
  // perdía cuando la recarga de la PWA reclamaba los puntos durante el
  // boot, y el cliente nunca veía confirmación (reporte del dueño).
  const [surveyResult, setSurveyResult] = useState(null);
  const claimSurvey = useCallback(async () => {
    const res = await doSurvey();
    if (res?.ok) setSurveyResult({
      type: 'success', pts: res.pts, count: res.count,
      limit: res.limit, bonus: res.bonusTicket,
    });
    // Error de RPC/conexión: doSurvey ya disparó su toast de error.
  }, [doSurvey]);

  // Resolución de la espera — NO depende de un único evento (14-ago):
  // en la app instalada (TWA) volver de la pestaña de Shell NO dispara
  // visibilitychange (la página nunca se marcó hidden) y el reclamo
  // quedaba congelado hasta cambiar de app y volver. Tres vías:
  //  · visibilitychange→visible: reclama o CANCELA por vuelta temprana
  //    (única señal confiable de "el cliente volvió antes de tiempo");
  //  · focus + intervalo de 1s (suspendido por el SO en background,
  //    despierta al volver): SOLO reclaman al cumplirse el tiempo —
  //    sin señal de visibilidad no se puede saber si volvió antes,
  //    así que la espera simplemente corre hasta otorgar los puntos.
  useEffect(() => {
    if (!surveyPending) return;
    let done = false;
    const resolve = (allowEarlyCancel) => {
      if (done) return;
      const elapsed = Math.floor((Date.now() - surveyPending.openedAt) / 1000);
      if (elapsed >= SURVEY_WAIT) {
        done = true;
        setSurveyPending(null);
        setShowSurveys(false);
        claimSurvey();
      } else if (allowEarlyCancel) {
        done = true;
        setSurveyPending(null);
        setShowSurveys(false);
        setSurveyResult({ type: 'early' });
      }
    };
    const onVis = () => { if (document.visibilityState === 'visible') resolve(true); };
    const onFocus = () => resolve(false);
    const iv = setInterval(() => {
      if (document.visibilityState === 'visible') resolve(false);
    }, 1000);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(iv);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onFocus);
    };
  }, [surveyPending, claimSurvey, setShowSurveys, setSurveyPending]);

  // Resolución al montar (con la sesión ya lista): si la PWA se recargó
  // mientras el cliente estaba en Shell, la encuesta RESTAURADA (la que
  // existía en el primer render — nunca una recién creada por un tap)
  // SIEMPRE se resuelve: puntos si cumplió el tiempo, modal de "no
  // completada" si volvió antes. Nunca queda una espera atascada en
  // silencio (causa del reporte del 14-ago).
  // No espera sbConnected (el fin del boot COMPLETO tardaba varios
  // segundos): basta la sesión del miembro — el RPC no necesita el
  // resto de los datos del boot.
  const resumeSurveyRef = useRef(surveyPending);
  useEffect(() => {
    const p = resumeSurveyRef.current;
    if (!p || !me?.id || me.id.startsWith('temp-')) return;
    resumeSurveyRef.current = null; // una sola vez
    if (surveyPending !== p) return; // ya la resolvió el handler de visibilidad
    const elapsed = Math.floor((Date.now() - p.openedAt) / 1000);
    setSurveyPending(null);
    setShowSurveys(false);
    if (elapsed >= SURVEY_WAIT) claimSurvey();
    else setSurveyResult({ type: 'early' });
  }, [surveyPending, me?.id, claimSurvey, setShowSurveys, setSurveyPending]);

  return { surveyPending, setSurveyPending, surveyResult, setSurveyResult };
}
