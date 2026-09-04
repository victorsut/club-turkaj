// src/views/client/vehicles/VehiclesHome.jsx
// F6 — Ventana VEHÍCULOS real, para TODOS los socios desde el rollout
// del 4-sep-2026 (VehiclesScreen carga la lista). Encabezado con la ilustración del
// vehículo en su color + resplandor; el PRINCIPAL (último que recibió
// combustible — orden del server) va de primero y se cambia con SWIPE
// izquierda/derecha. Debajo: datos relevantes (kilometraje, próximo
// servicio, aceite y el hueco de telemetría que llena la E2) y la
// gestión completa (agregar/editar/eliminar con doble tap).
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { BRAND_ORANGE, homeColors } from '../../../constants/styles';
import { VEHICLE_TYPES } from '../../../components/ui/VehicleIcons';
import VehicleArt from '../../../components/ui/VehicleArt';
import { bodyFor } from '../../../constants/vehicleCatalog';
import { has3D } from '../../../components/ui/vehicle3d/models3d';
import { plateMask } from '../../../lib/inputMasks';
import { listMyVehicleStats } from '../../../services/vehicleService';
import useSwipeTrack, { slideIn } from '../../../hooks/useSwipeTrack';
import VehicleForm from './VehicleForm';
import VehicleFuel from './VehicleFuel';
import ServiceConfirmSheet from './ServiceConfirmSheet';

// El visor 3D (three.js) baja SOLO al abrirlo — chunk propio
const Vehicle3DSheet = lazy(() => import('../../../components/ui/vehicle3d/Vehicle3DSheet.jsx'));

const fmtPlate = (p) => {
  const raw = plateMask.clean(p || '');
  return raw.length === 7 ? plateMask.format(raw) : (p || 'Sin placa');
};

const fmtKm = (km) => km == null ? null : `${km.toLocaleString('en-US')} km`;

