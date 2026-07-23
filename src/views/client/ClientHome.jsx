// src/views/client/ClientHome.jsx
// Main client dashboard: tier card, stats, survey, QR, promo carousel, history
import { useState, useEffect, useCallback, useRef } from 'react';
import { sb } from '../../lib/supabaseClient';
import { sMono, bento, BRAND_RED, homeColors } from '../../constants/styles';
import PromoCard from '../../components/ui/PromoCard';
import { CARD_PREFIX } from '../../constants/config';
import Wordmark from '../../components/ui/Wordmark';
import LegalFooter from '../../components/ui/LegalFooter';
import BentoTile from '../../components/ui/BentoTile';
import TierCardBento from '../../components/ui/TierCardBento';
import InactivityWarning from '../../components/ui/InactivityWarning';
import HistorySheet from './HistorySheet';
import useShortScreen from '../../hooks/useShortScreen';
import { Menu, Fuel, Ticket, Percent, Tag, Wifi, Door, Cake, Pin, Clock, Chev, StarRate } from '../../components/ui/Icons';
import LogoSpinner from '../../components/ui/LogoSpinner';
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
  // Paleta del bento según el nivel (ORO cálida / PLATINO fría / BLACK oscura)
  const hp = homeColors(cTier.name);

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
        // month=0 = cumpleaños del miembro (regla del sistema).
        // bday puede ser 'MM-DD' (miembros antiguos) o 'YYYY-MM-DD'.
        const bdayMD = (me.bday || '').length === 10 ? me.bday.slice(5) : me.bday;
        if (data.some(s => s.month === 0) && bdayMD && bdayMD === todayGT.slice(5)) {
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

      {/* Header + saludo (FORMATO GENERAL). En pantallas cortas se OMITE
          el logo (decisión del dueño 23-jul): solo saludo compacto +
          botón de menú; en pantallas grandes el logo conserva su fila
          propia como la referencia. El menú plano sustituye la campana
          (D34). */}
      {shortScr ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px 0' }}>
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
          index={1} square color={hp.vehicle} titleColor={hp.vehicleTitle} icon={<CarIcon />} title="Vehículo"
          sub="Administra y consulta tus vehículos" badge="PRÓXIMAMENTE"
          onClick={(e) => { if (setNavOrigin) setNavOrigin(originFromEvent(e)); setCScr('veh'); }}
        />

        {/* 3 · WiFi (beneficio PLATINO/BLACK — D34) */}
        <BentoTile
          index={2} color={hp.wifi} ink={hp.wifiInk || '#fff'} icon={<WifiIcon color={hp.wifiInk || '#fff'} />} title="WiFi"
          sub={cTier.name === 'ORO' ? 'Disponible desde nivel PLATINO' : 'Conéctate a nuestro WiFi gratis'}
          dimmed={cTier.name === 'ORO'}
          onClick={(e) => {
            if (cTier.name === 'ORO') { fire('El WiFi gratis se desbloquea en nivel PLATINO', 'info'); return; }
            setModalOrigin(withTint(e, hp.wifi));
            setShowWifi(true);
          }}
        />

        {/* 4 · Encuesta de Satisfacción (sustituye a "Encuentra Shell" — D34) */}
        <BentoTile
          index={3} color={hp.survey} ink={hp.surveyInk}
          icon={<SurveyIcon color={hp.surveyInk} />} title="Encuesta de Satisfacción"
          sub={mySurveyCount >= cfg.surveyDaily
            ? 'Completaste las de hoy'
            : `${mySurveyCount}/${cfg.surveyDaily} hoy · +${cfg.surveyPts} pts c/u`}
          onClick={(e) => {
            if (mySurveyCount >= cfg.surveyDaily) { fire('Ya completaste tus encuestas de hoy', 'success'); return; }
            setModalOrigin(withTint(e, hp.survey));
            setShowSurveys(true);
          }}
        />

        {/* 5 · Ubicación */}
        <BentoTile
          index={4} color={hp.location} ink={hp.locationInk || '#fff'} icon={<PinIcon color={hp.locationInk || '#fff'} />} title="Ubicación"
          sub="Ubica nuestras estaciones"
          onClick={(e) => { setModalOrigin(withTint(e, hp.location)); setShowMap(true); }}
        />

        {/* 6 · Historial de canjes */}
        <BentoTile
          index={5} color={hp.redeems} ink={hp.redeemsInk || '#fff'} icon={<TicketStarIcon color={hp.redeemsInk || '#fff'} />} title="Historial de Canjes"
          sub={`${myRedeemed.length} canje${myRedeemed.length === 1 ? '' : 's'} realizados`}
          onClick={(e) => setHistSheet({ type: 'canjes', origin: originFromEvent(e), tint: hp.redeems, accent: hp.redeems, accentInk: hp.redeemsInk })}
        />

        {/* 7 · Historial de compras (ancho completo) */}
        <BentoTile
          index={6} span={2} color={hp.purchases} titleColor={hp.purchasesTitle} icon={<BagIcon size={32} />} title="Historial de Compras"
          sub="Compras y todos tus movimientos de puntos"
          onClick={(e) => setHistSheet({ type: 'compras', origin: originFromEvent(e), tint: hp.purchases, accent: hp.purchasesAccent || hp.purchases, accentInk: hp.purchasesAccentInk })}
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
              <WifiIcon size={38} color={hp.wifi} />
            </div>
            <div style={{ fontSize: 19, fontWeight: 900, color: isBlack ? '#fff' : '#0D0D0D' }}>WiFi Puntos Plus</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: hp.wifi, marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 }}>
              Beneficio {cTier.name}
            </div>
            <div style={{ fontSize: 13, color: '#9E9E9E', lineHeight: 1.6, margin: '14px 0' }}>
              Mostrá esta pantalla al operador de la estación para recibir la clave WiFi.
            </div>
            <div style={{
              ...sMono, fontSize: 18, fontWeight: 800, letterSpacing: 2,
              padding: '12px 0', borderRadius: 14,
              background: isBlack ? 'rgba(255,255,255,.1)' : '#E9EAF6',
              color: hp.wifi,
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
          accent={histSheet.accent}
          accentInk={histSheet.accentInk}
          onClose={() => setHistSheet(null)}
          acts={myActs}
          redeemed={myRedeemed}
          tierName={cTier.name}
        />
      )}
      {/* Stations modal */}
      {showMap && (
        <GrowModal onClose={() => setShowMap(false)} origin={mOrigin} tint={mTint}
          background={cTier.name === 'BLACK' ? '#16161A' : '#fff'} maxHeight="86vh"
          arrowColor={hp.locationInk || '#fff'}>
          {() => (<>
            {/* Banda de identidad (patrón banda+cuerpo — color sólido
                del cuadro Ubicación con su tinta, centrada) */}
            <div style={{ background: hp.location, color: hp.locationInk || '#fff', padding: '22px 20px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.85 }}>
                Encuéntranos
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2, letterSpacing: 0.3 }}>
                Nuestras Estaciones
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.9, marginTop: 2 }}>
                Gasolineras Turkaj · Chichicastenango
              </div>
            </div>

            <div style={{ padding: '14px 20px 20px' }}>
            {(stations.length > 0 ? stations : [
              { name: 'Turkaj I', address: '' },
              { name: 'Turkaj II', address: '' },
              { name: 'Turkaj III', address: '' },
            ]).filter(s => s.active !== false).map((s) => (
              <div key={s.id || s.name} style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                padding: '13px 12px', marginBottom: 8, borderRadius: 16,
                background: cTier.name === 'BLACK' ? 'rgba(255,255,255,.05)' : '#F5F5F7',
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                  background: hp.location,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <PinIcon size={24} color={hp.locationInk || '#fff'} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: cTier.name === 'BLACK' ? '#E0E0E0' : '#0D0D0D' }}>
                    {s.name}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: cTier.name === 'BLACK' ? 'rgba(255,255,255,.5)' : '#6E6E73', marginTop: 3, lineHeight: 1.4 }}>
                    {s.address || 'Dirección no disponible'}
                  </div>
                  {/* Horario de atención (stations.schedule — dato de empresa) */}
                  {s.schedule && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 5, marginTop: 5,
                      fontSize: 11.5, fontWeight: 700,
                      color: cTier.name === 'BLACK' ? 'rgba(255,255,255,.75)' : hp.location,
                    }}>
                      <Clock /> {s.schedule}
                    </div>
                  )}
                  {/* Navegación: chips sólidos flat (sin emojis) */}
                  {(s.lat && s.lng) && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{
                          padding: '7px 14px', borderRadius: 10, textDecoration: 'none',
                          background: bento.blue, color: '#fff',
                          fontSize: 11, fontWeight: 700, fontFamily: "'DM Sans'",
                        }}>
                        Google Maps
                      </a>
                      <a href={`https://waze.com/ul?ll=${s.lat},${s.lng}&navigate=yes`}
                        target="_blank" rel="noopener noreferrer"
                        style={{
                          padding: '7px 14px', borderRadius: 10, textDecoration: 'none',
                          background: bento.teal, color: '#fff',
                          fontSize: 11, fontWeight: 700, fontFamily: "'DM Sans'",
                        }}>
                        Waze
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
            </div>
          </>)}
        </GrowModal>
      )}

      {/* Survey station selection modal */}
      {showSurveys && (
        <GrowModal onClose={() => setShowSurveys(false)} origin={mOrigin} tint={mTint}
          background={cTier.name === 'BLACK' ? '#101018' : '#fff'} maxHeight="88vh"
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

      {/* Operator Rating Modal — triggered by Realtime after purchase
          (FORMATO GENERAL: flat, sin emojis, spinner de marca) */}
      {pendingOpRating && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
          zIndex: 250, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20, animation: 'fadeUp .3s ease',
        }}>
          <div style={{
            background: isBlack ? '#101018' : '#fff',
            borderRadius: 24, maxWidth: 360, width: '100%', padding: '28px 24px',
            textAlign: 'center',
          }}>
            {savingRating ? (
              /* Saving state */
              <div style={{ padding: '24px 0', display: 'flex', justifyContent: 'center' }}>
                <LogoSpinner size={44} dark={isBlack} label="Enviando calificación..." />
              </div>
            ) : (
              <>
                {/* Header: surtidor blanco en cuadro verde sólido */}
                <div style={{
                  width: 56, height: 56, borderRadius: 16, margin: '0 auto 12px',
                  background: bento.green, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Fuel />
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: isBlack ? '#fff' : '#0D0D0D', marginBottom: 6 }}>
                  ¡Compra registrada!
                </div>

                {/* PROMO-1: puntos de la compra + promo aplicada (llega por
                    fetchPurchasePromo tras el INSERT Realtime) */}
                {pendingOpRating.points != null && (
                  <div style={{ fontSize: 16, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: isBlack ? '#7CD98F' : bento.green, marginBottom: pendingOpRating.promo ? 8 : 6 }}>
                    +{pendingOpRating.points} pts
                    {pendingOpRating.amount != null && (
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#9E9E9E' }}> · Q{+pendingOpRating.amount}</span>
                    )}
                  </div>
                )}
                {pendingOpRating.promo && (
                  <div style={{
                    display: 'inline-block', padding: '8px 14px', borderRadius: 12,
                    background: isBlack ? 'rgba(217,164,11,.18)' : '#FAF1DC',
                    fontSize: 12.5, fontWeight: 700, marginBottom: 10,
                    color: isBlack ? '#FFD54F' : '#B58000',
                  }}>
                    {pendingOpRating.promo.effectType === 'grant_reward' ? (
                      // PROMO-1b: premio regalado — ya está en tus canjes
                      <>{pendingOpRating.promo.name} · ¡{pendingOpRating.promo.rewardName} gratis!
                        <div style={{ fontSize: 10.5, fontWeight: 700, opacity: .85, marginTop: 2 }}>
                          Ya está en tus canjes pendientes — retiralo en estación
                        </div>
                      </>
                    ) : (
                      <>{pendingOpRating.promo.name}
                        {pendingOpRating.promo.effectType === 'points_multiplier' && ` x${+pendingOpRating.promo.effectValue}`}
                        {' '}· +{pendingOpRating.promo.extraPoints} pts extra
                      </>
                    )}
                  </div>
                )}

                <div style={{ fontSize: 12, fontWeight: 600, color: '#9E9E9E', marginBottom: 2 }}>
                  Fuiste atendido por
                </div>
                <div style={{
                  fontSize: 20, fontWeight: 800, marginBottom: 2,
                  color: isBlack ? '#fff' : '#0D0D0D',
                }}>
                  {pendingOpRating.operatorName}
                </div>
                {pendingOpRating.stationName && (
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#9E9E9E', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <Pin /> {pendingOpRating.stationName}
                  </div>
                )}

                {/* Stars — tap to rate and auto-submit */}
                <div style={{ fontSize: 13.5, fontWeight: 700, color: isBlack ? '#E0E0E0' : '#424242', marginBottom: 12 }}>
                  Calificá la atención
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 18 }}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <button key={s} onClick={() => submitOpRating(s)} aria-label={`${s} estrellas`} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: bento.amber, padding: 2, lineHeight: 0,
                      transition: 'transform .1s',
                    }}>
                      <StarRate size={36} />
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
