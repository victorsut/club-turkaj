// src/views/App.jsx
// Main orchestrator — manages global state, auth, Supabase sync, and view routing
// División 15-ago-2026 (regla de 500 líneas): las VISTAS (eager +
// lazy) viven en ScreenRouter.jsx, los modales de nivel raíz en
// components/AppModals.jsx y el arranque (OAuth + bootLoader) en
// hooks/useAuthBoot.js — todo movido VERBATIM.
import { useState, useCallback, useEffect, useRef } from 'react';
import { sb } from '../lib/supabaseClient';
import { makeTier } from '../lib/tierSystem';
import { CFG_INIT } from '../constants/config';
import { clientTheme, clientMainBg, adminTheme } from '../constants/styles';
import useToast from '../hooks/useToast';

// UI Components
import BottomNav from '../components/ui/BottomNav';
import GalaxyStars from '../components/ui/GalaxyStars';
import AppModals from '../components/AppModals';
import useBackLayer from '../hooks/useBackLayer';
import useStaffData from '../hooks/useStaffData';
import useAuthBoot from '../hooks/useAuthBoot';
import useMemberRealtime from '../hooks/useMemberRealtime';
import useNotificationsInbox from '../hooks/useNotificationsInbox';
import useSessionGuard from '../hooks/useSessionGuard';
import useBusinessActions from '../hooks/useBusinessActions';

// Router de pantallas: TODOS los imports de vistas (incluidos los
// React.lazy del code splitting por rol, 14-ago) viven allá.
import ScreenRouter, { operatorNav, clientNav } from './ScreenRouter';
import { originFromEvent } from '../lib/motionOrigin';
import { isPushSupported, subscribePush } from '../lib/pushNotifications';


