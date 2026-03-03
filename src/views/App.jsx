// src/views/App.jsx
// Main orchestrator — manages global state, auth, Supabase sync, and view routing
import { useState, useCallback, useEffect } from 'react';
import { sb } from '../lib/supabaseClient';
import { makeTier, daysInactive } from '../lib/tierSystem';
import { CFG_INIT, FUEL } from '../constants/config';
import { clientTheme, adminTheme, sMono, GAL } from '../constants/styles';
import useToast from '../hooks/useToast';

// UI Components
import RoleSwitcher from '../components/ui/RoleSwitcher';
import BottomNav from '../components/ui/BottomNav';
import { Check, Fuel, Users, Gift, Ticket, Clock, Gear } from '../components/ui/Icons';

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
import Settings from './admin/Settings';
import OpManagement from './admin/OpManagement';

export default function App() {
  // ===== ROLE & NAVIGATION =====
  const [view, setView] = useState('client');       // admin | operator | client
  const [scr, setScr] = useState('dash');            // admin screen
  const [cScr, setCScr] = useState('home');           // client screen
  const [oScr, setOScr] = useState('ohome');          // operator screen

  // ===== AUTH STATE =====
  const [authScreen, setAuthScreen] = useState('login');   // login|register|verify|profile|googleProfile|logged
  const [authOp, setAuthOp] = useState('login');           // login|logged
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
  const [ratingStars, setRatingStars] = useState(0);
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
    if (!sb || !sbConnected) return;
    sb.from('activity_log').insert({
      member_id: memberId, activity_type: type,
      description: desc, points_change: ptsChange || null, amount: amount || null,
    }).then(r => { if (r.error) console.error('[Activity]', r.error); });
    setActivityLog(prev => {
      const n = { ...prev };
      if (!n[memberId]) n[memberId] = [];
      n[memberId] = [{ type, desc, pts: ptsChange, amount, date: new Date().toISOString().split('T')[0], station: '' }, ...n[memberId]];
      return n;
    });
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

  // ===== SUPABASE DATA LOADING =====
  useEffect(() => {
    if (!sb) { setSbLoading(false); return; }
    let mounted = true;

    // Auth state change listener
    const authSub = sb.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      console.log('[Auth]', event, session?.user?.email || 'no session');
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session?.user) {
        setUserFromSession(session.user);
        if (event === 'SIGNED_IN') fire('👋 Bienvenido ' + (session.user.user_metadata?.full_name || session.user.email));
      }
      if (event === 'SIGNED_OUT') {
        setMe(null); setAuthScreen('login'); setView('client'); setGoogleStep('welcome');
      }
    });

    // Catch existing session (race condition: hash may be processed before listener)
    sb.auth.getSession().then(({ data: { session } }) => {
      console.log('[Auth] getSession:', session?.user?.email || 'no session');
      if (mounted && session?.user) {
        setUserFromSession(session.user);
      }
    });

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

        // Load members
        const memRes = await sb.from('members').select('*,physical_cards!assigned_to(card_code)').order('created_at', { ascending: false });
        if (memRes.data?.length > 0) {
          setCusts(memRes.data.map(m => ({
            id: m.id, name: m.name, email: m.email || '',
            phone: m.phone || '', dpi: m.dpi || '', plate: m.plate || '',
            nit: m.nit || '', bday: m.birthday || '',
            points: m.points || 0, gallons: parseFloat(m.gallons) || 0,
            spent: parseFloat(m.spent) || 0, visits: m.visits || 0,
            tickets: m.tickets || 0, redeemed: m.redeemed_count || 0,
            referrals: m.referral_count || 0,
            registered: m.created_at?.split('T')[0] || '',
            lastBuy: m.last_buy?.split('T')[0] || '',
            station: m.last_station || '',
            cardId: m.physical_cards?.[0]?.card_code || m.card_id || '',
            supabaseUser: true, authProvider: m.auth_provider || 'google',
            authProviderId: m.auth_provider_id || '',
          })));
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
              date: a.created_at?.split('T')[0] || '', station: a.station_id || '',
            });
          });
          setActivityLog(actMap);
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
        registered: m.created_at?.split('T')[0] || '',
        lastBuy: m.last_buy?.split('T')[0] || '',
        station: m.last_station || '',
        cardId: m.physical_cards?.[0]?.card_code || m.card_id || '',
        supabaseUser: true, authProvider: provider,
      };
    }

    if (sb) {
      console.log('[Auth] Looking up member with auth_provider_id:', u.id);
      sb.from('members').select('*,physical_cards!assigned_to(card_code)').eq('auth_provider_id', u.id).then(r => {
        if (r.error) {
          console.error('[Auth] Member lookup error:', r.error);
          setMe({
            id: u.id, name, email, avatar,
            phone: '', dpi: '', plate: '', nit: '', bday: '',
            points: 0, gallons: 0, spent: 0, visits: 0, tickets: 0,
            redeemed: 0, referrals: 0, registered: new Date().toISOString().split('T')[0],
            lastBuy: '', station: '', cardId: '', supabaseUser: true, authProvider: provider,
          });
          setRegProfile(p => ({ ...p, name, email }));
          setAuthScreen('googleProfile'); setView('client');
          return;
        }
        console.log('[Auth] Member lookup result:', r.data?.length, 'records found');
        if (r.data?.length > 0) {
          console.log('[Auth] ✅ Existing member found:', r.data[0].name, '→ logged in');
          const existing = buildExisting(r.data[0]);
          setMe(existing);
          setCusts(p => p.find(c => c.id === existing.id) ? p : [...p, existing]);
          setAuthScreen('logged'); setView('client');
        } else {
          console.log('[Auth] ❌ No member found → showing registration');
          setMe({
            id: u.id, name, email, avatar,
            phone: '', dpi: '', plate: '', nit: '', bday: '',
            points: 0, gallons: 0, spent: 0, visits: 0, tickets: 0,
            redeemed: 0, referrals: 0, registered: new Date().toISOString().split('T')[0],
            lastBuy: '', station: '', cardId: '', supabaseUser: true, authProvider: provider,
          });
          setRegProfile(p => ({ ...p, name, email }));
          setAuthScreen('googleProfile'); setView('client');
        }
      });
    }
  }

  // ===== CARGAR ENCUESTAS DEL DIA AL CAMBIAR DE USUARIO =====
  useEffect(() => {
    if (me?.id && sb && sbConnected) loadTodaySurveys(me.id);
  }, [me?.id, sbConnected, loadTodaySurveys]);

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
    const today = new Date().toISOString().split('T')[0];
    const buyer = custs.find(c => c.id === cid);
    setCusts(p => p.map(c => c.id === cid ? { ...c, points: c.points + pts, gallons: +(c.gallons + gal).toFixed(2), spent: c.spent + a, visits: c.visits + 1, lastBuy: today } : c));
    if (me?.id === cid) setMe(p => ({ ...p, points: p.points + pts, gallons: +(p.gallons + gal).toFixed(2), spent: p.spent + a, visits: p.visits + 1, lastBuy: today }));
    fire(`+${pts} pts · ${gal} gal · Q${a}`);
    setModal(null); setAmt('');
    if (buyer) {
      const oldTier = gT(parseFloat(buyer.gallons || 0)).name;
      const newGal = +(parseFloat(buyer.gallons || 0) + gal).toFixed(2);
      const newTier = gT(newGal).name;
      syncMember(cid, { points: (buyer.points || 0) + pts, gallons: newGal, spent: +(parseFloat(buyer.spent || 0) + a).toFixed(2), visits: (buyer.visits || 0) + 1, last_buy: new Date().toISOString(), updated_at: new Date().toISOString() });
      logActivity(cid, 'compra', `Compra ${gal} gal ${f} \u00b7 Q${a}`, pts, a);
      if (sb && sbConnected) {
        sb.from('purchases').insert({ member_id: cid, amount: a, fuel_type: f, gallons: gal, points_earned: pts });
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
  }, [me, custs, fire, cfg, gT, syncMember, logActivity, sbConnected]);

  const redeem = useCallback((r) => {
    const t = gT(me.gallons);
    const cost = Math.round(r.pts * (1 - t.redeemDisc));
    if (me.points < cost) return;
    setMe(p => ({ ...p, points: p.points - cost, redeemed: (p.redeemed || 0) + 1 }));
    setCusts(p => p.map(c => c.id === me.id ? { ...c, points: c.points - cost, redeemed: (c.redeemed || 0) + 1 } : c));
    const code = `TK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setRedeemedList(p => [{ id: `RD-${Date.now()}`, reward: { name: r.name, icon: r.icon, cat: r.cat }, cost, date: new Date().toISOString().split('T')[0], code, collected: false }, ...p]);
    fire(`🎉 ¡Canjeaste ${r.name} por ${cost} pts!`);
    syncMember(me.id, { points: me.points - cost, redeemed_count: (me.redeemed || 0) + 1, updated_at: new Date().toISOString() });
    logActivity(me.id, 'canje', `Canjeó: ${r.name} ${r.icon}`, -cost);
    if (sb && sbConnected) sb.from('redemptions').insert({ member_id: me.id, reward_id: r.id, points_spent: cost, redemption_code: code });
  }, [me, fire, gT, syncMember, logActivity, sbConnected]);

  const buyTickets = useCallback((n) => {
    const cost = n * cfg.ticketPts;
    if (me.points < cost) { fire('❌ Puntos insuficientes'); return; }
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
    syncMember(me.id, { points: me.points - cost, tickets: me.tickets + n, updated_at: new Date().toISOString() });
    logActivity(me.id, 'rifa', `Compró ${n} boletos de rifa`, -cost);
  }, [me, fire, cfg, curMonth, syncMember, logActivity]);

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
    syncMember(me.id, { points: me.points + cfg.surveyPts, tickets: bonusTicket ? me.tickets + 1 : me.tickets, updated_at: new Date().toISOString() });
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
    setMe(null); setGoogleStep('welcome'); setMySurveyCount(0);
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
    showSurveys, setShowSurveys,
    sortDir, setSortDir, memSort, setMemSort,
    stationFilter, setStationFilter, stationMode, setStationMode,
    // Auth
    authScreen, setAuthScreen, authOp, setAuthOp, authAdmin, setAuthAdmin,
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
    { id: 'dash', label: 'Inicio', icon: <Fuel /> },
    { id: 'mem', label: 'Miembros', icon: <Users /> },
    { id: 'ops', label: 'Operadores', icon: <Gear /> },
    { id: 'cat', label: 'Premios', icon: <Gift /> },
    { id: 'raf', label: 'Rifa', icon: <Ticket /> },
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
    { id: 'raf', label: 'Rifa', icon: <Ticket /> },
    { id: 'rules', label: 'Reglas', icon: <Clock /> },
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
      if (scr === 'cfg') return <Settings {...ctx} />;
      if (scr === 'ops') return <OpManagement {...ctx} />;
      if (scr === 'rules') return <Rules {...ctx} />;
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
    return <ClientHome {...ctx} />;
  }

  // ===== HANDLE NAV =====
  function handleNav(id) {
    if (isA) { setScr(id); setSel(null); }
    else if (isO) { setOScr(id); }
    else setCScr(id);
  }

  function handleRoleSwitch(role) {
    setView(role); setAuthError('');
    if (role === 'admin') setScr('dash');
    else if (role === 'operator') setOScr('ohome');
    else setCScr('home');
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

        {/* Role switcher */}
        <RoleSwitcher view={view} onSwitch={handleRoleSwitch} tierName={cTier.name} authScreen={authScreen} />

        {/* Active screen */}
        {renderScreen()}

        {/* Bottom navigation */}
        {isLoggedIn && (
          <BottomNav items={nav} current={cur} onSelect={handleNav} view={view} tierName={cTier.name} />
        )}
      </div>

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

      {/* Supabase connection indicator */}
      {sbConnected && !sbLoading && (
        <div style={{
          position: 'fixed', bottom: 8, right: 8,
          background: 'rgba(22,163,74,.9)', color: '#fff',
          padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, zIndex: 200,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          ● Supabase
        </div>
      )}
      {sbLoading && (
        <div style={{
          position: 'fixed', bottom: 8, right: 8,
          background: 'rgba(251,188,4,.9)', color: '#000',
          padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, zIndex: 200,
        }}>
          ⏳ Cargando...
        </div>
      )}
    </>
  );
}
