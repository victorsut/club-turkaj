// src/views/App.jsx
// Main orchestrator — manages global state, auth, Supabase sync, and view routing
import { useState, useCallback, useEffect, useRef } from 'react';
import { sb } from '../lib/supabaseClient';
import { makeTier } from '../lib/tierSystem';
import { CFG_INIT } from '../constants/config';
import { registerPurchase, redeemReward, buyRaffleTickets, completeSurvey, grantSpecialDayBonus, fetchPurchasePromo, fetchNotifications, markNotificationsRead, createMemberSessionOauth, getMyMember, logoutMember, fetchMembersFull, fetchMemberFull, fetchMyActivity, fetchMyRedemptions, fetchActivityStaff, fetchRaffleParticipants, fetchMemberStations, countMySurveysToday, markRaffleWinnerSeen } from '../services';
import { logoutOperator, logoutAdmin, fetchOperatorsFull } from '../services'; // SEC.B.4: logout delega el subconjunto de localStorage (ct_op/ct_admin + token de rol)
import { getOperatorToken, getAdminToken, getMemberToken } from '../services/sessionTokens'; // SEC.B.6.4 + SEC.C.1
import { mapMember } from '../lib/mapMember'; // SEC.C.1: mapeo del perfil de RPC
import { setSessionExpiredHandler } from '../services/sessionExpiry'; // SEC.B.8.2: registro del handler que dispara expireSession ante rechazo 28000 del server
import { firstName } from '../lib/text'; // regla 29-jul: al cliente solo el primer nombre del personal

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
import { isPushSupported, subscribePush, sendPushToMember } from '../lib/pushNotifications';

