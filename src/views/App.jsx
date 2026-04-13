// src/views/App.jsx
// Main orchestrator — manages global state, auth, Supabase sync, and view routing
import { useState, useCallback, useEffect, useRef } from 'react';
import { sb } from '../lib/supabaseClient';
import { makeTier, daysInactive } from '../lib/tierSystem';
import { CFG_INIT, FUEL, FUEL_LABELS } from '../constants/config';

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
import { clientTheme, adminTheme, sMono, GAL } from '../constants/styles';
import useToast from '../hooks/useToast';

// UI Components
import BottomNav from '../components/ui/BottomNav';
import QRCode from '../components/ui/QRCode';
import TierDeco from '../components/ui/TierDeco';
import { Check, Fuel, Users, Gift, Ticket, Clock, Gear, Megaphone, Menu } from '../components/ui/Icons';

// Auth Views
import ClientLogin from './client/ClientLogin';
import ClientRegister from './client/ClientRegister';
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
import OpManagement from './admin/OpManagement';
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
  const lastVisitsRef = useRef(0);
  const realtimeReadyRef = useRef(false); // prevents false rating trigger on initial Realtime handshake
  const [scr, setScr] = useState('dash');            // admin screen
  const [cScr, setCScr] = useState('home');           // client screen
  const [oScr, setOScr] = useState('ohome');          // operator screen

  // ===== AUTH STATE =====
  const [authScreen, setAuthScreen] = useState('login');   // login|register|verify|profile|googleProfile|logged
  const [authOp, setAuthOp] = useState('login');           // login|logged
  const [loggedOp, setLoggedOp] = useState(null);           // operator data after login
  const [opScanMode, setOpScanMode] = useState(false);      // open QR scanner on OpClients
  const [stations, setStations] = useState([]);               // gas stations from Supabase
  const [authAdmin, setAuthAdmin] = useState('login');     // login|logged
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
  const [me, setMe] = useState(null);
  const [custs, setCusts] = useState([]);
  const [operators, setOperators] = useState([]);
  const [showOpReg, setShowOpReg] = useState(false);
  const [editOp, setEditOp] = useState(null);
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
  const [showMap, setShowMap] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showRating, setShowRating] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [ratingStars, setRatingStars] = useState(0);
  const [pendingOpRating, setPendingOpRating] = useState(null);
  const [pendingRedeemConfirm, setPendingRedeemConfirm] = useState(null); // { redemptionId, rewardName, rewardIcon, cost } // { operatorId, operatorName }
  const [purchaseConfirm, setPurchaseConfirm] = useState(null); // { client, amt, fuel, onConfirm }
  const [redeemConfirm, setRedeemConfirm]   = useState(null); // { reward, cost }
  const [showSurveys, setShowSurveys] = useState(false);
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
  const TH = clientTheme(cTier.name);
  const isLoggedIn = (isC && authScreen === 'logged') || (isO && authOp === 'logged') || (isA && authAdmin === 'logged');

  // ===== SUPABASE WRITE HELPERS =====
  const syncMember = useCallback((memberId, data) => {
    if (!sb || !sbConnected) return;
    sb.from('members').update(data).eq('id', memberId).then(r => {
      if (r.error) console.error('[Sync]', r.error);
    });
  }, [sbConnected]);

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
  const checkSpecialDayBonus = async (memberId, memberBday) => {
    if (!sb || !memberId) return;
    const now   = new Date();
    const today = localDate(); // YYYY-MM-DD en hora local
    const month = now.getMonth() + 1;
    const day   = now.getDate();

    // Verificar si ya recibió bonus hoy
    const { data: memberRow } = await sb.from('members').select('last_special_bonus').eq('id', memberId).single();
    if (memberRow?.last_special_bonus === today) return; // ya recibió hoy

    // Cargar días festivos activos
    const { data: specialDays } = await sb.from('special_days').select('*').eq('active', true);
    if (!specialDays?.length) return;

    let totalBonus = 0;
    const bonusNames = [];

    for (const sd of specialDays) {
      // Cumpleaños del miembro (month=0, day=0 = especial)
      if (sd.month === 0) {
        if (!memberBday) continue;
        // bday guardado como MM-DD
        const [bMonth, bDay] = (memberBday || '').split('-').map(Number);
        if (bMonth === month && bDay === day) {
          totalBonus += sd.points;
          bonusNames.push(`${sd.icon} ${sd.name}`);
        }
      } else {
        // Fecha fija
        if (sd.month === month && sd.day === day) {
          totalBonus += sd.points;
          bonusNames.push(`${sd.icon} ${sd.name}`);
        }
      }
    }

    if (totalBonus === 0) return;

    // Otorgar puntos
    await sb.from('members').update({
      points: (memberRow?.points || 0) + totalBonus,
      last_special_bonus: today,
    }).eq('id', memberId);

    // Actualizar estado local
    setMe(p => p ? { ...p, points: (p.points || 0) + totalBonus } : p);

    // Registrar en activity_log
    for (const name of bonusNames) {
      await sb.from('activity_log').insert({
        member_id: memberId,
        activity_type: 'evento_especial',
        description: `¡${name}! Bonus especial`,
        points_change: totalBonus / bonusNames.length,
      });
    }

    const msg = bonusNames.join(' · ');
    fire(`🎉 +${totalBonus} pts · ${msg}`);
    console.log('[Special] Bonus otorgado:', totalBonus, 'pts -', msg);
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
        if (event === 'SIGNED_IN') fire('👋 Bienvenido ' + (session.user.user_metadata?.full_name || session.user.email));
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
        const [rwRes, prRes, stRes, cfgRes, rcRes] = await Promise.all([
          sb.from('rewards').select('*').eq('active', true).order('sort_order'),
          sb.from('promotions').select('*').eq('active', true).order('sort_order'),
          sb.from('stations').select('*'),
          sb.from('program_config').select('*'),
          sb.from('raffle_calendar').select('*').order('month'),
        ]);
        if (!mounted) return;

        if (rwRes.data?.length > 0) {
          setRewards(rwRes.data.map(r => ({
            id: r.id, name: r.name, icon: r.icon, pts: r.points_cost,
            cat: r.category, tier: r.tier_exclusive || undefined,
          })));
        }

        if (prRes.data?.length > 0) {
          setPromos(prRes.data.map(p => ({
            id: p.id, title: p.title, desc: p.description, icon: p.icon,
            bg: p.bg_gradient, color: p.text_color, active: p.active,
          })));
        }

        if (stRes.data?.length > 0) {
          setStations(stRes.data.map(s => ({
            id: s.id, name: s.name, address: s.address || '',
            lat: s.lat, lng: s.lng, active: s.active !== false,
          })));
          console.log('[Club Turkaj] Estaciones cargadas:', stRes.data.length);
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
            setCfg({
              qPerPt: gen.qPerPt || 10, ticketPts: gen.ticketPts || 5,
              regBase: gen.regBase || 15, regOptional: gen.regOptional || 2,
              referralPts: gen.referralPts || 25, surveyPts: gen.surveyPts || 3,
              surveyDaily: gen.surveyDaily || 5, tiers: trs, degrad: deg,
              termsUse: tu, termsCanje: tc,
            });
          }
        }

        if (rcRes.data?.length > 0) {
          const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
          setRaffleCal(rcRes.data.map(r => ({
            m: months[r.month - 1], p: `${r.prize_icon} ${r.prize_name}`,
            v: `Q${r.prize_value}`, cost: r.prize_value, dbId: r.id,
          })));
        }

        // Load members (with fallback if join fails)
        let memRes = await sb.from('members').select('*,physical_cards!assigned_to(card_code)').order('created_at', { ascending: false });
        if (memRes.error) {
          console.warn('[Club Turkaj] Members join query failed, trying without join:', memRes.error);
          memRes = await sb.from('members').select('*').order('created_at', { ascending: false });
        }
        if (memRes.error) console.error('[Club Turkaj] Error cargando miembros:', memRes.error);
        console.log('[Club Turkaj] Miembros encontrados:', memRes.data?.length || 0);

        function mapMember(m) {
          return {
            id: m.id, name: m.name, email: m.email || '',
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
            id: o.id, name: o.name, user: o.username, password: o.password_hash,
            dpi: o.dpi, gafete: o.gafete, phone: o.phone || '', email: o.email || '',
            station: o.stations?.name || o.station_id || '', stationId: o.station_id || null, bomba: o.bomba || '', turno: o.turno || '',
            active: o.active !== false,
          })));
          console.log('[Club Turkaj] Operadores cargados:', opRes.data.length);
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

        // Load raffle entries — join con raffle_calendar para obtener el mes
        // Usamos los IDs de raffle_calendar ya cargados para mapear correctamente
        // Cargar raffle_entries sin join — el nombre se resuelve desde custs o members
        const reRes = await sb.from('raffle_entries')
          .select('member_id, raffle_id, tickets')
          .order('created_at', { ascending: false });

        console.log('[Raffle] raffle_entries:', reRes.error?.message || `${reRes.data?.length ?? 0} filas`);

        if (!reRes.error && reRes.data?.length > 0 && rcRes.data?.length > 0) {
          // mapa raffle_id → month 0-indexed
          const idToMonth = {};
          rcRes.data.forEach(r => { idToMonth[r.id] = r.month - 1; });

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
            if (ex >= 0) ps[ex].tickets += e.tickets || 1;
            else ps.push({ cid: e.member_id, name, tickets: e.tickets || 1 });
          });
          setRafData(rafMap);
          console.log('[Raffle] ✅ rafData listo:', reRes.data.length, 'entradas');
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
          console.log('[Club Turkaj] Calificaciones cargadas:', ratRes.data.length);
        }

        setSbConnected(true);
        console.log('[Club Turkaj] ✅ Datos cargados desde Supabase');


      } catch (e) {
        console.error('[Club Turkaj] ⚠️ Error cargando:', e);
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
      console.log('[Club Turkaj] Operador/Admin logueado pero sin clientes, recargando...');
      sb.from('members').select('*,physical_cards!assigned_to(card_code)')
        .order('created_at', { ascending: false })
        .then(res => {
          if (res.error) {
            console.warn('[Club Turkaj] Retry con join falló, intentando sin join...');
            return sb.from('members').select('*').order('created_at', { ascending: false });
          }
          return res;
        })
        .then(res => {
          if (res.data?.length > 0) {
            setCusts(res.data.map(m => ({
              id: m.id, name: m.name, email: m.email || '',
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
              supabaseUser: true, authProvider: m.auth_provider || 'google',
              authProviderId: m.auth_provider_id || '',
            })));
            console.log('[Club Turkaj] ✅ Miembros recargados:', res.data.length);
          } else {
            console.warn('[Club Turkaj] No se encontraron miembros en recarga');
          }
        });
    }
  }, [authOp, authAdmin, custs.length]);

  // ===== CARGAR ENCUESTAS DEL DIA AL CAMBIAR DE USUARIO =====
  useEffect(() => {
    if (me?.visits != null) {
      lastVisitsRef.current = me.visits;
      // Mark Realtime as ready only after visits ref is set
      // Small delay ensures Realtime subscription is already up before we accept updates
      setTimeout(() => { realtimeReadyRef.current = true; }, 800);
    }
    return () => { realtimeReadyRef.current = false; };
  }, [me?.id]);
  useEffect(() => {
    if (me?.id && sb && sbConnected) loadTodaySurveys(me.id);
  }, [me?.id, sbConnected, loadTodaySurveys]);

  // ===== DÍAS FESTIVOS: Verificar al loguearse =====
  useEffect(() => {
    if (!me?.id || viewRef.current !== 'client' || authScreen !== 'logged') return;
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
        console.log('[Realtime] Member updated:', m.name, 'pts:', m.points, 'visits:', m.visits, 'prevVisits(ref):', lastVisitsRef.current, 'op_id:', m.last_operator_id);
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

        // Trigger operator rating if a new purchase was detected (visits increased)
        const newVisits = m.visits ?? 0;
        const prevVisits = lastVisitsRef.current;
        lastVisitsRef.current = newVisits;
        if (newVisits > prevVisits && realtimeReadyRef.current && viewRef.current === 'client') {
          // ── Recargar historial desde Supabase en el dispositivo del miembro ──
          // El operador registró la compra en su dispositivo — el activityLog local
          // del miembro nunca se actualizó. Lo recargamos acá.
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
        if (m.last_operator_id && newVisits > prevVisits && realtimeReadyRef.current && viewRef.current === 'client') {
          const op = operators.find(o => o.id === m.last_operator_id);
          console.log('[Realtime] New purchase detected, operator:', op?.name || m.last_operator_id);
          if (op) {
            setPendingOpRating({
              operatorId: m.last_operator_id,
              operatorName: op.name,
              stationName: m.last_station || '',
            });
          } else {
            sb.from('operators').select('name').eq('id', m.last_operator_id).single().then(r => {
              setPendingOpRating({
                operatorId: m.last_operator_id,
                operatorName: r.data?.name || 'Operador',
                stationName: m.last_station || '',
              });
            });
          }
        }
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
    if (!sb || !sbConnected || !me?.id || viewRef.current !== 'client') return;
    const ch = sb.channel('redemption-confirm')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'redemptions',
        filter: `member_id=eq.${me.id}`,
      }, (payload) => {
        const rd = payload.new;
        if (rd.confirm_status === 'pending') {
          console.log('[Realtime] Solicitud de confirmación de canje:', rd.id);
          // Buscar nombre del premio
          const reward = rewards.find(r => r.id === rd.reward_id);
          setPendingRedeemConfirm({
            redemptionId: rd.id,
            rewardName:   reward?.name  || 'Premio',
            rewardIcon:   reward?.icon  || '🎁',
            cost:         rd.points_spent || 0,
          });
        } else if (rd.confirm_status === 'confirmed' || rd.confirm_status === 'cancelled') {
          // Limpiar modal si quedó abierto
          setPendingRedeemConfirm(p => p?.redemptionId === rd.id ? null : p);
        }
      })
      .subscribe();
    return () => sb.removeChannel(ch);
  }, [me?.id, sbConnected, rewards]);

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
  const addPurchase = useCallback((cid, a, f) => {
    const pts = Math.floor(a / cfg.qPerPt);
    const gal = +(a / FUEL[f]).toFixed(2);
    if (pts <= 0) { fire('Mínimo Q10'); return; }
    const today = localDate();
    const buyer = custs.find(c => c.id === cid);
    const stationName = loggedOp?.station || '';
    console.log('[Purchase] Station:', stationName, 'StationId:', loggedOp?.stationId, 'LoggedOp:', loggedOp?.name);
    setCusts(p => p.map(c => c.id === cid ? { ...c, points: c.points + pts, gallons: +(c.gallons + gal).toFixed(2), spent: c.spent + a, visits: c.visits + 1, lastBuy: today, station: stationName || c.station } : c));
    if (me?.id === cid) setMe(p => ({ ...p, points: p.points + pts, gallons: +(p.gallons + gal).toFixed(2), spent: p.spent + a, visits: p.visits + 1, lastBuy: today, station: stationName || p.station }));
    fire(`+${pts} pts · ${gal} gal · Q${a}`);
    setModal(null); setAmt('');
    if (buyer) {
      const oldTier = gT(parseFloat(buyer.gallons || 0)).name;
      const newGal = +(parseFloat(buyer.gallons || 0) + gal).toFixed(2);
      const newTier = gT(newGal).name;
      const syncData = { points: (buyer.points || 0) + pts, gallons: newGal, spent: +(parseFloat(buyer.spent || 0) + a).toFixed(2), visits: (buyer.visits || 0) + 1, last_buy: localISO(), updated_at: localISO() };
      if (stationName) syncData.last_station = stationName;
      if (loggedOp?.id) syncData.last_operator_id = loggedOp.id;
      syncMember(cid, syncData);
      logActivity(cid, 'compra', `Compra ${gal} gal ${f} \u00b7 Q${a}`, pts, a);
      if (sb && sbConnected) {
        const purchaseData = { member_id: cid, amount: a, fuel_type: f, gallons: gal, points_earned: pts };
        if (loggedOp?.stationId) purchaseData.station_id = loggedOp.stationId;
        sb.from('purchases').insert(purchaseData);

        // Send push notification to member's phone
        if (loggedOp) {
          sendPushToMember(cid, {
            title: '⛽ ¡Compra registrada!',
            body: `+${pts} pts · ${gal} gal · Q${a} — Atendido por ${loggedOp.name}`,
            operatorId: loggedOp.id,
            operatorName: loggedOp.name,
            stationName: stationName,
          });
        }
        if (oldTier !== newTier) {
          sb.from('members').select('card_id').eq('id', cid).single().then(memR => {
            if (memR.data?.card_id) {
              sb.from('physical_cards').select('card_code').eq('id', memR.data.card_id).single().then(cardR => {
                if (cardR.data?.card_code) {
                  const pm = { ORO: 'CTOD', PLATINO: 'CTPD', BLACK: 'CTBD' };
                  const cm = cardR.data.card_code.match(/^CT[OPB]D-(\d+)$/);
                  if (cm) {
                    const nc = (pm[newTier] || 'CTOD') + '-' + cm[1];
                    sb.from('physical_cards').update({ card_code: nc, tier: newTier }).eq('id', memR.data.card_id);
                    fire('\u2b50 \u00a1Subiste a ' + newTier + '! Tu c\u00f3digo es ' + nc);
                    setCusts(p => p.map(c => c.id === cid ? { ...c, cardId: nc } : c));
                    if (me?.id === cid) setMe(p => ({ ...p, cardId: nc }));
                  }
                }
              });
            }
          });
        }
      }
    }
  }, [me, custs, fire, cfg, gT, syncMember, logActivity, sbConnected, loggedOp]);

  const redeem = useCallback((r) => {
    const t = gT(me.gallons);
    const cost = Math.round(r.pts * (1 - t.redeemDisc));
    if (me.points < cost) return;
    const code = `TK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const today = localDate();
    const newEntry = { id: `RD-${Date.now()}`, memberId: me.id, reward: { name: r.name, icon: r.icon, cat: r.cat }, cost, date: today, code, collected: false };

    // Actualizar estado local inmediatamente
    setMe(p => ({ ...p, points: p.points - cost, redeemed: (p.redeemed || 0) + 1 }));
    setCusts(p => p.map(c => c.id === me.id ? { ...c, points: c.points - cost, redeemed: (c.redeemed || 0) + 1 } : c));
    setRedeemedList(p => [newEntry, ...p]);
    fire(`🎉 ¡Canjeaste ${r.name} por ${cost} pts!`);

    // Sincronizar con Supabase
    syncMember(me.id, { points: me.points - cost, redeemed_count: (me.redeemed || 0) + 1, updated_at: localISO() });
    logActivity(me.id, 'canje', `Canjeó: ${r.name} ${r.icon}`, -cost);
    if (sb && sbConnected) {
      sb.from('redemptions')
        .insert({ member_id: me.id, reward_id: r.id, points_spent: cost, redemption_code: code })
        .then(res => {
          if (res.error) console.error('[Redeem] Supabase error:', res.error);
          else console.log('[Redeem] ✅ Guardado en Supabase:', code);
        });
    }
  }, [me, fire, gT, syncMember, logActivity, sbConnected]);

  const buyTickets = useCallback((n) => {
    const cost = n * cfg.ticketPts;
    if (me.points < cost) { fire('❌ Puntos insuficientes'); return; }

    // Actualizar estado local inmediatamente
    setMe(p => ({ ...p, points: p.points - cost, tickets: p.tickets + n }));
    setCusts(p => p.map(c => c.id === me.id ? { ...c, points: c.points - cost, tickets: c.tickets + n } : c));
    setRafData(p => p.map((rd, i) => {
      if (i !== curMonth) return rd;
      const ps = [...rd.participants];
      const ex = ps.findIndex(p2 => p2.cid === me.id);
      if (ex >= 0) ps[ex] = { ...ps[ex], tickets: ps[ex].tickets + n };
      else ps.push({ cid: me.id, name: me.name, tickets: n });
      return { ...rd, participants: ps };
    }));
    fire(`🎟️ ${n} boleto${n > 1 ? 's' : ''} · -${cost} pts`);
    syncMember(me.id, { points: me.points - cost, tickets: me.tickets + n, updated_at: localISO() });
    logActivity(me.id, 'rifa', `Compró ${n} boleto${n > 1 ? 's' : ''} de rifa`, -cost);

    // Guardar en Supabase
    if (sb && sbConnected) {
      // Buscar el ID de raffle_calendar para el mes actual (mes 1-indexed)
      sb.from('raffle_calendar')
        .select('id')
        .eq('month', curMonth + 1)
        .single()
        .then(res => {
          if (res.error) { console.error('[Raffle] calendar lookup:', res.error); return; }
          sb.from('raffle_entries')
            .insert({ member_id: me.id, raffle_id: res.data.id, tickets: n })
            .then(r => {
              if (r.error) console.error('[Raffle] insert error:', r.error);
              else console.log('[Raffle] ✅ Boletos guardados:', n);
            });
        });
    }
  }, [me, fire, cfg, curMonth, syncMember, logActivity, sbConnected]);

  const doSurvey = useCallback(() => {
    if (mySurveyCount >= cfg.surveyDaily) { fire('❌ Límite diario alcanzado'); return; }
    const newCount = mySurveyCount + 1;
    setMySurveyCount(newCount);
    setMe(p => ({ ...p, points: p.points + cfg.surveyPts }));
    setCusts(p => p.map(c => c.id === me.id ? { ...c, points: c.points + cfg.surveyPts } : c));
    const bonusTicket = newCount >= cfg.surveyDaily;
    if (bonusTicket) {
      setMe(p => ({ ...p, tickets: p.tickets + 1 }));
      fire(`📋 +${cfg.surveyPts} pts · 🎟️ ¡Bonus! 5/5 encuestas = 1 boleto gratis`);
    } else {
      fire(`📋 Encuesta completada · +${cfg.surveyPts} pts (${newCount}/${cfg.surveyDaily})`);
    }
    syncMember(me.id, { points: me.points + cfg.surveyPts, tickets: bonusTicket ? me.tickets + 1 : me.tickets, updated_at: localISO() });
    logActivity(me.id, 'encuesta', 'Encuesta completada' + (bonusTicket ? ' + Boleto bonus' : ''), cfg.surveyPts);
    if (sb && sbConnected) {
      sb.from('surveys').insert({ member_id: me.id, points_earned: cfg.surveyPts, bonus_ticket: bonusTicket })
        .then(r => {
          if (r.error) console.error('[Surveys] Error guardando encuesta:', r.error);
          else console.log('[Surveys] Encuesta guardada OK, count:', newCount);
        });
    }
  }, [me, mySurveyCount, fire, cfg, syncMember, logActivity, sbConnected]);

  const logout = useCallback(() => {
    if (sb) sb.auth.signOut({ scope: 'local' });
    setMe(null); setGoogleStep('welcome'); setMySurveyCount(0); setLoggedOp(null);
    if (isC) { setAuthScreen('login'); setCScr('home'); setLoginPhone(''); setLoginPass(''); }
    else if (isO) { setAuthOp('login'); setOScr('ohome'); }
    else if (isA) { setAuthAdmin('login'); setScr('dash'); }
    setAuthError(''); fire('👋 Sesión cerrada');
  }, [view, fire]);

  // ===== SHARED PROPS OBJECT =====
  // This bundles all state + actions needed by child views
  const ctx = {
    // State
    me, setMe, custs, setCusts, operators, setOperators,
    showOpReg, setShowOpReg, editOp, setEditOp, newOp, setNewOp,
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
    authScreen, setAuthScreen, authOp, setAuthOp, loggedOp, setLoggedOp, opScanMode, setOpScanMode, stations, authAdmin, setAuthAdmin,
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
    sbConnected, sbLoading,
    syncMember, logActivity,
    // Actions
    addPurchase, redeem, buyTickets, doSurvey, logout,
    // Navigation
    view, setView, scr, setScr, cScr, setCScr, oScr, setOScr,
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
  const clientNav = [
    { id: 'home', label: 'Inicio', icon: <Fuel /> },
    { id: 'cat', label: 'Canjear', icon: <Gift /> },
    { id: 'qr', label: '', icon: null, isQR: true },
    { id: 'raf', label: 'Rifa', icon: <Ticket /> },
    { id: 'menu', label: 'Menú', icon: <Menu /> },
  ];

  const nav = isA ? adminNav : isO ? operatorNav : clientNav;
  const cur = isA ? scr : isO ? oScr : cScr;

  // ===== SCREEN ROUTER =====
  function renderScreen() {
    // Auth gates
    if (isC && authScreen !== 'logged') {
      if (authScreen === 'register' || authScreen === 'verify') return <ClientRegister {...ctx} />;
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
      if (scr === 'rules') return <Rules {...ctx} />;
      if (scr === 'promos') return <AdminPromos {...ctx} />;
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
    if (cScr === 'raf') return <ClientRaffle {...ctx} />;
    if (cScr === 'rules') return <Rules {...ctx} />;
    if (cScr === 'menu') return <ClientMenu {...ctx} />;
    return <ClientHome {...ctx} />;
  }

  // ===== HANDLE NAV =====
  function handleNav(id) {
    if (isA) { setScr(id); setSel(null); }
    else if (isO) { setOScr(id); }
    else if (id === 'qr') { setShowQR(true); }
    else setCScr(id);
  }

  // ===== RENDER =====
  return (
    <>
      <div style={{
        maxWidth: 480, margin: '0 auto', minHeight: '100vh',
        background: isA ? adminTheme.bg
          : isO ? '#FAFAFA'
          : cTier.name === 'BLACK' ? '#06060C'
          : cTier.name === 'PLATINO' ? '#E8E8E8' : '#fff',
        position: 'relative', overflowX: 'hidden',
        boxShadow: '0 0 60px rgba(0,0,0,.08)',
      }}>
        {/* BLACK tier background stars */}
        {isC && cTier.name === 'BLACK' && authScreen === 'logged' && (
          <div style={{
            position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
            width: '100%', maxWidth: 480, height: '100vh',
            pointerEvents: 'none', zIndex: 0, overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(ellipse at 15% 20%, rgba(40,20,80,.35) 0%, transparent 50%), radial-gradient(ellipse at 80% 15%, rgba(20,30,70,.25) 0%, transparent 45%), radial-gradient(ellipse at 50% 70%, rgba(50,15,60,.2) 0%, transparent 55%), radial-gradient(ellipse at 85% 80%, rgba(15,25,60,.2) 0%, transparent 40%)',
            }} />
            {[...Array(60)].map((_, i) => (
              <div key={`s${i}`} style={{
                position: 'absolute',
                width: i % 7 === 0 ? 2 : i % 4 === 0 ? 1.3 : 0.6,
                height: i % 7 === 0 ? 2 : i % 4 === 0 ? 1.3 : 0.6,
                borderRadius: '50%',
                background: i % 11 === 0 ? 'rgba(180,200,255,.9)' : i % 7 === 0 ? 'rgba(255,230,200,.8)' : i % 4 === 0 ? 'rgba(200,210,255,.6)' : `rgba(255,255,255,${i % 3 === 0 ? .5 : .25})`,
                left: `${(i * 17.3 + 5.7) % 100}%`,
                top: `${(i * 23.7 + 3.1) % 100}%`,
                boxShadow: i % 7 === 0 ? '0 0 3px rgba(180,200,255,.5)' : i % 11 === 0 ? '0 0 2px rgba(255,230,200,.4)' : 'none',
                animation: i % 5 === 0 ? `twinkle ${3 + i % 4}s ${i * .3}s ease-in-out infinite` : 'none',
              }} />
            ))}
          </div>
        )}

        {/* Active screen */}
        {renderScreen()}

        {/* Bottom navigation */}
        {isLoggedIn && (
          <BottomNav items={nav} current={cur} onSelect={handleNav} view={view} tierName={cTier.name} />
        )}
      </div>

      {/* ── Modal confirmación de canje desde operador (dispositivo del MIEMBRO) ── */}
      {pendingRedeemConfirm && isC && me && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)',
          zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 24px',
        }}>
          <div style={{
            background: cTier.name === 'BLACK' ? '#0D0D1A' : '#fff',
            borderRadius: 24, width: '100%', maxWidth: 400, padding: '32px 24px',
            boxShadow: '0 24px 80px rgba(0,0,0,.4)',
            animation: 'pop .3s cubic-bezier(.32,1.2,.64,1)',
          }}>
            {/* Icono y título */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>{pendingRedeemConfirm.rewardIcon}</div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: cTier.name === 'BLACK' ? '#FFD54F' : '#F0A500', marginBottom: 6 }}>
                Solicitud de Canje
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: cTier.name === 'BLACK' ? '#fff' : '#0D0D0D', lineHeight: 1.2 }}>
                ¿Confirmás este canje?
              </div>
              <div style={{ fontSize: 13, color: '#9E9E9E', marginTop: 8 }}>
                El operador está listo para entregarte este premio
              </div>
            </div>

            {/* Detalle */}
            <div style={{ background: cTier.name === 'BLACK' ? 'rgba(255,255,255,.06)' : '#F9F9F9', borderRadius: 16, padding: '16px 20px', marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: '#9E9E9E', fontWeight: 600 }}>Premio</span>
                <span style={{ fontSize: 13, fontWeight: 900, color: cTier.name === 'BLACK' ? '#fff' : '#0D0D0D' }}>{pendingRedeemConfirm.rewardName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#9E9E9E', fontWeight: 600 }}>Puntos a descontar</span>
                <span style={{ fontSize: 16, fontWeight: 900, color: '#C62828' }}>-{pendingRedeemConfirm.cost} pts</span>
              </div>
            </div>

            {/* Botones */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={async () => {
                await sb.from('redemptions').update({ confirm_status: 'cancelled' }).eq('id', pendingRedeemConfirm.redemptionId);
                setPendingRedeemConfirm(null);
                fire('❌ Canje cancelado');
              }} style={{
                flex: 1, padding: '14px 0', borderRadius: 14,
                border: `2px solid ${cTier.name === 'BLACK' ? 'rgba(255,255,255,.1)' : '#eee'}`,
                background: 'none', color: cTier.name === 'BLACK' ? '#9E9E9E' : '#424242',
                fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>✕ Cancelar</button>
              <button onClick={async () => {
                await sb.from('redemptions').update({ confirm_status: 'confirmed' }).eq('id', pendingRedeemConfirm.redemptionId);
                setPendingRedeemConfirm(null);
                fire('✅ ¡Canje confirmado!');
              }} style={{
                flex: 2, padding: '14px 0', borderRadius: 14, border: 'none',
                background: cTier.name === 'BLACK' ? '#FFD54F' : cTier.name === 'PLATINO' ? '#1565C0' : '#FBBC04',
                color: cTier.name === 'PLATINO' ? '#fff' : '#0D0D0D',
                fontFamily: "'DM Sans'", fontSize: 15, fontWeight: 900, cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(251,188,4,.3)',
              }}>✓ Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmación de canje (nivel raíz) ── */}
      {redeemConfirm && isC && me && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)',
          zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}>
          <div style={{
            background: cTier.name === 'BLACK' ? '#0D0D1A' : cTier.name === 'PLATINO' ? '#E8E8E8' : '#fff',
            borderRadius: '24px 24px 0 0',
            width: '100%', maxWidth: 480, padding: '12px 24px 40px',
            boxShadow: '0 -8px 40px rgba(0,0,0,.2)',
            animation: 'slideUp .3s cubic-bezier(.32,1.2,.64,1)',
          }}>
            <div style={{ width: 40, height: 4, borderRadius: 4, background: cTier.name === 'BLACK' ? 'rgba(255,255,255,.2)' : '#E0E0E0', margin: '0 auto 20px' }} />

            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 52, marginBottom: 8 }}>{redeemConfirm.reward.icon || '🎁'}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: cTier.name === 'BLACK' ? '#fff' : '#0D0D0D', marginBottom: 4 }}>
                Confirmar Canje
              </div>
              <div style={{ fontSize: 13, color: '#9E9E9E' }}>Revisá los detalles antes de confirmar</div>
            </div>

            <div style={{ background: cTier.name === 'BLACK' ? 'rgba(255,255,255,.05)' : cTier.name === 'PLATINO' ? 'rgba(255,255,255,.5)' : '#F9F9F9', borderRadius: 16, padding: '16px 20px', marginBottom: 20 }}>
              {[
                { l: 'Premio',          v: redeemConfirm.reward.name, bold: true },
                { l: 'Categoría',       v: redeemConfirm.reward.cat || '—' },
                { l: 'Costo',           v: `${redeemConfirm.cost} pts`, large: true, red: true },
                { l: 'Saldo actual',    v: `${me.points} pts` },
                { l: 'Saldo tras canje',v: `${me.points - redeemConfirm.cost} pts`, green: true },
              ].map((row, i, arr) => (
                <div key={row.l} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  paddingBottom: i < arr.length - 1 ? 12 : 0,
                  borderBottom: i < arr.length - 1 ? `1px solid ${cTier.name === 'BLACK' ? 'rgba(255,255,255,.06)' : '#eee'}` : 'none',
                  marginBottom: i < arr.length - 1 ? 12 : 0,
                }}>
                  <span style={{ fontSize: 13, color: '#9E9E9E', fontWeight: 600 }}>{row.l}</span>
                  <span style={{
                    fontSize: row.large ? 18 : 13,
                    fontWeight: row.bold || row.large ? 900 : 700,
                    color: row.red ? '#C62828' : row.green ? '#2E7D32' : (cTier.name === 'BLACK' ? '#fff' : '#0D0D0D'),
                  }}>{row.v}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setRedeemConfirm(null)} style={{
                flex: 1, padding: 16, borderRadius: 14, border: `2px solid ${cTier.name === 'BLACK' ? 'rgba(255,255,255,.1)' : '#eee'}`,
                background: 'none', color: cTier.name === 'BLACK' ? '#9E9E9E' : '#424242',
                fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>Cancelar</button>
              <button onClick={() => {
                const { reward } = redeemConfirm;
                setRedeemConfirm(null);
                redeem(reward);
              }} style={{
                flex: 2, padding: 16, borderRadius: 14, border: 'none',
                background: cTier.name === 'BLACK' ? '#FFD54F' : cTier.name === 'PLATINO' ? '#1565C0' : '#FBBC04',
                color: cTier.name === 'PLATINO' ? '#fff' : '#0D0D0D',
                fontFamily: "'DM Sans'", fontSize: 15, fontWeight: 900, cursor: 'pointer',
                boxShadow: `0 4px 16px ${cTier.name === 'BLACK' ? 'rgba(255,213,79,.3)' : cTier.name === 'PLATINO' ? 'rgba(21,101,192,.35)' : 'rgba(251,188,4,.35)'}`,
              }}>✓ Confirmar Canje</button>
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

      {/* ── Modal QR emergente ── */}
      {showQR && isC && me && (
        <div
          onClick={() => setShowQR(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(0,0,0,.6)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            animation: 'fadeIn .2s ease',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: cTier.name === 'BLACK' ? '#0D0D1A'
                : cTier.name === 'PLATINO' ? '#E8E8E8' : '#fff',
              borderRadius: '28px 28px 0 0',
              width: '100%', maxWidth: 480,
              padding: '12px 24px 48px',
              animation: 'slideUp .32s cubic-bezier(.32,1.2,.64,1)',
              boxShadow: '0 -8px 40px rgba(0,0,0,.25)',
            }}
          >
            {/* Handle */}
            <div style={{ width: 40, height: 4, borderRadius: 4, background: cTier.name === 'BLACK' ? 'rgba(255,255,255,.2)' : '#E0E0E0', margin: '0 auto 20px' }} />

            {/* Título */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: cTier.name === 'BLACK' ? '#FFD54F' : '#F0A500', marginBottom: 2 }}>
                {cTier.icon} {cTier.name}
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: cTier.name === 'BLACK' ? '#fff' : '#0D0D0D' }}>
                Mi código QR
              </div>
            </div>

            {/* Tarjeta QR */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                display: 'inline-block', position: 'relative', overflow: 'hidden',
                borderRadius: 20, padding: '24px 28px',
                background: cTier.name === 'BLACK' ? 'linear-gradient(135deg,#1A1A2E,#0D0D1A)'
                  : cTier.name === 'PLATINO' ? 'linear-gradient(135deg,#C8C8C8,#E8E8E8)'
                  : 'linear-gradient(135deg,#FFFDE7,#FFF8E1)',
                border: cTier.name === 'BLACK' ? '1px solid rgba(255,255,255,.08)'
                  : cTier.name === 'PLATINO' ? '1px solid #BDBDBD'
                  : '1px solid #FFE082',
                boxShadow: cTier.name === 'BLACK' ? '0 8px 32px rgba(0,0,0,.5)'
                  : '0 8px 32px rgba(251,188,4,.2)',
              }}>
                <TierDeco name={cTier.name} />
                <div style={{ position: 'relative', zIndex: 2 }}>
                  <QRCode code={me.cardId || me.id} sz={180} scanColor={cTier.name === 'BLACK' ? '#FFD54F' : cTier.name === 'PLATINO' ? '#1565C0' : '#F0A500'} />
                  <div style={{ marginTop: 14, padding: '6px 16px', borderRadius: 10, background: 'rgba(0,0,0,.08)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13 }}>💳</span>
                    <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 800, color: cTier.name === 'BLACK' ? '#FFD54F' : '#0D0D0D', letterSpacing: 1 }}>
                      {me.cardId || '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: cTier.name === 'BLACK' ? 'rgba(255,255,255,.5)' : '#9E9E9E', fontWeight: 600 }}>
              Mostrá este código en cada carga de combustible
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: '#0D0D0D', color: '#fff', padding: '14px 24px',
          borderRadius: 14, fontWeight: 700, fontSize: 14, zIndex: 300,
          animation: 'fadeUp .3s', display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 8px 32px rgba(0,0,0,.2)', maxWidth: '90%',
        }}>
          <Check /> {toast}
        </div>
      )}


    </>
  );
}
