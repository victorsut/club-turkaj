// src/views/client/vehicles/VehicleFuel.jsx
// F6 E3a (2-sep-2026, pedido del dueño) — RENDIMIENTO Y CONSUMO del
// vehículo activo: análisis por carga (km/gal por tramo con las
// lecturas de odómetro), consumo por mes, indicadores (rendimiento,
// ritmo, costo por km, promedio por carga) y el HISTORIAL DE CARGAS
// del miembro con EDITOR de reasignación — si el modal de calificación
// no apareció (sin conexión), la carga se auto-asigna al vehículo
// equivocado y aquí se corrige (ventana server-side de 30 días).
// Datos: list_my_fuel_history + assign_purchase_vehicle (migración
// 20260902_f6e3a). Si la migración no está ejecutada, la sección
// simplemente no aparece (la app no rompe — precedente E2).
import { useEffect, useMemo, useState } from 'react';
import { BRAND_ORANGE } from '../../../constants/styles';
import { FUEL_LABELS } from '../../../constants/config';
import { VEHICLE_TYPES } from '../../../components/ui/VehicleIcons';
import { addMyFuelLog, assignPurchaseVehicle, deleteMyFuelLog, listMyFuelHistory } from '../../../services/vehicleService';
import { MonthBars, TrendChart } from './VehicleCharts';

