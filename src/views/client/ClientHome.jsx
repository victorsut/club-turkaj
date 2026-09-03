// src/views/client/ClientHome.jsx
// Main client dashboard: tier card, stats, survey, QR, promo carousel, history
import { useState } from 'react';
import { bento, homeColors, homeTileColors } from '../../constants/styles';
import { CARD_PREFIX } from '../../constants/config';
import OpRatingModal from '../../components/OpRatingModal';
import SurveyResultModal from '../../components/SurveyResultModal';
import LegalFooter from '../../components/ui/LegalFooter';
import BentoTile from '../../components/ui/BentoTile';
import TierCardBento from '../../components/ui/TierCardBento';
import InactivityWarning from '../../components/ui/InactivityWarning';
import HistorySheet from './HistorySheet';
import TierDetailModal from './home/TierDetailModal';
import WifiModal from './home/WifiModal';
import StationsMapModal from './home/StationsMapModal';
import SurveyStationsModal from './home/SurveyStationsModal';
import HomeHeader from './home/HomeHeader';
import PromoBentoTile from './home/PromoBentoTile';
import useShortScreen from '../../hooks/useShortScreen';
import useSurveyFlow from '../../hooks/useSurveyFlow';
import NotificationsSheet from './NotificationsSheet';
import SupportSheet from '../../components/ui/SupportSheet';
import { CarIcon, WifiIcon, SurveyIcon, PinIcon, TicketStarIcon, BagIcon } from '../../components/ui/BentoIcons';
import { originFromEvent, centerDeltaFromEvent } from '../../lib/motionOrigin';

