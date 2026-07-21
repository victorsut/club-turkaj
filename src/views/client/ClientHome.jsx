// src/views/client/ClientHome.jsx
// Main client dashboard: tier card, stats, survey, QR, promo carousel, history
import { useState, useEffect, useCallback, useRef } from 'react';
import { sb } from '../../lib/supabaseClient';
import { sMono, bento, BRAND_RED } from '../../constants/styles';
import PromoCard from '../../components/ui/PromoCard';
import { CARD_PREFIX } from '../../constants/config';
import Wordmark from '../../components/ui/Wordmark';
import LegalFooter from '../../components/ui/LegalFooter';
import BentoTile from '../../components/ui/BentoTile';
import TierCardBento from '../../components/ui/TierCardBento';
import InactivityWarning from '../../components/ui/InactivityWarning';
import HistorySheet from './HistorySheet';
import useShortScreen from '../../hooks/useShortScreen';
import { Menu, Fuel, Ticket, Percent, Tag, Wifi, Door, Cake, Pin, Clock, Chev } from '../../components/ui/Icons';
import GalaxyDust from '../../components/ui/GalaxyDust';
import GrowModal from '../../components/ui/GrowModal';
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
      else fire(`¡Gracias! Calificación enviada: ${starCount}/5`, 'success');
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
        fire(`Encuesta completada · +${cfg.surveyPts} pts`, 'success');
      } else {
        // Returned too early — cancel
        setSurveyPending(null);
        fire('Encuesta cancelada · Permanecé al menos 1:30 min en la página', 'error');
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
  // Pantallas cortas: tipografías y paddings compactos para caber sin scroll.
  const shortScr = useShortScreen();
  const firstName = (me.name || '').trim().split(' ')[0] || 'cliente';
  const [showTierDetail, setShowTierDetail] = useState(false);
  const [histSheet, setHistSheet] = useState(null); // { type: 'compras'|'canjes', origin } | null
  // R1b.2: tracking del arrastre del carrusel de promos (un swipe
  // horizontal cambia la card; un tap navega a la ventana PROMOCIONES).
  const promoTouchRef = useRef(null);
  const promoSwipedRef = useRef(false);
  // D35: punto del último cuadro presionado → el modal centrado "sale"
  // de ahí (transform-origin relativo al centro del viewport).
  const [modalOrigin, setModalOrigin] = useState(null);
  const mOrigin = modalOrigin
    ? `calc(50% + ${modalOrigin.dx || 0}px) calc(50% + ${modalOrigin.dy || 0}px)`
    : '50% 50%';
  const mTint = modalOrigin?.tint || null;
  // Origen + tinte del cuadro presionado (continuidad de color).
  const withTint = (e, tint) => {
    const d = centerDeltaFromEvent(e);
    return d ? { ...d, tint } : { dx: 0, dy: 0, tint };
  };
  // Tinte de la tarjeta de nivel (mismo tema del tier, sólido plano).
  const tierTint = isBlack
    ? 'radial-gradient(ellipse at 20% 30%, #0d0d1a 0%, #050508 40%, #000 100%)'
    : cTier.name === 'PLATINO' ? '#9EA7AD' : bento.gold;

  // Beneficios del nivel (detalle al tocar la tarjeta — FORMATO GENERAL,
  // iconos SVG sin emojis). El WiFi gratis solo aparece en PLATINO/BLACK
  // (en ORO se omite la línea); sin "invitar amigos" (feedback 21-jul).
  const bens = [
    { icon: <Fuel />, t: `1 pt por cada Q${cfg.qPerPt}` },
    ...(cTier.discount > 0 ? [{ icon: <Percent />, t: `Descuento Q${cTier.discount.toFixed(2)}/galón` }] : []),
    ...(cTier.redeemDisc > 0 ? [{ icon: <Tag />, t: `-${Math.round(cTier.redeemDisc * 100)}% en canje de premios` }] : []),
    ...(cTier.name !== 'ORO' ? [{ icon: <Wifi />, t: 'WiFi gratis ilimitado' }] : []),
    ...(cTier.bath ? [{ icon: <Door />, t: 'Acceso a baños' }] : []),
    { icon: <Cake />, t: `${cTier.evtPts} pts en eventos especiales` },
    { icon: <Ticket />, t: `Rifa mensual (${cfg.ticketPts} pts = 1 boleto)` },
  ];
  // Acento de los iconos según la identidad del nivel.
  const tierAccent = isBlack ? '#FBBC04' : cTier.name === 'PLATINO' ? '#6B767D' : bento.gold;

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
    <div style={{ background: isBlack ? 'transparent' : bento.pageBg }}>
      {/* Sección que llena la resolución del dispositivo; el disclaimer
          queda bajo el fold y aparece al scrollear (feedback IMG3) */}
      <div className="pp-home-fit" style={{ paddingBottom: 76 }}>
      {/* Inactivity warning */}
      <InactivityWarning lastBuy={me.lastBuy} />

      {/* Header + saludo (FORMATO GENERAL). En pantallas cortas el logo
          se integra a la izquierda ocupando la altura del saludo COMPLETO
          (¡Hola! / Bienvenido a / Puntos Plus) para compensar la
          proporción 1:1 de Promos/Vehículo; en pantallas grandes conserva
          su fila propia como la referencia. El menú plano sustituye la
          campana (D34). */}
      {shortScr ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px 0' }}>
          <img src="/logo.png" alt="Puntos Plus" style={{ width: 74, height: 74, borderRadius: 18, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: headerTxt }}>¡Hola, {firstName}!</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: headerTxt, lineHeight: 1.2 }}>Bienvenido a</div>
            <div style={{ lineHeight: 1.1 }}>
              <Wordmark size={28} color={headerTxt} />
            </div>
          </div>
          <button onClick={(e) => { if (setNavOrigin) setNavOrigin(originFromEvent(e)); setCScr('menu'); }} aria-label="Menú" style={{
            width: 42, height: 42, border: 'none', cursor: 'pointer',
            background: 'none', color: headerTxt,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, padding: 0, alignSelf: 'flex-start',
          }}>
            <Menu />
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 18px 0' }}>
            <img src="/logo.png" alt="Puntos Plus" style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0 }} />
            <div style={{ flex: 1 }} />
            <button onClick={(e) => { if (setNavOrigin) setNavOrigin(originFromEvent(e)); setCScr('menu'); }} aria-label="Menú" style={{
              width: 42, height: 42, border: 'none', cursor: 'pointer',
              background: 'none', color: headerTxt,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, padding: 0,
            }}>
              <Menu />
            </button>
          </div>
          <div style={{ padding: '10px 20px 0' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: headerTxt }}>¡Hola, {firstName}!</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: headerTxt, lineHeight: 1.25 }}>Bienvenido a</div>
            <div style={{ lineHeight: 1.1 }}>
              <Wordmark size={34} color={headerTxt} />
            </div>
          </div>
        </>
      )}

      {/* Saludo festivo vía special_days (D34) */}
      {festivo && (
        <div style={{ padding: '4px 20px 0', fontSize: 12, fontWeight: 800, color: BRAND_RED }}>
          {festivo.icon} {festivo.bday ? `¡Feliz cumpleaños, ${firstName}!` : `¡Feliz ${festivo.name}!`}
        </div>
      )}

      {/* Tarjeta de nivel (D34: doble zona táctil — general → detalle, puntos → Canjes) */}
      <TierCardBento
        me={me}
        cTier={cTier}
        onOpenDetail={(e) => { setModalOrigin(withTint(e, tierTint)); setShowTierDetail(true); }}
        onPointsTap={(e) => { if (setNavOrigin) setNavOrigin(originFromEvent(e)); setCScr('cat'); }}
      />

      {/* ── Bento grid (referencia FORMATO GENERAL) ── */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto 1fr 1fr auto', gap: shortScr ? 9 : 11, padding: shortScr ? '10px 16px 0' : '12px 16px 0' }}>

        {/* 1 · Promociones (R1b.2/D33): card 1:1 compuesta (título +
            descripción + sujeto). Tap → ventana PROMOCIONES; arrastre
            horizontal DENTRO del cuadro → cambia el carrusel. */}
        <div
          className="pp-tile"
          onTouchStart={(e) => {
            promoTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            promoSwipedRef.current = false;
          }}
          onTouchEnd={(e) => {
            const t = promoTouchRef.current;
            if (!t || activePromos.length < 2) return;
            const dx = e.changedTouches[0].clientX - t.x;
            const dy = e.changedTouches[0].clientY - t.y;
            if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) {
              promoSwipedRef.current = true;
              setPromoIdx(i => (i + (dx < 0 ? 1 : -1) + activePromos.length) % activePromos.length);
            }
          }}
          onClick={(e) => {
            // Un arrastre no navega: solo cambia la card visible.
            if (promoSwipedRef.current) { promoSwipedRef.current = false; return; }
            if (setNavOrigin) setNavOrigin(originFromEvent(e));
            setCScr('promos');
          }}
          style={{
            background: bento.red, borderRadius: bento.radius, aspectRatio: '1 / 1',
            position: 'relative', overflow: 'hidden',
            cursor: 'pointer', color: '#fff', animationDelay: '0ms',
            touchAction: 'pan-y',
          }}
        >
          {activePromos.length === 0 ? (
            <div style={{ position: 'absolute', inset: 0, padding: '15px 16px 14px', display: 'flex', flexDirection: 'column' }}>
              <GiftIcon />
              <div style={{ marginTop: 'auto', paddingTop: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>Promociones</div>
                <div style={{ fontSize: 11.5, opacity: 0.9, marginTop: 3, fontWeight: 500 }}>Descubre ofertas exclusivas</div>
              </div>
            </div>
          ) : (
            <>
              {activePromos.map((p, i) => (
                <PromoCard
                  key={p.id}
                  promo={p}
                  ratio="1:1"
                  style={{
                    position: 'absolute', inset: 0, aspectRatio: 'auto', borderRadius: 0,
                    opacity: i === promoIdx ? 1 : 0, transition: 'opacity .5s ease',
                    pointerEvents: 'none',
                  }}
                />
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
          index={1} square color={bento.green} icon={<CarIcon />} title="Vehículo"
          sub="Administra y consulta tus vehículos" badge="PRÓXIMAMENTE"
          onClick={(e) => { if (setNavOrigin) setNavOrigin(originFromEvent(e)); setCScr('veh'); }}
        />

        {/* 3 · WiFi (beneficio PLATINO/BLACK — D34) */}
        <BentoTile
          index={2} color={bento.blue} icon={<WifiIcon />} title="WiFi"
          sub={cTier.name === 'ORO' ? 'Disponible desde nivel PLATINO' : 'Conéctate a nuestro WiFi gratis'}
          dimmed={cTier.name === 'ORO'}
          onClick={(e) => {
            if (cTier.name === 'ORO') { fire('El WiFi gratis se desbloquea en nivel PLATINO', 'info'); return; }
            setModalOrigin(withTint(e, bento.blue));
            setShowWifi(true);
          }}
        />

        {/* 4 · Encuesta de Satisfacción (sustituye a "Encuentra Shell" — D34) */}
        <BentoTile
          index={3} color={bento.amber} icon={<SurveyIcon />} title="Encuesta"
          sub={mySurveyCount >= cfg.surveyDaily
            ? 'Completaste las de hoy'
            : `${mySurveyCount}/${cfg.surveyDaily} hoy · +${cfg.surveyPts} pts c/u`}
          onClick={(e) => {
            if (mySurveyCount >= cfg.surveyDaily) { fire('Ya completaste tus encuestas de hoy', 'success'); return; }
            setModalOrigin(withTint(e, bento.amber));
            setShowSurveys(true);
          }}
        />

        {/* 5 · Ubicación */}
        <BentoTile
          index={4} color={bento.purple} icon={<PinIcon />} title="Ubicación"
          sub="Ubica nuestras estaciones"
          onClick={(e) => { setModalOrigin(withTint(e, bento.purple)); setShowMap(true); }}
        />

        {/* 6 · Historial de canjes */}
        <BentoTile
          index={5} color={bento.teal} icon={<TicketStarIcon />} title="Historial de Canjes"
          sub={`${myRedeemed.length} canje${myRedeemed.length === 1 ? '' : 's'} realizados`}
          onClick={(e) => setHistSheet({ type: 'canjes', origin: originFromEvent(e), tint: bento.teal })}
        />

        {/* 7 · Historial de compras (ancho completo) */}
        <BentoTile
          index={6} span={2} color={bento.orange} icon={<BagIcon size={32} />} title="Historial de Compras"
          sub="Compras y todos tus movimientos de puntos"
          onClick={(e) => setHistSheet({ type: 'compras', origin: originFromEvent(e), tint: bento.orange })}
        />
      </div>



      </div>{/* /pp-home-fit */}

      {/* Disclaimer legal D28 — pegado al historial de compras: entra en
          la zona de holgura de la nav (queda oculto tras la barra hasta
          scrollear, sigue bajo el fold) */}
      <div style={{ marginTop: -52 }}>
        <LegalFooter color={isBlack ? 'rgba(255,255,255,.4)' : '#9E9E9E'} />
      </div>
      <div style={{ height: 72 }} />

      {/* Detalle del nivel (tocar la tarjeta — D34, FORMATO GENERAL):
          banda superior con la identidad sólida del tier (regla
          inamovible: ORO dorado, PLATINO metálico, BLACK galaxia) y
          lista de beneficios con iconos SVG. */}
      {showTierDetail && (
        <GrowModal onClose={() => setShowTierDetail(false)} origin={mOrigin} tint={mTint}
          background={isBlack ? '#101018' : '#fff'} arrowColor="#fff">
          {() => (<>
            {/* Banda de identidad del nivel (centrada — feedback 21-jul) */}
            <div style={{ background: tierTint, color: '#fff', padding: '22px 20px 18px', position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
              {isBlack && <GalaxyDust n={10} />}
              <div style={{ position: 'relative', zIndex: 2 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.85 }}>
                  Tu nivel
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.15, letterSpacing: 0.5 }}>
                  {cTier.name}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.9, marginTop: 2 }}>
                  {cTier.next ? `${cTier.base} – ${cTier.target - 1} galones` : `${cTier.base}+ galones`}
                </div>
              </div>
            </div>

            <div style={{ padding: '8px 20px 20px' }}>
              {bens.map((b, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0',
                  borderBottom: i < bens.length - 1 ? `1px solid ${isBlack ? 'rgba(255,255,255,.08)' : '#F0F0F0'}` : 'none',
                  fontSize: 13, fontWeight: 600, color: isBlack ? '#E0E0E0' : '#424242',
                }}>
                  <span style={{ width: 24, display: 'flex', justifyContent: 'center', color: tierAccent, flexShrink: 0 }}>{b.icon}</span>
                  <span>{b.t}</span>
                </div>
              ))}
              {cTier.next && (
                <div style={{ marginTop: 12, fontSize: 11, fontWeight: 700, color: isBlack ? 'rgba(255,255,255,.45)' : '#9E9E9E', textAlign: 'center' }}>
                  Faltan {cTier.rem} galones para {cTier.next}
                </div>
              )}
            </div>
          </>)}
        </GrowModal>
      )}

      {/* WiFi (pase de acceso — la clave la entrega el operador) */}
      {showWifi && (
        <GrowModal onClose={() => setShowWifi(false)} origin={mOrigin} tint={mTint}
          background={isBlack ? '#1A1A2E' : '#fff'} maxWidth={340}
          arrowColor={isBlack ? '#fff' : '#0D0D0D'}
          style={{ padding: '30px 22px 26px', textAlign: 'center' }}>
          {() => (<>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
              <WifiIcon size={38} color={isBlack ? '#64B5F6' : '#1565C0'} />
            </div>
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
          </>)}
        </GrowModal>
      )}

      {/* Historiales full-screen: Hoy · Mes · Año · Todo (D34) */}
      {histSheet && (
        <HistorySheet
          type={histSheet.type}
          origin={histSheet.origin}
          tint={histSheet.tint}
          onClose={() => setHistSheet(null)}
          acts={myActs}
          redeemed={myRedeemed}
          tierName={cTier.name}
        />
      )}
      {/* Stations modal */}
      {showMap && (
        <GrowModal onClose={() => setShowMap(false)} origin={mOrigin} tint={mTint}
          background={cTier.name === 'BLACK' ? '#1A1A2E' : '#fff'} maxHeight="86vh"
          arrowColor={cTier.name === 'BLACK' ? '#fff' : '#0D0D0D'}
          style={{ padding: '24px 20px' }}>
          {() => (<>
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

          </>)}
        </GrowModal>
      )}

      {/* Survey station selection modal */}
      {showSurveys && (
        <GrowModal onClose={() => setShowSurveys(false)} origin={mOrigin} tint={mTint}
          background={cTier.name === 'BLACK' ? '#101018' : '#fff'} maxHeight="88vh"
          arrowColor="#fff">
          {(close) => (<>
            {/* Banda de identidad (mismo formato del modal de nivel —
                color sólido del cuadro Encuesta, centrada) */}
            <div style={{ background: bento.amber, color: '#fff', padding: '22px 20px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.85 }}>
                Encuesta de satisfacción
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.15, letterSpacing: 0.5 }}>
                Encuesta Shell
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.9, marginTop: 2 }}>
                {mySurveyCount}/{cfg.surveyDaily} hoy · +{cfg.surveyPts} pts por encuesta
              </div>
            </div>

            <div style={{ padding: '14px 20px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: cTier.name === 'BLACK' ? 'rgba(255,255,255,.5)' : '#6E6E73', textAlign: 'center', marginBottom: 12 }}>
              Seleccioná la estación donde cargaste combustible
            </div>

            {(() => {
              // Estación del ÚLTIMO CONSUMO (D34). Fuente: activity_log
              // (la última 'compra' con estación, ya ordenado DESC) — NO
              // me.station: viene de members.last_station, columna que
              // register_purchase nunca actualiza y quedaba stale
              // (marcaba Turkaj III con el último consumo en Turkaj II).
              const lastAct = myActs.find(a => a.type === 'compra' && a.station);
              const raw = lastAct?.station || me.station || '';
              const fromId = (stations || []).find(st => st.id === raw)?.name || '';
              const lastName = fromId || raw;

              return [
                { name: 'Turkaj I', url: 'https://tellshell.shell.com/GTM?source=smartQR&s=10700531' },
                { name: 'Turkaj II', url: 'https://tellshell.shell.com/GTM?source=smartQR&s=10700717' },
                { name: 'Turkaj III', url: 'https://tellshell.shell.com/GTM?source=smartQR&s=10700211' },
              ].map((s) => {
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
                      ? (cTier.name === 'BLACK' ? 'rgba(217,164,11,.14)' : '#FAF1DC')
                      : (cTier.name === 'BLACK' ? 'rgba(255,255,255,.05)' : '#F5F5F7'),
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
                      color: cTier.name === 'BLACK' ? '#E0E0E0' : '#0D0D0D',
                    }}>
                      {s.name}
                    </div>
                    {isLast && (
                      <div style={{
                        fontSize: 10, fontWeight: 800, marginTop: 3,
                        color: cTier.name === 'BLACK' ? '#FFD54F' : '#B58000',
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
                    background: waitingThis ? bento.amber : (cTier.name === 'BLACK' ? '#fff' : '#0D0D0D'),
                    color: waitingThis ? '#fff' : (cTier.name === 'BLACK' ? '#0D0D0D' : '#fff'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {waitingThis ? <Clock /> : <Chev />}
                  </div>
                </div>
              );
              });
            })()}

            {/* Pending survey: countdown */}
            {surveyPending && (
              <div style={{
                background: cTier.name === 'BLACK' ? 'rgba(217,164,11,.14)' : '#FAF1DC',
                borderRadius: 16, padding: 16, marginBottom: 8, textAlign: 'center',
              }}>
                <div style={{
                  fontSize: 13, fontWeight: 700, marginBottom: 6,
                  color: cTier.name === 'BLACK' ? '#FFD54F' : '#B58000',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <Clock /> Completá la encuesta de {surveyPending.stationName}
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: cTier.name === 'BLACK' ? '#fff' : '#0D0D0D' }}>
                  {Math.floor(surveyCountdown / 60)}:{String(surveyCountdown % 60).padStart(2, '0')}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: cTier.name === 'BLACK' ? 'rgba(255,255,255,.5)' : '#6E6E73', marginTop: 4 }}>
                  Permanecé en la página de Shell · Los puntos se asignan al volver
                </div>
                {/* Progress bar */}
                <div style={{ height: 4, borderRadius: 2, overflow: 'hidden', background: cTier.name === 'BLACK' ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.06)', marginTop: 10 }}>
                  <div style={{
                    height: '100%', borderRadius: 2, transition: 'width 1s linear',
                    width: `${((SURVEY_WAIT - surveyCountdown) / SURVEY_WAIT) * 100}%`,
                    background: bento.amber,
                  }} />
                </div>
              </div>
            )}

            {/* Sin botón "Cerrar": la salida es la flecha del GrowModal.
                Con encuesta pendiente queda "Cancelar" para abortarla. */}
            {surveyPending && (
              <button onClick={() => { setSurveyPending(null); close(); }} style={{
                width: '100%', marginTop: 8, padding: 14, borderRadius: 14,
                background: cTier.name === 'BLACK' ? 'rgba(255,255,255,.08)' : '#F5F5F7',
                border: 'none',
                fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 700,
                color: cTier.name === 'BLACK' ? '#ccc' : '#424242',
                cursor: 'pointer',
              }}>
                Cancelar
              </button>
            )}
            </div>
          </>)}
        </GrowModal>
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

                {/* PROMO-1: puntos de la compra + promo aplicada (llega por
                    fetchPurchasePromo tras el INSERT Realtime) */}
                {pendingOpRating.points != null && (
                  <div style={{ fontSize: 16, fontWeight: 900, color: cTier.name === 'BLACK' ? '#81C784' : '#2E7D32', marginBottom: pendingOpRating.promo ? 8 : 6 }}>
                    +{pendingOpRating.points} pts
                    {pendingOpRating.amount != null && (
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#9E9E9E' }}> · Q{+pendingOpRating.amount}</span>
                    )}
                  </div>
                )}
                {pendingOpRating.promo && (
                  <div style={{
                    display: 'inline-block', padding: '7px 14px', borderRadius: 20,
                    background: cTier.name === 'BLACK' ? 'rgba(251,188,4,.15)' : '#FFF8E1',
                    border: '1px solid rgba(251,188,4,.45)',
                    fontSize: 12.5, fontWeight: 800, marginBottom: 10,
                    color: cTier.name === 'BLACK' ? '#FFD54F' : '#B58000',
                  }}>
                    {pendingOpRating.promo.effectType === 'grant_reward' ? (
                      // PROMO-1b: premio regalado — ya está en tus canjes
                      <>🎁 {pendingOpRating.promo.name} · ¡{pendingOpRating.promo.rewardName} gratis!
                        <div style={{ fontSize: 10.5, fontWeight: 700, opacity: .85, marginTop: 2 }}>
                          Ya está en tus canjes pendientes — retiralo en estación
                        </div>
                      </>
                    ) : (
                      <>🎉 {pendingOpRating.promo.name}
                        {pendingOpRating.promo.effectType === 'points_multiplier' && ` x${+pendingOpRating.promo.effectValue}`}
                        {' '}· +{pendingOpRating.promo.extraPoints} pts extra
                      </>
                    )}
                  </div>
                )}

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