const fmtN = (n, d = 1) => (+n).toLocaleString('en-US', { maximumFractionDigits: d });
const fmtDay = (iso) => new Date(iso).toLocaleDateString('es-GT', { day: 'numeric', month: 'short' });
const fmtMonth = (iso) => {
  const t = new Date(iso).toLocaleDateString('es-GT', { month: 'long', year: 'numeric' });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

// `preload`: datos iniciales para el arnés de vista previa (sin backend);
// en producción no se pasa y el historial baja por list_my_fuel_history.
export default function VehicleFuel({ dark, fire, vehicles, vehicle, stats, onStatsDirty, preload = null }) {
  const [loads, setLoads] = useState(preload);    // null=cargando · false=sin RPC · []=vacío
  const [editableDays, setEditableDays] = useState(30);
  const [editingId, setEditingId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [showAll, setShowAll] = useState(false);
  // E3b: registro MANUAL de consumo (cargas fuera de Turkaj)
  const [reg, setReg] = useState(false);
  const [rg, setRg] = useState({ gal: '', amt: '', km: '' });
  const [savingReg, setSavingReg] = useState(false);
  const [delLogArmed, setDelLogArmed] = useState(null); // id armado para borrar
  const [histOpen, setHistOpen] = useState(false); // E3d: historial contraído por defecto

  const fetchLoads = () => listMyFuelHistory().then(({ data, error }) => {
    if (error || !data?.ok) { setLoads(false); return; }
    setLoads(Array.isArray(data.loads) ? data.loads : []);
    if (data.editable_days) setEditableDays(data.editable_days);
  });
  useEffect(() => {
    if (preload) return;
    let alive = true;
    listMyFuelHistory().then(({ data, error }) => {
      if (!alive) return;
      if (error || !data?.ok) { setLoads(false); return; }
      setLoads(Array.isArray(data.loads) ? data.loads : []);
      if (data.editable_days) setEditableDays(data.editable_days);
    });
    return () => { alive = false; };
  }, [preload]);

  const ink = dark ? '#fff' : '#0D0D0D';
  const sub = dark ? 'rgba(255,255,255,.5)' : '#9E9E9E';
  const cardBg = dark ? 'rgba(255,255,255,.07)' : '#F5F5F7';
  const lbl = { fontSize: 11, fontWeight: 800, color: sub, textTransform: 'uppercase', letterSpacing: 1 };

  const vehById = useMemo(() => {
    const m = {};
    for (const x of vehicles) m[x.id] = x;
    return m;
  }, [vehicles]);
  const vehName = (vid) => {
    const x = vehById[vid];
    if (!x) return null;
    return [x.brand, x.model].filter(Boolean).join(' ')
      || (VEHICLE_TYPES.find(t => t.k === x.vtype)?.label ?? 'Vehículo');
  };

  // km/gal POR TRAMO: entre lecturas de odómetro consecutivas del mismo
  // vehículo, con los galones cargados entre ambas (se adjunta a la
  // carga que cierra el tramo)
  const segKmGal = useMemo(() => {
    const out = {};
    if (!Array.isArray(loads)) return out;
    const byVeh = {};
    for (const l of [...loads].reverse()) { // ascendente
      if (!l.vehicle_id) continue;
      (byVeh[l.vehicle_id] = byVeh[l.vehicle_id] || []).push(l);
    }
    for (const rows of Object.values(byVeh)) {
      let prev = null, gal = 0;
      for (const l of rows) {
        gal += +l.gallons || 0;
        if (l.km_reading == null) continue;
        if (prev && l.km_reading > prev.km && gal > 0) {
          out[l.id] = +( (l.km_reading - prev.km) / gal ).toFixed(1);
        }
        prev = { km: l.km_reading };
        gal = 0;
      }
    }
    return out;
  }, [loads]);

  // filas del vehículo ACTIVO (consumo por mes + frecuencia)
  const mine = useMemo(
    () => (Array.isArray(loads) ? loads.filter(l => l.vehicle_id === vehicle?.id) : []),
    [loads, vehicle?.id]);
  const months = useMemo(() => {
    const acc = new Map();
    for (const l of mine) {
      const d = new Date(l.created_at);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const e = acc.get(k) || {
        label: fmtMonth(l.created_at),
        short: new Date(l.created_at).toLocaleDateString('es-GT', { month: 'short' }).replace('.', ''),
        n: 0, gal: 0, amt: 0,
      };
      e.n++; e.gal += +l.gallons || 0; e.amt += +l.amount || 0;
      acc.set(k, e);
    }
    return [...acc.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6).map(x => x[1]);
  }, [mine]);
  // E3e: puntos de la gráfica de rendimiento (tramos en orden cronológico)
  const trendPoints = useMemo(
    () => [...mine].reverse().filter(l => segKmGal[l.id] != null)
      .map(l => ({ label: fmtDay(l.created_at), v: segKmGal[l.id] })),
    [mine, segKmGal]);

  const st = vehicle ? stats?.[vehicle.id] : null;
  const galCarga = st?.fuel_count > 0 ? st.total_gallons / st.fuel_count : null;
  const qGal = st?.total_gallons > 0 ? st.total_amount / st.total_gallons : null;
  const costoKm = qGal && st?.km_per_gal > 0 ? qGal / st.km_per_gal : null;
  const frecuencia = useMemo(() => {
    if (mine.length < 2) return null;
    const days = (new Date(mine[0].created_at) - new Date(mine[mine.length - 1].created_at)) / 86400000;
    return days >= 1 ? Math.round(days / (mine.length - 1)) : null;
  }, [mine]);

  // E3d: TENDENCIA — último tramo km/gal vs el promedio de los tramos
  // del vehículo (caída ≥10% = aviso: servicio/llantas/presión)
  const trend = useMemo(() => {
    const tramos = mine.filter(l => segKmGal[l.id] != null).map(l => segKmGal[l.id]);
    if (tramos.length < 2) return null;
    const avg = tramos.reduce((s, v) => s + v, 0) / tramos.length;
    if (!(avg > 0)) return null;
    return { pct: Math.round(((tramos[0] - avg) / avg) * 100), last: tramos[0] };
  }, [mine, segKmGal]);
  // E3d: costo mensual proyectado y autonomía por tanque
  const costoMes = costoKm && st?.km_per_day > 0 ? costoKm * st.km_per_day * 30.4 : null;
  const autonomia = vehicle?.tank_gal > 0 && st?.km_per_gal > 0 ? Math.round(vehicle.tank_gal * st.km_per_gal) : null;

  if (loads === false || !vehicle) return null; // migración pendiente o sin vehículo

  const insights = [
    {
      k: 'kmgal', label: 'Rendimiento',
      value: st?.km_per_gal ? `${fmtN(st.km_per_gal)} km/gal` : '—',
      note: trend
        ? `${trend.pct >= 0 ? '▲' : '▼'} ${Math.abs(trend.pct)}% vs tu promedio${trend.pct <= -10 ? ' — revisa servicio, llantas o presión' : ''}`
        : (st?.km_per_gal ? 'Entre tus lecturas de odómetro' : 'Reporta tu odómetro al calificar'),
      warn: trend ? trend.pct <= -10 : false,
    },
    { k: 'costo', label: 'Costo por km', value: costoKm ? `Q${fmtN(costoKm, 2)}` : '—', note: costoKm ? `A Q${fmtN(qGal, 2)} el galón` : 'Necesita rendimiento' },
    { k: 'mes', label: 'Costo mensual', value: costoMes ? `~Q${fmtN(costoMes, 0)}` : '—', note: costoMes ? `A tu ritmo de ${fmtN(st.km_per_day, 0)} km/día` : 'Necesita rendimiento y ritmo' },
    { k: 'auto', label: 'Autonomía', value: autonomia ? `~${fmtN(autonomia, 0)} km` : '—', note: autonomia ? `Por tanque de ${fmtN(vehicle.tank_gal)} gal` : 'Agrega el tanque en Datos y ajustes' },
    { k: 'galc', label: 'Por carga', value: galCarga ? `${fmtN(galCarga)} gal` : '—', note: galCarga ? `Q${fmtN(st.total_amount / st.fuel_count, 0)} en promedio` : 'Aún sin cargas' },
    { k: 'frec', label: 'Frecuencia', value: frecuencia ? `Cada ${frecuencia} día${frecuencia === 1 ? '' : 's'}` : '—', note: frecuencia ? `${mine.length} cargas recientes` : 'Con 2+ cargas' },
  ];

  // 3-sep (pedido del dueño): el historial muestra SOLO las cargas del
  // vehículo seleccionado; "Ver todas" abre el historial general (todos
  // los vehículos + cargas sin asignar) — ahí vive el editor de reasignación.
  const visible = Array.isArray(loads) ? (showAll ? loads : mine) : [];
  const othersN = Array.isArray(loads) ? loads.length - mine.length : 0;
  useEffect(() => { setShowAll(false); }, [vehicle?.id]);
  const canEdit = (l) => (Date.now() - new Date(l.created_at)) / 86400000 <= editableDays;

  const saveLog = async () => {
    if (savingReg) return;
    const gal = parseFloat(rg.gal);
    if (!(gal > 0)) { fire('Ingresa los galones cargados', 'warn'); return; }
    const amt = rg.amt === '' ? null : parseFloat(rg.amt);
    const km = rg.km === '' ? null : parseInt(rg.km, 10);
    setSavingReg(true);
    const { data, error } = await addMyFuelLog({ vehicleId: vehicle.id, gallons: gal, amount: amt, km });
    setSavingReg(false);
    if (error || !data?.ok) { fire('No se pudo registrar: ' + (error?.message || 'error'), 'error'); return; }
    setReg(false);
    setRg({ gal: '', amt: '', km: '' });
    fire('Consumo registrado', 'success');
    fetchLoads();
    onStatsDirty?.();
  };

  // borrar un registro manual (doble tap — un manual equivocado
  // envenena la telemetría y debe poder corregirse)
  const delLog = async (l) => {
    if (delLogArmed !== l.id) { setDelLogArmed(l.id); setTimeout(() => setDelLogArmed(x => (x === l.id ? null : x)), 2500); return; }
    setDelLogArmed(null);
    const { error } = await deleteMyFuelLog(l.id);
    if (error) { fire('No se pudo borrar: ' + (error.message || 'error'), 'error'); return; }
    fire('Registro borrado', 'success');
    fetchLoads();
    onStatsDirty?.();
  };

  const reassign = async (l, vid) => {
    if (busyId) return;
    setBusyId(l.id);
    const prevVid = l.vehicle_id;
    setLoads(ls => ls.map(x => (x.id === l.id ? { ...x, vehicle_id: vid } : x))); // optimista
    const { error } = await assignPurchaseVehicle({ purchaseId: l.id, vehicleId: vid });
    setBusyId(null);
    setEditingId(null);
    if (error) {
      setLoads(ls => ls.map(x => (x.id === l.id ? { ...x, vehicle_id: prevVid } : x)));
      fire('No se pudo corregir: ' + (error.message || 'error'), 'error');
      return;
    }
    fire('Carga corregida', 'success');
    onStatsDirty?.();
  };

  return (
    <div style={{ marginTop: 22 }}>
      <div style={lbl}>Rendimiento y consumo</div>

      {/* Indicadores del vehículo activo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
        {insights.map(t => (
          <div key={t.k} style={{ background: cardBg, borderRadius: 17, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: sub }}>{t.label}</div>
            <div style={{ fontSize: 15.5, fontWeight: 800, marginTop: 5, color: t.warn ? '#E65100' : ink }}>{t.value}</div>
            <div style={{ fontSize: 10.5, color: t.warn ? '#E65100' : sub, fontWeight: 600, marginTop: 3 }}>{t.note}</div>
          </div>
        ))}
      </div>

      {/* E3e: rendimiento por carga — línea de tramos km/gal con el
          promedio punteado (con ≥2 tramos; tap en un punto = detalle) */}
      {trendPoints.length >= 2 && (
        <div style={{ background: cardBg, borderRadius: 17, padding: '12px 14px 8px', marginTop: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: sub, marginBottom: 6 }}>Rendimiento por carga</div>
          <TrendChart points={trendPoints} avg={trendPoints.reduce((s, p) => s + p.v, 0) / trendPoints.length}
            dark={dark} ink={ink} sub={sub} surface={dark ? '#2A2A30' : '#F5F5F7'} />
        </div>
      )}

      {/* Consumo por mes (vehículo activo) — barras con ≥2 meses
          (tap en una barra = cargas y galones); con 1 mes, fila simple */}
      {months.length > 0 && (
        <div style={{ background: cardBg, borderRadius: 17, padding: '12px 14px 8px', marginTop: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: sub, marginBottom: 8 }}>Consumo por mes</div>
          {months.length >= 2 ? (
            <MonthBars months={[...months].reverse()} dark={dark} ink={ink} sub={sub} />
          ) : months.map(m => (
            <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '5px 0' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: ink }}>{m.label}</span>
              <span style={{ fontSize: 12, color: sub, fontWeight: 600 }}>
                {m.n} carga{m.n === 1 ? '' : 's'} · {fmtN(m.gal)} gal · <span style={{ color: ink, fontWeight: 800 }}>Q{fmtN(m.amt, 0)}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* E3b: registrar consumo MANUAL (carga fuera de Turkaj) — útil
          para comparar rendimiento; puede ser llenado PARCIAL (la
          telemetría nunca asume tanque lleno) */}
      {!reg ? (
        <button onClick={() => setReg(true)} style={{
          width: '100%', marginTop: 10, padding: 13, borderRadius: 15, cursor: 'pointer',
          border: `1.5px dashed ${dark ? 'rgba(255,255,255,.25)' : 'rgba(0,0,0,.18)'}`,
          background: 'transparent', color: ink,
          fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 800,
        }}>+ Registrar consumo</button>
      ) : (
        <div style={{ background: cardBg, borderRadius: 17, padding: '13px 14px', marginTop: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: sub }}>
            Registrar consumo · {vehName(vehicle.id)}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {[
              { k: 'gal', label: 'Galones', ph: '8.5', mode: 'decimal' },
              { k: 'amt', label: 'Precio (Q)', ph: '320', mode: 'decimal' },
              { k: 'km', label: 'Odómetro', ph: '45900', mode: 'numeric' },
            ].map(f => (
              <div key={f.k} style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: sub, marginBottom: 4 }}>{f.label}</div>
                <input value={rg[f.k]} inputMode={f.mode} placeholder={f.ph}
                  onChange={e => {
                    // decimal: dígitos + UN punto (galones 8.5, precio 319.90)
                    let v = e.target.value.replace(f.mode === 'numeric' ? /[^0-9]/g : /[^0-9.]/g, '');
                    if (f.mode !== 'numeric') {
                      const i = v.indexOf('.');
                      if (i >= 0) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, '');
                    }
                    v = v.slice(0, f.mode === 'numeric' ? 7 : 8);
                    setRg(prev => ({ ...prev, [f.k]: v }));
                  }}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '11px 10px', borderRadius: 12,
                    border: 'none', background: dark ? 'rgba(255,255,255,.1)' : '#fff', color: ink,
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, outline: 'none',
                  }} />
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10.5, color: sub, fontWeight: 600, lineHeight: 1.5, marginTop: 8 }}>
            No importa si el tanque no quedó lleno: el rendimiento se calcula con TODO el
            combustible registrado entre tus lecturas de odómetro.
          </div>
          {/* E3d: guardas SUAVES de calidad de datos (no bloquean) — un
              dedazo en el odómetro o los galones envenena la telemetría */}
          {(() => {
            const kmIn = rg.km === '' ? null : parseInt(rg.km, 10);
            const galIn = rg.gal === '' ? null : parseFloat(rg.gal);
            const lastKm = Math.max(vehicle.km || 0, ...mine.filter(l => l.km_reading != null).map(l => l.km_reading));
            const warns = [];
            if (kmIn != null && lastKm > 0 && kmIn < lastKm) {
              warns.push(`Ojo: el odómetro es menor que tu última lectura (${fmtN(lastKm, 0)} km) — revísalo si es un error.`);
            }
            if (galIn != null && vehicle.tank_gal > 0 && galIn > vehicle.tank_gal) {
              warns.push(`Ojo: los galones superan la capacidad de tu tanque (${fmtN(vehicle.tank_gal)} gal).`);
            }
            return warns.map(w => (
              <div key={w} style={{ fontSize: 10.5, color: '#E65100', fontWeight: 700, lineHeight: 1.5, marginTop: 6 }}>{w}</div>
            ));
          })()}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={() => { setReg(false); setRg({ gal: '', amt: '', km: '' }); }} disabled={savingReg} style={{
              flex: 1, padding: 11, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: dark ? 'rgba(255,255,255,.1)' : '#fff', color: ink,
              fontFamily: "'DM Sans'", fontSize: 12.5, fontWeight: 700,
            }}>Cancelar</button>
            <button onClick={saveLog} disabled={savingReg} style={{
              flex: 1.4, padding: 11, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: savingReg ? (dark ? '#3A3A3A' : '#BDBDBD') : BRAND_ORANGE, color: '#fff',
              fontFamily: "'DM Sans'", fontSize: 12.5, fontWeight: 800,
            }}>{savingReg ? 'Guardando…' : 'Guardar consumo'}</button>
          </div>
        </div>
      )}

      {/* Historial de cargas del miembro + editor de reasignación.
          E3d: CONTRAÍDO por defecto (pedido del dueño — la vista del
          vehículo se saturaba); el encabezado despliega/contrae */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '18px 0 8px' }}>
        <button onClick={() => setHistOpen(o => !o)} style={{
          border: 'none', background: 'transparent', cursor: 'pointer', padding: 0,
          display: 'inline-flex', alignItems: 'center', gap: 7,
        }}>
          <span style={lbl}>Historial de cargas{Array.isArray(loads) && loads.length > 0 ? ` (${showAll ? loads.length : mine.length})` : ''}</span>
          <svg width="13" height="13" viewBox="0 0 16 16" style={{ color: sub, transform: histOpen ? 'rotate(180deg)' : 'none', transition: 'transform .18s' }}>
            <path d="M3.5 6 8 10.5 12.5 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {histOpen && othersN > 0 && (
          <button onClick={() => setShowAll(s => !s)} style={{
            border: 'none', background: 'transparent', cursor: 'pointer', padding: 0,
            color: BRAND_ORANGE, fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 800,
          }}>{showAll ? 'Solo este vehículo' : `Ver todas (${loads.length})`}</button>
        )}
      </div>

      {histOpen && Array.isArray(loads) && loads.length > 0 && !showAll && mine.length === 0 && (
        <div style={{ background: cardBg, borderRadius: 17, padding: '14px', fontSize: 12.5, color: sub, fontWeight: 600, lineHeight: 1.5 }}>
          Este vehículo aún no tiene cargas registradas. Toca <b style={{ color: BRAND_ORANGE }}>Ver todas</b> para revisar el historial general y asignarle alguna.
        </div>
      )}

      {loads === null && (
        <div style={{ fontSize: 12, color: sub, fontWeight: 600 }}>Cargando…</div>
      )}
      {Array.isArray(loads) && loads.length === 0 && (
        <div style={{ background: cardBg, borderRadius: 17, padding: '14px', fontSize: 12.5, color: sub, fontWeight: 600, lineHeight: 1.5 }}>
          Aquí verás cada carga de combustible con su rendimiento. Carga en Turkaj y califica tu compra para empezar.
        </div>
      )}

      {histOpen && visible.map(l => {
        const name = l.vehicle_id ? vehName(l.vehicle_id) : null;
        const dot = vehById[l.vehicle_id]?.color;
        const kmgal = segKmGal[l.id];
        const open = editingId === l.id;
        return (
          <div key={l.id} style={{ background: cardBg, borderRadius: 15, padding: '11px 13px', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: ink }}>
                  {fmtDay(l.created_at)}
                  <span style={{ color: sub, fontWeight: 600 }}> · {fmtN(l.gallons, 2)} gal · Q{fmtN(l.amount, 0)}</span>
                </div>
                <div style={{ fontSize: 10.5, color: sub, fontWeight: 600, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {[l.source === 'manual' ? 'Registro manual' : l.station_name, l.km_reading != null ? `${fmtN(l.km_reading, 0)} km` : null, kmgal ? `${kmgal} km/gal` : null]
                    .filter(Boolean).join(' · ') || '—'}
                  {/* E3d: combustible DISTINTO al habitual del vehículo
                      asignado = probable carga mal asignada */}
                  {l.source !== 'manual' && l.fuel_type && vehById[l.vehicle_id]?.fuel_pref
                    && l.fuel_type !== vehById[l.vehicle_id].fuel_pref && (
                    <span style={{ color: '#E65100', fontWeight: 700 }}> · {FUEL_LABELS[l.fuel_type] || l.fuel_type} ≠ su habitual, ¿de otro vehículo?</span>
                  )}
                </div>
              </div>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, maxWidth: 120,
                fontSize: 10.5, fontWeight: 800, color: name ? ink : '#E65100',
                background: dark ? 'rgba(255,255,255,.08)' : '#fff', borderRadius: 20, padding: '5px 9px',
              }}>
                {dot && <span style={{ width: 8, height: 8, borderRadius: 4, background: dot, flexShrink: 0 }} />}
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name || 'Sin vehículo'}</span>
              </span>
              {l.source === 'manual' && (
                <button aria-label="Borrar registro" onClick={() => delLog(l)} style={{
                  width: 30, height: 30, borderRadius: 10, border: 'none', cursor: 'pointer', flexShrink: 0,
                  background: delLogArmed === l.id ? '#C62828' : (dark ? 'rgba(255,255,255,.1)' : '#fff'),
                  color: delLogArmed === l.id ? '#fff' : sub,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <path d="M2.5 4h11M6.5 4V2.5h3V4M4 4l.8 10h6.4L12 4M6.7 7v4.5M9.3 7v4.5" />
                  </svg>
                </button>
              )}
              {l.source !== 'manual' && canEdit(l) && vehicles.length > 0 && (
                <button aria-label="Corregir vehículo" onClick={() => setEditingId(open ? null : l.id)} style={{
                  width: 30, height: 30, borderRadius: 10, border: 'none', cursor: 'pointer', flexShrink: 0,
                  background: open ? BRAND_ORANGE : (dark ? 'rgba(255,255,255,.1)' : '#fff'),
                  color: open ? '#fff' : sub, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="14" height="14" viewBox="0 0 16 16"><path d="M11.3 1.7a1.6 1.6 0 0 1 2.3 0l.7.7a1.6 1.6 0 0 1 0 2.3L5.8 13.2 2 14l.8-3.8Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
                </button>
              )}
            </div>
            {open && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${dark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.07)'}` }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: sub, marginBottom: 7 }}>¿A qué vehículo pertenece esta carga?</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {vehicles.map(x => (
                    <button key={x.id} disabled={busyId === l.id} onClick={() => reassign(l, x.id)} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px',
                      borderRadius: 12, border: 'none', cursor: 'pointer',
                      background: x.id === l.vehicle_id ? (dark ? '#fff' : '#0D0D0D') : (dark ? 'rgba(255,255,255,.1)' : '#fff'),
                      color: x.id === l.vehicle_id ? (dark ? '#0D0D0D' : '#fff') : ink,
                      fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 700,
                      opacity: busyId === l.id ? .6 : 1,
                    }}>
                      <span style={{ width: 9, height: 9, borderRadius: 5, background: x.color || '#9E9E9E' }} />
                      {vehName(x.id)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {histOpen && Array.isArray(loads) && loads.length > 0 && (
        <div style={{ fontSize: 10.5, color: sub, fontWeight: 600, lineHeight: 1.5, marginTop: 4 }}>
          ¿Una carga quedó en el vehículo equivocado? Tócale el lápiz y corrígela
          (hasta {editableDays} días — pasa cuando calificas sin conexión).
        </div>
      )}
    </div>
  );
}
