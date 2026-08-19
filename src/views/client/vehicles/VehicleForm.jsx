// src/views/client/vehicles/VehicleForm.jsx
// F6 Etapa 1 — Sheet de ALTA/EDICIÓN de vehículo con vista previa en
// VIVO de la ilustración (cambiar tipo o color repinta al instante).
// Catálogo híbrido D23: marca/modelo con sugerencias (datalist) +
// entrada libre. La placa usa plateMask (BD guarda crudo P123ABC).
// Guarda por save_my_vehicle (sesión de miembro, whitelist server).
import { useState, useMemo } from 'react';
import { BRAND_ORANGE } from '../../../constants/styles';
import { VEHICLE_TYPES } from '../../../components/ui/VehicleIcons';
import VehicleArt, { VEHICLE_COLORS } from '../../../components/ui/VehicleArt';
import { OIL_TYPES, brandsFor, modelsFor, bodyFor } from '../../../constants/vehicleCatalog';
import { plateMask } from '../../../lib/inputMasks';
import { saveMyVehicle } from '../../../services/vehicleService';
import useBackLayer from '../../../hooks/useBackLayer';

export default function VehicleForm({ vehicle, dark, fire, onClose, onSaved }) {
  const editing = !!vehicle?.id;
  const [f, setF] = useState(() => ({
    vtype: vehicle?.vtype || 'liviano',
    brand: vehicle?.brand || '',
    model: vehicle?.model || '',
    version: vehicle?.version || '',
    color: vehicle?.color || VEHICLE_COLORS[5],
    plate: plateMask.clean(vehicle?.plate || ''),
    km: vehicle?.km != null ? String(vehicle.km) : '',
    oil_type: vehicle?.oil_type || '',
    next_service: vehicle?.next_service || '',
    next_service_km: vehicle?.next_service_km != null ? String(vehicle.next_service_km) : '',
  }));
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  useBackLayer(true, onClose);

  // ── superficies según modo (FORMATO GENERAL) ──
  const bg = dark ? '#141417' : '#fff';
  const ink = dark ? '#fff' : '#0D0D0D';
  const sub = dark ? 'rgba(255,255,255,.5)' : '#9E9E9E';
  const fieldBg = dark ? 'rgba(255,255,255,.08)' : '#F5F5F7';
  const input = {
    width: '100%', boxSizing: 'border-box', padding: '13px 14px', borderRadius: 13,
    border: 'none', background: fieldBg, color: ink,
    fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600, outline: 'none',
  };
  const lbl = { display: 'block', fontSize: 11, fontWeight: 800, color: sub, textTransform: 'uppercase', letterSpacing: 1, margin: '16px 0 7px' };
  const chip = (on) => ({
    padding: '9px 13px', borderRadius: 12, border: 'none', cursor: 'pointer',
    background: on ? (dark ? '#fff' : '#0D0D0D') : fieldBg,
    color: on ? (dark ? '#0D0D0D' : '#fff') : ink,
    fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 700,
  });

  // Sugerencias FILTRADAS por el tipo elegido (pedido del dueño):
  // quien eligió Motocicleta no ve marcas/modelos de carros — la
  // escritura libre sigue permitida (catálogo híbrido D23).
  const brandSugg = useMemo(() => brandsFor(f.vtype), [f.vtype]);
  const modelSugg = useMemo(() => modelsFor(f.brand, f.vtype), [f.brand, f.vtype]);

  const save = async () => {
    if (saving) return;
    const rawPlate = plateMask.clean(f.plate);
    if (rawPlate && rawPlate.length !== 7) { fire('La placa debe estar completa (L 123 ABC) o vacía', 'warn'); return; }
    setSaving(true);
    const { data, error } = await saveMyVehicle({
      id: vehicle?.id || null,
      vtype: f.vtype,
      brand: f.brand.trim(), model: f.model.trim(), version: f.version.trim(),
      color: f.color, plate: rawPlate,
      km: f.km === '' ? null : parseInt(f.km, 10),
      oil_type: f.oil_type.trim(),
      next_service: f.next_service || null,
      next_service_km: f.next_service_km === '' ? null : parseInt(f.next_service_km, 10),
    });
    setSaving(false);
    if (error) { fire('Error: ' + (error.message || 'no se pudo guardar'), 'error'); return; }
    fire(editing ? 'Vehículo actualizado' : 'Vehículo agregado', 'success');
    onSaved(data.vehicle);
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.55)',
      backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 480, maxHeight: '92vh', overflowY: 'auto',
        background: bg, borderRadius: '24px 24px 0 0', padding: '18px 20px 28px',
        boxSizing: 'border-box', animation: 'slideUp .28s ease-out',
      }}>
        <div style={{ width: 44, height: 5, borderRadius: 3, background: dark ? 'rgba(255,255,255,.2)' : '#E0E0E0', margin: '0 auto 14px' }} />
        <div style={{ fontSize: 19, fontWeight: 900, color: ink }}>
          {editing ? 'Editar vehículo' : 'Agregar vehículo'}
        </div>

        {/* Vista previa en vivo: tipo, MODELO (silueta) y color repintan
            al instante. STICKY (pedido del dueño 15-ago): queda FIJA
            arriba mientras se escribe/elige — con el teclado abierto y
            el sheet scrolleado, el diseño sigue siempre a la vista. */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 3,
          margin: '14px -20px 2px', padding: '6px 20px 4px',
          background: bg,
          boxShadow: dark ? '0 10px 14px -8px rgba(0,0,0,.6)' : '0 10px 14px -8px rgba(0,0,0,.14)',
        }}>
          <div style={{
            borderRadius: 18, padding: '8px 0 2px',
            background: dark ? 'rgba(255,255,255,.05)' : '#FAFAFB',
            display: 'flex', justifyContent: 'center',
          }}>
            <VehicleArt type={f.vtype} body={bodyFor(f.vtype, f.model, f.brand)} color={f.color} width={190} />
          </div>
        </div>

        {/* Tipo */}
        <label style={lbl}>Tipo de vehículo</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {VEHICLE_TYPES.map(t => (
            <button key={t.k} onClick={() => set('vtype', t.k)} style={{ ...chip(f.vtype === t.k), display: 'flex', alignItems: 'center', gap: 6 }}>
              <t.Icon size={16} /> {t.label}
            </button>
          ))}
        </div>

        {/* Color */}
        <label style={lbl}>Color</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
          {VEHICLE_COLORS.map(c => (
            <button key={c} onClick={() => set('color', c)} aria-label={`Color ${c}`} style={{
              width: 34, height: 34, borderRadius: 12, background: c, cursor: 'pointer',
              border: f.color === c ? `3px solid ${BRAND_ORANGE}` : `1px solid ${dark ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.12)'}`,
              boxSizing: 'border-box',
            }} />
          ))}
        </div>

        {/* Marca / modelo / versión (catálogo híbrido D23) */}
        <label style={lbl}>Marca</label>
        <input list="pp-veh-brands" value={f.brand} onChange={e => set('brand', e.target.value)}
          placeholder={brandSugg.slice(0, 3).join(', ') + '...'} style={input} />
        <datalist id="pp-veh-brands">
          {brandSugg.map(b => <option key={b} value={b} />)}
        </datalist>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1.4 }}>
            <label style={lbl}>Modelo / línea</label>
            <input list="pp-veh-models" value={f.model} onChange={e => set('model', e.target.value)}
              placeholder={modelSugg[0] || 'Corolla'} style={input} />
            <datalist id="pp-veh-models">
              {modelSugg.map(m => <option key={m} value={m} />)}
            </datalist>
          </div>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Versión / año</label>
            <input value={f.version} onChange={e => set('version', e.target.value)}
              placeholder="2022" style={input} />
          </div>
        </div>

        {/* Placa + kilometraje */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Placa</label>
            <input value={plateMask.format(f.plate)}
              onChange={e => set('plate', plateMask.clean(e.target.value))}
              placeholder="P 123 ABC" autoCapitalize="characters"
              style={{ ...input, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Kilometraje</label>
            <input value={f.km} inputMode="numeric"
              onChange={e => set('km', e.target.value.replace(/[^0-9]/g, '').slice(0, 7))}
              placeholder="45000" style={{ ...input, fontFamily: "'JetBrains Mono', monospace" }} />
          </div>
        </div>

        {/* Aceite */}
        <label style={lbl}>Tipo de aceite</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 8 }}>
          {OIL_TYPES.map(o => (
            <button key={o} onClick={() => set('oil_type', f.oil_type === o ? '' : o)} style={chip(f.oil_type === o)}>{o}</button>
          ))}
        </div>
        <input value={f.oil_type} onChange={e => set('oil_type', e.target.value)}
          placeholder="O escribe el tuyo (ej. 15W-40 sintético)" style={input} />

        {/* Próximo servicio — por FECHA o por KILOMETRAJE (o ambos) */}
        <label style={lbl}>Próximo servicio</label>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: sub, marginBottom: 5 }}>Por fecha</div>
            <input type="date" value={f.next_service}
              onChange={e => set('next_service', e.target.value)}
              style={{ ...input, colorScheme: dark ? 'dark' : 'light' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: sub, marginBottom: 5 }}>O al llegar a (km)</div>
            <input value={f.next_service_km} inputMode="numeric"
              onChange={e => set('next_service_km', e.target.value.replace(/[^0-9]/g, '').slice(0, 7))}
              placeholder="50000" style={{ ...input, fontFamily: "'JetBrains Mono', monospace" }} />
          </div>
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button onClick={onClose} disabled={saving} style={{
            flex: 1, padding: 15, borderRadius: 15, border: 'none', cursor: 'pointer',
            background: fieldBg, color: ink, fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 700,
          }}>Cancelar</button>
          <button onClick={save} disabled={saving} style={{
            flex: 1.6, padding: 15, borderRadius: 15, border: 'none', cursor: 'pointer',
            background: saving ? (dark ? '#3A3A3A' : '#BDBDBD') : BRAND_ORANGE, color: '#fff',
            fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 800,
          }}>{saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Agregar vehículo'}</button>
        </div>
      </div>
    </div>
  );
}
