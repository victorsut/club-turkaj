// src/components/OpRatingModal.jsx
// Modal post-compra en el dispositivo del cliente (Realtime INSERT de
// purchases): paso 1 califica al operador con estrellas; paso 2 invita
// a la Encuesta de Satisfacción de Shell de la estación de ESA compra.
// La encuesta reutiliza el flujo del home (surveyPending + timer 90s
// viven en ClientHome; acá solo se lanza y se muestra el countdown —
// al volver de Shell, el handler de visibilidad de ClientHome otorga
// los puntos o cancela, y este modal se cierra solo).
import { useState, useEffect, useRef, useCallback } from 'react';
import { sb } from '../lib/supabaseClient';
import { bento, BRAND_ORANGE } from '../constants/styles';
import { SHELL_SURVEYS, SURVEY_WAIT } from '../constants/config';
import { Fuel, Pin, Clock, StarRate } from './ui/Icons';
import { SurveyIcon } from './ui/BentoIcons';
import LogoSpinner from './ui/LogoSpinner';
import { firstName } from '../lib/text';

export default function OpRatingModal({
  data, onClose, dark, memberId, sbConnected, fire,
  cfg, mySurveyCount, accent, accentInk,
  surveyPending, setSurveyPending, surveyCountdown,
}) {
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState('rate'); // 'rate' | 'survey'
  const [closing, setClosing] = useState(false);
  const launchedRef = useRef(false);

  // D35: el modal cierra con la animación INVERSA a la apertura
  // (fadeUpOut) antes de desmontar — todos los caminos de salida
  // (Omitir, Ahora no, Cancelar, auto-cierre) pasan por acá.
  const close = useCallback(() => {
    setClosing(prev => {
      if (!prev) setTimeout(onClose, 200);
      return true;
    });
  }, [onClose]);

  // Encuesta de la estación de ESTA compra (llave: stations.name)
  const surveyTarget = SHELL_SURVEYS.find(s => s.name === data.stationName);
  const canInvite = !!surveyTarget && mySurveyCount < cfg.surveyDaily && !surveyPending;

  const submitRating = useCallback(async (starCount) => {
    if (starCount < 1 || saving) return;
    setSaving(true);
    if (sb && sbConnected) {
      const { error } = await sb.from('operator_ratings').insert({
        operator_id: data.operatorId,
        member_id: memberId,
        stars: starCount,
      });
      if (error) console.error('[Rating]', error);
      else fire(`¡Gracias! Calificación enviada: ${starCount}/5`, 'success');
    }
    setSaving(false);
    if (canInvite) setStep('survey');
    else close();
  }, [saving, sbConnected, data.operatorId, memberId, fire, canInvite, close]);

  const startSurvey = () => {
    if (!surveyTarget || surveyPending) return;
    launchedRef.current = true;
    window.open(surveyTarget.url, '_blank');
    setSurveyPending({ openedAt: Date.now(), stationName: surveyTarget.name });
  };

  // Al volver de Shell, el handler de visibilidad de ClientHome resuelve
  // surveyPending (puntos o cancelación, con sus toasts) → cerrar acá.
  useEffect(() => {
    if (step === 'survey' && launchedRef.current && !surveyPending) close();
  }, [step, surveyPending, close]);

  const subTxt = dark ? 'rgba(255,255,255,.5)' : '#6E6E73';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
      zIndex: 250, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
      animation: closing ? 'fadeUpOut .2s ease forwards' : 'fadeUp .3s ease',
    }}>
      <div style={{
        background: dark ? '#101018' : '#fff',
        borderRadius: 24, maxWidth: 360, width: '100%', padding: '28px 24px',
        textAlign: 'center',
      }}>
        {saving ? (
          /* Saving state */
          <div style={{ padding: '24px 0', display: 'flex', justifyContent: 'center' }}>
            <LogoSpinner size={44} dark={dark} label="Enviando calificación..." />
          </div>
        ) : step === 'rate' ? (
          <>
            {/* Header: surtidor blanco en cuadro verde sólido */}
            <div style={{
              width: 56, height: 56, borderRadius: 16, margin: '0 auto 12px',
              background: bento.green, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Fuel />
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: dark ? '#fff' : '#0D0D0D', marginBottom: 6 }}>
              ¡Compra registrada!
            </div>

            {/* PROMO-1: puntos de la compra + promo aplicada (llega por
                fetchPurchasePromo tras el INSERT Realtime) */}
            {data.points != null && (
              <div style={{ fontSize: 16, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: dark ? '#7CD98F' : bento.green, marginBottom: data.promo ? 8 : 6 }}>
                +{data.points} pts
                {data.amount != null && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#9E9E9E' }}> · Q{+data.amount}</span>
                )}
              </div>
            )}
            {data.promo && (
              <div style={{
                display: 'inline-block', padding: '8px 14px', borderRadius: 12,
                background: dark ? 'rgba(217,164,11,.18)' : '#FAF1DC',
                fontSize: 12.5, fontWeight: 700, marginBottom: 10,
                color: dark ? '#FFD54F' : '#B58000',
              }}>
                {data.promo.effectType === 'grant_reward' ? (
                  // PROMO-1b: premio regalado — ya está en tus canjes
                  <>{data.promo.name} · ¡{data.promo.rewardName} gratis!
                    <div style={{ fontSize: 10.5, fontWeight: 700, opacity: .85, marginTop: 2 }}>
                      Ya está en tus canjes pendientes — retiralo en estación
                    </div>
                  </>
                ) : (
                  <>{data.promo.name}
                    {data.promo.effectType === 'points_multiplier' && ` x${+data.promo.effectValue}`}
                    {' '}· +{data.promo.extraPoints} pts extra
                  </>
                )}
              </div>
            )}

            <div style={{ fontSize: 12, fontWeight: 600, color: '#9E9E9E', marginBottom: 2 }}>
              Fuiste atendido por
            </div>
            <div style={{
              fontSize: 20, fontWeight: 800, marginBottom: 2,
              color: dark ? '#fff' : '#0D0D0D',
            }}>
              {firstName(data.operatorName) || 'Operador'}
            </div>
            {data.stationName && (
              <div style={{ fontSize: 12, fontWeight: 600, color: '#9E9E9E', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <Pin /> {data.stationName}
              </div>
            )}

            {/* Stars — tap to rate and auto-submit */}
            <div style={{ fontSize: 13.5, fontWeight: 700, color: dark ? '#E0E0E0' : '#424242', marginBottom: 12 }}>
              Calificá la atención
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 18 }}>
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => submitRating(s)} aria-label={`${s} estrellas`} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: bento.amber, padding: 2, lineHeight: 0,
                  transition: 'transform .1s',
                }}>
                  <StarRate size={36} />
                </button>
              ))}
            </div>

            {/* Skip */}
            <button onClick={close} style={{
              width: '100%', padding: 12, borderRadius: 14,
              background: 'none', border: 'none',
              fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 600,
              color: '#9E9E9E', cursor: 'pointer',
            }}>
              Omitir
            </button>
          </>
        ) : (
          <>
            {/* Paso 2 — invitación a la encuesta Shell de la estación de
                la compra (color del cuadro Encuesta según el nivel) */}
            <div style={{
              width: 56, height: 56, borderRadius: 16, margin: '0 auto 12px',
              background: accent, color: accentInk,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <SurveyIcon size={30} color={accentInk} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: dark ? '#fff' : '#0D0D0D', marginBottom: 6 }}>
              ¡Gracias por tu calificación!
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: subTxt, lineHeight: 1.55, marginBottom: 14 }}>
              Contale a Shell cómo fue el servicio que recibiste en la
              Encuesta de Satisfacción oficial y ganá{' '}
              <strong style={{ color: dark ? '#7CD98F' : bento.green }}>+{cfg.surveyPts} pts</strong>.
            </div>

            {/* Estación de la compra */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontSize: 13, fontWeight: 800, marginBottom: 18,
              color: dark ? '#E0E0E0' : '#0D0D0D',
            }}>
              <Pin /> {surveyTarget.name}
            </div>

            {surveyPending ? (
              <>
                {/* Countdown — mismo bloque ámbar del modal de encuestas */}
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
                  <div style={{ fontSize: 28, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: dark ? '#fff' : '#0D0D0D' }}>
                    {Math.floor(surveyCountdown / 60)}:{String(surveyCountdown % 60).padStart(2, '0')}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: subTxt, marginTop: 4 }}>
                    Permanecé en la página de Shell · Los puntos se asignan al volver
                  </div>
                  <div style={{ height: 4, borderRadius: 2, overflow: 'hidden', background: dark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.06)', marginTop: 10 }}>
                    <div style={{
                      height: '100%', borderRadius: 2, transition: 'width 1s linear',
                      width: `${((SURVEY_WAIT - surveyCountdown) / SURVEY_WAIT) * 100}%`,
                      background: bento.amber,
                    }} />
                  </div>
                </div>
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
              </>
            ) : (
              <>
                <button onClick={startSurvey} style={{
                  width: '100%', padding: 15, borderRadius: 14, border: 'none',
                  background: BRAND_ORANGE, color: '#fff',
                  fontFamily: "'DM Sans'", fontSize: 15, fontWeight: 800,
                  cursor: 'pointer',
                }}>
                  Responder encuesta
                </button>
                <button onClick={close} style={{
                  width: '100%', marginTop: 6, padding: 12, borderRadius: 14,
                  background: 'none', border: 'none',
                  fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 600,
                  color: '#9E9E9E', cursor: 'pointer',
                }}>
                  Ahora no
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
