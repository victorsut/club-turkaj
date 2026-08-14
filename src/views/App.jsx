// src/views/App.jsx
// Main orchestrator — manages global state, auth, Supabase sync, and view routing
import { useState, useCallback, useEffect, useRef } from 'react';
import { sb } from '../lib/supabaseClient';
import { makeTier } from '../lib/tierSystem';
import { CFG_INIT } from '../constants/config';
import { createMemberSessionOauth, markRaffleWinnerSeen } from '../services';

// Guatemala es UTC-6 — helpers de fecha local en lib/dates.js
import { localDate, utcToLocal } from '../lib/dates';
import { loadFromSupabase } from '../services/bootLoader';
import { clientTheme, clientMainBg, adminTheme } from '../constants/styles';
import useToast from '../hooks/useToast';

// UI Components
import BottomNav from '../components/ui/BottomNav';
import GalaxyStars from '../components/ui/GalaxyStars';
import SpecialDayBonusModal from '../components/SpecialDayBonusModal';
import UpdateAvailable from '../components/UpdateAvailable';
import { Fuel, Users, Gift, Ticket, House, TicketStar, Car } from '../components/ui/Icons';
import Toast from '../components/ui/Toast';
import RaffleWinnerModal from '../components/RaffleWinnerModal';
import RedeemConfirmRequestModal from '../components/RedeemConfirmRequestModal';
import RedeemConfirmSheet from '../components/RedeemConfirmSheet';
import PurchaseConfirmSheet from '../components/PurchaseConfirmSheet';
import ClientQrSheet from '../components/ClientQrSheet';
import useBackLayer from '../hooks/useBackLayer';
import useStaffData from '../hooks/useStaffData';
import useMemberRealtime from '../hooks/useMemberRealtime';
import useNotificationsInbox from '../hooks/useNotificationsInbox';
import useSessionGuard from '../hooks/useSessionGuard';
import useBusinessActions from '../hooks/useBusinessActions';

// Auth Views
import ClientLogin from './client/ClientLogin';
import GoogleProfile from './client/GoogleProfile';
import OperatorLogin from './operator/OperatorLogin';
import AdminLogin from './admin/AdminLogin';

// Client Views
import ClientHome from './client/ClientHome';
import CompanySelect from './client/CompanySelect';
import Catalog from './shared/Catalog';
import ClientRaffle from './client/ClientRaffle';
import Rules from './shared/Rules';
import ClientMenu from './client/ClientMenu';
import ClientPromos from './client/ClientPromos';

// Operator Views
import OpHome from './operator/OpHome';
import OpClients from './operator/OpClients';
import OpRedeem from './operator/OpRedeem';
import OpRaffle from './operator/OpRaffle';