// Ficha completa (list_members_full / get_member_full) → fila de custs.
// Fuente única del shape: la usan la carga masiva del login de staff y
// addMemberToCusts (alta en vivo de miembros recién registrados).
function mapFullMember(m) {
  return {
    id: m.id, name: m.name, nickname: m.nickname || '', email: m.email || '', avatar: m.avatar_url || '',
    phone: m.phone || '', dpi: m.dpi || '', plate: m.plate || '',
    vehicles: (() => { const v = m.vehicles; if (!v) return []; if (Array.isArray(v)) return v; if (typeof v === 'object') return Object.values(v); try { return JSON.parse(v); } catch { return []; } })(),
    nit: m.nit || '', bday: m.birthday || '',
    address: m.address || null,
    points: m.points || 0, gallons: parseFloat(m.gallons) || 0,
    spent: parseFloat(m.spent) || 0, visits: m.visits || 0,
    tickets: m.tickets || 0, redeemed: m.redeemed_count || 0,
    referrals: m.referral_count || 0,
    registered: utcToLocal(m.created_at) || '',
    lastBuy: utcToLocal(m.last_buy) || '',
    station: m.last_station || '',
    cardId: m.card_code || m.card_id || '',
    termsAcceptedAt: m.terms_accepted_at || null, // constancia 11-ago (member_profile_json lo expone)
    supabaseUser: true, authProvider: m.auth_provider || 'google',
    authProviderId: m.auth_provider_id || '',
  };
}

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
  const [myNotifs, setMyNotifs] = useState([]);
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
  const dark = uiMode ? uiMode === 'dark' : cTier.name === 'BLACK';
  const TH = clientTheme(cTier.name, dark);
  const isLoggedIn = (isC && authScreen === 'logged') || (isO && authOp === 'logged') || (isA && authAdmin === 'logged');

  // ===== SUPABASE WRITE HELPERS =====
  const logActivity = useCallback((memberId, type, desc, ptsChange, amount) => {
    // SEC.C.3: el INSERT directo de activity_log quedó revocado — este
    // helper solo actualiza el estado LOCAL (optimismo de UI). El
    // rastro persistente lo escriben los RPCs server-side (la 'entrega'
    // la registra deliver_redemption; compras/canjes/rifa/encuestas ya
    // lo hacían desde sus propios RPCs).
    setActivityLog(prev => {
      const n = { ...prev };
      if (!n[memberId]) n[memberId] = [];
      n[memberId] = [{ type, desc, pts: ptsChange, amount, date: localDate(), station: '' }, ...n[memberId]];
      return n;
    });
  }, []);

  // Helper: cargar conteo de encuestas del día para un miembro
  const loadTodaySurveys = useCallback(async (memberId) => {
    if (!sb || !memberId) return;
    // SEC.C.4: surveys quedó cerrada (el INSERT abierto permitía
    // bloquear el límite diario de un miembro) — el conteo llega por
    // RPC con su sesión, resuelto en zona Guatemala server-side.
    const count = await countMySurveysToday();
    if (count == null) {
      console.warn('[Surveys] conteo no disponible (sesión legada o error)');
    } else {
      setMySurveyCount(count || 0);
      console.log('[Surveys] Encuestas hoy:', count);
    }
  }, []);

  // ===== DÍAS FESTIVOS: otorgar puntos al abrir la app =====
  // FB.6.3 — delega en la RPC grant_special_day_bonus (atomica,
  // delta server-side). Reemplaza la logica legacy que reseteaba
  // points e insertaba un activity_type invalido ('evento_especial').
  const checkSpecialDayBonus = async (memberId) => {
    if (!memberId) return;

    const result = await grantSpecialDayBonus(memberId);

    if (!result.ok) {
      console.error('[FB] checkSpecialDayBonus error:', result.error?.message);
      return;
    }

    // data es la respuesta de la RPC: { ok, bonus?, events?, member_name?, reason? }
    const data = result.data;

    if (!data?.ok) {
      // ok:false con reason (member_not_found, already_granted,
      // no_bonus_today) -> silencioso.
      return;
    }

    // ok:true: aplicar bonus en state local + modal celebrativo
    const { bonus, events, member_name } = data;
    const today = localDate();

    setMe(prev => prev ? {
      ...prev,
      points: (prev.points || 0) + bonus,
      last_special_bonus: today,
    } : prev);

    setCusts(prev => prev.map(c =>
      c.id === memberId
        ? {
            ...c,
            points: (c.points || 0) + bonus,
            last_special_bonus: today,
          }
        : c
    ));

    // Modal celebrativo personalizado por tier (FB.6.2c) — reemplaza el toast
    setSpecialBonusModal({
      open: true,
      events,
      bonus,
      memberName: member_name,
    });
  };

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

  // ===== FICHA COMPLETA AL ENTRAR COMO OPERADOR/ADMIN (SEC.C.1) =====
  // El boot solo carga columnas no sensibles; al loguearse un operador
  // o admin, su sesión autoriza list_members_full y custs se reemplaza
  // por los perfiles completos (búsqueda por teléfono/DPI, ficha, etc.).
  const custsFullRef = useRef(false);
  // SEC.C.2b: última carga de members del boot (columnas abiertas) —
  // respaldo si el fetch de fichas completas falla tras ganarle al boot.
  const bootCustsRef = useRef(null);
  // FIX (11-ago): misma guarda anti-carrera para operadores. El efecto
  // de staff (fetchOperatorsFull) puede ganarle al boot cuando hay
  // sesión de admin cacheada; sin esta bandera el boot (columnas
  // mínimas: sin DPI/gafete/teléfono) pisaba la ficha completa y
  // OpManagement mostraba tarjetas incompletas y bloqueaba la edición.
  const opsFullRef = useRef(false);
  useEffect(() => {
    if (authOp !== 'logged' && authAdmin !== 'logged') { custsFullRef.current = false; return; }
    if (custsFullRef.current || !sb) return;
    const role = authAdmin === 'logged' ? 'admin' : 'operator';
    const tok = role === 'admin' ? getAdminToken() : getOperatorToken();
    if (!tok?.token) return;
    custsFullRef.current = true;
    fetchMembersFull(tok.token, role).then(rows => {
      if (rows.length > 0) {
        setCusts(rows.map(mapFullMember));
        console.log('[Puntos Plus] ✅ Fichas completas cargadas:', rows.length);
      } else {
        custsFullRef.current = false; // token vencido u error: reintentar
        // SEC.C.2b: si el boot le cedió el paso a este fetch y falló,
        // restaurar al menos las columnas abiertas.
        if (bootCustsRef.current) setCusts(p => (p.length ? p : bootCustsRef.current));
      }
    });
  }, [authOp, authAdmin]);

  // Miembro RECIÉN registrado → traer su ficha completa y sumarla a
  // custs sin recargar (reporte del dueño 31-jul: el escaneo del QR de
  // un cliente nuevo fallaba hasta recargar la app del operador). La
  // usan el evento INSERT del canal realtime y el fallback del escaneo
  // (auto-reparación si el realtime no propagó). Devuelve la fila
  // mapeada o null.
  const addMemberToCusts = useCallback(async (memberId) => {
    if (authOp !== 'logged' && authAdmin !== 'logged') return null;
    const role = authAdmin === 'logged' ? 'admin' : 'operator';
    const tok = role === 'admin' ? getAdminToken() : getOperatorToken();
    if (!tok?.token || !memberId) return null;
    const m = await fetchMemberFull(tok.token, role, memberId);
    if (!m?.id) return null;
    const row = mapFullMember(m);
    setCusts(p => {
      const i = p.findIndex(c => c.id === row.id);
      if (i < 0) return [...p, row];
      const next = [...p];
      next[i] = { ...next[i], ...row };
      return next;
    });
    return row;
  }, [authOp, authAdmin]);

  // ===== SEC.C.2: ACTIVIDAD GLOBAL PARA STAFF =====
  // El boot ya no puede leer activity_log: el mapa global (filtro por
  // estación en Miembros, actividad de las fichas) se carga por RPC al
  // entrar como operador/admin. Merge sobre lo previo: el libro mayor
  // completo del miembro logueado en este navegador no se pisa.
  const actMapStaffRef = useRef(false);
  useEffect(() => {
    if (authOp !== 'logged' && authAdmin !== 'logged') { actMapStaffRef.current = false; opsFullRef.current = false; return; }
    if (actMapStaffRef.current || !sb) return;
    actMapStaffRef.current = true;
    fetchActivityStaff(null, 300).then(rows => {
      if (!rows.length) { actMapStaffRef.current = false; return; }
      const actMap = {};
      rows.forEach(a => {
        if (!actMap[a.member_id]) actMap[a.member_id] = [];
        actMap[a.member_id].push({
          type: a.activity_type, desc: a.description,
          pts: a.points_change, amount: a.amount ? parseFloat(a.amount) : null,
          date: utcToLocal(a.created_at) || '', station: a.station_id || '',
        });
      });
      setActivityLog(prev => ({ ...actMap, ...prev }));
    });
    // Ficha completa de operadores (objetivo #1): DPI/gafete/teléfono/
    // correo ya no viajan por la API abierta — el admin los carga con
    // su sesión para la pestaña Operadores.
    fetchOperatorsFull().then(rows => {
      if (!rows.length) return;
      opsFullRef.current = true; // gana la carrera: el boot ya no pisa
      setOperators(rows.map(o => ({
        id: o.id, name: o.name, user: o.username,
        dpi: o.dpi || '', gafete: o.gafete || '',
        phone: o.phone || '', email: o.email || '',
        station: o.station_name || '', stationId: o.station_id || null,
        bomba: o.bomba || '', turno: o.turno || '',
        active: o.active !== false,
        // Espejo de PROPER (F7a): no puede loguearse; su estación es la
        // última donde despachó según la factura.
        external: o.external_source || null,
      })));
    });
    // Estación por miembro para el filtro de Miembros (SEC.C.2b):
    // derivada de purchases (el activity_log guarda station_id como
    // uuid y la vista comparaba nombres — nunca coincidía).
    fetchMemberStations().then(rows => {
      if (!rows.length) return;
      const map = {};
      rows.forEach(r => { map[r.member_id] = { last: r.last_station, top: r.top_station }; });
      setMemberStations(map);
    });
  }, [authOp, authAdmin]);

  // ===== SEC.C.2: PARTICIPANTES DE RIFA CON SESIÓN =====
  // raffle_tickets ya no tiene SELECT abierto: los boletos agregados
  // llegan por RPC con la sesión activa (miembro, operador o admin) y
  // el nombre viene resuelto server-side. Las compras de boletos siguen
  // actualizando rafData de forma optimista; este efecto trae la verdad
  // del servidor al abrir la app o cambiar de sesión.
  useEffect(() => {
    if (!sb || !sbConnected || raffleCal.length === 0) return;
    const memberLogged = authScreen === 'logged' && me?.id && !String(me.id).startsWith('temp-');
    if (!memberLogged && authOp !== 'logged' && authAdmin !== 'logged') return;
    fetchRaffleParticipants().then(rows => {
      if (!rows) return; // sin token o error: conservar lo que haya
      const idToMonth = {};
      raffleCal.forEach((r, i) => { if (r?.dbId) idToMonth[r.dbId] = i; });
      const rafMap = Array(12).fill(null).map(() => ({ participants: [] }));
      rows.forEach(e => {
        const month = idToMonth[e.raffle_id];
        if (month === undefined) return;
        // display_name = apodo o primer nombre (1-ago: la rifa ya no
        // muestra nombres reales); avatar para la lista de participantes
        rafMap[month].participants.push({ cid: e.member_id, name: e.display_name || e.name || 'Miembro', avatar: e.avatar_url || '', tickets: e.tickets || 1 });
      });
      setRafData(rafMap);
      console.log('[Raffle] ✅ rafData listo:', rows.length, 'participantes');
    });
  }, [sbConnected, raffleCal, authScreen, me?.id, authOp, authAdmin]);

  // ===== CARGAR ENCUESTAS DEL DIA AL CAMBIAR DE USUARIO =====
  useEffect(() => {
    if (me?.id && !me.id.startsWith('temp-') && sb && sbConnected) loadTodaySurveys(me.id);
  }, [me?.id, sbConnected, loadTodaySurveys]);

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

  // Canjes propios del miembro (con código TK para el QR) — se usa al
  // loguearse y al confirmar una entrega (el pendiente pasa a RECOGIDO
  // sin tener que reabrir la app).
  const reloadMyRedemptions = useCallback(() => {
    fetchMyRedemptions().then(rows => {
      if (!rows.length) return;
      setRedeemedList(rows.map(rd => ({
        id: rd.id,
        memberId: rd.member_id,
        reward: { name: rd.reward_name || 'Premio', icon: rd.reward_icon || '🎁', cat: rd.reward_category || '' },
        cost: rd.points_spent,
        date: utcToLocal(rd.created_at) || '',
        code: rd.redemption_code,
        collected: rd.collected || false,
        // D22: vencimiento del canje (solo premios de rifa lo traen)
        expiresAt: rd.expires_at || null,
      })));
      // F7a.3: solicitud de confirmación VIGENTE al abrir la app — si el
      // POS de PROPER (o el operador) la pidió con la app cerrada, el
      // broadcast se perdió; acá se detecta y se abre el modal. Solo
      // solicitudes frescas (< 3 min, confirm_requested_at) para no
      // revivir solicitudes muertas de días anteriores.
      const pend = rows.find(rd =>
        !rd.collected && rd.confirm_status === 'pending' && rd.confirm_requested_at &&
        (Date.now() - new Date(rd.confirm_requested_at).getTime()) < 3 * 60 * 1000);
      if (pend) {
        const reward = rewards.find(r => r.id === pend.reward_id) || null;
        setPendingRedeemConfirm(p => p || {
          redemptionId: pend.id,
          rewardName:   reward?.name || pend.reward_name || 'Premio',
          rewardIcon:   reward?.icon || pend.reward_icon || '🎁',
          reward,
          cost:         pend.points_spent || 0,
        });
      }
    });
  }, [rewards]);

  // Señal para cerrar el QR del premio en HistorySheet al confirmar la
  // entrega (pedido del dueño 29-jul) — el sheet vive dentro del
  // historial, así que viaja por ctx como contador.
  const [rewardQrCloseSignal, setRewardQrCloseSignal] = useState(0);

  // ===== HISTORIAL Y CANJES PROPIOS AL LOGUEARSE (28-jul / SEC.C.2) =====
  // El libro mayor COMPLETO del miembro (limit 1000 — el 'registro' con
  // el bonus de alta debe seguir visible; reporte: Fernando Morales) y
  // sus canjes (con redemption_code para el QR del premio) llegan por
  // RPC con su sesión: el SELECT abierto de ambas tablas quedó revocado.
  // Sesiones legadas sin token ven listas vacías hasta re-loguearse.
  useEffect(() => {
    if (!me?.id || authScreen !== 'logged' || viewRef.current !== 'client' || !sb) return;
    if (String(me.id).startsWith('temp-')) return;
    fetchMyActivity(me.id, 1000).then(rows => {
      if (!rows.length) return;
      setActivityLog(prev => ({
        ...prev,
        [me.id]: rows.map(a => ({
          type: a.activity_type,
          desc: a.description,
          pts: a.points_change,
          amount: a.amount ? parseFloat(a.amount) : null,
          date: utcToLocal(a.created_at) || '',
          station: a.station_id || '',
        })),
      }));
    });
    reloadMyRedemptions();
  }, [me?.id, authScreen, reloadMyRedemptions]);

  // ===== REALTIME PARA ADMIN/OPERADOR: puntos en vivo en custs (28-jul) =====
  // El canal member-updates solo cubre al miembro logueado (vista
  // cliente). Pedido del dueño: el admin también debe ver los puntos
  // moverse en vivo. Sin filtro: cualquier UPDATE de members refresca
  // la fila en custs (el payload solo trae las columnas no sensibles —
  // los grants de columna de SEC.C.1 aplican también a Realtime).
  useEffect(() => {
    if ((authOp !== 'logged' && authAdmin !== 'logged') || !sb || !sbConnected) return;
    const ch = sb.channel('members-staff')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'members' }, (payload) => {
        const m = payload.new || {};
        if (!m.id) return;
        setCusts(p => p.map(c => c.id === m.id ? {
          ...c,
          points: m.points ?? c.points,
          gallons: parseFloat(m.gallons) || c.gallons,
          spent: parseFloat(m.spent) || c.spent,
          visits: m.visits ?? c.visits,
          tickets: m.tickets ?? c.tickets,
          redeemed: m.redeemed_count ?? c.redeemed,
          lastBuy: utcToLocal(m.last_buy) || c.lastBuy,
          station: m.last_station || c.station,
        } : c));
      })
      // Registro NUEVO: el payload trae solo columnas abiertas (sin el
      // código CT de la tarjeta) → la ficha completa se pide por RPC.
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'members' }, (payload) => {
        const id = payload.new?.id;
        if (id) addMemberToCusts(id);
      })
      .subscribe();
    return () => sb.removeChannel(ch);
  }, [authOp, authAdmin, sbConnected, addMemberToCusts]);

  // ===== SEC.C.1: REHIDRATAR/VALIDAR la sesión de miembro al abrir =====
  // ct_me es solo caché: si hay token, el servidor devuelve el perfil
  // FRESCO (la ficha completa ya no baja por la API abierta). Token
  // inválido/revocado → cerrar la sesión cacheada. Sin token (sesiones
  // pre-SEC.C o Google, que lo obtiene en SIGNED_IN) → no forzar nada.
  useEffect(() => {
    if (!me?.id || authScreen !== 'logged' || viewRef.current !== 'client') return;
    if (String(me.id).startsWith('temp-')) return;
    getMyMember().then(res => {
      if (res.ok && res.member) {
        setMe(prev => prev ? { ...prev, ...mapMember(res.member) } : prev);
      } else if (res.invalidSession) {
        console.warn('[SEC.C] Sesión de miembro inválida → logout');
        localStorage.removeItem('ct_me');
        setMe(null); setAuthScreen('login');
      }
      // noToken: sesión legada o Google pendiente de SIGNED_IN — seguir.
    });
    // Solo al montar con sesión ya restaurada; los cambios de me.id
    // posteriores vienen de logins que ya traen perfil fresco.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authScreen]);

  // ===== NOTIFICACIONES: inbox de la campana (carga + realtime) =====
  useEffect(() => {
    if (!me?.id || authScreen !== 'logged' || viewRef.current !== 'client') {
      setMyNotifs([]);
      return;
    }
    fetchNotifications(me.id).then(setMyNotifs);
    // Al volver la app al frente, refrescar: el canal Realtime se
    // suspende en segundo plano y los registros que el SW hizo mientras
    // tanto (push de compra/premio mostrado) no llegarían al badge.
    const mid = me.id;
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications(mid).then(setMyNotifs);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    if (!sb || !sbConnected) {
      return () => document.removeEventListener('visibilitychange', onVis);
    }
    const ch = sb.channel(`notifications-${me.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `member_id=eq.${me.id}`,
      }, (payload) => {
        setMyNotifs(p => p.some(n => n.id === payload.new.id) ? p : [payload.new, ...p]);
      })
      .subscribe();
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      sb.removeChannel(ch);
    };
  }, [me?.id, authScreen, sbConnected]);

  // Marca todas como leídas (al abrir el inbox); el badge se apaga al
  // instante y el servidor estampa read_at en segundo plano.
  const markNotifsRead = useCallback(() => {
    if (!me?.id) return;
    const now = new Date().toISOString();
    setMyNotifs(p => p.map(n => n.read_at ? n : { ...n, read_at: now }));
    markNotificationsRead(me.id);
  }, [me?.id]);

  // ===== SERVICE WORKER: Listen for notification clicks =====
  // Ref con el miembro logueado: el listener del SW es estable ([] deps)
  // y necesita el valor VIGENTE para responder WHO_IS.
  const meIdRef = useRef(null);
  useEffect(() => { meIdRef.current = me?.id || null; }, [me?.id]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handleMessage = (event) => {
      // El SW pregunta quién está a la vista antes de suprimir una
      // notificación de compra/premio: responder miembro + vista por el
      // puerto del MessageChannel (una pestaña de operador responde
      // view 'op' y NO suprime — bug del 28-jul).
      if (event.data?.type === 'WHO_IS' && event.ports && event.ports[0]) {
        event.ports[0].postMessage({
          memberId: meIdRef.current,
          view: viewRef.current,
        });
        return;
      }
      if (event.data?.type === 'NOTIFICATION_CLICK') {
        const d = event.data.data || {};
        if (d.type === 'purchase' && d.operatorId) {
          // El modal vive en ClientHome: volver al inicio si la app
          // quedó en otra pestaña (Rifa, Menú...) al tocar el aviso.
          setCScr('home');
          setPendingOpRating({
            purchaseId: d.purchaseId || null,
            operatorId: d.operatorId,
            operatorName: d.operatorName || 'Operador',
            stationName: d.stationName || '',
            points: d.points ?? null,
            amount: d.amount ?? null,
          });
          if (d.purchaseId) {
            fetchPurchasePromo(d.purchaseId).then(({ data: promo }) => {
              if (promo) setPendingOpRating(prev => (prev ? { ...prev, promo } : prev));
            });
          }
        }
        // Premio de promoción: llevar a Canjes con los pendientes abiertos.
        if (d.type === 'reward') {
          setCScr('cat');
          setCatPendingSignal(s => s + 1);
        }
        // Otros tipos (degradacion, general): basta traer la app al frente.
      }
    };
    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, []);

  // Check URL params for rating from notification (app opens fresh)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rateOpId = params.get('rate');
    if (rateOpId && me?.id) {
      const purchaseId = params.get('purchaseId') || null;
      setCScr('home'); // el modal vive en ClientHome
      setPendingOpRating({
        purchaseId,
        operatorId: rateOpId,
        operatorName: decodeURIComponent(params.get('opName') || 'Operador'),
        stationName: decodeURIComponent(params.get('station') || ''),
        points: params.get('pts') != null ? Number(params.get('pts')) : null,
        amount: params.get('amount') != null ? Number(params.get('amount')) : null,
      });
      if (purchaseId) {
        fetchPurchasePromo(purchaseId).then(({ data: promo }) => {
          if (promo) setPendingOpRating(prev => (prev ? { ...prev, promo } : prev));
        });
      }
      window.history.replaceState(null, '', window.location.pathname);
    }
    // Deep-link de notificación de premio (app cerrada): Canjes pendientes.
    if (params.get('goto') === 'pendientes' && me?.id) {
      setCScr('cat');
      setCatPendingSignal(s => s + 1);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [me?.id]);

  // ===== REALTIME: Actualizar datos del miembro en tiempo real =====
  useEffect(() => {
    if (!sb || !me?.id || !sbConnected) return;
    const channel = sb.channel('member-updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'members',
        filter: `id=eq.${me.id}`,
      }, (payload) => {
        const m = payload.new;
        const prev = payload.old;
        console.log('[Realtime] Member updated:', m.id, 'pts:', m.points, 'visits:', m.visits, 'op_id:', m.last_operator_id);
        setMe(p => ({
          ...p,
          points: m.points ?? p.points,
          gallons: parseFloat(m.gallons) || p.gallons,
          spent: parseFloat(m.spent) || p.spent,
          visits: m.visits ?? p.visits,
          tickets: m.tickets ?? p.tickets,
          redeemed: m.redeemed_count ?? p.redeemed,
          lastBuy: utcToLocal(m.last_buy) || p.lastBuy,
          station: m.last_station || p.station,
        }));
        setCusts(p => p.map(c => c.id === m.id ? {
          ...c,
          points: m.points ?? c.points,
          gallons: parseFloat(m.gallons) || c.gallons,
          spent: parseFloat(m.spent) || c.spent,
          visits: m.visits ?? c.visits,
          tickets: m.tickets ?? c.tickets,
          redeemed: m.redeemed_count ?? c.redeemed,
          lastBuy: utcToLocal(m.last_buy) || c.lastBuy,
          station: m.last_station || c.station,
        } : c));

        // FIX-MODAL (Parte C): la recarga de historial se DESACOPLA del delta de
        // visits. Antes estaba gateada por (newVisits > prevVisits): no recargaba
        // cuando el ref estaba stale (tras combustible), ni cuando la acción del
        // propio cliente (rifa/canje/encuesta) no cambia visits. Ahora recarga en
        // CADA UPDATE de members → cubre combustible cross-device Y refresca el
        // historial del cliente para sus propias acciones. El mapeo no cambia.
        if (viewRef.current === 'client') {
          // ── Recargar historial en el dispositivo del miembro ──
          // limit alto: el historial es el LIBRO MAYOR del miembro — el
          // 'registro' (bonus de alta) debe seguir visible aunque haya
          // mucha actividad posterior (reporte del dueño 28-jul).
          // SEC.C.2: por RPC con la sesión (SELECT abierto revocado).
          fetchMyActivity(m.id, 1000).then(rows => {
            if (!rows.length) return;
            setActivityLog(prev => ({
              ...prev,
              [m.id]: rows.map(a => ({
                type: a.activity_type,
                desc: a.description,
                pts: a.points_change,
                amount: a.amount ? parseFloat(a.amount) : null,
                date: utcToLocal(a.created_at) || '',
                station: a.station_id || '',
              })),
            }));
            console.log('[Realtime] ✅ Historial recargado:', rows.length, 'entradas');
          });
        }

        // FIX-MODAL (Parte D): el modal de calificación se eliminó de acá.
        // Antes se disparaba por delta de visits + last_operator_id pegajoso
        // (frágil). Ahora lo dispara el canal purchases-${me.id} (INSERT de
        // purchases = combustible real, con operator_id/station_id directos).
      })
      .subscribe((status) => {
        console.log('[Realtime] Subscription:', status);
      });

    return () => {
      sb.removeChannel(channel);
    };
  }, [me?.id, sbConnected, operators]);

  // ===== REALTIME: Confirmación de canje (miembro confirma/cancela) =====
  useEffect(() => {
    if (!sb || !sbConnected || !me?.id) return;
    const ch = sb.channel(`redemption-confirm-${me.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'redemptions',
        filter: `member_id=eq.${me.id}`,
      }, (payload) => {
        const rd = payload.new;
        console.log('[Realtime] redemption update:', rd.id, 'confirm_status:', rd.confirm_status);
        if (rd.confirm_status === 'pending') {
          // Buscar nombre del premio
          const reward = rewards.find(r => r.id === rd.reward_id);
          console.log('[Realtime] Solicitud de confirmación de canje - reward:', reward?.name || rd.reward_id);
          setPendingRedeemConfirm({
            redemptionId: rd.id,
            rewardName:   reward?.name  || 'Premio',
            rewardIcon:   reward?.icon  || '🎁',
            reward:       reward || null, // objeto completo → RewardIcon + color de categoría
            cost:         rd.points_spent || 0,
          });
        } else if (rd.confirm_status === 'confirmed' || rd.confirm_status === 'cancelled') {
          setPendingRedeemConfirm(p => p?.redemptionId === rd.id ? null : p);
        }
      })
      .subscribe((status) => {
        console.log('[Realtime] redemption-confirm subscription:', status);
      });

    // ── Canal BROADCAST del flujo de confirmación (SEC.C.2b) ──
    // La entrega de postgres_changes con policies/grants de columna
    // resultó no confiable en producción (el UPDATE a 'pending' se
    // commiteaba pero el evento no llegaba al cliente). El operador
    // emite el aviso DIRECTO por broadcast tras marcar 'pending' — sin
    // RLS de por medio — y también el desistimiento (cancel/timeout),
    // que además corrige un hueco viejo: el reset a 'none' nunca
    // cerraba el modal del cliente. El canal postgres queda de respaldo
    // (si ambos llegan, el estado se re-escribe idéntico — inocuo).
    const bc = sb.channel(`redeem-bc-${me.id}`)
      .on('broadcast', { event: 'confirm_request' }, ({ payload }) => {
        if (!payload?.redemptionId) return;
        console.log('[Broadcast] confirm_request:', payload.redemptionId);
        const reward = rewards.find(r => r.id === payload.rewardId) || null;
        setPendingRedeemConfirm({
          redemptionId: payload.redemptionId,
          rewardName:   reward?.name || payload.rewardName || 'Premio',
          rewardIcon:   reward?.icon || payload.rewardIcon || '🎁',
          reward,
          cost:         payload.cost ?? 0,
        });
      })
      .on('broadcast', { event: 'confirm_cancel' }, ({ payload }) => {
        console.log('[Broadcast] confirm_cancel:', payload?.redemptionId);
        setPendingRedeemConfirm(p => p?.redemptionId === payload?.redemptionId ? null : p);
      })
      .subscribe((status) => {
        console.log('[Realtime] redeem-bc subscription:', status);
      });

    return () => { sb.removeChannel(ch); sb.removeChannel(bc); };
  }, [me?.id, sbConnected, rewards]);

  // ===== REALTIME: Modal de calificación de operador tras COMBUSTIBLE =====
  // FIX-MODAL: señal correcta para abrir el modal de estrellas. Antes lo
  // disparaba el handler de members por delta de visits (newVisits > prevVisits)
  // contra una línea base (lastVisitsRef) que se desincronizaba → falsos
  // positivos en rifa/canje. Acá escuchamos INSERT de `purchases`: una fila se
  // crea SOLO por register_purchase (combustible), trae operator_id/station_id
  // directos y NO depende del last_operator_id pegajoso. Rifa/canje/encuesta no
  // insertan en purchases → no pueden abrir el modal. Espejo del patrón de
  // redemption-confirm-${me.id}. No necesita realtimeReadyRef: un INSERT no
  // reproduce estado al suscribir, así que el primer evento es una compra real.
  useEffect(() => {
    if (!sb || !sbConnected || !me?.id) return;
    const ch = sb.channel(`purchases-${me.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'purchases',
        filter: `member_id=eq.${me.id}`,
      }, (payload) => {
        const p = payload.new;
        const opId = p.operator_id;
        const stId = p.station_id;
        console.log('[Realtime] purchase insert:', p.id, 'op_id:', opId, 'station_id:', stId);
        // Sin operador no hay a quién calificar; el modal es solo de la vista cliente.
        if (!opId || viewRef.current !== 'client') return;
        // El cliente suele tener su Código QR abierto (se lo mostró al
        // operador para la compra): cerrarlo para que el modal de
        // calificación quede al frente (pedido del dueño 25-jul).
        setShowQR(false); setQrClosing(false);
        const stationName = stations.find(s => s.id === stId)?.name || '';
        // PROMO-1: el modal muestra los puntos de la compra y la promo aplicada.
        const base = {
          purchaseId: p.id,
          operatorId: opId,
          stationName,
          points: p.points_earned ?? null,
          amount: p.amount ?? null,
        };
        const op = operators.find(o => o.id === opId);
        if (op) {
          setPendingOpRating({ ...base, operatorName: op.name });
        } else {
          sb.from('operators').select('name').eq('id', opId).single().then(r => {
            setPendingOpRating({ ...base, operatorName: r.data?.name || 'Operador' });
          });
        }
        // La promo llega en query aparte (promo_applications, misma tx que la
        // compra → ya commiteada). Enriquecer el modal si sigue abierto.
        fetchPurchasePromo(p.id).then(({ data: promo }) => {
          if (promo) setPendingOpRating(prev => (prev ? { ...prev, promo } : prev));
        });
      })
      .subscribe((status) => {
        console.log('[Realtime] purchases subscription:', status);
      });
    return () => sb.removeChannel(ch);
  }, [me?.id, sbConnected, operators, stations]);

  // ===== REALTIME: Actualizar rating del operador en tiempo real =====
  useEffect(() => {
    if (!sb || !loggedOp?.id || !sbConnected) return;
    const channel = sb.channel('op-ratings')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'operator_ratings',
        filter: `operator_id=eq.${loggedOp.id}`,
      }, (payload) => {
        const r = payload.new;
        console.log('[Realtime] New rating:', r.stars, 'stars');
        setOpRatings(prev => {
          const n = { ...prev };
          if (!n[r.operator_id]) n[r.operator_id] = [];
          n[r.operator_id] = [{ stars: r.stars }, ...n[r.operator_id]];
          return n;
        });
      })
      .subscribe();
    return () => sb.removeChannel(channel);
  }, [loggedOp?.id, sbConnected]);

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

  // ──────────────────────────────────────────────
  // addPurchase — delega en RPC register_purchase
  // ──────────────────────────────────────────────
  // La RPC hace TODO de forma atómica:
  //   - Lee precios desde program_config
  //   - Inserta en purchases
  //   - Actualiza members (puntos, galones, visitas, last_buy, last_operator_id)
  //   - Inserta en activity_log
  //   - Si hay cambio de tier → actualiza physical_cards
  //
  // El cliente solo: muestra toast, optimistic UI, push notification.
  // Devuelve true solo si la compra se registró (el confirm del modal
  // usa el resultado — antes se llamaba sin await y el toast de éxito
  // salía siempre, incluso si el RPC rechazaba).
  const addPurchase = useCallback(async (cid, a, f) => {
    if (!a || a < 10) { fire('Mínimo Q10'); return false; }
    if (!sb || !sbConnected) { fire('Sin conexión'); return false; }

    const stationName = loggedOp?.station || '';

    // Llamada al RPC
    const { data, error, sessionExpired } = await registerPurchase({
      memberId: cid,
      operatorId: loggedOp?.id || null,
      stationId: loggedOp?.stationId || null,
      amount: a,
      fuelType: f,
    });

    if (error) {
      console.error('[Purchase] RPC error:', error.message);
      if (sessionExpired) return false; // SEC.B.8.2: expireSession ya manejó el rechazo; no pisar el toast con el crudo.
      fire('Error: ' + error.message);
      return false;
    }

    const { points: pts, gallons: gal, tier_changed, new_tier, new_card_code, promo } = data;
    const today = localDate();
    // PROMO-1: pts ya viene FINAL (base + extra); promo trae {name, extra_points} si aplicó.
    // PROMO-1b: grant_reward regala un canje (reward_name, redemption_code) en vez de puntos.
    // Sin emojis (11-ago): promoTag viaja también al body del PUSH, que
    // el SO renderiza sin pasar por stripEmojis del Toast — el cliente
    // veía 🎁/🎉 en la pantalla de bloqueo.
    const promoTag = promo
      ? (promo.effect_type === 'grant_reward'
        ? ` · ${promo.reward_name} GRATIS`
        : ` · ${promo.name} (+${promo.extra_points})`)
      : '';

    // Optimistic update del state local con los valores REALES devueltos por el server
    setCusts(p => p.map(c => c.id === cid ? {
      ...c,
      points: c.points + pts,
      gallons: +(parseFloat(c.gallons || 0) + gal).toFixed(2),
      spent: +(parseFloat(c.spent || 0) + a).toFixed(2),
      visits: (c.visits || 0) + 1,
      lastBuy: today,
      station: stationName || c.station,
      cardId: new_card_code || c.cardId,
    } : c));

    if (me?.id === cid) setMe(p => ({
      ...p,
      points: p.points + pts,
      gallons: +(parseFloat(p.gallons || 0) + gal).toFixed(2),
      spent: +(parseFloat(p.spent || 0) + a).toFixed(2),
      visits: (p.visits || 0) + 1,
      lastBuy: today,
      station: stationName || p.station,
      cardId: new_card_code || p.cardId,
    }));

    fire(`+${pts} pts · ${gal} gal · Q${a}${promoTag}`);
    setAmt('');

    // Push notification (motor): si el cliente tiene la app cerrada, el
    // tap de la notificación abre su modal de calificación + encuesta
    // (misma data que el canal Realtime de purchases).
    if (loggedOp) {
      sendPushToMember(cid, {
        type: 'purchase',
        title: promo ? '¡Compra con promoción!' : '¡Compra registrada!',
        // Regla del dueño (29-jul): al cliente solo el PRIMER nombre.
        body: `+${pts} pts · ${gal} gal · Q${a}${promoTag}${tier_changed && new_tier ? ` · ¡Subiste a ${new_tier}!` : ''} — Atendido por ${firstName(loggedOp.name)}`,
        data: {
          operatorId: loggedOp.id,
          operatorName: firstName(loggedOp.name),
          stationName,
          purchaseId: data.purchase_id || null,
          points: pts,
          amount: a,
          actions: [
            { action: 'rate', title: 'Calificar' },
            { action: 'dismiss', title: 'Cerrar' },
          ],
        },
      });

      // Premio por promoción (grant_reward): push aparte con deep-link a
      // los canjes pendientes, donde vive el QR para reclamarlo.
      if (promo?.effect_type === 'grant_reward') {
        sendPushToMember(cid, {
          type: 'reward',
          title: '¡Ganaste un premio!',
          body: `${promo.name ? promo.name + ': ' : ''}${promo.reward_name} gratis por tu compra. Abrí la notificación para ver el QR y mostralo al operador cuando quieras reclamarlo.`,
          url: '/?goto=pendientes',
          data: { rewardName: promo.reward_name, code: promo.redemption_code || null },
        });
      }
    }

    // Aviso de upgrade de tier
    if (tier_changed && new_card_code) {
      fire('⭐ ¡Subiste a ' + new_tier + '! Tu código es ' + new_card_code);
    }
    return true;
  }, [me, fire, sbConnected, loggedOp]);

  // ──────────────────────────────────────────────
  // redeem — delega en RPC redeem_reward
  // ──────────────────────────────────────────────
  // La RPC valida puntos, calcula descuento por tier, valida exclusividad
  // de tier, crea la fila en redemptions con confirm_status='none' (default),
  // descuenta puntos y registra activity_log.
  // El flujo de confirmación con el operador (OpRedeem) sigue intacto:
  // operador escanea → update confirm_status='pending' → cliente confirma.
  //
  // r.id debe ser el UUID del reward en Supabase (no el campo "id" local).
  const redeem = useCallback(async (r) => {
    if (!me?.id) return;
    if (!sb || !sbConnected) { fire('Sin conexión'); return; }
    if (!r.id) { fire('Premio sin ID válido'); return; }

    const { data, error } = await redeemReward({
      memberId: me.id,
      rewardId: r.id,
      operatorId: null, // canje desde cliente, sin operador asociado aún
    });

    if (error) {
      fire('❌ ' + (error.message || 'Error al canjear'));
      return;
    }

    const { redemption_id, code, cost, reward_name, reward_icon } = data;
    const today = localDate();
    const newEntry = {
      id: redemption_id,
      memberId: me.id,
      reward: { name: reward_name, icon: reward_icon, cat: r.cat },
      cost, date: today, code, collected: false,
    };

    // Update local state con valores REALES del server
    setMe(p => ({ ...p, points: p.points - cost, redeemed: (p.redeemed || 0) + 1 }));
    setCusts(p => p.map(c => c.id === me.id
      ? { ...c, points: c.points - cost, redeemed: (c.redeemed || 0) + 1 }
      : c));
    setRedeemedList(p => [newEntry, ...p]);
    fire(`🎉 ¡Canjeaste ${reward_name} por ${cost} pts!`);
  }, [me, fire, sbConnected]);

  // ──────────────────────────────────────────────
  // buyTickets — delega en RPC buy_raffle_tickets
  // ──────────────────────────────────────────────
  // La RPC valida puntos, descuenta, inserta en raffle_tickets
  // (no raffle_entries — esa tabla está deprecada) y registra activity.
  const buyTickets = useCallback(async (n) => {
    if (!me?.id) return;
    if (!n || n < 1) { fire('Cantidad inválida'); return; }
    if (!sb || !sbConnected) { fire('Sin conexión'); return; }

    // Obtener ID de la rifa del mes actual (curMonth es 0-indexed)
    const { data: rafRow, error: rafErr } = await sb
      .from('raffle_calendar')
      .select('id')
      .eq('month', curMonth + 1)
      .eq('year', new Date().getFullYear())
      .maybeSingle();

    if (rafErr || !rafRow?.id) {
      fire('Rifa no disponible para este mes');
      return;
    }

    // SEC.C.1: la compra exige la sesión de miembro (el vector sin token
    // quedó cerrado server-side).
    const { data, error } = await buyRaffleTickets({
      memberId: me.id,
      raffleId: rafRow.id,
      quantity: n,
      sessionToken: getMemberToken()?.token ?? null,
      sessionRole: 'member',
    });

    if (error) {
      fire('❌ ' + (error.message || 'Error al comprar boletos'));
      return;
    }

    const { tickets, cost, remaining_points, new_ticket_total } = data;

    setMe(p => ({ ...p, points: remaining_points, tickets: new_ticket_total }));
    setCusts(p => p.map(c => c.id === me.id
      ? { ...c, points: remaining_points, tickets: new_ticket_total }
      : c));
    setRafData(p => p.map((rd, i) => {
      if (i !== curMonth) return rd;
      const ps = [...rd.participants];
      const ex = ps.findIndex(p2 => p2.cid === me.id);
      if (ex >= 0) ps[ex] = { ...ps[ex], tickets: ps[ex].tickets + tickets };
      else ps.push({ cid: me.id, name: me.nickname || (me.name || '').split(' ')[0], avatar: me.avatar || '', tickets });
      return { ...rd, participants: ps };
    }));

    fire(`🎟️ ${tickets} boleto${tickets > 1 ? 's' : ''} · -${cost} pts`);
  }, [me, fire, curMonth, sbConnected]);

  // ──────────────────────────────────────────────
  // doSurvey — delega en RPC complete_survey
  // ──────────────────────────────────────────────
  // La RPC cuenta encuestas del día desde la tabla `surveys`,
  // valida límite, suma puntos, otorga bonus si es la 5ta.
  // El cliente CONFÍA en `count` y `bonus_ticket` retornados.
  const doSurvey = useCallback(async () => {
    if (!me?.id) return;
    if (!sb || !sbConnected) { fire('Sin conexión'); return; }

    const { data, error } = await completeSurvey(me.id);

    if (error) {
      fire('❌ ' + (error.message || 'Error al guardar encuesta'));
      return;
    }

    const { points: pts, count, limit, bonus_ticket, remaining_points, new_ticket_total } = data;

    setMySurveyCount(count);
    setMe(p => ({ ...p, points: remaining_points, tickets: new_ticket_total }));
    setCusts(p => p.map(c => c.id === me.id
      ? { ...c, points: remaining_points, tickets: new_ticket_total }
      : c));

    if (bonus_ticket) {
      // El boleto bonus entra a la rifa del mes en curso (RPC
      // complete_survey, migration 20260721b) — reflejarlo al instante.
      setRafData(p => p.map((rd, i) => {
        if (i !== curMonth) return rd;
        const ps = [...rd.participants];
        const ex = ps.findIndex(p2 => p2.cid === me.id);
        if (ex >= 0) ps[ex] = { ...ps[ex], tickets: ps[ex].tickets + 1 };
        else ps.push({ cid: me.id, name: me.nickname || (me.name || '').split(' ')[0], avatar: me.avatar || '', tickets: 1 });
        return { ...rd, participants: ps };
      }));
      fire(`+${pts} pts · ¡Bonus! ${count}/${limit} encuestas = 1 boleto de rifa gratis`, 'success');
    } else {
      fire(`Encuesta completada · +${pts} pts (${count}/${limit})`, 'success');
    }
  }, [me, fire, sbConnected, curMonth]);

  // SEC.B.6.4: helper reutilizable para terminar una sesión de operador/admin.
  // Encapsula la revocación server-side (logoutOperator/logoutAdmin, B.6.3) +
  // el reset del estado React + el aviso. Lo invocan: (1) el logout manual con
  // reason 'cerrada', (2) el cierre proactivo de sesión expirada
  // (checkSessionAlive) con reason 'expirada', y (3) — a futuro — B.8.2 cuando
  // el server rechace con error.code 28000, también con 'expirada'.
  // El toast es un overlay fijo en el root de App (fuera del subárbol de cada
  // pantalla), así que persiste visible tras el cambio a la pantalla de login.
  // El CLIENTE no usa este helper (su sesión la maneja Supabase Auth nativo):
  // se queda en la rama isC de logout, intacta.
  const expireSession = useCallback((role, { reason } = {}) => {
    const msg = reason === 'expirada'
      ? '⏱️ Tu sesión expiró, iniciá sesión de nuevo'
      : '👋 Sesión cerrada';
    if (role === 'operator') {
      logoutOperator(); setAuthOp('login'); setLoggedOp(null); setOScr('ohome');
    } else if (role === 'admin') {
      logoutAdmin(); setAuthAdmin('login'); setLoggedAdmin(null); setScr('dash');
    }
    setAuthError(''); fire(msg);
  }, [fire]);

  const logout = useCallback(() => {
    if (sb) sb.auth.signOut({ scope: 'local' });
    setMe(null); setGoogleStep('welcome'); setMySurveyCount(0); setLoggedOp(null);
    if (isC) {
      logoutMember(); // SEC.C.1: revoca member_sessions y limpia el token
      localStorage.removeItem('ct_me'); setAuthScreen('login'); setCScr('home');
      setCompanyPicked(false); // el selector de empresa se pide de nuevo
      setLoginPhone(''); setLoginPass(''); setMe(null);
      setAuthError(''); fire('👋 Sesión cerrada');
    }
    else if (isO) expireSession('operator', { reason: 'cerrada' });
    else if (isA) expireSession('admin', { reason: 'cerrada' });
  }, [view, fire, expireSession]);

  // SEC.B.6.4: detecta la "sesión zombi" (objeto de sesión presente pero token
  // vencido) y dispara el cierre proactivo. La invocan los dos enganches de la
  // Parte 3: el arranque de la app y el evento visibilitychange.
  //
  // Lee viewRef.current (NO `view`): el listener de visibilidad se registra una
  // vez y capturaría un `view` stale; viewRef.current siempre tiene el rol
  // vigente (el codebase ya usa este patrón en el efecto de auth).
  //
  // CONDICIÓN CONJUNTA por rol — "objeto de sesión presente Y token vivo null":
  //   - getOperatorToken()/getAdminToken() devuelven null si el token venció
  //     (y de paso auto-limpian su clave, sessionTokens.js).
  //   - Solo el caso MIXTO (loggedOp/loggedAdmin truthy + token null) = zombi.
  //   - Ambos presentes = sesión sana → no tocar.
  //   - Ninguno presente = ya deslogueado → no tocar.
  const checkSessionAlive = useCallback(() => {
    const role = viewRef.current;
    if (role === 'operator') {
      if (loggedOp && getOperatorToken() === null) {
        expireSession('operator', { reason: 'expirada' });
      }
    } else if (role === 'admin') {
      if (loggedAdmin && getAdminToken() === null) {
        expireSession('admin', { reason: 'expirada' });
      }
    }
    // role === 'client' (o cualquier otro valor): no-op deliberado.
  }, [loggedOp, loggedAdmin, expireSession]);

  // SEC.B.6.4 — Enganche 1: chequeo al MONTAR (corre una vez). Cubre el caso
  // "el operador vuelve al día siguiente y abre/recarga la app": al arrancar,
  // loggedOp/loggedAdmin se siembran de localStorage y, si el token venció,
  // checkSessionAlive lo manda al login limpio en vez de dejar la sesión zombi.
  useEffect(() => { checkSessionAlive(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // SEC.B.6.4 — Enganche 2: listener de visibilitychange (patrón idéntico al de
  // ClientHome.jsx). Cubre el caso "la app quedó abierta, el dispositivo entró
  // en reposo, el operador enciende la pantalla al día siguiente".
  //
  // El efecto DEPENDE de checkSessionAlive: cuando loggedOp/loggedAdmin cambian
  // (p.ej. el operador inicia sesión DESPUÉS del arranque), checkSessionAlive se
  // recrea, el cleanup quita el handler viejo (que cerraba sobre loggedOp stale)
  // y se registra uno nuevo con los valores frescos. Sin esta dependencia, un
  // listener registrado una sola vez con [] capturaría el loggedOp=null del
  // primer render y nunca detectaría la zombi de una sesión iniciada después.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      checkSessionAlive();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [checkSessionAlive]);

  // SEC.B.8.2: handler del rechazo reactivo de sesión. Lo dispara la capa de
  // servicios (notifySessionExpired) cuando una RPC sensible rechaza con
  // ERRCODE 28000 (B.8.1). Reutiliza expireSession de B.6.4 (logout + redirect
  // al login + aviso "Tu sesión expiró"). El rol sale de viewRef.current (no de
  // un closure ni de un parámetro): resuelve el doble vector de
  // buy_raffle_tickets sin tocar firmas. Cliente = no-op redundante (nunca
  // recibe 28000: su único flujo que toca el helper es la rama 1a, sin RAISE).
  const handleSessionExpired = useCallback(() => {
    const role = viewRef.current;
    if (role === 'operator') {
      expireSession('operator', { reason: 'expirada' });
    } else if (role === 'admin') {
      expireSession('admin', { reason: 'expirada' });
    }
    // role === 'client' (o cualquier otro): no-op deliberado.
  }, [expireSession]);

  // SEC.B.8.2: registra el handler en el singleton sessionExpiry al montar y lo
  // limpia en el cleanup. Dep [handleSessionExpired]: si su identidad cambia
  // (cambiaría si expireSession cambiara, que depende de fire), se re-registra
  // la versión fresca — mismo razonamiento de stale closure que B.6.4. En la
  // práctica fire/expireSession son estables, así que registra una vez.
  useEffect(() => {
    setSessionExpiredHandler(handleSessionExpired);
    return () => setSessionExpiredHandler(null);
  }, [handleSessionExpired]);

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
    dark, uiMode, setUiMode,
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
        {/* BLACK: fondo galaxia con estrellas en deriva (CSS puro) — en
            ambos modos: oscuro = galaxia clásica; claro = estrellas
            doradas/grises sobre el fondo perla (variante `light`). */}
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