const fmtDate = (d) => {
  if (!d) return null;
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Días hasta la fecha (negativo = vencido) en calendario local
const daysUntil = (d) => {
  if (!d) return null;
  const [y, m, day] = d.split('-').map(Number);
  const target = new Date(y, m - 1, day);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
};

export default function VehiclesHome({ ctx, vehicles, setVehicles }) {
  const { cTier, dark, fire, vehicleFocus, setVehicleFocus } = ctx;
  const hp = homeColors(cTier.name);
  const [idx, setIdx] = useState(0);
  const [form, setForm] = useState(null);          // null | { vehicle|null }
  const [confirm, setConfirm] = useState(null);    // E4: null | { vehicle }
  const [show3D, setShow3D] = useState(null);      // null | { vehicle, bodyKey }
  // carrusel que sigue al dedo (3-sep) — gesto compartido con la Rifa
  // desde el 4-sep (hooks/useSwipeTrack)
  const swipe = useSwipeTrack({ count: vehicles.length, idx, setIdx });

  // F6 E2 — telemetría por vehículo (cargas, galones, Q, km/gal, km/día)
  const [stats, setStats] = useState({});
  const [statsK, setStatsK] = useState(0); // E3a: reasignar en el historial recarga la telemetría
  useEffect(() => {
    let alive = true;
    listMyVehicleStats().then(({ data }) => {
      if (alive && data?.ok) setStats(data.stats || {});
    });
    return () => { alive = false; };
  }, [statsK]);

  // E4: llegada desde la notificación de servicio (push, deep-link o
  // inbox): ir a ESE vehículo y abrir la confirmación; se consume una
  // sola vez (setVehicleFocus(null)).
  useEffect(() => {
    if (!vehicleFocus || !vehicles.length) return;
    const i = vehicles.findIndex(x => x.id === vehicleFocus.vehicleId);
    const target = i >= 0 ? i : 0;
    setIdx(target);
    if (vehicleFocus.confirm) setConfirm({ vehicle: vehicles[target] });
    setVehicleFocus?.(null);
  }, [vehicleFocus?.at, vehicles.length]);

  // ── la INFORMACIÓN entra en la dirección del cambio (3-sep): los
  // cuadros de datos, escalonados, y la sección de combustible, sin
  // remontar nada (Web Animations API sobre los nodos vivos).
  const tilesRef = useRef(null);
  const fuelRef = useRef(null);
  const firstIdx = useRef(true);
  useEffect(() => {
    if (firstIdx.current) { firstIdx.current = false; return; }
    const dir = swipe.dirRef.current;
    slideIn(tilesRef.current ? [...tilesRef.current.children] : [], dir);
    slideIn([fuelRef.current], dir, { delay: 120, duration: 420, scale: false });
  }, [idx]);

  const ink = dark ? '#fff' : '#0D0D0D';
  const sub = dark ? 'rgba(255,255,255,.5)' : '#9E9E9E';
  const cardBg = dark ? 'rgba(255,255,255,.07)' : '#F5F5F7';

  const v = vehicles[idx] || null;
  const typeInfo = (k) => VEHICLE_TYPES.find(t => t.k === k) || VEHICLE_TYPES[7];

  const onSaved = (saved) => {
    setForm(null);
    setVehicles(prev => {
      const i = prev.findIndex(x => x.id === saved.id);
      if (i < 0) { setIdx(prev.length); return [...prev, saved]; }
      const next = [...prev]; next[i] = { ...next[i], ...saved };
      return next;
    });
  };

  // 3-sep: la eliminación vive en Datos y ajustes (zona de riesgo con
  // confirmación); el servidor ya borró cuando llega aquí.
  const onDeleted = (gone) => {
    setForm(null);
    setVehicles(prev => prev.filter(x => x.id !== gone.id));
    setIdx(i => Math.max(0, Math.min(i, vehicles.length - 2)));
  };

  // ── Próximo servicio: por FECHA, por KM o ambos (E1.1) — se muestra
  // lo más URGENTE; el otro criterio va como nota secundaria.
  const serviceDays = v ? daysUntil(v.next_service) : null;
  const kmLeft = v && v.next_service_km != null && v.km != null ? v.next_service_km - v.km : null;
  // E2: telemetría del vehículo activo + estimación de días al servicio
  // por km según su ritmo real (km/día de las lecturas de odómetro)
  const st = v ? stats[v.id] : null;
  const kmEta = kmLeft != null && kmLeft > 0 && st?.km_per_day > 0
    ? Math.ceil(kmLeft / st.km_per_day) : null;
  const svc = (() => {
    if (!v) return null;
    const hasDate = !!v.next_service;
    const hasKm = v.next_service_km != null;
    if (!hasDate && !hasKm) return { value: '—', note: 'Sin programar — agrégalo al editar', warn: false };
    const kmVal = hasKm ? `${v.next_service_km.toLocaleString('en-US')} km` : null;
    const kmNote = !hasKm ? null
      : kmLeft == null ? 'Meta de odómetro (actualiza tu km)'
      : kmLeft <= 0 ? `Pasado por ${Math.abs(kmLeft).toLocaleString('en-US')} km`
      : `Faltan ${kmLeft.toLocaleString('en-US')} km${kmEta ? ` · ≈ ${kmEta} día${kmEta === 1 ? '' : 's'}` : ''}`;
    const dateNote = !hasDate ? null
      : serviceDays < 0 ? `Venció hace ${-serviceDays} día${serviceDays === -1 ? '' : 's'}`
      : serviceDays === 0 ? '¡Es hoy!'
      : `En ${serviceDays} día${serviceDays === 1 ? '' : 's'}`;
    const kmWarn = kmLeft != null && kmLeft <= 500;
    const dateWarn = serviceDays != null && serviceDays <= 7;
    // ¿Cuál manda? el vencido primero; luego el que esté en alerta
    const kmFirst = hasKm && (!hasDate || (kmLeft != null && kmLeft <= 0) || (kmWarn && !dateWarn));
    if (kmFirst) {
      return { value: kmVal, note: kmNote + (hasDate ? ` · o el ${fmtDate(v.next_service)}` : ''), warn: kmWarn };
    }
    return { value: fmtDate(v.next_service), note: dateNote + (hasKm ? ` · o a los ${kmVal}` : ''), warn: dateWarn };
  })();
  // E4: servicio EN ÉPOCA (≤7 días / ≤500 km) o vencido → botón de
  // confirmación; mientras no se confirme, el cron sigue recordando.
  const svcDue = !!v && ((serviceDays != null && serviceDays <= 7) || (kmLeft != null && kmLeft <= 500));
  const vName = v ? ([v.brand, v.model].filter(Boolean).join(' ') || 'tu vehículo') : '';

  // Tiles de datos del vehículo activo
  const tiles = v ? [
    {
      k: 'km', label: 'Kilometraje',
      value: fmtKm(v.km) || '—',
      note: v.km == null ? 'Agrégalo al editar' : 'Última lectura',
    },
    {
      k: 'service', label: 'Próximo servicio',
      value: svc.value, note: svc.note, warn: svc.warn,
    },
    {
      k: 'oil', label: 'Aceite',
      value: v.oil_type || '—',
      note: v.oil_type ? 'Tipo que utiliza' : 'Agrégalo al editar',
    },
    {
      k: 'fuel', label: 'Combustible',
      value: st
        ? `${st.fuel_count} carga${st.fuel_count === 1 ? '' : 's'} · ${(+st.total_gallons).toLocaleString('en-US')} gal`
        : '—',
      note: st
        ? `Q${(+st.total_amount).toLocaleString('en-US')} en total${st.km_per_gal ? ` · ${st.km_per_gal} km/gal` : ''}`
        : 'Tus cargas se asignan al calificar la compra',
    },
  ] : [];

  return (
    <div style={{ minHeight: '100vh', padding: '18px 18px 120px', boxSizing: 'border-box' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2, color: BRAND_ORANGE, textTransform: 'uppercase' }}>Mis vehículos</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: ink, marginTop: 2 }}>
            {vehicles.length === 0 ? 'Agrega el primero' : `${vehicles.length} registrado${vehicles.length === 1 ? '' : 's'}`}
          </div>
        </div>
        <button onClick={() => setForm({ vehicle: null })} style={{
          padding: '10px 16px', borderRadius: 13, border: 'none', cursor: 'pointer',
          background: dark ? '#fff' : '#0D0D0D', color: dark ? '#0D0D0D' : '#fff',
          fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 800,
        }}>+ Agregar</button>
      </div>

      {vehicles.length === 0 ? (
        /* ── Estado vacío ── */
        <div style={{ textAlign: 'center', paddingTop: 40 }}>
          <div style={{ opacity: .45, display: 'flex', justifyContent: 'center' }}>
            <VehicleArt type="liviano" color="#9E9E9E" width={230} />
          </div>
          <div style={{ fontSize: 14, color: sub, lineHeight: 1.6, maxWidth: 280, margin: '14px auto 20px' }}>
            Registra tu vehículo para personalizarlo, llevar su kilometraje y sus servicios.
          </div>
          <button onClick={() => setForm({ vehicle: null })} style={{
            padding: '14px 26px', borderRadius: 15, border: 'none', cursor: 'pointer',
            background: BRAND_ORANGE, color: '#fff', fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 800,
          }}>Agregar mi primer vehículo</button>
        </div>
      ) : (
        <>
          {/* ── Carrusel héroe con swipe ── */}
          <div {...swipe.handlers} style={{ ...swipe.viewportStyle, borderRadius: 22, margin: '10px 0 4px' }}>
            <div ref={swipe.trackRef} style={swipe.trackStyle}>
              {vehicles.map((veh, i) => {
                const t = typeInfo(veh.vtype);
                const col = veh.color || '#9E9E9E';
                const bodyKey = bodyFor(veh.vtype, veh.model, veh.brand);
                return (
                  <div key={veh.id || i} style={swipe.slideStyle(i)}>
                    <div style={{
                      position: 'relative', borderRadius: 22, padding: '18px 16px 12px',
                      // E3c: en claro, MISMO fondo que los cuadros de información
                      // (la tarjeta blanca sobre fondo blanco cortaba el resplandor
                      // del color contra un borde invisible — referencia del dueño)
                      background: dark ? 'rgba(255,255,255,.06)' : '#F5F5F7',
                      border: dark ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(0,0,0,.05)',
                      overflow: 'hidden',
                    }}>
                      {/* resplandor del color del vehículo */}
                      <div aria-hidden style={{
                        position: 'absolute', top: -40, left: '50%', width: 300, height: 220,
                        marginLeft: -150, borderRadius: '50%',
                        background: `radial-gradient(circle, ${col}33 0%, transparent 65%)`,
                      }} />
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 800, letterSpacing: 1, color: sub, textTransform: 'uppercase' }}>
                          <t.Icon size={15} /> {t.label}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          {i === 0 && veh.last_fuel_at && (
                            <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1, color: '#fff', background: BRAND_ORANGE, borderRadius: 20, padding: '4px 10px' }}>PRINCIPAL</span>
                          )}
                          {/* E3a: personalización (color/marca/modelo) — pincel a la
                              DERECHA de la insignia PRINCIPAL (pedido del dueño).
                              E3c.1: 26px + margen negativo — a 32px engordaba la fila
                              y el título del tipo bajaba respecto al borde de la
                              tarjeta (referencia POR CORREGIR del dueño) */}
                          <button aria-label="Personalizar" onClick={() => setForm({ vehicle: veh, mode: 'look' })} style={{
                            width: 26, height: 26, borderRadius: 9, border: 'none', cursor: 'pointer',
                            margin: '-3px 0', background: dark ? 'rgba(255,255,255,.12)' : '#0D0D0D', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9.06 11.9 17.13 3.84a2.85 2.85 0 1 1 4.03 4.03L13.1 15.93" />
                              <path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02Z" />
                            </svg>
                          </button>
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                        <VehicleArt type={veh.vtype} body={bodyKey} color={col} width={350}
                          style={{ maxWidth: '100%', height: 'auto' }} />
                        {has3D(bodyKey) && (
                          <button onClick={() => setShow3D({ vehicle: veh, bodyKey })} style={{
                            position: 'absolute', right: 2, bottom: 6, padding: '7px 13px',
                            borderRadius: 20, border: 'none', cursor: 'pointer',
                            background: dark ? 'rgba(255,255,255,.12)' : '#0D0D0D',
                            color: '#fff', fontFamily: "'DM Sans'", fontSize: 11.5, fontWeight: 900,
                            letterSpacing: 1,
                          }}>3D ↻</button>
                        )}
                      </div>
                      <div style={{ textAlign: 'center', position: 'relative', marginTop: -4 }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: ink }}>
                          {[veh.brand, veh.model].filter(Boolean).join(' ') || 'Mi vehículo'}
                          {veh.version ? <span style={{ color: sub, fontWeight: 700 }}> · {veh.version}</span> : null}
                        </div>
                        <div style={{
                          display: 'inline-block', marginTop: 7, padding: '5px 14px', borderRadius: 9,
                          background: dark ? 'rgba(255,255,255,.1)' : '#0D0D0D', color: '#fff',
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, letterSpacing: 1.5,
                        }}>{fmtPlate(veh.plate)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* puntos del carrusel */}
          {vehicles.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, margin: '10px 0 2px' }}>
              {vehicles.map((_, i) => (
                <button key={i} onClick={() => swipe.go(i)} aria-label={`Vehículo ${i + 1}`} style={{
                  width: i === idx ? 20 : 7, height: 7, borderRadius: 4, border: 'none', padding: 0, cursor: 'pointer',
                  background: i === idx ? BRAND_ORANGE : (dark ? 'rgba(255,255,255,.25)' : '#D5D5D8'),
                  transition: 'width .25s ease',
                }} />
              ))}
            </div>
          )}

          {/* ── Datos relevantes ── */}
          <div ref={tilesRef} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
            {tiles.map(tl => (
              <div key={tl.k} style={{ background: cardBg, borderRadius: 17, padding: '13px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: sub }}>{tl.label}</div>
                <div style={{
                  fontSize: tl.k === 'km' ? 19 : 15.5, fontWeight: 800, marginTop: 5,
                  color: tl.warn ? '#E65100' : ink,
                  fontFamily: tl.k === 'km' ? "'JetBrains Mono', monospace" : "'DM Sans'",
                }}>{tl.value}</div>
                <div style={{ fontSize: 11, color: tl.warn ? '#E65100' : sub, fontWeight: 600, marginTop: 3 }}>{tl.note}</div>
              </div>
            ))}
          </div>

          {/* E4: ¿ya hiciste el servicio? — mismo destino que el push */}
          {svcDue && (
            <button onClick={() => setConfirm({ vehicle: v })} style={{
              width: '100%', marginTop: 10, padding: '13px 14px', borderRadius: 15, cursor: 'pointer',
              border: '1.5px solid #E65100', background: dark ? 'rgba(230,81,0,.14)' : '#FFF3E9',
              color: '#E65100', fontFamily: "'DM Sans'", textAlign: 'left',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            }}>
              <span>
                <div style={{ fontSize: 13.5, fontWeight: 800 }}>¿Ya hiciste el servicio de {vName}?</div>
                <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2, opacity: .85 }}>Confírmalo y anota el próximo — así dejamos de recordártelo</div>
              </span>
              <span style={{ fontSize: 20, fontWeight: 800, flexShrink: 0 }}>›</span>
            </button>
          )}

          {/* ── Acciones del vehículo activo ── */}
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button onClick={() => setForm({ vehicle: v, mode: 'data' })} style={{
              flex: 1, padding: 14, borderRadius: 15, border: 'none', cursor: 'pointer',
              background: hp.vehicle, color: '#fff', fontFamily: "'DM Sans'", fontSize: 13.5, fontWeight: 800,
            }}>Datos y ajustes</button>
          </div>

          {/* E3a: rendimiento, consumo por mes e historial de cargas con
              editor de reasignación (cargas mal atribuidas sin conexión) */}
          <div ref={fuelRef}>
            <VehicleFuel
              dark={dark} fire={fire} vehicles={vehicles} vehicle={v}
              stats={stats} onStatsDirty={() => setStatsK(k => k + 1)}
            />
          </div>

          {/* Descargo de marcas (F6): las marcas/modelos identifican el
              vehículo del socio; las ilustraciones son propias, sin logos */}
          <div style={{ fontSize: 10.5, color: sub, textAlign: 'center', lineHeight: 1.6, maxWidth: 330, margin: '18px auto 0' }}>
            Las marcas y modelos se usan únicamente para identificar tu vehículo y no implican
            afiliación con los fabricantes. Las ilustraciones son representaciones propias, sin logotipos.
          </div>
        </>
      )}

      {/* E1.26: sin botón "Volver al inicio" (pedido del dueño) — la
          vista es pestaña de la barra inferior y el regreso vive ahí */}

      {/* Visor 3D (chunk perezoso de three.js) */}
      {show3D && (
        <Suspense fallback={null}>
          <Vehicle3DSheet
            vehicle={show3D.vehicle}
            bodyKey={show3D.bodyKey}
            dark={dark}
            onClose={() => setShow3D(null)}
          />
        </Suspense>
      )}

      {/* E4: confirmación de servicio (push / inbox / botón) */}
      {confirm && (
        <ServiceConfirmSheet
          vehicle={confirm.vehicle}
          dark={dark}
          fire={fire}
          onClose={() => setConfirm(null)}
          onSaved={(saved) => { setConfirm(null); onSaved(saved); }}
        />
      )}

      {/* Sheet de alta/edición */}
      {form && (
        <VehicleForm
          vehicle={form.vehicle}
          mode={form.mode || 'full'}
          dark={dark}
          fire={fire}
          onClose={() => setForm(null)}
          onSaved={onSaved}
          onDeleted={onDeleted}
        />
      )}
    </div>
  );
}