export default function ClientHome(ctx) {
  // Poda 14-ago (división etapa 3): fuera del ctx los símbolos MUERTOS
  // en esta vista (gT, TH, showHist, showInvite, showRedeemed, custs,
  // logout, rafData, curMonth — este último solo alimentaba el derivado
  // currentMonthTickets, también muerto).
  const { me, cfg, cTier, activePromos, promoIdx, setPromoIdx,
    mySurveyCount, doSurvey,
    showWifi, setShowWifi, showMap, setShowMap, stations, showQR,
    showSurveys, setShowSurveys, fire,
    pendingOpRating, setPendingOpRating, sbConnected,
    activityLog, redeemedList,
    setCScr, setNavOrigin, dark, chosenDark, setVehicleFocus,
    myNotifs, markNotifsRead, clearNotifs, rewardQrCloseSignal } = ctx;

  // FIX (11-ago): el guard va ANTES de todos los hooks (Rules of Hooks).
  // Antes vivía en medio (línea ~76), tras 2 hooks y antes de otros 13:
  // un render con me=null habría lanzado "rendered fewer hooks" (pantalla
  // blanca). Hoy no truena porque los setMe(null) van batcheados con el
  // cambio de authScreen, pero era un crash latente. No hay ESLint que
  // lo detecte en el proyecto.
  if (!me) return null;

  // Campana (badge de no leídas — el header vive en HomeHeader) y
  // canal de asistencia; los sheets se renderizan acá.
  const [showNotifs, setShowNotifs] = useState(null); // { origin } | null
  const unreadN = (myNotifs || []).filter(n => !n.read_at).length;
  const [supportOpen, setSupportOpen] = useState(false);

  // Flujo de la Encuesta de Satisfacción (pendiente persistida +
  // resolución en 3 vías + modal de resultado) — hooks/useSurveyFlow.
  const { surveyPending, setSurveyPending, surveyResult, setSurveyResult } =
    useSurveyFlow({ me, doSurvey, setShowSurveys });

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
  // Pantallas cortas: tipografías y paddings compactos para caber sin scroll.
  const shortScr = useShortScreen();
  const [showTierDetail, setShowTierDetail] = useState(false);
  const [histSheet, setHistSheet] = useState(null); // { type: 'compras'|'canjes', origin } | null
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

  // Acento de los iconos según la identidad del nivel.
  const tierAccent = isBlack ? '#FBBC04' : cTier.name === 'PLATINO' ? '#6B767D' : bento.gold;
  // Paleta del bento según el nivel (ORO cálida / PLATINO fría / BLACK oscura)
  const hp = homeColors(cTier.name);
  // Cuadros del bento (14-ago): en BLACK son translúcidos y siguen el
  // modo ELEGIDO (chosenDark) — el fondo galaxia y las superficies van
  // siempre en oscuro, la elección solo varía las cajas. Modales y
  // sheets siguen con hp (identidad).
  const htp = homeTileColors(cTier.name, chosenDark ?? dark);

  return (
    <div style={{ background: (dark || isBlack) ? 'transparent' : bento.pageBg }}>
      {/* Sección que llena la resolución del dispositivo; el disclaimer
          queda bajo el fold y aparece al scrollear (feedback IMG3) */}
      <div className="pp-home-fit" style={{ paddingBottom: 76 }}>
      {/* Inactivity warning */}
      {/* Aviso de inactividad — solo con el motor de degradación ACTIVO */}
      {cfg.degradEnabled && <InactivityWarning lastBuy={me.lastBuy} tierName={cTier.name} dark={dark} />}

      {/* Header + saludo + festivo (home/HomeHeader) */}
      <HomeHeader
        me={me} cfg={cfg} dark={dark} shortScr={shortScr}
        unreadN={unreadN} sbConnected={sbConnected}
        onOpenNotifs={(e) => setShowNotifs({ origin: originFromEvent(e) })}
        onOpenSupport={() => setSupportOpen(true)}
        onOpenMenu={(e) => { if (setNavOrigin) setNavOrigin(originFromEvent(e)); setCScr('menu'); }}
      />

      {/* Tarjeta de nivel (D34: doble zona táctil — general → detalle, puntos → Canjes) */}
      <TierCardBento
        me={me}
        cTier={cTier}
        onOpenDetail={(e) => { setModalOrigin(withTint(e, tierTint)); setShowTierDetail(true); }}
        onPointsTap={(e) => { if (setNavOrigin) setNavOrigin(originFromEvent(e)); setCScr('cat'); }}
      />

      {/* ── Bento grid (referencia FORMATO GENERAL) ── */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto 1fr 1fr auto', gap: shortScr ? 9 : 11, padding: shortScr ? '10px 16px 0' : '12px 16px 0' }}>

        {/* 1 · Promociones (R1b.2/D33 — home/PromoBentoTile): tap →
            ventana PROMOCIONES; arrastre horizontal → cambia el carrusel */}
        <PromoBentoTile
          activePromos={activePromos} promoIdx={promoIdx} setPromoIdx={setPromoIdx}
          onOpen={(e) => { if (setNavOrigin) setNavOrigin(originFromEvent(e)); setCScr('promos'); }}
        />

        {/* 2 · Vehículo (placeholder hasta F6 — D34) */}
        <BentoTile
          index={1} square color={htp.vehicle} titleColor={htp.vehicleTitle} ink={htp.vehicleInk || '#fff'}
          icon={<CarIcon color={htp.vehicleInk} />} title="Vehículo"
          sub="Administra y consulta tus vehículos" badge="PRÓXIMAMENTE"
          onClick={(e) => { if (setNavOrigin) setNavOrigin(originFromEvent(e)); setCScr('veh'); }}
        />

        {/* 3 · WiFi (beneficio PLATINO/BLACK — D34) */}
        <BentoTile
          index={2} color={htp.wifi} ink={htp.wifiInk || '#fff'} titleColor={htp.wifiTitle}
          icon={<WifiIcon color={htp.wifiInk || '#fff'} />} title="WiFi"
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
          index={3} color={htp.survey} ink={htp.surveyInk} titleColor={htp.surveyTitle}
          icon={<SurveyIcon color={htp.surveyInk} />} title="Encuesta de Satisfacción"
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
          index={4} color={htp.location} ink={htp.locationInk || '#fff'} titleColor={htp.locationTitle}
          icon={<PinIcon color={htp.locationInk || '#fff'} />} title="Ubicación"
          sub="Ubica nuestras estaciones"
          onClick={(e) => { setModalOrigin(withTint(e, hp.location)); setShowMap(true); }}
        />

        {/* 6 · Historial de canjes */}
        <BentoTile
          index={5} color={htp.redeems} ink={htp.redeemsInk || '#fff'} titleColor={htp.redeemsTitle}
          icon={<TicketStarIcon color={htp.redeemsInk || '#fff'} />} title="Historial de Canjes"
          sub={`${myRedeemed.length} canje${myRedeemed.length === 1 ? '' : 's'} realizados`}
          onClick={(e) => setHistSheet({ type: 'canjes', origin: originFromEvent(e), tint: hp.redeems, accent: hp.redeems, accentInk: hp.redeemsInk })}
        />

        {/* 7 · Historial de compras (ancho completo) */}
        <BentoTile
          index={6} span={2} color={htp.purchases} titleColor={htp.purchasesTitle} ink={htp.purchasesInk || '#fff'}
          icon={<BagIcon size={32} color={htp.purchasesInk} />} title="Historial de Compras"
          sub="Compras y todos tus movimientos de puntos"
          onClick={(e) => setHistSheet({ type: 'compras', origin: originFromEvent(e), tint: hp.purchases, accent: hp.purchasesAccent || hp.purchases, accentInk: hp.purchasesAccentInk })}
        />
      </div>



      </div>{/* /pp-home-fit */}

      {/* Disclaimer legal D28 — pegado al historial de compras: entra en
          la zona de holgura de la nav (queda oculto tras la barra hasta
          scrollear, sigue bajo el fold) */}
      <div style={{ marginTop: -52 }}>
        <LegalFooter color={dark ? 'rgba(255,255,255,.4)' : '#9E9E9E'} />
      </div>
      <div style={{ height: 72 }} />

      {/* Detalle del nivel (tocar la tarjeta — D34) */}
      {showTierDetail && (
        <TierDetailModal onClose={() => setShowTierDetail(false)}
          origin={mOrigin} tint={mTint} tierTint={tierTint}
          tierAccent={tierAccent} isBlack={isBlack} dark={dark}
          cTier={cTier} cfg={cfg} />
      )}

      {/* WiFi — geolocalización: en la estación muestra red y clave;
          sin ubicación o lejos, pase de acceso (clave con el operador) */}
      {showWifi && (
        <WifiModal onClose={() => setShowWifi(false)}
          origin={mOrigin} tint={mTint} dark={dark} hp={hp}
          cTier={cTier} stations={stations} displayCode={displayCode} fire={fire} />
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
          dark={dark}
          qrOverlayOpen={showQR}
          rewardQrCloseSignal={rewardQrCloseSignal}
        />
      )}
      {/* Stations modal */}
      {showMap && (
        <StationsMapModal onClose={() => setShowMap(false)}
          origin={mOrigin} tint={mTint} dark={dark} hp={hp}
          cfg={cfg} stations={stations} />
      )}

      {/* Survey station selection modal */}
      {showSurveys && (
        <SurveyStationsModal onClose={() => setShowSurveys(false)}
          origin={mOrigin} tint={mTint} dark={dark} hp={hp}
          cfg={cfg} mySurveyCount={mySurveyCount}
          myActs={myActs} meStation={me.station} stations={stations}
          surveyPending={surveyPending} setSurveyPending={setSurveyPending} />
      )}

      {/* Modal post-compra (Realtime): estrellas + invitación a la
          encuesta Shell de la estación de la compra. key = nueva compra
          reinicia el paso interno del modal. */}
      {pendingOpRating && (
        <OpRatingModal
          key={pendingOpRating.purchaseId || 'compra'}
          data={pendingOpRating}
          onClose={() => setPendingOpRating(null)}
          dark={dark}
          memberId={me.id}
          sbConnected={sbConnected}
          fire={fire}
          cfg={cfg}
          mySurveyCount={mySurveyCount}
          accent={hp.survey}
          accentInk={hp.surveyInk || '#fff'}
          surveyPending={surveyPending}
          setSurveyPending={setSurveyPending}
        />
      )}

      {/* Resultado de la encuesta — persistente hasta que el cliente
          lo cierre (sustituye al toast, que se perdía cuando la PWA
          se recargaba al volver de Shell) */}
      {surveyResult && (
        <SurveyResultModal
          result={surveyResult}
          onClose={() => setSurveyResult(null)}
          dark={dark}
        />
      )}

      {/* Inbox de la campana: notificaciones del motor, se marcan
          leídas al abrir (el badge se apaga al instante). */}
      {/* Canal de asistencia (WhatsApp / llamada + horario en vivo) */}
      {supportOpen && (
        <SupportSheet onClose={() => setSupportOpen(false)} dark={dark} phone={cfg?.supportPhone} />
      )}

      {showNotifs && (
        <NotificationsSheet
          origin={showNotifs.origin}
          onClose={() => setShowNotifs(null)}
          notifs={myNotifs}
          markRead={markNotifsRead}
          clearNotifs={clearNotifs}
          tierName={cTier.name}
          dark={dark}
          onNavigate={(n) => {
            // F6 E4: aviso de servicio → Vehículos, en ese vehículo,
            // con la confirmación abierta (mismo destino que el push)
            if (n.type === 'vehiculo_servicio') {
              setShowNotifs(null);
              setVehicleFocus?.({ vehicleId: n.data?.vehicle_id || null, confirm: true, at: Date.now() });
              setCScr('veh');
            }
          }}
        />
      )}

    </div>
  );
}