// Admin Views
import AdminDash from './admin/AdminDash';
import AdminShell from './admin/AdminShell';
import Members from './admin/Members';
import MemberDetail from './admin/MemberDetail';
import AdminRaffle from './admin/AdminRaffle';
import AdminPremios from './admin/AdminPremios';
import Settings from './admin/Settings';
import AdminPromos from './admin/AdminPromos';
import PromoRules from './admin/PromoRules';
import OpManagement from './admin/OpManagement';
import AdminManagement from './admin/AdminManagement';
import AdminCatalog from './admin/AdminCatalog';
import AnClientes from './admin/analytics/AnClientes';
import AnOperadores from './admin/analytics/AnOperadores';
import AnPromos from './admin/analytics/AnPromos';
import AnIntegridad from './admin/analytics/AnIntegridad';
import AdminStations from './admin/AdminStations';
import AuditLog from './admin/AuditLog';
import VehiclesSoon from './client/VehiclesSoon';
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

  // R1b.4 Rifa — modal de ganador: si el sorteo (draw_due_raffles) me
  // marcó ganador de una rifa que aún no he visto, felicitar UNA vez.
  // La marca de "visto" vive en el SERVIDOR (winner_seen_at — fix
  // 25-jul: con solo localStorage reaparecía en cada dispositivo);
  // localStorage queda como guarda instantánea secundaria.
  const [raffleWin, setRaffleWin] = useState(null);
  useEffect(() => {
    if (!me?.id || (!raffleCal.length && !crossYearWins.length)) return;
    try {
      // Rifa multi-año (8-ago): el pool incluye las sorteadas de OTROS
      // años (la de diciembre se sortea en enero del año siguiente y ya
      // no vive en los 12 slots del año en curso — sin esto el ganador
      // nunca veía su felicitación al cruzar el año).
      const pool = [...raffleCal, ...crossYearWins];
      const win = pool.find(r => r?.winnerId === me.id && r.drawnAt && r.dbId
        && !r.winnerSeenAt
        && !localStorage.getItem(`pp_rafwin_${r.dbId}`));
      if (win) setRaffleWin(win);
    } catch { /* localStorage no disponible */ }
  }, [me?.id, raffleCal, crossYearWins]);

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

  // ===== SUPABASE DATA LOADING =====
  useEffect(() => {
    if (!sb) { setSbLoading(false); return; }
    let mounted = true;

    // Auth state change listener (only for client/member view)
    const authSub = sb.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (viewRef.current !== 'client') return; // Ignore Google auth for admin/operator
      console.log('[Auth]', event, session?.user?.email || 'no session');
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session?.user) {
        setUserFromSession(session.user);
        // (El toast "👋 Bienvenido" se quitó a pedido del dueño: OAuth
        // re-emite SIGNED_IN en cada apertura y saludaba siempre.)
      }
      if (event === 'SIGNED_OUT') {
        setMe(null); setAuthScreen('login'); setGoogleStep('welcome');
      }
    });

    // Catch existing session (only for client view)
    if (viewRef.current === 'client') {
      sb.auth.getSession().then(({ data: { session } }) => {
        console.log('[Auth] getSession:', session?.user?.email || 'no session');
        if (mounted && session?.user) {
          setUserFromSession(session.user);
        }
      });
    }

    // Clean OAuth hash from URL
    if (window.location.hash?.includes('access_token')) {
      setTimeout(() => {
        window.history?.replaceState(null, '', window.location.pathname);
      }, 1000);
    }

    // Carga inicial (extraída a services/bootLoader.js en la división
    // etapa 2): recibe los setters/refs y aborta sets tras el unmount.
    loadFromSupabase({
      isMounted: () => mounted,
      bootCustsRef, custsFullRef, opsFullRef,
      setRewards, setStores, setPromos, setStations, setCfg,
      setRaffleCal, setCrossYearWins, setCusts, setOperators,
      setOpRatings, setSbConnected, setSbLoading,
    });
    return () => {
      mounted = false;
      authSub?.data?.subscription?.unsubscribe();
    };
  }, []);

  // ===== AUTH: Set user from Supabase session =====
  function setUserFromSession(u) {
    if (!u) return;
    const name = u.user_metadata?.full_name || u.email || 'Usuario';
    const email = u.email || '';
    const avatar = u.user_metadata?.avatar_url || '';
    const provider = u.app_metadata?.provider || 'google';

    function buildExisting(m) {
      const parseV = (v) => { if (!v) return []; if (Array.isArray(v)) return v; if (typeof v === 'object') return Object.values(v); try { return JSON.parse(v); } catch { return []; } };
      return {
        // avatar: la BD manda — puede tener la foto PERSONALIZADA de Mi
        // Cuenta; la de Google solo es fallback (1-ago)
        id: m.id, name: m.name, nickname: m.nickname || '', email: m.email || email, avatar: m.avatar_url || avatar || '',
        phone: m.phone || '', dpi: m.dpi || '', plate: m.plate || '',
        nit: m.nit || '', bday: m.birthday || '',
        address: m.address || null,
        points: m.points || 0, gallons: parseFloat(m.gallons) || 0,
        spent: parseFloat(m.spent) || 0, visits: m.visits || 0,
        tickets: m.tickets || 0, redeemed: m.redeemed_count || 0,
        referrals: m.referral_count || 0,
        registered: utcToLocal(m.created_at) || '',
        lastBuy: utcToLocal(m.last_buy) || '',
        station: m.last_station || '',
        cardId: m.card_code || m.physical_cards?.[0]?.card_code || m.card_id || '',
        vehicles: parseV(m.vehicles),
        supabaseUser: true, authProvider: provider,
      };
    }

    if (sb) {
      console.log('[Auth] Looking up member with auth_provider_id:', u.id);

      // Helper: intentar login con resultado de members
      function handleMemberResult(data) {
        if (data?.length > 0) {
          console.log('[Auth] \u2705 Existing member found:', data[0].name, '\u2192 logged in');
          const existing = buildExisting(data[0]);
          // (El avatar de Google lo persiste create_member_session_oauth)
          setMe(existing);
          setCusts(p => p.find(c => c.id === existing.id) ? p : [...p, existing]);
          setAuthScreen('logged'); setView('client');
          return true;
        }
        return false;
      }

      // Helper: mostrar registro (solo si no se encontro nada)
      function showRegistration() {
        console.log('[Auth] \u274c No member found \u2192 showing registration');
        setMe({
          id: u.id, name, email, avatar,
          phone: '', dpi: '', plate: '', nit: '', bday: '',
          points: 0, gallons: 0, spent: 0, visits: 0, tickets: 0,
          redeemed: 0, referrals: 0, registered: localDate(),
          lastBuy: '', station: '', cardId: '', supabaseUser: true, authProvider: provider,
        });
        setRegProfile(p => ({ ...p, name, email }));
        setAuthScreen('googleProfile'); setView('client');
      }

      // SEC.C.1: la sesi\u00f3n de Google prueba la identidad SERVER-side \u2014
      // create_member_session_oauth busca por auth_provider_id, hace el
      // v\u00ednculo por email si aplica, persiste el avatar y emite la
      // sesi\u00f3n de miembro. Sustituye a los 3 SELECT directos (members
      // ya no expone PII por la API abierta).
      createMemberSessionOauth(avatar).then((res) => {
        if (res.ok && res.member) {
          handleMemberResult([res.member]);
          return;
        }
        if (res.notFound) { showRegistration(); return; }
        console.error('[Auth] oauth session:', res.error);
      });
    }
  }


  // ===== HOOKS DE DATOS (división etapa 3, 12-ago-2026) =====
  // Staff: fichas completas, actividad global, participantes de rifa y
  // realtime de custs; expone los refs anti-carrera que consume el boot.
  const { addMemberToCusts, custsFullRef, bootCustsRef, opsFullRef } = useStaffData({
    authOp, authAdmin, authScreen, meId: me?.id, sbConnected, raffleCal,
    setCusts, setOperators, setActivityLog, setMemberStations, setRafData,
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
  const { myNotifs, markNotifsRead } = useNotificationsInbox({
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
    myNotifs, markNotifsRead,
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

  // ===== NAV ITEMS =====
  // El admin no tiene BottomNav (Admin v2: AdminShell con menú lateral).
  const operatorNav = [
    { id: 'ohome', label: 'Inicio', icon: <Fuel /> },
    { id: 'oclients', label: 'Clientes', icon: <Users /> },
    { id: 'oredeem', label: 'Premios', icon: <Gift /> },
    { id: 'oraffle', label: 'Rifa', icon: <Ticket /> },
  ];
  // Iconos y labels según la referencia FORMATO GENERAL: casa, boleto
  // con estrella, QR central, regalo, carro.
  const clientNav = [
    { id: 'home', label: 'Inicio', icon: <House /> },
    { id: 'cat', label: 'Canjes', icon: <Gift /> },
    { id: 'qr', label: '', icon: null, isQR: true },
    { id: 'raf', label: 'Rifa', icon: <TicketStar /> },
    { id: 'veh', label: 'Vehículos', icon: <Car /> },
  ];

  const nav = isO ? operatorNav : clientNav;
  const cur = isA ? scr : isO ? oScr : cScr;

  // ===== SCREEN ROUTER =====
  function renderScreen() {
    // Auth gates
    if (isC && authScreen !== 'logged') {
      if (authScreen === 'googleProfile') return <GoogleProfile {...ctx} />;
      return <ClientLogin {...ctx} />;
    }
    if (isO && authOp !== 'logged') return <OperatorLogin {...ctx} />;
    if (isA && authAdmin !== 'logged') return <AdminLogin {...ctx} />;

    // Admin screens
    if (isA) {
      if (scr === 'mem') return <Members {...ctx} />;
      if (scr === 'det') return <MemberDetail {...ctx} />;
      if (scr === 'cat') return <AdminCatalog {...ctx} />; // 8-ago: Catálogo de Canjes (gestión; la vista Catalog compartida queda solo para el cliente)
      if (scr === 'raf') return <AdminRaffle {...ctx} />;
      if (scr === 'premios') return <AdminPremios {...ctx} />;
      if (scr === 'cfg') return <Settings {...ctx} />;
      if (scr === 'ops') return <OpManagement {...ctx} />;
      if (scr === 'stations') return <AdminStations {...ctx} />;
      if (scr === 'admins') return <AdminManagement {...ctx} />;
      if (scr === 'audit') return <AuditLog {...ctx} />;
      if (scr === 'rules') return <Rules {...ctx} />;
      if (scr === 'promos') return <AdminPromos {...ctx} />;
      if (scr === 'promorules') return <PromoRules {...ctx} />;
      if (scr === 'anCli') return <AnClientes {...ctx} />;
      if (scr === 'anOps') return <AnOperadores {...ctx} />;
      if (scr === 'anPro') return <AnPromos {...ctx} />;
      if (scr === 'anInt') return <AnIntegridad {...ctx} />;
      return <AdminDash {...ctx} />;
    }

    // Operator screens
    if (isO) {
      if (oScr === 'oclients') return <OpClients {...ctx} />;
      if (oScr === 'oredeem') return <OpRedeem {...ctx} />;
      if (oScr === 'oraffle') return <OpRaffle {...ctx} />;
      return <OpHome {...ctx} />;
    }

    // Client screens — el selector de empresa antecede al inicio
    if (!companyPicked) return <CompanySelect dark={dark} cfg={cfg} onPick={() => setCompanyPicked(true)} />;
    if (cScr === 'cat') return <Catalog {...ctx} client={true} />;
    if (cScr === 'promos') return <ClientPromos {...ctx} />;
    if (cScr === 'raf') return <ClientRaffle {...ctx} />;
    if (cScr === 'menu') return <ClientMenu {...ctx} />;
    if (cScr === 'veh') return <VehiclesSoon {...ctx} />;
    return <ClientHome {...ctx} />;
  }

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

        {/* Active screen — el cliente entra con animación desde el origen presionado (D35).
            position:relative (SIN z-index) apila el contenido SIEMPRE por
            encima de GalaxyStars: sin él, al terminar la animación de
            entrada el transform desaparecía, el contenido estático caía
            bajo el overlay fixed de estrellas/nebulosas y los textos se
            veían "bajar de opacidad" segundos después de entrar. z-auto
            no crea stacking context → los modales internos siguen
            pudiendo tapar la BottomNav. */}
        {isC && authScreen === 'logged'
          ? (
            <div
              key={companyPicked ? cScr : 'company'}
              className="pp-screen"
              style={{ position: 'relative', transformOrigin: navOrigin ? `${navOrigin.x}px ${navOrigin.y}px` : '50% 85%' }}
            >
              {renderScreen()}
            </div>
          )
          : adminWide
            // Admin v2 (6-ago): shell con menú lateral — desktop-first,
            // iconos en tableta, drawer en móvil. Sin BottomNav.
            ? <AdminShell ctx={ctx}>{renderScreen()}</AdminShell>
            : renderScreen()}

        {/* Bottom navigation — el cliente no la ve hasta elegir empresa;
            el admin dejó de usarla (Admin v2: menú lateral) */}
        {isLoggedIn && (!isC || companyPicked) && !adminWide && (
          <BottomNav items={nav} current={cur} onSelect={handleNav} view={view} tierName={cTier.name} dark={dark} />
        )}
      </div>

      {/* ── Modal confirmación de canje desde operador (dispositivo del
          MIEMBRO) — RedeemConfirmRequestModal responde por RPC ── */}
      {pendingRedeemConfirm && isC && me && (
        <RedeemConfirmRequestModal
          pending={pendingRedeemConfirm}
          dark={dark}
          fire={fire}
          onClose={() => setPendingRedeemConfirm(null)}
          onConfirmed={() => {
            // Pedido del dueño (29-jul): si el QR del premio quedó
            // abierto tras el escaneo, cerrarlo al confirmar.
            setRewardQrCloseSignal(s => s + 1);
            // La entrega se concreta en el POS un instante después
            // (poll de 2s + RPC): recargar los canjes para que el
            // pendiente pase a RECOGIDO sin reabrir la app.
            setTimeout(reloadMyRedemptions, 6000);
          }}
        />
      )}

      {/* ── Sheet confirmación de canje (nivel raíz) ── */}
      {redeemConfirm && isC && me && (
        <RedeemConfirmSheet
          data={redeemConfirm}
          me={me}
          dark={dark}
          closing={rcClosing}
          stations={stations}
          stores={stores}
          onClose={closeRedeemConfirm}
          onConfirm={(reward) => { setRedeemConfirm(null); redeem(reward); }}
        />
      )}

      {/* ── Sheet confirmación de compra (nivel raíz, escapa overflow:hidden) ── */}
      {purchaseConfirm && (
        <PurchaseConfirmSheet
          data={purchaseConfirm}
          gT={gT}
          cfg={cfg}
          onClose={() => setPurchaseConfirm(null)}
          addPurchase={addPurchase}
        />
      )}

      {/* ── Sheet del código QR del miembro (botón central) ── */}
      {showQR && isC && me && (
        <ClientQrSheet
          me={me}
          tierName={cTier.name}
          dark={dark}
          closing={qrClosing}
          onClose={closeQR}
        />
      )}

      {/* Toast (FORMATO GENERAL — severidad e ícono en Toast.jsx) */}
      <Toast toast={toast} dark={isC && dark} />

      {/* ── Modal de ganador de la rifa mensual (R1b.4) ── */}
      {raffleWin && isC && me && (
        <RaffleWinnerModal
          cal={raffleWin}
          name={me.name}
          stations={stations}
          isBlack={dark}
          onClose={() => {
            // Marca de visto en el SERVIDOR (cross-device) + localStorage
            // como guarda instantánea. Reflejar en raffleCal local para
            // que el efecto no lo re-encuentre antes del próximo fetch.
            try { localStorage.setItem(`pp_rafwin_${raffleWin.dbId}`, '1'); } catch { /* noop */ }
            // SEC.C.4: raffle_calendar perdió la escritura abierta (el
            // premio y hasta el winner_id eran editables) — el RPC solo
            // deja al GANADOR marcar su propia felicitación.
            if (sb) markRaffleWinnerSeen(raffleWin.dbId);
            setRaffleCal(p => p.map(r => r?.dbId === raffleWin.dbId
              ? { ...r, winnerSeenAt: new Date().toISOString() } : r));
            // Rifa multi-año: la ganada puede vivir en el pool de otros años
            setCrossYearWins(p => p.map(r => r?.dbId === raffleWin.dbId
              ? { ...r, winnerSeenAt: new Date().toISOString() } : r));
            setRaffleWin(null);
          }}
        />
      )}

      {/* ── Modal celebrativo de bono por día especial (FB.6.2c) ── */}
      <SpecialDayBonusModal
        open={specialBonusModal.open}
        events={specialBonusModal.events}
        bonus={specialBonusModal.bonus}
        memberName={specialBonusModal.memberName}
        tier={me ? cTier : null}
        dark={dark}
        onClose={() => setSpecialBonusModal(prev => ({ ...prev, open: false }))}
      />

      {/* Aviso de nueva version disponible (Service Worker) */}
      <UpdateAvailable />

    </>
  );
}
