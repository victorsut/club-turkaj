// src/components/OpRatingModal.jsx
// Modal post-compra en el dispositivo del cliente (Realtime INSERT de
// purchases): paso 1 califica al operador con estrellas; paso 2 invita
// a la Encuesta de Satisfacción de Shell de la estación de ESA compra.
// La encuesta reutiliza el flujo del home (surveyPending + espera
// SURVEY_WAIT viven en ClientHome; acá solo se lanza y se muestra el
// estado de espera SIN contador visible — al volver de Shell, el
// handler de visibilidad de ClientHome otorga los puntos o cancela,
// y este modal se cierra solo).
import { useState, useEffect, useRef, useCallback } from 'react';
import { sb } from '../lib/supabaseClient';
import { bento, BRAND_ORANGE } from '../constants/styles';
import { SHELL_SURVEYS } from '../constants/config';
import { Fuel, Pin, Clock, StarRate } from './ui/Icons';
import { SurveyIcon } from './ui/BentoIcons';
import LogoSpinner from './ui/LogoSpinner';
import { firstName } from '../lib/text';
import { rateOperatorSecure } from '../services/secureReads';
import { listMyVehicles, assignPurchaseVehicle } from '../services/vehicleService';
import { VEHICLE_TYPES } from './ui/VehicleIcons';

