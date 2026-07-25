// src/views/App.jsx
// Main orchestrator — manages global state, auth, Supabase sync, and view routing
import { useState, useCallback, useEffect, useRef } from 'react';
import { sb } from '../lib/supabaseClient';
import { makeTier, daysInactive } from '../lib/tierSystem';
import { CFG_INIT, FUEL_LABELS } from '../constants/config';
import { registerPurchase, redeemReward, buyRaffleTickets, completeSurvey, grantSpecialDayBonus, fetchPurchasePromo } from '../services';
import { logoutOperator, logoutAdmin } from '../services'; // SEC.B.4: logout delega el subconjunto de localStorage (ct_op/ct_admin + token de rol)
import { getOperatorToken, getAdminToken } from '../services/sessionTokens'; // SEC.B.6.4: chequeo de token vivo para el cierre proactivo de sesión expirada
import { setSessionExpiredHandler } from '../services/sessionExpiry'; // SEC.B.8.2: registro del handler que dispara expireSession ante rechazo 28000 del server

// Guatemala es UTC-6 — usar siempre fecha/hora local, nunca UTC
function localDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function localISO() {
  // Genera timestamp en hora local (para guardar en Supabase con hora correcta)
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString();
}
// Convierte un timestamp UTC de Supabase a fecha local YYYY-MM-DD
function utcToLocal(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
import { clientTheme, clientMainBg, adminTheme, sMono, GAL, bento, BRAND_ORANGE, CAT_LABELS, CAT_COLORS } from '../constants/styles';
import useToast from '../hooks/useToast';

// UI Components
import BottomNav from '../components/ui/BottomNav';
import GalaxyStars from '../components/ui/GalaxyStars';
import QRCode from '../components/ui/QRCode';
import SpecialDayBonusModal from '../components/SpecialDayBonusModal';
import UpdateAvailable from '../components/UpdateAvailable';
import { Fuel, Users, Gift, Ticket, Clock, Gear, Megaphone, Menu, House, TicketStar, Car } from '../components/ui/Icons';
import Toast from '../components/ui/Toast';
import RewardIcon from '../components/ui/RewardIcon';
import RaffleWinnerModal from '../components/RaffleWinnerModal';
import useBackLayer from '../hooks/useBackLayer';

// Auth Views
import ClientLogin from './client/ClientLogin';
import ClientProfile from './client/ClientProfile';
import GoogleProfile from './client/GoogleProfile';
import OperatorLogin from './operator/OperatorLogin';
import AdminLogin from './admin/AdminLogin';

// Client Views
import ClientHome from './client/ClientHome';
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
import Members from './admin/Members';
import MemberDetail from './admin/MemberDetail';
import AdminRaffle from './admin/AdminRaffle';
import AdminPremios from './admin/AdminPremios';
import Settings from './admin/Settings';
import AdminPromos from './admin/AdminPromos';
import PromoRules from './admin/PromoRules';
import OpManagement from './admin/OpManagement';
import AuditLog from './admin/AuditLog';
import VehiclesSoon from './client/VehiclesSoon';
import { originFromEvent } from '../lib/motionOrigin';
import { isPushSupported, subscribePush, sendPushToMember } from '../lib/pushNotifications';

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
  const [authAdmin, setAuthAdmin]   = useState(savedAdmin ? 'logged' : 'login');
  const [loggedAdmin, setLoggedAdmin] = useState(savedAdmin); // admin data after login
  const [authError, setAuthError] = useState('');
  const clearAuthErr = () => { if (authError) setAuthError(''); };

  // Auth form fields
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regPass2, setRegPass2] = useState('');
  const [regVerifyMethod, setRegVerifyMethod] = useState('whatsapp');
  const [regCode, setRegCode] = useState('');
  const [regSentCode, setRegSentCode] = useState(false);
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
  const [surveys, setSurveys] = useState([]);
  const [mySurveyCount, setMySurveyCount] = useState(0);
  const [activityLog, setActivityLog] = useState({});
  const [cfg, setCfg] = useState(CFG_INIT);
  const [cards, setCards] = useState([]);
  const [raffleCal, setRaffleCal] = useState([]);
  const [rafData, setRafData] = useState(Array(12).fill(null).map(() => ({ participants: [] })));
  const [rafWinners, setRafWinners] = useState({});
  const [opRatings, setOpRatings] = useState({});
  const [redeemedList, setRedeemedList] = useState([]);

  // ===== UI STATE =====
  const [sel, setSel] = useState(null);          // selected member (admin)
  const [q, setQ] = useState('');                 // search query
  const [modal, setModal] = useState(null);
  const [amt, setAmt] = useState('');
  const [fuel, setFuel] = useState('super');
  const [catF, setCatF] = useState('todos');
  const [rQty, setRQty] = useState(1);
  const [showHist, setShowHist] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showRedeemed, setShowRedeemed] = useState(false);
  const [showWifi, setShowWifi] = useState(false);
  // R1b/D35: origen (cuadro o pestaña presionada) del que "sale" la
  // vista del cliente al cambiar de pantalla (container transform).
  const [navOrigin, setNavOrigin] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showRating, setShowRating] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [ratingStars, setRatingStars] = useState(0);
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
    if (!me?.id || !raffleCal.length) return;
    try {
      const win = raffleCal.find(r => r?.winnerId === me.id && r.drawnAt && r.dbId
        && !r.winnerSeenAt
        && !localStorage.getItem(`pp_rafwin_${r.dbId}`));
      if (win) setRaffleWin(win);
    } catch { /* localStorage no disponible */ }
  }, [me?.id, raffleCal]);

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
  // Modo efectivo: elección del usuario o, sin ella, el histórico del
  // nivel (BLACK oscuro, ORO/PLATINO claro). En login/registro (sin
  // sesión) manda solo la elección; por defecto claro.
  const dark = uiMode ? uiMode === 'dark' : cTier.name === 'BLACK';
  const TH = clientTheme(cTier.name, dark);
  const isLoggedIn = (isC && authScreen === 'logged') || (isO && authOp === 'logged') || (isA && authAdmin === 'logged');

  // ===== SUPABASE WRITE HELPERS =====
  const logActivity = useCallback((memberId, type, desc, ptsChange, amount) => {
    // Actualizar estado local SIEMPRE (independiente de Supabase)
    setActivityLog(prev => {
      const n = { ...prev };
      if (!n[memberId]) n[memberId] = [];
      n[memberId] = [{ type, desc, pts: ptsChange, amount, date: localDate(), station: '' }, ...n[memberId]];
      return n;
    });
    // Guardar en Supabase solo si está conectado
    if (!sb || !sbConnected) return;
    sb.from('activity_log').insert({
      member_id: memberId, activity_type: type,
      description: desc, points_change: ptsChange || null, amount: amount || null,
    }).then(r => { if (r.error) console.error('[Activity]', r.error); });
  }, [sbConnected]);

  // Helper: cargar conteo de encuestas del día para un miembro
  const loadTodaySurveys = useCallback(async (memberId) => {
    if (!sb || !memberId) return;
    // Guatemala UTC-6: calcular medianoche local en UTC
    const now = new Date();
    const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayUTC = localMidnight.toISOString();
    console.log('[Surveys] Buscando encuestas desde:', todayUTC, 'para member:', memberId);
    const { count, error } = await sb.from('surveys')
      .select('*', { count: 'exact', head: true })
      .eq('member_id', memberId)
      .gte('created_at', todayUTC);
    if (error) {
      console.error('[Surveys] Error cargando conteo:', error);
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

    async function loadFromSupabase() {
      try {
        // Sorteo perezoso de rifas: si un mes terminó sin ganador, se
        // sortea acá (ponderado por boletos, idempotente — ver migration
        // 20260721_rifa_sorteo). Debe correr ANTES de leer raffle_calendar
        // para que winner_id/drawn_at lleguen frescos.
        try { await sb.rpc('draw_due_raffles'); } catch (e) { console.warn('[Raffle] draw_due_raffles:', e?.message); }

        // Degradación perezosa por inactividad (25-jul): mismo patrón que
        // el sorteo — corre ANTES de leer members para que los galones
        // (y por tanto el NIVEL, que deriva de ellos) lleguen frescos.
        // Ver migration 20260725e_degradacion_real.
        try { await sb.rpc('apply_due_degradations'); } catch (e) { console.warn('[Degrad] apply_due_degradations:', e?.message); }

        const [rwRes, prRes, stRes, cfgRes, rcRes] = await Promise.all([
          sb.from('rewards').select('*').order('sort_order'),
          sb.from('promotions').select('*').order('sort_order'),
          sb.from('stations').select('*'),
          sb.from('program_config').select('*'),
          sb.from('raffle_calendar').select('*').order('month'),
        ]);
        if (!mounted) return;

        if (rwRes.data) {
          setRewards(rwRes.data.map(r => ({
            id: r.id, name: r.name, icon: r.icon,
            pts: r.points_cost, cat: r.category, tier: r.tier_exclusive || undefined,
            points_cost: r.points_cost, category: r.category, tier_exclusive: r.tier_exclusive,
            description: r.description, active: r.active !== false,
          })));
        }

        if (prRes.data) {
          setPromos(prRes.data.map(p => ({
            id: p.id, title: p.title, desc: p.description, icon: p.icon,
            bg: p.bg_gradient, color: p.text_color,
            sort_order: p.sort_order,
            active: p.active !== false,
            // R1b.2 (D33): card compuesta + vista PROMOCIONES
            image_url: p.image_url || null,
            category: p.category || null,
            valid_until: p.valid_until || null,
            conditions: p.conditions || null,
            promo_rule_id: p.promo_rule_id || null,
            text_colors: p.text_colors || null,
          })));
        }

        if (stRes.data?.length > 0) {
          setStations(stRes.data.map(s => ({
            id: s.id, name: s.name, address: s.address || '',
            lat: s.lat, lng: s.lng, active: s.active !== false,
            schedule: s.schedule || null,
            wifiSsid: s.wifi_ssid || null, wifiPassword: s.wifi_password || null,
          })));
          console.log('[Puntos Plus] Estaciones cargadas:', stRes.data.length);
        }

        if (cfgRes.data?.length > 0) {
          const cfgMap = {};
          cfgRes.data.forEach(c => { cfgMap[c.key] = c.value; });
          if (cfgMap.general && cfgMap.tiers) {
            const gen = typeof cfgMap.general === 'string' ? JSON.parse(cfgMap.general) : cfgMap.general;
            const trs = typeof cfgMap.tiers === 'string' ? JSON.parse(cfgMap.tiers) : cfgMap.tiers;
            const deg = cfgMap.degradation ? (typeof cfgMap.degradation === 'string' ? JSON.parse(cfgMap.degradation) : cfgMap.degradation) : [];
            const tu = cfgMap.terms_use ? (typeof cfgMap.terms_use === 'string' ? JSON.parse(cfgMap.terms_use) : cfgMap.terms_use) : [];
            const tc = cfgMap.terms_canje ? (typeof cfgMap.terms_canje === 'string' ? JSON.parse(cfgMap.terms_canje) : cfgMap.terms_canje) : [];
            // Interruptor del motor de degradación (25-jul): apagado
            // hasta el lanzamiento oficial; se enciende en admin Settings.
            const degEn = cfgMap.degradation_enabled
              ? (typeof cfgMap.degradation_enabled === 'string' ? JSON.parse(cfgMap.degradation_enabled) : cfgMap.degradation_enabled)
              : {};
            let fp;
            if (cfgMap.fuel_prices) {
              fp = typeof cfgMap.fuel_prices === 'string' ? JSON.parse(cfgMap.fuel_prices) : cfgMap.fuel_prices;
            } else {
              console.warn('[Puntos Plus] program_config.fuel_prices no encontrado — usando fallback {0,0,0}. Configurar en admin/Settings.');
              fp = { super: 0, regular: 0, diesel: 0 };
            }
            setCfg({
              qPerPt: gen.qPerPt || 10, ticketPts: gen.ticketPts || 5,
              regBase: gen.regBase || 15, regOptional: gen.regOptional || 2,
              referralPts: gen.referralPts || 25, surveyPts: gen.surveyPts || 3,
              surveyDaily: gen.surveyDaily || 5, tiers: trs, degrad: deg,
              termsUse: tu, termsCanje: tc,
              fuelPrices: fp,
              degradEnabled: degEn.enabled === true,
              degradEnabledAt: degEn.enabled_at || null,
            });
          }
        }

        if (rcRes.data?.length > 0) {
          const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
          // 12 slots por índice de mes (0-11) del AÑO EN CURSO: los
          // consumidores indexan raffleCal[curMonth]. Incluye ganador,
          // fecha de sorteo e imagen real del premio (R1b.4 Rifa).
          const yr = new Date().getFullYear();
          const cal = months.map((m, i) => ({
            m, p: '—', name: null, icon: null, img: null, detail: null,
            v: 'Q0', cost: 0, dbId: null, month: i + 1, year: yr,
            winnerId: null, drawnAt: null, winnerSeenAt: null, ticketPts: null,
          }));
          rcRes.data.filter(r => !r.year || r.year === yr).forEach(r => {
            cal[r.month - 1] = {
              m: months[r.month - 1], p: `${r.prize_icon} ${r.prize_name}`,
              name: r.prize_name, icon: r.prize_icon, img: r.prize_image_url || null,
              detail: r.prize_detail || null,
              v: `Q${r.prize_value}`, cost: r.prize_value, dbId: r.id,
              month: r.month, year: r.year || yr,
              winnerId: r.winner_id || null, drawnAt: r.drawn_at || null,
              winnerSeenAt: r.winner_seen_at || null,
              // Costo del boleto de ESTA rifa; null = global cfg.ticketPts.
              ticketPts: r.ticket_points ?? null,
            };
          });
          setRaffleCal(cal);
        }

        // Load members (with fallback if join fails)
        let memRes = await sb.from('members').select('*,physical_cards!assigned_to(card_code)').order('created_at', { ascending: false });
        if (memRes.error) {
          console.warn('[Puntos Plus] Members join query failed, trying without join:', memRes.error);
          memRes = await sb.from('members').select('*').order('created_at', { ascending: false });
        }
        if (memRes.error) console.error('[Puntos Plus] Error cargando miembros:', memRes.error);
        console.log('[Puntos Plus] Miembros encontrados:', memRes.data?.length || 0);

        function mapMember(m) {
          return {
            id: m.id, name: m.name, email: m.email || '',
            phone: m.phone || '', dpi: m.dpi || '', plate: m.plate || '',
            vehicles: (() => { const v = m.vehicles; if (!v) return []; if (Array.isArray(v)) return v; if (typeof v === 'object') return Object.values(v); try { return JSON.parse(v); } catch { return []; } })(),
            nit: m.nit || '', bday: m.birthday || '',
            points: m.points || 0, gallons: parseFloat(m.gallons) || 0,
            spent: parseFloat(m.spent) || 0, visits: m.visits || 0,
            tickets: m.tickets || 0, redeemed: m.redeemed_count || 0,
            referrals: m.referral_count || 0,
            registered: utcToLocal(m.created_at) || '',
            lastBuy: utcToLocal(m.last_buy) || '',
            station: m.last_station || '',
            cardId: m.physical_cards?.[0]?.card_code || m.card_id || '',
            supabaseUser: true, authProvider: m.auth_provider || 'google',
            authProviderId: m.auth_provider_id || '',
          };
        }

        if (memRes.data?.length > 0) {
          setCusts(memRes.data.map(mapMember));
        }

        // Load operators
        const opRes = await sb.from('operators').select('*, stations(name)').order('name');
        if (opRes.data?.length > 0) {
          setOperators(opRes.data.map(o => ({
            id: o.id, name: o.name, user: o.username,
            dpi: o.dpi, gafete: o.gafete, phone: o.phone || '', email: o.email || '',
            station: o.stations?.name || o.station_id || '', stationId: o.station_id || null, bomba: o.bomba || '', turno: o.turno || '',
            active: o.active !== false,
          })));
          console.log('[Puntos Plus] Operadores cargados:', opRes.data.length);
        }

        // Load activity log
        const actRes = await sb.from('activity_log').select('*').order('created_at', { ascending: false }).limit(200);
        if (actRes.data?.length > 0) {
          const actMap = {};
          actRes.data.forEach(a => {
            if (!actMap[a.member_id]) actMap[a.member_id] = [];
            actMap[a.member_id].push({
              type: a.activity_type, desc: a.description,
              pts: a.points_change, amount: a.amount ? parseFloat(a.amount) : null,
              date: utcToLocal(a.created_at) || '', station: a.station_id || '',
            });
          });
          setActivityLog(actMap);
        }

        // Load redemptions
        const rdRes = await sb.from('redemptions')
          .select('*, rewards(name, icon, category)')
          .order('created_at', { ascending: false })
          .limit(100);
        if (rdRes.data?.length > 0) {
          setRedeemedList(rdRes.data.map(rd => ({
            id: rd.id,
            memberId: rd.member_id,
            reward: { name: rd.rewards?.name || 'Premio', icon: rd.rewards?.icon || '🎁', cat: rd.rewards?.category || '' },
            cost: rd.points_spent,
            date: utcToLocal(rd.created_at) || '',
            code: rd.redemption_code,
            collected: rd.collected || false,
          })));
        }

        // Load raffle tickets — FUENTE REAL de boletos comprados: la
        // tabla que llena el RPC buy_raffle_tickets es raffle_tickets
        // (raffle_entries quedó obsoleta y por eso "Mis boletos" volvía
        // a cero al recargar). El nombre se resuelve desde members.
        const reRes = await sb.from('raffle_tickets')
          .select('member_id, raffle_id, quantity');

        console.log('[Raffle] raffle_tickets:', reRes.error?.message || `${reRes.data?.length ?? 0} filas`);

        if (!reRes.error && reRes.data?.length > 0 && rcRes.data?.length > 0) {
          // mapa raffle_id → month 0-indexed (solo año en curso)
          const yrNow = new Date().getFullYear();
          const idToMonth = {};
          rcRes.data.filter(r => !r.year || r.year === yrNow).forEach(r => { idToMonth[r.id] = r.month - 1; });

          // mapa member_id → name desde la carga de members ya hecha arriba
          const idToName = {};
          if (memRes.data?.length > 0) {
            memRes.data.forEach(m => { idToName[m.id] = m.name || 'Miembro'; });
          }

          const rafMap = Array(12).fill(null).map(() => ({ participants: [] }));
          reRes.data.forEach(e => {
            const month = idToMonth[e.raffle_id];
            if (month === undefined || month < 0 || month > 11) return;
            const ps  = rafMap[month].participants;
            const ex  = ps.findIndex(p => p.cid === e.member_id);
            const name = idToName[e.member_id] || 'Miembro';
            if (ex >= 0) ps[ex].tickets += e.quantity || 1;
            else ps.push({ cid: e.member_id, name, tickets: e.quantity || 1 });
          });
          setRafData(rafMap);
          console.log('[Raffle] ✅ rafData listo:', reRes.data.length, 'compras');
        } else if (reRes.error) {
          console.error('[Raffle] Error:', reRes.error.message);
        }

        // Load operator ratings
        const ratRes = await sb.from('operator_ratings').select('operator_id, stars').order('created_at', { ascending: false });
        if (ratRes.data?.length > 0) {
          const ratMap = {};
          ratRes.data.forEach(r => {
            if (!ratMap[r.operator_id]) ratMap[r.operator_id] = [];
            ratMap[r.operator_id].push({ stars: r.stars });
          });
          setOpRatings(ratMap);
          console.log('[Puntos Plus] Calificaciones cargadas:', ratRes.data.length);
        }

        setSbConnected(true);
        console.log('[Puntos Plus] ✅ Datos cargados desde Supabase');


      } catch (e) {
        console.error('[Puntos Plus] ⚠️ Error cargando:', e);
      } finally {
        if (mounted) setSbLoading(false);
      }
    }

    loadFromSupabase();
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
        id: m.id, name: m.name, email: m.email || email, avatar,
        phone: m.phone || '', dpi: m.dpi || '', plate: m.plate || '',
        nit: m.nit || '', bday: m.birthday || '',
        points: m.points || 0, gallons: parseFloat(m.gallons) || 0,
        spent: parseFloat(m.spent) || 0, visits: m.visits || 0,
        tickets: m.tickets || 0, redeemed: m.redeemed_count || 0,
        referrals: m.referral_count || 0,
        registered: utcToLocal(m.created_at) || '',
        lastBuy: utcToLocal(m.last_buy) || '',
        station: m.last_station || '',
        cardId: m.physical_cards?.[0]?.card_code || m.card_id || '',
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

      // Intento 1: buscar por auth_provider_id con join
      sb.from('members').select('*,physical_cards!assigned_to(card_code)')
        .eq('auth_provider_id', u.id).then(async (r) => {
        if (!r.error && handleMemberResult(r.data)) return;

        // Intento 2: sin join (por si falla el FK)
        if (r.error) console.warn('[Auth] Join query failed, retrying without join:', r.error.code);
        const r2 = await sb.from('members').select('*').eq('auth_provider_id', u.id);
        if (!r2.error && handleMemberResult(r2.data)) return;

        // Intento 3: buscar por email como fallback
        if (email) {
          console.log('[Auth] Trying email fallback:', email);
          const r3 = await sb.from('members').select('*').eq('email', email).limit(1);
          if (!r3.error && r3.data?.length > 0) {
            // Vincular auth_provider_id al miembro encontrado por email
            await sb.from('members').update({ auth_provider_id: u.id, auth_provider: provider })
              .eq('id', r3.data[0].id);
            console.log('[Auth] \u2705 Linked existing member by email:', r3.data[0].name);
            handleMemberResult(r3.data);
            return;
          }
        }

        // No se encontro nada: mostrar registro
        showRegistration();
      });
    }
  }

  // ===== RECARGAR DATOS SI FALTAN AL ENTRAR COMO OPERADOR/ADMIN =====
  useEffect(() => {
    if ((authOp === 'logged' || authAdmin === 'logged') && custs.length === 0 && sb) {
      console.log('[Puntos Plus] Operador/Admin logueado pero sin clientes, recargando...');
      sb.from('members').select('*,physical_cards!assigned_to(card_code)')
        .order('created_at', { ascending: false })
        .then(res => {
          if (res.error) {
            console.warn('[Puntos Plus] Retry con join falló, intentando sin join...');
            return sb.from('members').select('*').order('created_at', { ascending: false });
          }
          return res;
        })
        .then(res => {
          if (res.data?.length > 0) {
            setCusts(res.data.map(m => ({
              id: m.id, name: m.name, email: m.email || '',
              phone: m.phone || '', dpi: m.dpi || '', plate: m.plate || '',
            vehicles: (() => { const v = m.vehicles; if (!v) return []; if (Array.isArray(v)) return v; if (typeof v === 'object') return Object.values(v); try { return JSON.parse(v); } catch { return []; } })(),
              nit: m.nit || '', bday: m.birthday || '',
              points: m.points || 0, gallons: parseFloat(m.gallons) || 0,
              spent: parseFloat(m.spent) || 0, visits: m.visits || 0,
              tickets: m.tickets || 0, redeemed: m.redeemed_count || 0,
              referrals: m.referral_count || 0,
              registered: utcToLocal(m.created_at) || '',
              lastBuy: utcToLocal(m.last_buy) || '',
              station: m.last_station || '',
              cardId: m.physical_cards?.[0]?.card_code || m.card_id || '',
              supabaseUser: true, authProvider: m.auth_provider || 'google',
              authProviderId: m.auth_provider_id || '',
            })));
            console.log('[Puntos Plus] ✅ Miembros recargados:', res.data.length);
          } else {
            console.warn('[Puntos Plus] No se encontraron miembros en recarga');
          }
        });
    }
  }, [authOp, authAdmin, custs.length]);

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

  // ===== SERVICE WORKER: Listen for notification clicks =====
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handleMessage = (event) => {
      if (event.data?.type === 'NOTIFICATION_CLICK') {
        const d = event.data.data || {};
        if (d.type === 'purchase' && d.operatorId) {
          setPendingOpRating({
            operatorId: d.operatorId,
            operatorName: d.operatorName || 'Operador',
            stationName: d.stationName || '',
          });
        }
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
      setPendingOpRating({
        operatorId: rateOpId,
        operatorName: decodeURIComponent(params.get('opName') || 'Operador'),
        stationName: decodeURIComponent(params.get('station') || ''),
      });
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
        console.log('[Realtime] Member updated:', m.name, 'pts:', m.points, 'visits:', m.visits, 'op_id:', m.last_operator_id);
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
          // ── Recargar historial desde Supabase en el dispositivo del miembro ──
          sb.from('activity_log')
            .select('*')
            .eq('member_id', m.id)
            .order('created_at', { ascending: false })
            .limit(50)
            .then(res => {
              if (res.data?.length > 0) {
                setActivityLog(prev => ({
                  ...prev,
                  [m.id]: res.data.map(a => ({
                    type: a.activity_type,
                    desc: a.description,
                    pts: a.points_change,
                    amount: a.amount ? parseFloat(a.amount) : null,
                    date: utcToLocal(a.created_at) || '',
                    station: a.station_id || '',
                  })),
                }));
                console.log('[Realtime] ✅ Historial recargado:', res.data.length, 'entradas');
              }
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
    return () => sb.removeChannel(ch);
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
  const addPurchase = useCallback(async (cid, a, f) => {
    if (!a || a < 10) { fire('Mínimo Q10'); return; }
    if (!sb || !sbConnected) { fire('Sin conexión'); return; }

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
      if (sessionExpired) return; // SEC.B.8.2: expireSession ya manejó el rechazo; no pisar el toast con el crudo.
      fire('Error: ' + error.message);
      return;
    }

    const { points: pts, gallons: gal, tier_changed, new_tier, new_card_code, promo } = data;
    const today = localDate();
    // PROMO-1: pts ya viene FINAL (base + extra); promo trae {name, extra_points} si aplicó.
    // PROMO-1b: grant_reward regala un canje (reward_name, redemption_code) en vez de puntos.
    const promoTag = promo
      ? (promo.effect_type === 'grant_reward'
        ? ` · 🎁 ${promo.reward_name} GRATIS`
        : ` · 🎉 ${promo.name} (+${promo.extra_points})`)
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
    setModal(null); setAmt('');

    // Push notification
    if (loggedOp) {
      sendPushToMember(cid, {
        title: promo ? '🎉 ¡Compra con promoción!' : '⛽ ¡Compra registrada!',
        body: `+${pts} pts · ${gal} gal · Q${a}${promoTag} — Atendido por ${loggedOp.name}`,
        operatorId: loggedOp.id,
        operatorName: loggedOp.name,
        stationName,
      });
    }

    // Aviso de upgrade de tier
    if (tier_changed && new_card_code) {
      fire('⭐ ¡Subiste a ' + new_tier + '! Tu código es ' + new_card_code);
    }
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

    const { data, error } = await buyRaffleTickets({
      memberId: me.id,
      raffleId: rafRow.id,
      quantity: n,
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
      else ps.push({ cid: me.id, name: me.name, tickets });
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
        else ps.push({ cid: me.id, name: me.name, tickets: 1 });
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
      localStorage.removeItem('ct_me'); setAuthScreen('login'); setCScr('home');
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
    surveys, setSurveys, mySurveyCount, setMySurveyCount,
    activityLog, setActivityLog, cfg, setCfg, cards, setCards,
    raffleCal, setRaffleCal, rafData, setRafData, rafWinners, setRafWinners,
    opRatings, setOpRatings, redeemedList, setRedeemedList,
    sel, setSel, q, setQ, modal, setModal, amt, setAmt, fuel, setFuel,
    catF, setCatF, rQty, setRQty,
    showHist, setShowHist, showInvite, setShowInvite,
    showRedeemed, setShowRedeemed, showWifi, setShowWifi,
    showMap, setShowMap, showTerms, setShowTerms,
    showRating, setShowRating, ratingStars, setRatingStars,
    showQR, setShowQR,
    pendingOpRating, setPendingOpRating,
    pendingRedeemConfirm, setPendingRedeemConfirm,
    purchaseConfirm, setPurchaseConfirm,
    redeemConfirm, setRedeemConfirm,
    showSurveys, setShowSurveys,
    sortDir, setSortDir, memSort, setMemSort,
    stationFilter, setStationFilter, stationMode, setStationMode,
    // Auth
    authScreen, setAuthScreen, authOp, setAuthOp, loggedOp, setLoggedOp, opScanMode, setOpScanMode, opRedeemScan, setOpRedeemScan, stations, setStations, authAdmin, setAuthAdmin, loggedAdmin, setLoggedAdmin,
    opRafClient, setOpRafClient, opRafScan, setOpRafScan, opRafQty, setOpRafQty, opSearch, setOpSearch,
    authError, setAuthError, clearAuthErr,
    loginPhone, setLoginPhone, loginPass, setLoginPass,
    regPhone, setRegPhone, regPass, setRegPass, regPass2, setRegPass2,
    regVerifyMethod, setRegVerifyMethod, regCode, setRegCode,
    regSentCode, setRegSentCode, regProfile, setRegProfile,
    googleStep, setGoogleStep,
    opLoginGafete, setOpLoginGafete, opLoginDpi, setOpLoginDpi,
    opLoginUser, setOpLoginUser, opLoginPass, setOpLoginPass,
    adLoginDpi, setAdLoginDpi, adLoginGafete, setAdLoginGafete,
    adLoginEmail, setAdLoginEmail, adLoginPass, setAdLoginPass,
    // Helpers
    gT, cTier, TH, curMonth, fire,
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
  const adminNav = [
    { id: 'dash',    label: 'Inicio',    icon: <Fuel />      },
    { id: 'mem',     label: 'Miembros',  icon: <Users />     },
    { id: 'ops',     label: 'Operadores',icon: <Gear />      },
    { id: 'premios', label: 'Premios',   icon: <Gift />      },
    { id: 'promos',  label: 'Promos',    icon: <Megaphone /> },
  ];
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

  const nav = isA ? adminNav : isO ? operatorNav : clientNav;
  const cur = isA ? scr : isO ? oScr : cScr;

  // ===== SCREEN ROUTER =====
  function renderScreen() {
    // Auth gates
    if (isC && authScreen !== 'logged') {
      // 'register'/'verify' legacy: la bienvenida intermedia se eliminó —
      // el registro entra directo al wizard (decisión del dueño 22-jul).
      if (authScreen === 'register' || authScreen === 'verify') return <GoogleProfile {...ctx} />;
      if (authScreen === 'profile') return <ClientProfile {...ctx} />;
      if (authScreen === 'googleProfile') return <GoogleProfile {...ctx} />;
      return <ClientLogin {...ctx} />;
    }
    if (isO && authOp !== 'logged') return <OperatorLogin {...ctx} />;
    if (isA && authAdmin !== 'logged') return <AdminLogin {...ctx} />;

    // Admin screens
    if (isA) {
      if (scr === 'mem') return <Members {...ctx} />;
      if (scr === 'det') return <MemberDetail {...ctx} />;
      if (scr === 'cat') return <Catalog {...ctx} client={false} />;
      if (scr === 'raf') return <AdminRaffle {...ctx} />;
      if (scr === 'premios') return <AdminPremios {...ctx} />;
      if (scr === 'cfg') return <Settings {...ctx} />;
      if (scr === 'ops') return <OpManagement {...ctx} />;
      if (scr === 'audit') return <AuditLog {...ctx} />;
      if (scr === 'rules') return <Rules {...ctx} />;
      if (scr === 'promos') return <AdminPromos {...ctx} />;
      if (scr === 'promorules') return <PromoRules {...ctx} />;
      return <AdminDash {...ctx} />;
    }

    // Operator screens
    if (isO) {
      if (oScr === 'oclients') return <OpClients {...ctx} />;
      if (oScr === 'oredeem') return <OpRedeem {...ctx} />;
      if (oScr === 'oraffle') return <OpRaffle {...ctx} />;
      return <OpHome {...ctx} />;
    }

    // Client screens
    if (cScr === 'cat') return <Catalog {...ctx} client={true} />;
    if (cScr === 'promos') return <ClientPromos {...ctx} />;
    if (cScr === 'raf') return <ClientRaffle {...ctx} />;
    if (cScr === 'rules') return <Rules {...ctx} />;
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
        maxWidth: 480, margin: '0 auto', minHeight: '100vh',
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
              key={cScr}
              className="pp-screen"
              style={{ position: 'relative', transformOrigin: navOrigin ? `${navOrigin.x}px ${navOrigin.y}px` : '50% 85%' }}
            >
              {renderScreen()}
            </div>
          )
          : renderScreen()}

        {/* Bottom navigation */}
        {isLoggedIn && (
          <BottomNav items={nav} current={cur} onSelect={handleNav} view={view} tierName={cTier.name} dark={dark} />
        )}
      </div>

      {/* ── Modal confirmación de canje desde operador (dispositivo del
          MIEMBRO) — FORMATO GENERAL: flat sin sombra, RewardIcon en
          cuadro de su categoría, kicker naranja, CTA BRAND_ORANGE ── */}
      {pendingRedeemConfirm && isC && me && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)',
          zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 24px', animation: 'ppFade .25s ease',
        }}>
          <div style={{
            background: dark ? '#101018' : '#fff',
            borderRadius: 24, width: '100%', maxWidth: 400, padding: '28px 22px',
            animation: 'pop .3s cubic-bezier(.32,1.2,.64,1)',
          }}>
            {/* Héroe: ícono SVG del premio en cuadro de su categoría */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16, margin: '0 auto 12px',
                background: CAT_COLORS[pendingRedeemConfirm.reward?.cat] || '#5E5E63', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <RewardIcon reward={pendingRedeemConfirm.reward || { name: pendingRedeemConfirm.rewardName }} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: BRAND_ORANGE, marginBottom: 4 }}>
                Solicitud de Canje
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: dark ? '#fff' : '#0D0D0D', lineHeight: 1.2 }}>
                ¿Confirmás este canje?
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#9E9E9E', marginTop: 6 }}>
                El operador está listo para entregarte este premio
              </div>
            </div>

            {/* Detalle — filas flat con divisor */}
            <div style={{ background: dark ? 'rgba(255,255,255,.05)' : '#F5F5F7', borderRadius: 16, padding: '14px 18px', marginBottom: 20 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                paddingBottom: 12, marginBottom: 12,
                borderBottom: `1px solid ${dark ? 'rgba(255,255,255,.06)' : '#ECECEE'}`,
              }}>
                <span style={{ fontSize: 13, color: '#9E9E9E', fontWeight: 600 }}>Premio</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: dark ? '#fff' : '#0D0D0D' }}>{pendingRedeemConfirm.rewardName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#9E9E9E', fontWeight: 600 }}>Puntos a descontar</span>
                <span style={{ fontSize: 16, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: dark ? '#FF8A80' : bento.red }}>-{pendingRedeemConfirm.cost} pts</span>
              </div>
            </div>

            {/* Botones — acción sólida naranja, cancelar flat */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={async () => {
                await sb.from('redemptions').update({ confirm_status: 'cancelled' }).eq('id', pendingRedeemConfirm.redemptionId);
                setPendingRedeemConfirm(null);
                fire('Canje cancelado', 'info');
              }} style={{
                flex: 1, padding: 16, borderRadius: 14, border: 'none',
                background: dark ? 'rgba(255,255,255,.08)' : '#F5F5F7',
                color: dark ? '#ccc' : '#424242',
                fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>Cancelar</button>
              <button onClick={async () => {
                await sb.from('redemptions').update({ confirm_status: 'confirmed' }).eq('id', pendingRedeemConfirm.redemptionId);
                setPendingRedeemConfirm(null);
                fire('¡Canje confirmado!', 'success');
              }} style={{
                flex: 2, padding: 16, borderRadius: 14, border: 'none',
                background: BRAND_ORANGE, color: '#fff',
                fontFamily: "'DM Sans'", fontSize: 15, fontWeight: 800, cursor: 'pointer',
              }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmación de canje (nivel raíz) ── */}
      {redeemConfirm && isC && me && (
        <div onClick={closeRedeemConfirm} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)',
          zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          animation: rcClosing ? 'ppFadeOut .22s ease forwards' : 'ppFade .2s ease',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: dark ? '#0D0D1A' : '#fff',
            borderRadius: '24px 24px 0 0',
            width: '100%', maxWidth: 480, padding: '12px 24px 40px',
            maxHeight: '88vh', overflowY: 'auto',
            animation: rcClosing ? 'slideDownOut .22s ease-in forwards' : 'slideUp .3s cubic-bezier(.32,1.2,.64,1)',
          }}>
            <div style={{ width: 40, height: 4, borderRadius: 4, background: dark ? 'rgba(255,255,255,.2)' : '#E0E0E0', margin: '0 auto 20px' }} />

            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              {/* Ícono SVG del premio en cuadro de color de su categoría
                  (FORMATO GENERAL — sin emojis) */}
              <div style={{
                width: 56, height: 56, borderRadius: 16, margin: '0 auto 10px',
                background: CAT_COLORS[redeemConfirm.reward.cat] || '#5E5E63', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <RewardIcon reward={redeemConfirm.reward} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: dark ? '#fff' : '#0D0D0D', marginBottom: 4 }}>
                Confirmar Canje
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#9E9E9E' }}>Revisá los detalles antes de confirmar</div>
            </div>

            {/* Detalle largo del premio (rewards.description — qué
                servicio o bien se adquiere con el canje) */}
            {redeemConfirm.reward.description && (
              <div style={{
                background: dark ? 'rgba(255,255,255,.05)' : '#F5F5F7',
                borderRadius: 16, padding: '14px 16px', marginBottom: 12, textAlign: 'left',
              }}>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: '#9E9E9E', marginBottom: 6 }}>
                  Detalle del premio
                </div>
                <div style={{
                  maxHeight: 130, overflowY: 'auto',
                  fontSize: 12.5, fontWeight: 600, lineHeight: 1.6, whiteSpace: 'pre-line',
                  color: dark ? '#CFCFCF' : '#48484A',
                }}>
                  {redeemConfirm.reward.description}
                </div>
              </div>
            )}

            <div style={{ background: dark ? 'rgba(255,255,255,.05)' : '#F5F5F7', borderRadius: 16, padding: '16px 20px', marginBottom: 20 }}>
              {[
                { l: 'Premio',          v: redeemConfirm.reward.name, bold: true },
                { l: 'Categoría',       v: CAT_LABELS[redeemConfirm.reward.cat] || redeemConfirm.reward.cat || '—' },
                { l: 'Costo',           v: `${redeemConfirm.cost} pts`, large: true, red: true },
                { l: 'Saldo actual',    v: `${me.points} pts` },
                { l: 'Saldo tras canje',v: `${me.points - redeemConfirm.cost} pts`, green: true },
              ].map((row, i, arr) => (
                <div key={row.l} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  paddingBottom: i < arr.length - 1 ? 12 : 0,
                  borderBottom: i < arr.length - 1 ? `1px solid ${dark ? 'rgba(255,255,255,.06)' : '#ECECEE'}` : 'none',
                  marginBottom: i < arr.length - 1 ? 12 : 0,
                }}>
                  <span style={{ fontSize: 13, color: '#9E9E9E', fontWeight: 600 }}>{row.l}</span>
                  <span style={{
                    fontSize: row.large ? 18 : 13,
                    fontWeight: row.bold || row.large ? 800 : 700,
                    fontVariantNumeric: 'tabular-nums',
                    color: row.red ? bento.red : row.green ? bento.green : (dark ? '#fff' : '#0D0D0D'),
                  }}>{row.v}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={closeRedeemConfirm} style={{
                flex: 1, padding: 16, borderRadius: 14, border: 'none',
                background: dark ? 'rgba(255,255,255,.08)' : '#F5F5F7',
                color: dark ? '#ccc' : '#424242',
                fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>Cancelar</button>
              <button onClick={() => {
                const { reward } = redeemConfirm;
                setRedeemConfirm(null);
                redeem(reward);
              }} style={{
                flex: 2, padding: 16, borderRadius: 14, border: 'none',
                background: BRAND_ORANGE, color: '#fff',
                fontFamily: "'DM Sans'", fontSize: 15, fontWeight: 800, cursor: 'pointer',
              }}>Confirmar Canje</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmación de compra (nivel raíz, escapa overflow:hidden) ── */}
      {purchaseConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)',
          zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff', borderRadius: '24px 24px 0 0',
            width: '100%', maxWidth: 480, padding: '12px 24px 36px',
            boxShadow: '0 -8px 40px rgba(0,0,0,.15)',
            animation: 'fadeUp .25s ease',
          }}>
            <div style={{ width: 40, height: 4, background: '#E0E0E0', borderRadius: 4, margin: '0 auto 20px' }} />

            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>⛽</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#0D0D0D' }}>Confirmar Compra</div>
              <div style={{ fontSize: 13, color: '#9E9E9E', marginTop: 4 }}>Revisá los datos antes de registrar</div>
            </div>

            <div style={{ background: '#F9F9F9', borderRadius: 16, padding: '16px 20px', marginBottom: 20 }}>
              {[
                { l: 'Cliente',          v: purchaseConfirm.client.name,                          bold: true },
                { l: 'Tarjeta',          v: purchaseConfirm.client.cardId || '—',                  mono: true },
                { l: 'Combustible',      v: FUEL_LABELS[purchaseConfirm.fuel] },
                { l: 'Monto',            v: `Q${purchaseConfirm.amt.toFixed(2)}`,                  large: true },
                { l: 'Puntos a otorgar', v: `+${Math.floor(purchaseConfirm.amt / cfg.qPerPt)}`,    green: true, large: true },
              ].map((row, i, arr) => (
                <div key={row.l} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  paddingBottom: i < arr.length - 1 ? 12 : 0,
                  borderBottom: i < arr.length - 1 ? '1px solid #eee' : 'none',
                  marginBottom: i < arr.length - 1 ? 12 : 0,
                }}>
                  <span style={{ fontSize: 13, color: '#9E9E9E', fontWeight: 600 }}>{row.l}</span>
                  <span style={{
                    fontSize: row.large ? 20 : 13,
                    fontWeight: row.bold || row.large ? 900 : 700,
                    color: row.green ? '#2E7D32' : '#0D0D0D',
                    fontFamily: row.mono ? 'monospace' : "'DM Sans'",
                  }}>{row.v}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setPurchaseConfirm(null)} style={{
                flex: 1, padding: 16, borderRadius: 14, border: '2px solid #eee',
                background: '#fff', color: '#424242', fontFamily: "'DM Sans'",
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>Cancelar</button>
              <button onClick={() => {
                const { client, amt, fuel, onConfirm } = purchaseConfirm;
                setPurchaseConfirm(null);
                addPurchase(client.id, amt, fuel);
                fire('✅ Compra registrada · El cliente recibirá notificación');
                onConfirm?.();
              }} style={{
                flex: 2, padding: 16, borderRadius: 14, border: 'none',
                background: '#FBBC04', color: '#0D0D0D', fontFamily: "'DM Sans'",
                fontSize: 15, fontWeight: 900, cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(251,188,4,.35)',
              }}>✓ Confirmar Compra</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal QR emergente (FORMATO GENERAL: flat, esquinas de
          escáner en rojo de marca — referencia pantalla Código QR) ── */}
      {showQR && isC && me && (
        <div
          onClick={closeQR}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(0,0,0,.6)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            animation: qrClosing ? 'ppFadeOut .22s ease forwards' : 'fadeIn .2s ease',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: dark ? '#101018' : '#fff',
              borderRadius: '28px 28px 0 0',
              width: '100%', maxWidth: 480,
              padding: '12px 24px 44px',
              animation: qrClosing ? 'slideDownOut .22s ease-in forwards' : 'slideUp .32s cubic-bezier(.32,1.2,.64,1)',
            }}
          >
            {/* Handle */}
            <div style={{ width: 40, height: 4, borderRadius: 4, background: dark ? 'rgba(255,255,255,.2)' : '#E0E0E0', margin: '0 auto 18px' }} />

            {/* Título */}
            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <div style={{
                fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2,
                color: cTier.name === 'BLACK' ? '#FFD54F' : cTier.name === 'PLATINO' ? '#6B767D' : bento.gold,
              }}>
                Nivel {cTier.name}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: dark ? '#fff' : '#0D0D0D' }}>
                Código QR
              </div>
            </div>

            {/* QR enmarcado por esquinas de escáner (rojo de marca) */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'inline-block', position: 'relative', padding: 14 }}>
                {[
                  { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 14 },
                  { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 14 },
                  { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 14 },
                  { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 14 },
                ].map((pos, i) => (
                  <div key={i} style={{
                    position: 'absolute', width: 30, height: 30,
                    borderColor: BRAND_ORANGE, borderStyle: 'solid', borderWidth: 0,
                    ...pos,
                  }} />
                ))}
                {/* Panel blanco siempre (el QR necesita fondo claro para escanear) */}
                <div style={{ background: '#fff', borderRadius: 12, padding: 16, display: 'inline-block', lineHeight: 0 }}>
                  <QRCode code={me.cardId || me.id} sz={180} scanColor={BRAND_ORANGE} />
                </div>
              </div>

              {/* Código de tarjeta */}
              <div style={{ marginTop: 10 }}>
                <div style={{
                  display: 'inline-block', padding: '8px 18px', borderRadius: 10,
                  background: dark ? 'rgba(255,255,255,.08)' : '#F5F5F7',
                  ...sMono, fontSize: 13, fontWeight: 800, letterSpacing: 1.5,
                  color: dark ? '#fff' : '#0D0D0D',
                }}>
                  {me.cardId || '—'}
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12.5, color: dark ? 'rgba(255,255,255,.5)' : '#6E6E73', fontWeight: 600 }}>
              Mostrá este código en cada carga de combustible
            </div>
          </div>
        </div>
      )}

      {/* Toast (FORMATO GENERAL — severidad e ícono en Toast.jsx) */}
      <Toast toast={toast} dark={isC && dark} />

      {/* ── Modal de ganador de la rifa mensual (R1b.4) ── */}
      {raffleWin && isC && me && (
        <RaffleWinnerModal
          cal={raffleWin}
          name={me.name}
          isBlack={dark}
          onClose={() => {
            // Marca de visto en el SERVIDOR (cross-device) + localStorage
            // como guarda instantánea. Reflejar en raffleCal local para
            // que el efecto no lo re-encuentre antes del próximo fetch.
            try { localStorage.setItem(`pp_rafwin_${raffleWin.dbId}`, '1'); } catch { /* noop */ }
            if (sb) {
              sb.from('raffle_calendar')
                .update({ winner_seen_at: new Date().toISOString() })
                .eq('id', raffleWin.dbId)
                .then(({ error }) => { if (error) console.error('[Rifa] winner_seen_at:', error.message); });
            }
            setRaffleCal(p => p.map(r => r?.dbId === raffleWin.dbId
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
