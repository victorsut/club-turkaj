// src/views/client/ClientHome.jsx
// Main client dashboard: tier card, stats, survey, QR, promo carousel, history
import { useState, useEffect, useCallback } from 'react';
import { sb } from '../../lib/supabaseClient';
import { sMono, bento, BRAND_RED } from '../../constants/styles';
import { CARD_PREFIX } from '../../constants/config';
import Wordmark from '../../components/ui/Wordmark';
import LegalFooter from '../../components/ui/LegalFooter';
import BentoTile from '../../components/ui/BentoTile';
import TierCardBento from '../../components/ui/TierCardBento';
import InactivityWarning from '../../components/ui/InactivityWarning';
import HistorySheet from './HistorySheet';
import { Menu } from '../../components/ui/Icons';
import { GiftIcon, CarIcon, WifiIcon, SurveyIcon, PinIcon, TicketStarIcon, BagIcon } from '../../components/ui/BentoIcons';
import { originFromEvent, centerDeltaFromEvent } from '../../lib/motionOrigin';

export default function ClientHome(ctx) {
  const { me, gT, cfg, cTier, TH, activePromos, promoIdx, setPromoIdx,
    mySurveyCount, doSurvey, showHist, setShowHist,
    showInvite, setShowInvite, showRedeemed, setShowRedeemed,
    showWifi, setShowWifi, showMap, setShowMap, stations,
    showSurveys, setShowSurveys, fire,
    pendingOpRating, setPendingOpRating, sbConnected,
    activityLog, custs, redeemedList, logout,
    rafData, curMonth, setCScr, setNavOrigin } = ctx;

  if (!me) return null;

  // Boletos válidos solo para el mes en curso
  const currentMonthTickets = (rafData?.[curMonth]?.participants || [])
    .find(p => p.cid === me.id)?.tickets || 0;

  // Operator rating from member device — auto-submit on tap
  const [savingRating, setSavingRating] = useState(false);

  const submitOpRating = useCallback(async (starCount) => {
    if (!pendingOpRating || starCount < 1 || savingRating) return;
    setSavingRating(true);
    if (sb && sbConnected) {
      const { error } = await sb.from('operator_ratings').insert({
        operator_id: pendingOpRating.operatorId,
        member_id: me.id,
        stars: starCount,
      });
      if (error) console.error('[Rating]', error);
      else fire(`⭐ ¡Gracias! Calificación enviada: ${starCount}/5`);
    }
    setSavingRating(false);
    setPendingOpRating(null);
  }, [pendingOpRating, me?.id, sbConnected, savingRating, fire, setPendingOpRating]);

  const dismissRating = useCallback(() => {
    setPendingOpRating(null);
  }, [setPendingOpRating]);

  // Survey timer: wait 90 seconds before granting points
  const [surveyPending, setSurveyPending] = useState(null); // { openedAt, stationName }
  const [surveyCountdown, setSurveyCountdown] = useState(0);
  const SURVEY_WAIT = 90; // 1.5 minutes in seconds

  useEffect(() => {
    if (!surveyPending) { setSurveyCountdown(0); return; }
    const tick = () => {
      const elapsed = Math.floor((Date.now() - surveyPending.openedAt) / 1000);
      const remaining = Math.max(0, SURVEY_WAIT - elapsed);
      setSurveyCountdown(remaining);
      if (remaining <= 0) clearInterval(iv);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [surveyPending]);

  // Auto-cancel or auto-claim when user returns to the app
  useEffect(() => {
    if (!surveyPending) return;
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const elapsed = Math.floor((Date.now() - surveyPending.openedAt) / 1000);
      if (elapsed >= SURVEY_WAIT) {
        // Timer completed — auto-claim points
        doSurvey();
        setSurveyPending(null);
        setShowSurveys(false);
        fire(`✅ Encuesta completada · +${cfg.surveyPts} pts`);
      } else {
        // Returned too early — cancel
        setSurveyPending(null);
        fire('❌ Encuesta cancelada · Permanecé al menos 1:30 min en la página');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [surveyPending, doSurvey, cfg.surveyPts, fire, setShowSurveys]);

  // Codigo de tarjeta con prefijo dinamico segun tier actual
  const tierPrefix = CARD_PREFIX[cTier.name] || 'CTOD';
  const displayCode = (() => {
    const c = me.cardId;
    if (c) {
      const m = c.match(/^CT[OPB]D-(\d+)$/);
      if (m) return tierPrefix + '-' + m[1];
    }
    // Fallback: extraer solo digitos del UUID para generar codigo numerico
    const digits = String(me.id).replace(/[^0-9]/g, '');
    return tierPrefix + '-' + digits.slice(-5).padStart(5, '0');
  })();

  // Activity history (alimenta las ventanas de historial)
  const myActs = activityLog?.[me.id] || [];
  const myRedeemed = (redeemedList || []).filter(rd => rd.memberId === me.id);

  // ── R1b: estado del home bento ────────────────────────────
  const isBlack = cTier.name === 'BLACK';
  const headerTxt = isBlack ? '#fff' : '#0D0D0D';
  const subTxt = isBlack ? 'rgba(255,255,255,.55)' : '#6E6E73';
  const firstName = (me.name || '').trim().split(' ')[0] || 'cliente';
  const [showTierDetail, setShowTierDetail] = useState(false);
  const [histSheet, setHistSheet] = useState(null); // { type: 'compras'|'canjes', origin } | null
  // D35: punto del último cuadro presionado → el modal centrado "sale"
  // de ahí (transform-origin relativo al centro del viewport).
  const [modalOrigin, setModalOrigin] = useState(null);
  const mOrigin = modalOrigin
    ? `calc(50% + ${modalOrigin.dx}px) calc(50% + ${modalOrigin.dy}px)`
    : '50% 50%';

  // Beneficios del nivel (detalle al tocar la tarjeta)
  const bens = [
    { i: '⛽', t: `1 pt por cada Q${cfg.qPerPt}` },
    ...(cTier.discount > 0 ? [{ i: '💰', t: `Descuento Q${cTier.discount.toFixed(2)}/galón` }] : []),
    ...(cTier.redeemDisc > 0 ? [{ i: '🏷️', t: `-${Math.round(cTier.redeemDisc * 100)}% en canje de premios` }] : []),
    { i: '📶', t: cTier.name === 'ORO' ? 'WiFi — desde nivel PLATINO' : 'WiFi ilimitado' },
    ...(cTier.bath ? [{ i: '🚻', t: 'Acceso a baños' }] : []),
    { i: '🎂', t: `${cTier.evtPts} pts en eventos especiales` },
    { i: '🎟️', t: `Rifa mensual (${cfg.ticketPts} pts = 1 boleto)` },
  ];

  // Saludo festivo (D34): special_days de hoy (hora de Guatemala) o cumpleaños.
  const [festivo, setFestivo] = useState(null);
  useEffect(() => {
    if (!sb || !sbConnected) return;
    const todayGT = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guatemala' }); // YYYY-MM-DD
    const mm = parseInt(todayGT.slice(5, 7), 10);
    const dd = parseInt(todayGT.slice(8, 10), 10);
    sb.from('special_days').select('name, month, day, icon, active').eq('active', true)
      .then(({ data }) => {
        if (!data) return;
        const hit = data.find(s => s.month === mm && s.day === dd);
        if (hit) { setFestivo({ name: hit.name, icon: hit.icon || '🎉' }); return; }
        // month=0 = cumpleaños del miembro (regla del sistema)
        if (data.some(s => s.month === 0) && me.bday === todayGT.slice(5)) {
          setFestivo({ bday: true, icon: '🎂' });
        }
      });
  }, [sbConnected, me.bday]);

  return (
    <div style={{ paddingBottom: 88, minHeight: '100vh', background: isBlack ? 'transparent' : bento.pageBg }}>
      {/* Inactivity warning */}
      <InactivityWarning lastBuy={me.lastBuy} />

      {/* Header compacto: logo + saludo + menú (D34) — todo en una fila
          para que el grid completo quepa sin scroll */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px 0' }}>
        <img src="/logo.png" alt="Puntos Plus" style={{ width: 36, height: 36, borderRadius: 11, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.08)', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0, padding: '0 2px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: subTxt, lineHeight: 1.2 }}>¡Hola, {firstName}!</div>
          <div style={{ fontSize: 17, fontWeight: 900, color: headerTxt, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Bienvenido a <Wordmark size={17} color={headerTxt} />
          </div>
          {festivo && (
            <div style={{ fontSize: 11, fontWeight: 800, color: BRAND_RED, lineHeight: 1.3 }}>
              {festivo.icon} {festivo.bday ? `¡Feliz cumpleaños, ${firstName}!` : `¡Feliz ${festivo.name}!`}
            </div>
          )}
        </div>
        <button onClick={(e) => { if (setNavOrigin) setNavOrigin(originFromEvent(e)); setCScr('menu'); }} aria-label="Menú" style={{
          width: 38, height: 38, borderRadius: 11, border: 'none', cursor: 'pointer',
          background: isBlack ? 'rgba(255,255,255,.08)' : '#fff',
          color: headerTxt,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isBlack ? 'none' : '0 2px 8px rgba(0,0,0,.08)', flexShrink: 0,
        }}>
          <Menu />
        </button>
      </div>

      {/* Tarjeta de nivel (D34: doble zona táctil — general → detalle, puntos → Canjes) */}
      <TierCardBento
        me={me}
        cTier={cTier}
        onOpenDetail={(e) => { setModalOrigin(centerDeltaFromEvent(e)); setShowTierDetail(true); }}
        onPointsTap={(e) => { if (setNavOrigin) setNavOrigin(originFromEvent(e)); setCScr('cat'); }}
      />

      {/* ── Bento grid (referencia visual R1b) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '10px 14px 0' }}>

        {/* 1 · Promociones: el carrusel real ocupa el slot del cuadro rojo (D33) */}
        <div
          className="pp-tile"
          onClick={() => activePromos.length > 1 && setPromoIdx((promoIdx + 1) % activePromos.length)}
          style={{
            background: bento.red, borderRadius: bento.radius, minHeight: 106,
            position: 'relative', overflow: 'hidden', boxShadow: bento.shadow,
            cursor: activePromos.length > 1 ? 'pointer' : 'default',
            color: '#fff', padding: '13px 14px 12px',
            display: 'flex', flexDirection: 'column', animationDelay: '0ms',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 18% 12%, rgba(255,255,255,.22), transparent 55%)', pointerEvents: 'none' }} />
          {activePromos.length === 0 ? (
            <>
              <GiftIcon size={26} />
              <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                <div style={{ fontSize: 12.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.7 }}>Promociones</div>
                <div style={{ fontSize: 10.5, opacity: 0.85, marginTop: 2, fontWeight: 600 }}>Descubre ofertas exclusivas</div>
              </div>
            </>
          ) : (
            <>
              {activePromos.map((p, i) => (
                <div key={p.id} style={{
                  position: 'absolute', inset: 0, padding: '14px 14px 20px',
                  background: p.bg || bento.red,
                  display: 'flex', flexDirection: 'column',
                  opacity: i === promoIdx ? 1 : 0, transition: 'opacity .5s ease',
                }}>
                  {p.icon && <div style={{ fontSize: 26, lineHeight: 1 }}>{p.icon}</div>}
                  <div style={{ marginTop: 'auto' }}>
                    <div style={{ fontSize: 12.5, fontWeight: 900, color: p.color || '#fff', lineHeight: 1.25 }}>{p.title}</div>
                    {p.desc && (
                      <div style={{ fontSize: 10, color: p.color || '#fff', opacity: 0.8, marginTop: 2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {p.desc}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {activePromos.length > 1 && (
                <div style={{ position: 'absolute', bottom: 7, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 4 }}>
                  {activePromos.map((_, i) => (
                    <div key={i} style={{ width: i === promoIdx ? 14 : 5, height: 5, borderRadius: 3, background: '#fff', opacity: i === promoIdx ? 0.95 : 0.45, transition: 'all .3s' }} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* 2 · Vehículo (placeholder hasta F6 — D34) */}
        <BentoTile
          index={1} color={bento.green} icon={<CarIcon />} title="Vehículo"
          sub="Administra y consulta tus vehículos" badge="PRÓXIMAMENTE"
          onClick={(e) => { if (setNavOrigin) setNavOrigin(originFromEvent(e)); setCScr('veh'); }}
        />

        {/* 3 · WiFi (beneficio PLATINO/BLACK — D34) */}
        <BentoTile
          index={2} color={bento.blue} icon={<WifiIcon />} title="WiFi"
          sub={cTier.name === 'ORO' ? 'Disponible desde nivel PLATINO' : 'Conéctate a nuestro WiFi gratis'}
          dimmed={cTier.name === 'ORO'}
          onClick={(e) => {
            if (cTier.name === 'ORO') { fire('📶 El WiFi gratis se desbloquea en nivel PLATINO'); return; }
            setModalOrigin(centerDeltaFromEvent(e));
            setShowWifi(true);
          }}
        />

        {/* 4 · Encuesta de Satisfacción (sustituye a "Encuentra Shell" — D34) */}
        <BentoTile
          index={3} color={bento.amber} icon={<SurveyIcon />} title="Encuesta"
          sub={mySurveyCount >= cfg.surveyDaily
            ? '✅ Completaste las de hoy'
            : `${mySurveyCount}/${cfg.surveyDaily} hoy · +${cfg.surveyPts} pts c/u`}
          onClick={(e) => {
            if (mySurveyCount >= cfg.surveyDaily) { fire('✅ Ya completaste tus encuestas de hoy'); return; }
            setModalOrigin(centerDeltaFromEvent(e));
            setShowSurveys(true);
          }}
        />

        {/* 5 · Ubicación */}
        <BentoTile
          index={4} color={bento.purple} icon={<PinIcon />} title="Ubicación"
          sub="Ubica nuestras estaciones"
          onClick={(e) => { setModalOrigin(centerDeltaFromEvent(e)); setShowMap(true); }}
        />

        {/* 6 · Historial de canjes */}
        <BentoTile
          index={5} color={bento.teal} icon={<TicketStarIcon />} title="Historial de Canjes"
          sub={`${myRedeemed.length} canje${myRedeemed.length === 1 ? '' : 's'} realizados`}
          onClick={(e) => setHistSheet({ type: 'canjes', origin: originFromEvent(e) })}
        />

        {/* 7 · Historial de compras (ancho completo) */}
        <BentoTile
          index={6} span={2} color={bento.orange} icon={<BagIcon size={24} />} title="Historial de Compras"
          sub="Consulta tus compras y puntos acumulados"
          onClick={(e) => setHistSheet({ type: 'compras', origin: originFromEvent(e) })}
        />
      </div>



      {/* Disclaimer legal D28 (arriba de las ventanas/modales) */}
      <LegalFooter color={isBlack ? 'rgba(255,255,255,.4)' : '#9E9E9E'} />

      {/* Detalle del nivel (tocar la tarjeta — D34) */}
      {showTierDetail && (
        <div onClick={() => setShowTierDetail(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
          zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20, animation: 'ppFade .2s ease',
        }}>
          <div onClick={e => e.stopPropagation()} className="pp-grow" style={{
            background: isBlack ? '#1A1A2E' : '#fff',
            borderRadius: 24, maxWidth: 380, width: '100%', padding: '24px 20px',
            border: isBlack ? '1px solid rgba(255,255,255,.1)' : '1px solid #eee',
            boxShadow: '0 20px 60px rgba(0,0,0,.3)',
            maxHeight: '85vh', overflowY: 'auto',
            transformOrigin: mOrigin,
          }}>
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 34, marginBottom: 6 }}>{cTier.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: isBlack ? '#fff' : '#0D0D0D' }}>Nivel {cTier.name}</div>
              {cTier.base > 0 && <div style={{ fontSize: 11, color: '#9E9E9E', fontWeight: 700, marginTop: 2 }}>{cTier.base}+ galones</div>}
            </div>
            {bens.map((b, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0',
                borderBottom: i < bens.length - 1 ? `1px solid ${isBlack ? 'rgba(255,255,255,.08)' : '#F0F0F0'}` : 'none',
                fontSize: 13, fontWeight: 600, color: isBlack ? '#E0E0E0' : '#424242',
              }}>
                <span style={{ width: 28, textAlign: 'center' }}>{b.i}</span>
                <span>{b.t}</span>
              </div>
            ))}
            {cTier.next && (
              <div style={{ marginTop: 12, fontSize: 11, fontWeight: 700, color: '#9E9E9E', textAlign: 'center' }}>
                Faltan {cTier.rem} galones para {cTier.next}
              </div>
            )}
            <button onClick={() => setShowTierDetail(false)} style={{
              width: '100%', marginTop: 14, padding: 14, borderRadius: 14,
              background: isBlack ? 'rgba(255,255,255,.08)' : '#F5F5F5',
              border: isBlack ? '1px solid rgba(255,255,255,.1)' : '1px solid #eee',
              fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 700,
              color: isBlack ? '#ccc' : '#424242', cursor: 'pointer',
            }}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* WiFi (pase de acceso — la clave la entrega el operador) */}
      {showWifi && (
        <div onClick={() => setShowWifi(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
          zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20, animation: 'ppFade .2s ease',
        }}>
          <div onClick={e => e.stopPropagation()} className="pp-grow" style={{
            background: isBlack ? '#1A1A2E' : '#fff',
            borderRadius: 24, maxWidth: 340, width: '100%', padding: '26px 22px', textAlign: 'center',
            border: isBlack ? '1px solid rgba(255,255,255,.1)' : '1px solid #eee',
            boxShadow: '0 20px 60px rgba(0,0,0,.3)',
            transformOrigin: mOrigin,
          }}>
            <div style={{ fontSize: 38, marginBottom: 8 }}>📶</div>
            <div style={{ fontSize: 19, fontWeight: 900, color: isBlack ? '#fff' : '#0D0D0D' }}>WiFi Puntos Plus</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#1565C0', marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 }}>
              Beneficio {cTier.name}
            </div>
            <div style={{ fontSize: 13, color: '#9E9E9E', lineHeight: 1.6, margin: '14px 0' }}>
              Mostrá esta pantalla al operador de la estación para recibir la clave WiFi.
            </div>
            <div style={{
              ...sMono, fontSize: 18, fontWeight: 800, letterSpacing: 2,
              padding: '12px 0', borderRadius: 14,
              background: isBlack ? 'rgba(21,101,192,.2)' : '#E3F2FD',
              color: isBlack ? '#64B5F6' : '#1565C0',
            }}>
              {displayCode}
            </div>
            <button onClick={() => setShowWifi(false)} style={{
              width: '100%', marginTop: 14, padding: 14, borderRadius: 14,
              background: isBlack ? 'rgba(255,255,255,.08)' : '#F5F5F5',
              border: isBlack ? '1px solid rgba(255,255,255,.1)' : '1px solid #eee',
              fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 700,
              color: isBlack ? '#ccc' : '#424242', cursor: 'pointer',
            }}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Historiales full-screen: Hoy · Mes · Año · Todo (D34) */}
      {histSheet && (
        <HistorySheet
          type={histSheet.type}
          origin={histSheet.origin}
          onClose={() => setHistSheet(null)}
          acts={myActs}
          redeemed={myRedeemed}
          tierName={cTier.name}
        />
      )}
      {/* Stations modal */}
      {showMap && (
        <div onClick={() => setShowMap(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
          zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20, animation: 'ppFade .2s ease',
        }}>
          <div onClick={e => e.stopPropagation()} className="pp-grow" style={{
            background: cTier.name === 'BLACK' ? '#1A1A2E' : '#fff',
            borderRadius: 24, maxWidth: 380, width: '100%', padding: '24px 20px',
            border: cTier.name === 'BLACK' ? '1px solid rgba(255,255,255,.1)' : '1px solid #eee',
            boxShadow: '0 20px 60px rgba(0,0,0,.3)',
            maxHeight: '86vh', overflowY: 'auto',
            transformOrigin: mOrigin,
          }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>⛽</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: cTier.name === 'BLACK' ? '#fff' : '#0D0D0D' }}>
                Nuestras Estaciones
              </div>
              <div style={{ fontSize: 12, color: '#9E9E9E', marginTop: 4 }}>Gasolineras Turkaj</div>
            </div>

            {(stations.length > 0 ? stations : [
              { name: 'Turkaj I', address: '' },
              { name: 'Turkaj II', address: '' },
              { name: 'Turkaj III', address: '' },
            ]).filter(s => s.active !== false).map((s, i, arr) => (
              <div key={s.id || s.name} style={{
                padding: '14px 0',
                borderBottom: i < arr.length - 1 ? `1px solid ${cTier.name === 'BLACK' ? 'rgba(255,255,255,.06)' : '#F0F0F0'}` : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                    background: cTier.name === 'BLACK' ? 'rgba(251,188,4,.1)' : '#FFF8E1',
                    border: cTier.name === 'BLACK' ? '1px solid rgba(251,188,4,.2)' : '1px solid #FFE082',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                  }}>
                    ⛽
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: cTier.name === 'BLACK' ? '#FFD54F' : '#0D0D0D' }}>
                      {s.name}
                    </div>
                    <div style={{ fontSize: 12, color: cTier.name === 'BLACK' ? 'rgba(255,255,255,.5)' : '#757575', marginTop: 3, lineHeight: 1.4 }}>
                      {s.address ? `📍 ${s.address}` : 'Dirección no disponible'}
                    </div>
                    {/* Navigation buttons */}
                    {(s.lat && s.lng) && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`}
                          target="_blank" rel="noopener noreferrer"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '6px 12px', borderRadius: 10, textDecoration: 'none',
                            background: cTier.name === 'BLACK' ? 'rgba(66,133,244,.15)' : '#E8F0FE',
                            border: cTier.name === 'BLACK' ? '1px solid rgba(66,133,244,.3)' : '1px solid #C5DAF6',
                            fontSize: 11, fontWeight: 700, fontFamily: "'DM Sans'",
                            color: cTier.name === 'BLACK' ? '#8AB4F8' : '#1A73E8',
                          }}>
                          🗺️ Google Maps
                        </a>
                        <a href={`https://waze.com/ul?ll=${s.lat},${s.lng}&navigate=yes`}
                          target="_blank" rel="noopener noreferrer"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '6px 12px', borderRadius: 10, textDecoration: 'none',
                            background: cTier.name === 'BLACK' ? 'rgba(51,208,219,.12)' : '#E0F7FA',
                            border: cTier.name === 'BLACK' ? '1px solid rgba(51,208,219,.3)' : '1px solid #B2EBF2',
                            fontSize: 11, fontWeight: 700, fontFamily: "'DM Sans'",
                            color: cTier.name === 'BLACK' ? '#33D0DB' : '#00838F',
                          }}>
                          🚗 Waze
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <button onClick={() => setShowMap(false)} style={{
              width: '100%', marginTop: 16, padding: 14, borderRadius: 14,
              background: cTier.name === 'BLACK' ? 'rgba(255,255,255,.08)' : '#F5F5F5',
              border: cTier.name === 'BLACK' ? '1px solid rgba(255,255,255,.1)' : '1px solid #eee',
              fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 700,
              color: cTier.name === 'BLACK' ? '#ccc' : '#424242',
              cursor: 'pointer',
            }}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Survey station selection modal */}
      {showSurveys && (
        <div onClick={() => setShowSurveys(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
          zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20, animation: 'ppFade .2s ease',
        }}>
          <div onClick={e => e.stopPropagation()} className="pp-grow" style={{
            background: cTier.name === 'BLACK' ? '#1A1A2E' : '#fff',
            borderRadius: 24, maxWidth: 380, width: '100%', padding: '24px 20px',
            border: cTier.name === 'BLACK' ? '1px solid rgba(255,255,255,.1)' : '1px solid #eee',
            boxShadow: '0 20px 60px rgba(0,0,0,.3)',
            maxHeight: '88vh', overflowY: 'auto',
            transformOrigin: mOrigin,
          }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: cTier.name === 'BLACK' ? '#fff' : '#0D0D0D' }}>
                Encuesta Shell
              </div>
              <div style={{ fontSize: 12, color: '#9E9E9E', marginTop: 4 }}>
                Seleccioná la estación donde cargaste combustible
              </div>
              <div style={{ ...sMono, fontSize: 12, fontWeight: 800, color: cTier.name === 'BLACK' ? '#64B5F6' : '#1565C0', marginTop: 8 }}>
                {mySurveyCount}/{cfg.surveyDaily} hoy · +{cfg.surveyPts} pts por encuesta
              </div>
            </div>

            {(() => {
              // Resolve last station name (could be UUID, name, or empty)
              const raw = me.station || '';
              const fromId = (stations || []).find(st => st.id === raw)?.name || '';
              const lastName = fromId || raw;

              return [
                { name: 'Turkaj I', url: 'https://tellshell.shell.com/GTM?source=smartQR&s=10700531' },
                { name: 'Turkaj II', url: 'https://tellshell.shell.com/GTM?source=smartQR&s=10700717' },
                { name: 'Turkaj III', url: 'https://tellshell.shell.com/GTM?source=smartQR&s=10700211' },
              ].map((s) => {
                const isLast = lastName && lastName === s.name;
                return (
                <div key={s.name}
                  onClick={() => {
                    if (surveyPending) return; // already waiting
                    window.open(s.url, '_blank');
                    setSurveyPending({ openedAt: Date.now(), stationName: s.name });
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 12px', marginBottom: 8, borderRadius: 16,
                    cursor: surveyPending ? 'default' : 'pointer',
                    opacity: surveyPending ? (surveyPending.stationName === s.name ? 1 : 0.4) : 1,
                    background: isLast
                      ? (cTier.name === 'BLACK' ? 'rgba(251,188,4,.1)' : '#FFF8E1')
                      : (cTier.name === 'BLACK' ? 'rgba(255,255,255,.04)' : '#F9F9F9'),
                    border: isLast
                      ? (cTier.name === 'BLACK' ? '2px solid rgba(251,188,4,.3)' : '2px solid #FFE082')
                      : (cTier.name === 'BLACK' ? '1px solid rgba(255,255,255,.06)' : '1px solid #eee'),
                    transition: 'transform .15s',
                  }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                    background: cTier.name === 'BLACK' ? 'rgba(100,181,246,.1)' : '#E3F2FD',
                    border: cTier.name === 'BLACK' ? '1px solid rgba(100,181,246,.2)' : '1px solid #BBDEFB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                  }}>
                    ⛽
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 15, fontWeight: 800,
                      color: cTier.name === 'BLACK' ? (isLast ? '#FFD54F' : '#E0E0E0') : '#0D0D0D',
                    }}>
                      {s.name}
                    </div>
                    {isLast && (
                      <div style={{
                        fontSize: 10, fontWeight: 800, marginTop: 3,
                        color: cTier.name === 'BLACK' ? '#FFD54F' : '#F0A500',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        📍 Última visita
                      </div>
                    )}
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 800, padding: '6px 12px', borderRadius: 10,
                    background: surveyPending?.stationName === s.name
                      ? (cTier.name === 'BLACK' ? 'rgba(251,188,4,.15)' : '#FFF8E1')
                      : (cTier.name === 'BLACK' ? 'rgba(100,181,246,.15)' : '#E3F2FD'),
                    color: surveyPending?.stationName === s.name
                      ? (cTier.name === 'BLACK' ? '#FFD54F' : '#F0A500')
                      : (cTier.name === 'BLACK' ? '#64B5F6' : '#1565C0'),
                  }}>
                    {surveyPending?.stationName === s.name ? '⏳ Esperando' : 'Llenar →'}
                  </div>
                </div>
              );
              });
            })()}

            {/* Pending survey: countdown */}
            {surveyPending && (
              <div style={{
                background: cTier.name === 'BLACK' ? 'rgba(255,255,255,.06)' : '#FFF8E1',
                borderRadius: 16, padding: 16, marginBottom: 8, textAlign: 'center',
                border: cTier.name === 'BLACK' ? '1px solid rgba(255,255,255,.1)' : '1px solid #FFE082',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: cTier.name === 'BLACK' ? '#FFD54F' : '#F0A500', marginBottom: 6 }}>
                  ⏳ Completá la encuesta de {surveyPending.stationName}
                </div>
                <div style={{ ...sMono, fontSize: 28, fontWeight: 900, color: cTier.name === 'BLACK' ? '#fff' : '#0D0D0D' }}>
                  {Math.floor(surveyCountdown / 60)}:{String(surveyCountdown % 60).padStart(2, '0')}
                </div>
                <div style={{ fontSize: 11, color: '#9E9E9E', marginTop: 4 }}>
                  Permanecé en la página de Shell · Los puntos se asignan al volver
                </div>
                {/* Progress bar */}
                <div style={{ height: 4, borderRadius: 2, overflow: 'hidden', background: cTier.name === 'BLACK' ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.06)', marginTop: 10 }}>
                  <div style={{
                    height: '100%', borderRadius: 2, transition: 'width 1s linear',
                    width: `${((SURVEY_WAIT - surveyCountdown) / SURVEY_WAIT) * 100}%`,
                    background: cTier.name === 'BLACK' ? '#FFD54F' : '#FBBC04',
                  }} />
                </div>
              </div>
            )}

            <button onClick={() => { if (!surveyPending) setShowSurveys(false); else { setSurveyPending(null); setShowSurveys(false); } }} style={{
              width: '100%', marginTop: 8, padding: 14, borderRadius: 14,
              background: cTier.name === 'BLACK' ? 'rgba(255,255,255,.08)' : '#F5F5F5',
              border: cTier.name === 'BLACK' ? '1px solid rgba(255,255,255,.1)' : '1px solid #eee',
              fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 700,
              color: cTier.name === 'BLACK' ? '#ccc' : '#424242',
              cursor: 'pointer',
            }}>
              {surveyPending ? 'Cancelar' : 'Cerrar'}
            </button>
          </div>
        </div>
      )}

      {/* Operator Rating Modal — triggered by Realtime after purchase */}
      {pendingOpRating && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
          zIndex: 250, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20, animation: 'fadeUp .3s ease',
        }}>
          <div style={{
            background: cTier.name === 'BLACK' ? '#1A1A2E' : '#fff',
            borderRadius: 24, maxWidth: 360, width: '100%', padding: '28px 24px',
            border: cTier.name === 'BLACK' ? '1px solid rgba(255,255,255,.1)' : '1px solid #eee',
            boxShadow: '0 20px 60px rgba(0,0,0,.3)', textAlign: 'center',
          }}>
            {savingRating ? (
              /* Saving state */
              <div style={{ padding: '20px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: cTier.name === 'BLACK' ? '#fff' : '#424242' }}>
                  Enviando calificación...
                </div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div style={{
                  width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
                  background: cTier.name === 'BLACK' ? 'rgba(76,175,80,.15)' : '#E8F5E9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
                }}>
                  ⛽
                </div>
                <div style={{ fontSize: 18, fontWeight: 900, color: cTier.name === 'BLACK' ? '#fff' : '#0D0D0D', marginBottom: 6 }}>
                  ¡Compra registrada!
                </div>
                <div style={{ fontSize: 13, color: '#9E9E9E', marginBottom: 4 }}>
                  Fuiste atendido por
                </div>
                <div style={{
                  fontSize: 20, fontWeight: 900, marginBottom: 2,
                  color: cTier.name === 'BLACK' ? '#FFD54F' : '#0D0D0D',
                }}>
                  {pendingOpRating.operatorName}
                </div>
                {pendingOpRating.stationName && (
                  <div style={{ fontSize: 12, color: '#9E9E9E', marginBottom: 20 }}>
                    📍 {pendingOpRating.stationName}
                  </div>
                )}

                {/* Stars — tap to rate and auto-submit */}
                <div style={{ fontSize: 14, fontWeight: 700, color: cTier.name === 'BLACK' ? '#E0E0E0' : '#424242', marginBottom: 14 }}>
                  Calificá la atención
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <button key={s} onClick={() => submitOpRating(s)} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 40, padding: 4,
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.1))',
                      transition: 'transform .1s',
                    }}>
                      ⭐
                    </button>
                  ))}
                </div>

                {/* Skip */}
                <button onClick={dismissRating} style={{
                  width: '100%', padding: 12, borderRadius: 14,
                  background: 'none', border: 'none',
                  fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 600,
                  color: '#9E9E9E', cursor: 'pointer',
                }}>
                  Omitir
                </button>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
