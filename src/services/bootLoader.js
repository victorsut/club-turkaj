// src/services/bootLoader.js
// Carga inicial de datos desde Supabase (el `loadFromSupabase()` del
// orquestador). Extraído de App.jsx en la división etapa 2
// (12-ago-2026) SIN cambios de lógica: recibe los setters y refs de
// App por parámetro y `isMounted()` para abortar sets tras el unmount.
// El listener de auth (onAuthStateChange / getSession) NO vive acá —
// se queda en App.jsx porque alimenta setUserFromSession.
import { sb } from '../lib/supabaseClient';
import { utcToLocal } from '../lib/dates';

export async function loadFromSupabase({
  isMounted,
  bootCustsRef, custsFullRef, opsFullRef,
  setRewards, setStores, setPromos, setStations, setCfg,
  setRaffleCal, setCrossYearWins, setCusts, setOperators,
  setOpRatings, setSbConnected, setSbLoading,
}) {
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

    const [rwRes, prRes, stRes, cfgRes, rcRes, psRes] = await Promise.all([
      sb.from('rewards').select('*').order('sort_order'),
      sb.from('promotions').select('*').order('sort_order'),
      sb.from('stations').select('*'),
      sb.from('program_config').select('*'),
      sb.from('raffle_calendar').select('*').order('month'),
      // D18: tiendas asociadas (antes de la migración 20260806c la
      // tabla no existe → error silencioso y stores queda [])
      sb.from('partner_stores').select('*').order('name'),
    ]);
    if (!isMounted()) return;

    if (rwRes.data) {
      setRewards(rwRes.data.map(r => ({
        id: r.id, name: r.name, icon: r.icon,
        pts: r.points_cost, cat: r.category, tier: r.tier_exclusive || undefined,
        points_cost: r.points_cost, category: r.category, tier_exclusive: r.tier_exclusive,
        description: r.description, active: r.active !== false,
        // D17: localizaciones de canje (null = todas las estaciones)
        stationIds: r.station_ids || null, storeIds: r.store_ids || null,
        station_ids: r.station_ids || null, store_ids: r.store_ids || null,
      })));
    }

    // D18: tiendas asociadas (sin migración: error → queda [])
    if (psRes.data) setStores(psRes.data);

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
      // Orden por nombre con criterio numérico (Turkaj 1 → 2 → 3 /
      // I → II → III) — el modal de Ubicación y las vistas admin
      // muestran las estaciones siempre en el mismo orden (4-ago).
      setStations(stRes.data.map(s => ({
        id: s.id, name: s.name, address: s.address || '',
        lat: s.lat, lng: s.lng, active: s.active !== false,
        schedule: s.schedule || null,
        wifiSsid: s.wifi_ssid || null, wifiPassword: s.wifi_password || null,
        externalCode: s.external_code || '', // F1: código PROPER
        fuelPrices: s.fuel_prices || null,    // D4: precio propio (null = globales)
      })).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es', { numeric: true })));
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
        // Canal de asistencia (4-ago): número de WhatsApp/llamadas
        const sup = cfgMap.support
          ? (typeof cfgMap.support === 'string' ? JSON.parse(cfgMap.support) : cfgMap.support)
          : {};
        // F1 (4-ago): identidad de la empresa
        const comp = cfgMap.company
          ? (typeof cfgMap.company === 'string' ? JSON.parse(cfgMap.company) : cfgMap.company)
          : {};
        // D24 (4-sep): umbrales de las alertas push de servicio de
        // vehículos — editables en Admin → Configuración; el cliente
        // pinta el aviso con el MISMO umbral que el push.
        const sa = cfgMap.service_alerts
          ? (typeof cfgMap.service_alerts === 'string' ? JSON.parse(cfgMap.service_alerts) : cfgMap.service_alerts)
          : {};
        // D4 (4-sep): interruptor precios globales vs por estación
        const fpm = cfgMap.fuel_prices_mode
          ? (typeof cfgMap.fuel_prices_mode === 'string' ? JSON.parse(cfgMap.fuel_prices_mode) : cfgMap.fuel_prices_mode)
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
          fuelPricesPerStation: fpm.per_station === true,
          degradEnabled: degEn.enabled === true,
          degradEnabledAt: degEn.enabled_at || null,
          supportPhone: sup.phone || '49741067',
          companyName: comp.name || 'Gasolineras Turkaj',
          companyLocation: comp.location || 'Chichicastenango',
          serviceAlerts: {
            days: +sa.days || 7, km: +sa.km || 500,
            overdueEveryDays: +sa.overdue_every_days || 7, kmEveryDays: +sa.km_every_days || 14,
          },
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
        claimDays: null, claimStationId: null,
      }));
      // Mismo shape para el slot del año en curso y para las
      // sorteadas de otros años (el modal de ganador consume ambos)
      const mapRaffleSlot = (r) => ({
        m: months[r.month - 1], p: `${r.prize_icon} ${r.prize_name}`,
        name: r.prize_name, icon: r.prize_icon, img: r.prize_image_url || null,
        detail: r.prize_detail || null,
        v: `Q${r.prize_value}`, cost: r.prize_value, dbId: r.id,
        month: r.month, year: r.year || yr,
        winnerId: r.winner_id || null, drawnAt: r.drawn_at || null,
        winnerSeenAt: r.winner_seen_at || null,
        // Costo del boleto de ESTA rifa; null = global cfg.ticketPts.
        ticketPts: r.ticket_points ?? null,
        // D22: plazo/estación de reclamo (null = 15 días / Turkaj 1)
        claimDays: r.claim_days ?? null,
        claimStationId: r.claim_station_id || null,
      });
      rcRes.data.filter(r => !r.year || r.year === yr).forEach(r => {
        cal[r.month - 1] = mapRaffleSlot(r);
      });
      setRaffleCal(cal);
      // Rifa multi-año (8-ago): las SORTEADAS de otros años entran a
      // un pool aparte — caso real: la rifa de diciembre se sortea en
      // enero del año siguiente, cuando raffleCal ya solo trae los
      // slots del año nuevo, y el ganador no veía su felicitación.
      setCrossYearWins(
        rcRes.data.filter(r => r.year && r.year !== yr && r.winner_id).map(mapRaffleSlot)
      );
    }

    // Load members — SEC.C.1/C.5: en el boot solo columnas NO
    // sensibles; el NOMBRE también quedó fuera de la API abierta
    // (1-ago — la rifa usa display_name del RPC de participantes).
    // Operador/admin cargan la ficha completa (con nombres) vía
    // list_members_full con SU sesión al loguearse.
    const memRes = await sb.from('members')
      .select('id, points, gallons, spent, visits, tickets, redeemed_count, last_buy, last_station, card_id, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (memRes.error) console.error('[Puntos Plus] Error cargando miembros:', memRes.error);
    console.log('[Puntos Plus] Miembros encontrados:', memRes.data?.length || 0);

    function mapMember(m) {
      return {
        // SEC.C.5: el boot ya no trae name — queda '' hasta que la
        // ficha completa del staff (list_members_full) lo llene
        id: m.id, name: m.name || '', email: m.email || '', avatar: m.avatar_url || '',
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
        cardId: m.physical_cards?.[0]?.card_code || m.card_id || '',
        supabaseUser: true, authProvider: m.auth_provider || 'google',
        authProviderId: m.auth_provider_id || '',
      };
    }

    if (memRes.data?.length > 0) {
      // SEC.C.2b (bug reportado por el dueño): con operador/admin ya
      // logueado, las fichas COMPLETAS (custsFull) pueden llegar
      // ANTES de que esta carga del boot resuelva — y este set las
      // PISABA con las columnas abiertas, cuyo cardId es el uuid de
      // members.card_id (no el código CTOD-XXXXX): el escaneo de QR
      // dejaba de encontrar miembros hasta re-loguearse.
      const mapped = memRes.data.map(mapMember);
      bootCustsRef.current = mapped;
      setCusts(prev => (custsFullRef.current ? prev : mapped));
    }

    // Load operators — objetivo #1 (29-jul): `operators` dejó de
    // exponer DPI/gafete/teléfono/correo/hash por la API abierta.
    // El boot trae solo columnas públicas (el cliente necesita el
    // nombre para el modal de calificación); la ficha completa la
    // carga el admin con su sesión (efecto opsFull más abajo).
    const opRes = await sb.from('operators')
      .select('id, name, username, station_id, bomba, turno, active')
      .order('name');
    if (opRes.error) console.error('[Puntos Plus] Error cargando operadores:', opRes.error);
    if (opRes.data?.length > 0) {
      const stById = {};
      (stRes.data || []).forEach(s => { stById[s.id] = s.name; });
      const bootOps = opRes.data.map(o => ({
        id: o.id, name: o.name, user: o.username,
        dpi: '', gafete: '', phone: '', email: '',
        station: stById[o.station_id] || '', stationId: o.station_id || null,
        bomba: o.bomba || '', turno: o.turno || '',
        active: o.active !== false,
      }));
      // No pisar la ficha completa si ya la trajo el efecto de staff.
      setOperators(prev => (opsFullRef.current ? prev : bootOps));
      console.log('[Puntos Plus] Operadores cargados:', opRes.data.length);
    }

    // SEC.C.2: activity_log, redemptions y raffle_tickets ya NO se
    // leen en el boot — su SELECT abierto quedó revocado. El libro
    // mayor y los canjes del miembro llegan por RPC con su sesión al
    // loguearse; el mapa global del staff y los participantes de la
    // rifa, con la sesión de operador/admin (efectos más abajo).

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
    if (isMounted()) setSbLoading(false);
  }
}