export default function App() {
  // ===== ROLE & NAVIGATION =====
  // Determine role from URL: ?rol=admin | ?rol=operador | default=client
  const getInitialView = () => {
    const params = new URLSearchParams(window.location.search);
    const rol = (params.get('rol') || '').toLowerCase();
    if (rol === 'admin') return 'admin';
    if (rol === 'operador' || rol === 'operator') return 'operator';
    return 'client';
  };
  const [view, setView] = useState(getInitialView);       // admin | operator | client
  const viewRef = useRef(view);
  useEffect(() => { viewRef.current = view; }, [view]);
  const [scr, setScr] = useState('dash');            // admin screen
  const [cScr, setCScr] = useState('home');           // client screen
  const [oScr, setOScr] = useState('ohome');          // operator screen

  // ===== AUTH STATE =====
  // Restaurar sesion de operador/admin/cliente desde localStorage
  // (DEBE declararse antes de cualquier useState que use savedOp)
  const savedOp = (() => { try { return JSON.parse(localStorage.getItem('ct_op') || 'null'); } catch { return null; } })();
  const savedAdmin = (() => {
    try {
      const raw = localStorage.getItem('ct_admin');
      if (!raw) return null;
      // Compatibilidad con formato antiguo ('logged' suelto) → forzar re-login
      if (raw === 'logged') { localStorage.removeItem('ct_admin'); return null; }
      return JSON.parse(raw);
    } catch { return null; }
  })();
  const savedMe = (() => { try { return JSON.parse(localStorage.getItem('ct_me') || 'null'); } catch { return null; } })();

  const [authScreen, setAuthScreen] = useState(savedMe?.id ? 'logged' : 'login');
  const [me, setMe]                 = useState(savedMe);
  // Selector de empresa (1-ago-2026): al INICIAR SESIÓN como cliente se
  // elige la empresa antes del inicio (hoy solo Gasolineras Turkaj —
  // preparación por posibles requerimientos del dueño). Solo tras un
  // login explícito: con sesión ya guardada la app abre directo al
  // inicio (ajuste del dueño 1-ago — no aparecer en cada apertura);
  // el logout lo resetea para el siguiente ingreso.
  const [companyPicked, setCompanyPicked] = useState(!!savedMe?.id);

  // ===== MODO CLARO / OSCURO (24-jul-2026) =====
  // '' = sin elección → modo efectivo por nivel (BLACK oscuro, resto
  // claro). Se elige con sol/luna en el login o en el Menú y persiste.
  const [uiMode, setUiMode] = useState(() => {
    try { return localStorage.getItem('pp_mode') || ''; } catch { return ''; }
  });
  useEffect(() => {
    try {
      if (uiMode) localStorage.setItem('pp_mode', uiMode);
      else localStorage.removeItem('pp_mode');
    } catch { /* localStorage no disponible */ }
  }, [uiMode]);

  const [authOp, setAuthOp]     = useState(savedOp ? 'logged' : 'login');
  const [loggedOp, setLoggedOp] = useState(savedOp);           // operator data after login
  const [opScanMode, setOpScanMode] = useState(false);      // open QR scanner on OpClients
  const [opRedeemScan, setOpRedeemScan] = useState(false);  // open QR scanner on OpRedeem
  // OpRaffle (rifa operador): estado de la pantalla de compra de boletos
  const [opRafClient, setOpRafClient] = useState(null);     // cliente seleccionado
  const [opRafScan, setOpRafScan] = useState(null);         // estado del escaneo / tarjeta
  const [opRafQty, setOpRafQty] = useState(1);              // cantidad de boletos
  const [opSearch, setOpSearch] = useState('');             // busqueda por nombre
  const [stations, setStations] = useState([]);               // gas stations from Supabase
  const [stores, setStores] = useState([]);                   // D18: tiendas asociadas (partner_stores)
  const [authAdmin, setAuthAdmin]   = useState(savedAdmin ? 'logged' : 'login');
  const [loggedAdmin, setLoggedAdmin] = useState(savedAdmin); // admin data after login
  const [authError, setAuthError] = useState('');
  const clearAuthErr = () => { if (authError) setAuthError(''); };

  // Auth form fields
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regProfile, setRegProfile] = useState({ name: '', dpi: '', plate: '', email: '', bday: '', nit: '' });
  const [googleStep, setGoogleStep] = useState('welcome');
  const [opLoginGafete, setOpLoginGafete] = useState('');
  const [opLoginDpi, setOpLoginDpi] = useState('');
  const [opLoginUser, setOpLoginUser] = useState('');
  const [opLoginPass, setOpLoginPass] = useState('');
  const [adLoginDpi, setAdLoginDpi] = useState('');
  const [adLoginGafete, setAdLoginGafete] = useState('');
  const [adLoginEmail, setAdLoginEmail] = useState('');
  const [adLoginPass, setAdLoginPass] = useState('');

  // ===== DATA STATE =====
  // me y authScreen ya declarados arriba con persistencia localStorage
  const [custs, setCusts] = useState([]);
  const [operators, setOperators] = useState([]);
  const [showOpReg, setShowOpReg] = useState(false);
  const [editOp, setEditOp] = useState(null);
  const [editMember, setEditMember] = useState(null); // miembro en edicion (MemberDetail / Members)
  const [newOp, setNewOp] = useState({ name: '', user: '', password: '', dpi: '', gafete: '', phone: '', station: 'Turkaj I', bomba: '', turno: 'Matutino', email: '' });
  const [rewards, setRewards] = useState([]);
  const [promos, setPromos] = useState([]);
  const [promoIdx, setPromoIdx] = useState(0);
  const [mySurveyCount, setMySurveyCount] = useState(0);
  const [activityLog, setActivityLog] = useState({});
  const [cfg, setCfg] = useState(CFG_INIT);
  const [raffleCal, setRaffleCal] = useState([]);
  // Rifa multi-año (8-ago): rifas SORTEADAS de otros años — solo para
  // que el modal de ganador las encuentre al cruzar el año (raffleCal
  // conserva sus 12 slots del año en curso para todos los consumidores).
  const [crossYearWins, setCrossYearWins] = useState([]);
  const [rafData, setRafData] = useState(Array(12).fill(null).map(() => ({ participants: [] })));
  const [opRatings, setOpRatings] = useState({});
  const [redeemedList, setRedeemedList] = useState([]);

  // ===== UI STATE =====
  const [sel, setSel] = useState(null);          // selected member (admin)
  const [q, setQ] = useState('');                 // search query
  const [amt, setAmt] = useState('');
  const [fuel, setFuel] = useState('super');
  const [catF, setCatF] = useState('todos');
  // Señal (contador) para que Catalog abra sus canjes PENDIENTES al
  // llegar por deep-link de notificación de premio (type 'reward').
  const [catPendingSignal, setCatPendingSignal] = useState(0);
  // Inbox de la campana del inicio: notificaciones del miembro logueado.
  const [showHist, setShowHist] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showRedeemed, setShowRedeemed] = useState(false);
  const [showWifi, setShowWifi] = useState(false);
  // R1b/D35: origen (cuadro o pestaña presionada) del que "sale" la
  // vista del cliente al cambiar de pantalla (container transform).
  const [navOrigin, setNavOrigin] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [pendingOpRating, setPendingOpRating] = useState(null);
  const [pendingRedeemConfirm, setPendingRedeemConfirm] = useState(null); // { redemptionId, rewardName, rewardIcon, cost } // { operatorId, operatorName }
  const [purchaseConfirm, setPurchaseConfirm] = useState(null); // { client, amt, fuel, onConfirm }
  const [redeemConfirm, setRedeemConfirm]   = useState(null); // { reward, cost }
  // Cierre animado del sheet de canje: se desliza hacia abajo (inverso
  // de la apertura) al tocar Cancelar o fuera del componente.
  const [rcClosing, setRcClosing] = useState(false);
  const closeRedeemConfirm = () => {
    if (rcClosing) return;
    setRcClosing(true);
    setTimeout(() => { setRedeemConfirm(null); setRcClosing(false); }, 220);
  };
  // ── Botón físico de volver (Android/gesto del navegador) ──
  // Cada capa abierta registra su cierre: volver cierra la capa superior
  // (modal/sheet) o regresa al inicio desde cualquier ventana, en vez de
  // salir de la app. GrowModal/HistorySheet se registran solos.
  useBackLayer(view === 'client' && cScr !== 'home', () => setCScr('home'));
  useBackLayer(view === 'client' && showQR, () => closeQR());
  useBackLayer(view === 'client' && !!redeemConfirm, () => closeRedeemConfirm());

  // Cierre animado del sheet del código QR (misma regla).
  const [qrClosing, setQrClosing] = useState(false);
  const closeQR = () => {
    if (qrClosing) return;
    setQrClosing(true);
    setTimeout(() => { setShowQR(false); setQrClosing(false); }, 220);
  };
  const [showSurveys, setShowSurveys] = useState(false);
  const [specialBonusModal, setSpecialBonusModal] = useState({ open: false, events: [], bonus: 0, memberName: '' });
  const [sortDir, setSortDir] = useState('desc');
  const [memSort, setMemSort] = useState('all');
  const [stationFilter, setStationFilter] = useState(null);
  const [stationMode, setStationMode] = useState('last');
  // SEC.C.2b: estación por miembro (última compra / más frecuente)
  // derivada server-side de purchases — { member_id: {last, top} }.
  const [memberStations, setMemberStations] = useState({});
  const [sbConnected, setSbConnected] = useState(false);
  const [sbLoading, setSbLoading] = useState(true);

  // ===== HELPERS =====
  const { toast, fire } = useToast();
  const gT = useCallback((gal) => makeTier(gal, cfg), [cfg]);
  const curMonth = new Date().getMonth();
  const isA = view === 'admin';
  const isO = view === 'operator';
  const isC = view === 'client';
  const cTier = me ? gT(me.gallons) : gT(0);

  // Panel admin RESPONSIVO (4-ago): con sesión de admin el lienzo crece
  // a 1080px — la clase va en <body> porque #root (max-width 480 en
  // global.css) vive fuera del árbol de React. Cliente/operador y el
  // login de admin conservan el lienzo móvil.
  const adminWide = isA && authAdmin === 'logged';
  // Admin v2.1 (6-ago): el lienzo ancho aplica a TODA la vista admin —
  // incluido el LOGIN (pantalla dividida en computadora/tablet); el
  // shell con sidebar sigue apareciendo solo con sesión (adminWide).
  useEffect(() => {
    document.body.classList.toggle('pp-adm-wide', isA);
    return () => document.body.classList.remove('pp-adm-wide');
  }, [isA]);
  // Modo efectivo: elección del usuario o, sin ella, el histórico del
  // nivel (BLACK oscuro, ORO/PLATINO claro). En login/registro (sin
  // sesión) manda solo la elección; por defecto claro.
  // BLACK (14-ago, dueño): el fondo galaxia oscuro es ÚNICO para ambos
  // modos — las superficies van SIEMPRE en oscuro y la elección del
  // usuario (chosenDark) solo varía las cajas del inicio (homeTileColors).
  const chosenDark = uiMode ? uiMode === 'dark' : cTier.name === 'BLACK';
  const dark = cTier.name === 'BLACK' ? true : chosenDark;
  const TH = clientTheme(cTier.name, dark);
  const isLoggedIn = (isC && authScreen === 'logged') || (isO && authOp === 'logged') || (isA && authAdmin === 'logged');

  // ===== ACCIONES DE NEGOCIO (división etapa 4, 12-ago-2026) =====
  // Todas delegan en RPCs atómicas; acá solo optimismo de UI. Viven en
  // hooks/useBusinessActions.js — logActivity/addPurchase/redeem/
  // buyTickets/doSurvey van al ctx; loadTodaySurveys y
  // checkSpecialDayBonus los consumen los efectos de más abajo.
  const {
    logActivity, loadTodaySurveys, checkSpecialDayBonus,
    addPurchase, redeem, buyTickets, doSurvey,
  } = useBusinessActions({
    me, curMonth, fire, sbConnected, loggedOp,
    setMe, setCusts, setActivityLog, setMySurveyCount,
    setRedeemedList, setRafData, setSpecialBonusModal, setAmt,
  });

  // ===== HOOKS DE DATOS (división etapa 3, 12-ago-2026) =====
  // Staff: fichas completas, actividad global, participantes de rifa y
  // realtime de custs; expone los refs anti-carrera que consume el boot.
  // (División 15-ago: se llama ANTES que useAuthBoot porque el boot
  // recibe sus refs — el orden de efectos es indiferente: las guardas
  // de sbConnected/sesión ya toleraban cualquier orden de llegada.)
  const { addMemberToCusts, custsFullRef, bootCustsRef, opsFullRef } = useStaffData({
    authOp, authAdmin, authScreen, meId: me?.id, sbConnected, raffleCal,
    setCusts, setOperators, setActivityLog, setMemberStations, setRafData,
  });

  // ===== ARRANQUE (división 15-ago-2026) =====
  // Listener de Google OAuth + getSession + limpieza del hash y la
  // carga inicial (services/bootLoader) viven en hooks/useAuthBoot.js.
  useAuthBoot({
    viewRef,
    setMe, setCusts, setAuthScreen, setView, setGoogleStep, setRegProfile,
    bootCustsRef, custsFullRef, opsFullRef,
    setRewards, setStores, setPromos, setStations, setCfg,
    setRaffleCal, setCrossYearWins, setOperators,
    setOpRatings, setSbConnected, setSbLoading,
  });

  // Miembro: rehidratación de sesión (SEC.C.1), libro mayor y canjes
  // propios (SEC.C.2) y canales realtime (puntos en vivo, confirmación
  // de canje, modal de calificación tras combustible, rating en vivo).
  const { reloadMyRedemptions } = useMemberRealtime({
    me, authScreen, sbConnected, viewRef,
    rewards, stations, operators, loggedOp,
    setMe, setAuthScreen, setCusts, setActivityLog, setRedeemedList,
    setPendingRedeemConfirm, setPendingOpRating, setShowQR, setQrClosing,
    setOpRatings,
  });

  // Inbox de la campana + navegación disparada por notificaciones
  // (mensajes del Service Worker y deep-links por URL).
  const { myNotifs, markNotifsRead, clearNotifs } = useNotificationsInbox({
    me, authScreen, sbConnected, viewRef,
    setCScr, setPendingOpRating, setCatPendingSignal,
  });

  // ===== CARGAR ENCUESTAS DEL DIA AL CAMBIAR DE USUARIO =====
  // Sin esperar sbConnected (14-ago): el RPC count_my_surveys_today solo
  // necesita la sesión del miembro — con la compuerta del boot completo
  // el conteo del tile de Encuesta tardaba varios segundos en aparecer.
  useEffect(() => {
    if (me?.id && !me.id.startsWith('temp-') && sb) loadTodaySurveys(me.id);
  }, [me?.id, loadTodaySurveys]);

  // ===== DÍAS FESTIVOS: Verificar al loguearse =====
  useEffect(() => {
    if (!me?.id || viewRef.current !== 'client' || authScreen !== 'logged' || me.id.startsWith('temp-')) return;
    checkSpecialDayBonus(me.id, me.bday);
  }, [me?.id, authScreen]);

  // ===== PUSH NOTIFICATIONS: Subscribe when member logs in =====
  useEffect(() => {
    if (!me?.id || viewRef.current !== 'client' || authScreen !== 'logged') return;
    if (!isPushSupported()) {
      console.log('[Push] Not supported in this browser/context');
      return;
    }
    // Always attempt subscription — subscribePush is idempotent (upsert)
    // This retries if previous attempt failed (e.g. missing manifest before fix)
    console.log('[Push] Attempting subscription for member:', me.id);
    subscribePush(me.id).then(ok => {
      console.log('[Push] Subscription result:', ok ? '✅ OK' : '⚠️ Failed/Denied');
    });
  }, [me?.id, authScreen]);


  // Señal para cerrar el QR del premio en HistorySheet al confirmar la
  // entrega (pedido del dueño 29-jul) — el sheet vive dentro del
  // historial, así que viaja por ctx como contador.
  const [rewardQrCloseSignal, setRewardQrCloseSignal] = useState(0);

  // ===== PROMO CAROUSEL AUTO-ADVANCE =====
  const activePromos = promos.filter(p => p.active);
  useEffect(() => {
    if (activePromos.length > 1) {
      const t = setInterval(() => setPromoIdx(i => (i + 1) % activePromos.length), 4000);
      return () => clearInterval(t);
    }
  }, [activePromos.length]);

  // ===== BUSINESS LOGIC CALLBACKS =====
  // Sincronizar sesion cliente a localStorage cuando cambia
  useEffect(() => {
    if (me?.id && !me.id.startsWith('temp-') && authScreen === 'logged') {
      localStorage.setItem('ct_me', JSON.stringify(me));
    }
  }, [me?.id, authScreen]);


  // Ciclo de vida de sesiones (división etapa 3): logout manual +
  // expiración proactiva (SEC.B.6.4) y reactiva (SEC.B.8.2).
  const { logout } = useSessionGuard({
    view, viewRef, fire, loggedOp, loggedAdmin,
    setMe, setGoogleStep, setMySurveyCount, setLoggedOp, setAuthScreen,
    setCScr, setCompanyPicked, setLoginPhone, setLoginPass, setAuthError,
    setAuthOp, setOScr, setAuthAdmin, setLoggedAdmin, setScr,
  });

  // ===== SHARED PROPS OBJECT =====
  // This bundles all state + actions needed by child views
  const ctx = {
    // State
    me, setMe, custs, setCusts, operators, setOperators,
    showOpReg, setShowOpReg, editOp, setEditOp, newOp, setNewOp,
    editMember, setEditMember,
    rewards, setRewards, promos, setPromos, promoIdx, setPromoIdx, activePromos,
    mySurveyCount, setMySurveyCount,
    activityLog, setActivityLog, cfg, setCfg,
    raffleCal, setRaffleCal, rafData, setRafData,
    opRatings, setOpRatings, redeemedList, setRedeemedList,
    sel, setSel, q, setQ, amt, setAmt, fuel, setFuel,
    catF, setCatF, catPendingSignal,
    myNotifs, markNotifsRead, clearNotifs,
    showHist, setShowHist, showInvite, setShowInvite,
    showRedeemed, setShowRedeemed, showWifi, setShowWifi,
    showMap, setShowMap,
    showQR, setShowQR,
    pendingOpRating, setPendingOpRating,
    pendingRedeemConfirm, setPendingRedeemConfirm,
    purchaseConfirm, setPurchaseConfirm,
    redeemConfirm, setRedeemConfirm,
    showSurveys, setShowSurveys,
    sortDir, setSortDir, memSort, setMemSort,
    stationFilter, setStationFilter, stationMode, setStationMode, memberStations,
    rewardQrCloseSignal,
    // Auth
    authScreen, setAuthScreen, authOp, setAuthOp, loggedOp, setLoggedOp, opScanMode, setOpScanMode, opRedeemScan, setOpRedeemScan, stations, setStations, stores, setStores, authAdmin, setAuthAdmin, loggedAdmin, setLoggedAdmin,
    opRafClient, setOpRafClient, opRafScan, setOpRafScan, opRafQty, setOpRafQty, opSearch, setOpSearch,
    authError, setAuthError, clearAuthErr,
    loginPhone, setLoginPhone, loginPass, setLoginPass,
    regPhone, setRegPhone, regProfile, setRegProfile,
    googleStep, setGoogleStep,
    opLoginGafete, setOpLoginGafete, opLoginDpi, setOpLoginDpi,
    opLoginUser, setOpLoginUser, opLoginPass, setOpLoginPass,
    adLoginDpi, setAdLoginDpi, adLoginGafete, setAdLoginGafete,
    adLoginEmail, setAdLoginEmail, adLoginPass, setAdLoginPass,
    // Helpers
    gT, cTier, TH, curMonth, fire, addMemberToCusts,
    dark, chosenDark, uiMode, setUiMode,
    sbConnected, sbLoading,
    logActivity,
    // Actions
    addPurchase, redeem, buyTickets, doSurvey, logout,
    // Navigation
    view, setView, scr, setScr, cScr, setCScr, oScr, setOScr,
    setNavOrigin,
    isA, isO, isC,
  };

  // ===== NAV =====
  // Los arrays (con sus iconos) viven en ScreenRouter.jsx; el admin no
  // tiene BottomNav (Admin v2: AdminShell con menú lateral).
  const nav = isO ? operatorNav : clientNav;
  const cur = isA ? scr : isO ? oScr : cScr;

  // ===== HANDLE NAV =====
  function handleNav(id, e) {
    if (isA) { setScr(id); setSel(null); }
    else if (isO) { setOScr(id); }
    else if (id === 'qr') { setShowQR(true); }
    else {
      // D35: la vista nueva "sale" de la pestaña presionada.
      setNavOrigin(e ? originFromEvent(e) : null);
      setCScr(id);
    }
  }

  // ===== RENDER =====
  return (
    <>
      <div style={{
        // Admin v2 (6-ago): el shell (y el login de pantalla dividida)
        // administran su propio ancho — sin límite de lienzo en admin.
        maxWidth: isA ? 'none' : 480, margin: '0 auto', minHeight: '100vh',
        background: isA ? adminTheme.bg
          : isO ? '#FAFAFA'
          : clientMainBg(cTier.name, dark),
        position: 'relative', overflowX: 'hidden',
        boxShadow: '0 0 60px rgba(0,0,0,.08)',
      }}>
        {/* BLACK: fondo galaxia con estrellas en deriva (CSS puro) —
            ÚNICO para ambos modos (14-ago, dueño): dark va forzado a
            true en BLACK, así que la variante `light` (doradas sobre
            perla) quedó inalcanzable; el modo elegido solo varía las
            cajas del inicio. */}
        {isC && cTier.name === 'BLACK' && authScreen === 'logged' && <GalaxyStars light={!dark} />}

        {/* Pantalla activa: router + Suspense del code splitting por
            rol (división 15-ago — vive en ScreenRouter.jsx) */}
        <ScreenRouter
          ctx={ctx}
          companyPicked={companyPicked}
          setCompanyPicked={setCompanyPicked}
          navOrigin={navOrigin}
        />

        {/* Bottom navigation — el cliente no la ve hasta elegir empresa;
            el admin dejó de usarla (Admin v2: menú lateral) */}
        {isLoggedIn && (!isC || companyPicked) && !adminWide && (
          <BottomNav items={nav} current={cur} onSelect={handleNav} view={view} tierName={cTier.name} dark={dark} />
        )}
      </div>

      {/* ── Modales de nivel raíz + Toast + aviso de versión (división
          15-ago — viven en components/AppModals.jsx; el modal de
          ganador de rifa y su efecto R1b.4 también viven allá) ── */}
      <AppModals
        ctx={ctx}
        toast={toast}
        rcClosing={rcClosing} closeRedeemConfirm={closeRedeemConfirm}
        qrClosing={qrClosing} closeQR={closeQR}
        setRewardQrCloseSignal={setRewardQrCloseSignal}
        reloadMyRedemptions={reloadMyRedemptions}
        specialBonusModal={specialBonusModal} setSpecialBonusModal={setSpecialBonusModal}
        crossYearWins={crossYearWins} setCrossYearWins={setCrossYearWins}
      />
    </>
  );
}
