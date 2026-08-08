// src/views/client/menu/VehiclesSection.jsx
// Vehículos de Mi Cuenta (extraído de MenuAccount el 8-ago-2026 para
// respetar el límite de 500 líneas): lista, alta con tipo + placa y
// baja con confirmación en bottom sheet. Alta y baja persisten vía
// update_my_profile (plate se deriva server-side del primer vehículo).
import { useState, useEffect } from 'react';
import { sb } from '../../../lib/supabaseClient';
import { inputFlat, bento, BRAND_ORANGE } from '../../../constants/styles';
import { Plus, XMark } from '../../../components/ui/Icons';
import { getMemberToken } from '../../../services/sessionTokens';
import { VEHICLE_TYPES } from '../../../components/ui/VehicleIcons';
import { plateMask } from '../../../lib/inputMasks';
import useBackLayer from '../../../hooks/useBackLayer';

const parseVehicles = (v) => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === 'object') return Object.values(v);
  try { return JSON.parse(v); } catch { return []; }
};
const typeInfo = k => VEHICLE_TYPES.find(t => t.k === k) || VEHICLE_TYPES[0];

export default function VehiclesSection({ ctx, TH }) {
  const { me, setMe, fire, sbConnected } = ctx;

  const [vehicles, setVehicles] = useState(() => parseVehicles(me?.vehicles));
  useEffect(() => {
    const parsed = parseVehicles(me?.vehicles);
    if (parsed.length > 0) setVehicles(parsed);
  }, [me?.vehicles]);
  const [addingV, setAddingV]     = useState(false);
  const [newVType, setNewVType]   = useState('liviano');
  const [newVPlate, setNewVPlate] = useState('');

  const field = { ...inputFlat, background: TH.isDark ? 'rgba(255,255,255,.08)' : '#fff', color: TH.header };

  // persistVehicles DEVUELVE el error de la BD (bug del 27-jul: antes
  // se tragaba el fallo); solo refleja en `me` si guardó.
  const persistVehicles = async (updated) => {
    if (sb && sbConnected) {
      const { data, error } = await sb.rpc('update_my_profile', {
        p_session_token: getMemberToken()?.token ?? null,
        p_changes: { vehicles: updated },
      });
      const err = error || (data?.error ? { message: data.error } : null);
      if (err) { console.error('[Vehicles]', err); return err; }
    }
    setMe(p => ({ ...p, vehicles: updated, plate: updated[0]?.plate || '' }));
    return null;
  };

  const addVehicle = async () => {
    if (!newVPlate.trim()) { fire('Ingresa la placa del vehículo', 'error'); return; }
    if (!plateMask.complete(newVPlate)) { fire('Placa incompleta — formato: P 123 ABC', 'error'); return; }
    const prev = vehicles;
    const updated = [...prev, { type: newVType, plate: newVPlate }];
    setVehicles(updated); setAddingV(false); setNewVPlate(''); setNewVType('liviano');
    const err = await persistVehicles(updated);
    if (err) { setVehicles(prev); fire('No se pudo guardar el vehículo: ' + err.message, 'error'); return; }
    fire('Vehículo agregado', 'success');
  };

  // Eliminar pide CONFIRMACIÓN (pedido del dueño 27-jul)
  const [delVehicle, setDelVehicle] = useState(null); // { v, i } | null
  const [delClosing, setDelClosing] = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const closeDelSheet = () => {
    setDelClosing(true);
    setTimeout(() => { setDelVehicle(null); setDelClosing(false); }, 200);
  };
  useBackLayer(!!delVehicle, closeDelSheet);

  const confirmRemoveVehicle = async () => {
    if (!delVehicle || deleting) return;
    setDeleting(true);
    const { i } = delVehicle;
    const prev = vehicles;
    const updated = prev.filter((_, j) => j !== i);
    setVehicles(updated);
    const err = await persistVehicles(updated);
    setDeleting(false);
    closeDelSheet();
    if (err) { setVehicles(prev); fire('No se pudo eliminar el vehículo: ' + err.message, 'error'); return; }
    fire('Vehículo eliminado', 'success');
  };

  return (
    <>
      <div style={{ fontSize: 13, fontWeight: 800, color: TH.header, marginBottom: 10 }}>Tus vehículos</div>
      {vehicles.map((v, i) => {
        const t = typeInfo(v.type);
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: TH.surface, borderRadius: 16, padding: '12px 14px', marginBottom: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: TH.iconBox, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <t.Icon size={22} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: TH.header }}>{t.label}</div>
              <div style={{ fontSize: 12, color: TH.sub, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{plateMask.format(plateMask.clean(v.plate || '')) || v.plate}</div>
            </div>
            <button onClick={() => setDelVehicle({ v, i })} aria-label="Quitar vehículo"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: TH.sub, padding: 4, display: 'flex' }}><XMark /></button>
          </div>
        );
      })}

      {addingV ? (
        <div style={{ background: TH.surface, borderRadius: 20, padding: 16, marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: TH.header, marginBottom: 12 }}>Tipo de vehículo</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            {VEHICLE_TYPES.map(t => {
              const on = newVType === t.k;
              return (
                <button key={t.k} onClick={() => setNewVType(t.k)} style={{
                  padding: '10px 8px', borderRadius: 12, border: 'none',
                  background: on ? (TH.isDark ? '#fff' : '#0D0D0D') : TH.inset,
                  color: on ? (TH.isDark ? '#0D0D0D' : '#fff') : TH.sub,
                  cursor: 'pointer', fontFamily: "'DM Sans'", fontWeight: 700, fontSize: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <t.Icon size={18} />{t.label}
                </button>
              );
            })}
          </div>
          <input placeholder="Placa (ej: P 123 ABC)" value={plateMask.format(newVPlate)} autoCapitalize="characters"
            onChange={e => setNewVPlate(plateMask.clean(e.target.value))}
            style={{ ...field, paddingLeft: 16, marginBottom: 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, letterSpacing: 2 }} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setAddingV(false); setNewVPlate(''); }}
              style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: TH.inset, color: TH.sub, fontFamily: "'DM Sans'", fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
            <button onClick={addVehicle}
              style={{ flex: 2, padding: 12, borderRadius: 12, border: 'none', background: BRAND_ORANGE, color: '#fff', fontFamily: "'DM Sans'", fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>Agregar</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAddingV(true)} style={{ width: '100%', padding: 14, borderRadius: 16, border: 'none', background: TH.surface, color: TH.header, fontFamily: "'DM Sans'", fontWeight: 800, fontSize: 14, cursor: 'pointer', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ color: BRAND_ORANGE, display: 'flex' }}><Plus /></span>
          Agregar vehículo
        </button>
      )}

      {/* ── Confirmación de eliminación (bottom sheet) ── */}
      {delVehicle && (() => {
        const t = typeInfo(delVehicle.v.type);
        const plateTxt = plateMask.format(plateMask.clean(delVehicle.v.plate || '')) || delVehicle.v.plate;
        return (
          <div onClick={closeDelSheet}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: delClosing ? 'ppFadeOut .2s ease forwards' : 'fadeIn .2s ease' }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background: TH.isDark ? '#16161A' : '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '24px 20px 36px', animation: delClosing ? 'slideDownOut .22s ease forwards' : 'slideUp .25s ease' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: TH.header, marginBottom: 4 }}>¿Eliminar este vehículo?</div>
              <div style={{ fontSize: 13, color: TH.sub, lineHeight: 1.5, marginBottom: 16 }}>
                Se eliminará de tu cuenta junto con todos sus datos relacionados. Esta acción no se puede deshacer.
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: TH.isDark ? 'rgba(255,255,255,.07)' : '#F5F5F7', borderRadius: 16, padding: '12px 14px', marginBottom: 18 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: bento.red, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <t.Icon size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: TH.header }}>{t.label}</div>
                  <div style={{ fontSize: 12, color: TH.sub, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{plateTxt}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={closeDelSheet}
                  style={{ flex: 1, padding: 14, borderRadius: 14, border: 'none', background: TH.isDark ? 'rgba(255,255,255,.08)' : '#F5F5F7', color: TH.sub, fontFamily: "'DM Sans'", fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                  Cancelar
                </button>
                <button onClick={confirmRemoveVehicle} disabled={deleting}
                  style={{ flex: 1, padding: 14, borderRadius: 14, border: 'none', background: bento.red, color: '#fff', fontFamily: "'DM Sans'", fontWeight: 800, cursor: 'pointer', fontSize: 14, opacity: deleting ? .7 : 1 }}>
                  {deleting ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