export default function OpRatingModal({
  data, onClose, dark, memberId, sbConnected, fire,
  cfg, mySurveyCount, accent, accentInk,
  surveyPending, setSurveyPending,
}) {
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState('rate'); // 'rate' | 'survey'
  const [closing, setClosing] = useState(false);
  const launchedRef = useRef(false);

  // ── F6 E2: asignación de la carga a un vehículo + odómetro ──
  // El server ya la auto-asignó al PRINCIPAL (trigger); acá el cliente
  // la confirma/cambia y opcionalmente reporta el km. Solo si el socio
  // tiene vehículos (rollout a todos el 4-sep: ya no hay beta).
  const [vehOpts, setVehOpts] = useState(null);   // null | vehículos del miembro
  const [vehSel, setVehSel] = useState(null);     // id elegido
  const [kmText, setKmText] = useState('');
  const vehInitial = useRef(null);                // id auto-asignado (principal)
  const vehSent = useRef(false);                  // la asignación ya se envió
  useEffect(() => {
    if (!sbConnected || !data.purchaseId) return;
    let alive = true;
    listMyVehicles().then(({ data: res }) => {
      if (!alive || !res?.ok || !(res.vehicles || []).length) return;
      setVehOpts(res.vehicles);
      vehInitial.current = res.vehicles[0].id; // orden del server: principal primero
      setVehSel(res.vehicles[0].id);
    });
    return () => { alive = false; };
  }, [sbConnected, data.purchaseId]);

  // Envía la asignación UNA vez si hay algo que decir: vehículo distinto
  // del auto-asignado o lectura de odómetro. Fire-and-forget (no bloquea
  // el cierre); errores solo a consola (p. ej. compra >7 días).
  const flushVehicle = useCallback(() => {
    if (vehSent.current || !vehSel || !data.purchaseId) return;
    const km = /^\d{1,7}$/.test(kmText.trim()) ? parseInt(kmText.trim(), 10) : null;
    if (vehSel === vehInitial.current && km == null) return;
    vehSent.current = true;
    assignPurchaseVehicle({ purchaseId: data.purchaseId, vehicleId: vehSel, km })
      .then(({ error }) => { if (error) console.error('[Vehículo]', error); });
  }, [vehSel, kmText, data.purchaseId]);

  // D35: el modal cierra con la animación INVERSA a la apertura
  // (fadeUpOut) antes de desmontar — todos los caminos de salida
  // (Omitir, Ahora no, Cancelar, auto-cierre) pasan por acá.
  const close = useCallback(() => {
    flushVehicle(); // la asignación de vehículo/km no se pierde al salir
    setClosing(prev => {
      if (!prev) setTimeout(onClose, 200);
      return true;
    });
  }, [onClose, flushVehicle]);

  // Encuesta de la estación de ESTA compra (llave: stations.name)
  const surveyTarget = SHELL_SURVEYS.find(s => s.name === data.stationName);
  const canInvite = !!surveyTarget && mySurveyCount < cfg.surveyDaily && !surveyPending;

  const submitRating = useCallback(async (starCount) => {
    if (starCount < 1 || saving) return;
    flushVehicle();
    setSaving(true);
    if (sb && sbConnected) {
      // SEC.C.4: el INSERT abierto de operator_ratings quedó revocado
      // (permitía spam de estrellas) — RPC con la sesión del miembro,
      // una calificación por compra.
      const res = await rateOperatorSecure(data.operatorId, starCount, data.purchaseId || null);
      if (res.error) console.error('[Rating]', res.error);
      else fire(`¡Gracias! Calificación enviada: ${starCount}/5`, 'success');
    }
    setSaving(false);
    if (canInvite) setStep('survey');
    else close();
  }, [saving, sbConnected, data.operatorId, memberId, fire, canInvite, close, flushVehicle]);

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

            {/* F6 E2: ¿a cuál vehículo va esta carga? (solo betas con
                vehículos) — chips + odómetro opcional; se envía al
                calificar u omitir */}
            {vehOpts && (
              <div style={{ textAlign: 'left', marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: '#9E9E9E', marginBottom: 8 }}>
                  Carga asignada a
                </div>
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
                  {vehOpts.map(veh => {
                    const t = VEHICLE_TYPES.find(x => x.k === veh.vtype) || VEHICLE_TYPES[VEHICLE_TYPES.length - 1];
                    const name = [veh.brand, veh.model].filter(Boolean).join(' ') || veh.plate || t.label;
                    const on = vehSel === veh.id;
                    return (
                      <button key={veh.id} onClick={() => { setVehSel(veh.id); vehSent.current = false; }} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                        padding: '8px 12px', borderRadius: 12, cursor: 'pointer',
                        border: on ? `1.5px solid ${BRAND_ORANGE}` : `1.5px solid ${dark ? 'rgba(255,255,255,.15)' : 'rgba(0,0,0,.12)'}`,
                        background: on ? (dark ? 'rgba(221,29,33,.16)' : '#FDECEA') : 'transparent',
                        color: on ? (dark ? '#FF8A80' : '#C62828') : (dark ? '#E0E0E0' : '#424242'),
                        fontFamily: "'DM Sans'", fontSize: 12.5, fontWeight: 800,
                      }}>
                        <t.Icon size={15} /> {name}
                      </button>
                    );
                  })}
                </div>
                <input
                  inputMode="numeric" pattern="[0-9]*" maxLength={7}
                  value={kmText}
                  onChange={e => { setKmText(e.target.value.replace(/\D/g, '')); vehSent.current = false; }}
                  placeholder="Odómetro actual en km (opcional)"
                  style={{
                    width: '100%', boxSizing: 'border-box', marginTop: 8,
                    padding: '10px 12px', borderRadius: 12,
                    border: `1.5px solid ${dark ? 'rgba(255,255,255,.15)' : 'rgba(0,0,0,.12)'}`,
                    background: dark ? 'rgba(255,255,255,.06)' : '#FAFAFA',
                    color: dark ? '#fff' : '#0D0D0D',
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700,
                  }}
                />
                {/* E3d: guarda SUAVE — lectura menor que la conocida del
                    vehículo elegido = probable dedazo (no bloquea) */}
                {(() => {
                  const sel = (vehOpts || []).find(x => x.id === vehSel);
                  const kmIn = /^\d{1,7}$/.test(kmText.trim()) ? parseInt(kmText.trim(), 10) : null;
                  if (kmIn == null || !(sel?.km > 0) || kmIn >= sel.km) return null;
                  return (
                    <div style={{ fontSize: 10.5, color: '#E65100', fontWeight: 700, marginTop: 5, lineHeight: 1.4 }}>
                      Ojo: es menor que la última lectura de este vehículo ({sel.km.toLocaleString('en-US')} km) — revísala si es un error.
                    </div>
                  );
                })()}
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
                {/* Esperando el regreso de Shell — mismo bloque ámbar del
                    modal de encuestas, SIN contador visible */}
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
                  <div style={{ fontSize: 11, fontWeight: 600, color: subTxt, marginTop: 4 }}>
                    Respondé todas las preguntas en la página de Shell · Tus puntos se asignan al terminar
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
