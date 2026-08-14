// src/views/client/home/SurveyStationsModal.jsx
// Modal de la Encuesta de Satisfacción: selección de estación (marca la
// del último consumo), lanzamiento de la encuesta Shell y estado de
// espera SIN contador visible (el cliente no debe saber que basta
// esperar SURVEY_WAIT). Extraído VERBATIM de ClientHome (división
// 14-ago) — la resolución de la espera vive en useSurveyFlow.
import GrowModal from '../../../components/ui/GrowModal';
import { bento } from '../../../constants/styles';
import { SHELL_SURVEYS } from '../../../constants/config';
import { Fuel, Pin, Clock, Chev } from '../../../components/ui/Icons';

export default function SurveyStationsModal({
  onClose, origin, tint, dark, hp, cfg, mySurveyCount,
  myActs, meStation, stations, surveyPending, setSurveyPending,
}) {
  return (
    <GrowModal onClose={onClose} origin={origin} tint={tint}
      background={dark ? '#101018' : '#fff'} maxHeight="88vh"
      arrowColor={hp.surveyInk}>
      {(close) => (<>
        {/* Banda de identidad (mismo formato del modal de nivel —
            color del cuadro Encuesta según el nivel, con su tinta,
            centrada — referencia colores inicio) */}
        <div style={{ background: hp.survey, color: hp.surveyInk, padding: '22px 20px 18px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.85 }}>
            Califica nuestro servicio
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2, letterSpacing: 0.3 }}>
            Encuesta de Satisfacción
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.9, marginTop: 2 }}>
            {mySurveyCount}/{cfg.surveyDaily} hoy · +{cfg.surveyPts} pts por encuesta
          </div>
        </div>

        <div style={{ padding: '14px 20px 20px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: dark ? 'rgba(255,255,255,.5)' : '#6E6E73', textAlign: 'center', marginBottom: 12 }}>
          Seleccioná la estación donde cargaste combustible
        </div>

        {(() => {
          // Estación del ÚLTIMO CONSUMO (D34). Fuente: activity_log
          // (la última 'compra' con estación, ya ordenado DESC) — NO
          // me.station: viene de members.last_station, columna que
          // register_purchase nunca actualiza y quedaba stale
          // (marcaba Turkaj III con el último consumo en Turkaj II).
          const lastAct = myActs.find(a => a.type === 'compra' && a.station);
          const raw = lastAct?.station || meStation || '';
          const fromId = (stations || []).find(st => st.id === raw)?.name || '';
          const lastName = fromId || raw;

          return SHELL_SURVEYS.map((s) => {
            const isLast = lastName && lastName === s.name;
            const waitingThis = surveyPending?.stationName === s.name;
            return (
            <div key={s.name}
              onClick={() => {
                if (surveyPending) return; // already waiting
                window.open(s.url, '_blank');
                setSurveyPending({ openedAt: Date.now(), stationName: s.name });
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '13px 12px', marginBottom: 8, borderRadius: 16,
                cursor: surveyPending ? 'default' : 'pointer',
                opacity: surveyPending ? (waitingThis ? 1 : 0.4) : 1,
                background: isLast
                  ? (dark ? 'rgba(217,164,11,.14)' : '#FAF1DC')
                  : (dark ? 'rgba(255,255,255,.05)' : '#F5F5F7'),
                transition: 'transform .15s',
              }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                background: bento.amber, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Fuel />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 15, fontWeight: 800,
                  color: dark ? '#E0E0E0' : '#0D0D0D',
                }}>
                  {s.name}
                </div>
                {isLast && (
                  <div style={{
                    fontSize: 10, fontWeight: 800, marginTop: 3,
                    color: dark ? '#FFD54F' : '#B58000',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <Pin /> Última visita
                  </div>
                )}
              </div>
              {/* CTA: círculo negro con chevron (formato del banner de
                  Promociones); esperando → círculo ámbar con reloj */}
              <div style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                background: waitingThis ? bento.amber : (dark ? '#fff' : '#0D0D0D'),
                color: waitingThis ? '#fff' : (dark ? '#0D0D0D' : '#fff'),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {waitingThis ? <Clock /> : <Chev />}
              </div>
            </div>
          );
          });
        })()}

        {/* Pending survey: esperando el regreso de Shell — SIN
            contador visible (el cliente no debe saber que basta
            esperar SURVEY_WAIT) */}
        {surveyPending && (
          <div style={{
            background: dark ? 'rgba(217,164,11,.14)' : '#FAF1DC',
            borderRadius: 16, padding: 16, marginBottom: 8, textAlign: 'center',
          }}>
            <div style={{
              fontSize: 13, fontWeight: 700, marginBottom: 6,
              color: dark ? '#FFD54F' : '#B58000',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <Clock /> Completá la encuesta de {surveyPending.stationName}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: dark ? 'rgba(255,255,255,.5)' : '#6E6E73', marginTop: 4 }}>
              Respondé todas las preguntas en la página de Shell · Tus puntos se asignan al terminar
            </div>
          </div>
        )}

        {/* Sin botón "Cerrar": la salida es la flecha del GrowModal.
            Con encuesta pendiente queda "Cancelar" para abortarla. */}
        {surveyPending && (
          <button onClick={() => { setSurveyPending(null); close(); }} style={{
            width: '100%', marginTop: 8, padding: 14, borderRadius: 14,
            background: dark ? 'rgba(255,255,255,.08)' : '#F5F5F7',
            border: 'none',
            fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 700,
            color: dark ? '#ccc' : '#424242',
            cursor: 'pointer',
          }}>
            Cancelar
          </button>
        )}
        </div>
      </>)}
    </GrowModal>
  );
}
