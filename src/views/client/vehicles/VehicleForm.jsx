// src/views/client/vehicles/VehicleForm.jsx
// F6 Etapa 1 — Sheet de ALTA/EDICIÓN de vehículo con vista previa en
// VIVO de la ilustración (cambiar tipo o color repinta al instante).
// Catálogo híbrido D23: marca/modelo con sugerencias + entrada libre.
// E1.25 (2-sep, pedido del dueño): cambiar de TIPO limpia marca y
// modelo; la flecha de cada campo abre un desplegable PROPIO con el
// catálogo completo del tipo (el datalist nativo filtraba por el texto
// ya escrito y no dejaba re-elegir) — con un modelo exacto elegido se
// muestra la lista COMPLETA; sin marca, el desplegable de modelo lista
// "modelo · marca" y elegir uno llena ambos campos.
// La placa usa plateMask (BD guarda crudo P123ABC).
// Guarda por save_my_vehicle (sesión de miembro, whitelist server).
import { useState, useMemo } from 'react';
import { BRAND_ORANGE } from '../../../constants/styles';
import { VEHICLE_TYPES } from '../../../components/ui/VehicleIcons';
import VehicleArt, { VEHICLE_COLORS } from '../../../components/ui/VehicleArt';
import { OIL_TYPES, brandsFor, modelsFor, bodyFor } from '../../../constants/vehicleCatalog';
import { plateMask } from '../../../lib/inputMasks';
import { saveMyVehicle } from '../../../services/vehicleService';
import useBackLayer from '../../../hooks/useBackLayer';

// mode (E1.27): 'full' = alta completa · 'look' = solo personalización
// (tipo, color, marca, modelo, versión — con vista previa) · 'data' =
// solo datos puntuales (placa, km, aceite, próximo servicio).
export default function VehicleForm({ vehicle, dark, fire, onClose, onSaved, mode = 'full' }) {
  const editing = !!vehicle?.id;
  const showLook = mode !== 'data';
  const showData = mode !== 'look';
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
    tank_gal: vehicle?.tank_gal != null ? String(vehicle.tank_gal) : '',
    fuel_pref: vehicle?.fuel_pref || '',
  }));
  const [saving, setSaving] = useState(false);
  const [openSugg, setOpenSugg] = useState(null); // 'brand' | 'model' | null
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

  // Cambiar de TIPO limpia marca y modelo elegidos (E1.25): las
  // sugerencias del tipo nuevo ya no corresponden a lo escrito.
  const changeType = (k) => {
    if (k === f.vtype) return;
    setF(p => ({ ...p, vtype: k, brand: '', model: '' }));
    setOpenSugg(null);
  };

  // Opciones del desplegable: si el texto actual es EXACTAMENTE una
  // opción (ya eligió), se muestra la lista COMPLETA para re-elegir;
  // si está escribiendo, se filtra por lo escrito; sin coincidencias,
  // lista completa (la escritura libre no se bloquea).
  const filterOpts = (all, text) => {
    const t = text.trim().toLowerCase();
    if (!t || all.some(o => o.v.toLowerCase() === t)) return all;
    const fil = all.filter(o => o.v.toLowerCase().includes(t));
    return fil.length ? fil : all;
  };
  // E1.26: opciones SIEMPRE en orden alfabético (pedido del dueño)
  const abc = (a, b) => a.v.localeCompare(b.v, 'es') || (a.brand || '').localeCompare(b.brand || '', 'es');
  const brandOpts = useMemo(
    () => filterOpts(brandSugg.map(b => ({ v: b })).sort(abc), f.brand),
    [brandSugg, f.brand]);
  const modelOpts = useMemo(() => {
    let all;
    if (f.brand.trim() && modelSugg.length) {
      all = modelSugg.map(m => ({ v: m }));
    } else {
      // sin marca: catálogo completo del tipo — elegir llena AMBOS campos
      all = [];
      for (const b of brandsFor(f.vtype)) {
        for (const m of modelsFor(b, f.vtype)) all.push({ v: m, brand: b });
      }
    }
    return filterOpts(all.sort(abc), f.model);
  }, [f.brand, f.vtype, f.model, modelSugg]);

  const pickBrand = (o) => {
    setF(p => ({
      ...p, brand: o.v,
      // el modelo elegido se conserva solo si existe en la marca nueva
      model: modelsFor(o.v, p.vtype).some(m => m.toLowerCase() === p.model.trim().toLowerCase()) ? p.model : '',
    }));
    setOpenSugg(null);
  };
  const pickModel = (o) => {
    setF(p => ({ ...p, model: o.v, brand: o.brand || p.brand }));
    setOpenSugg(null);
  };

  // ── desplegable propio (campo + flecha) ──
  const arrowBtn = (open) => ({
    position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
    width: 34, height: 34, borderRadius: 10, border: 'none', cursor: 'pointer',
    background: 'transparent', color: open ? BRAND_ORANGE : sub,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
  });
  const panelSt = {
    position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 6,
    maxHeight: 216, overflowY: 'auto', borderRadius: 14, padding: 6, boxSizing: 'border-box',
    background: dark ? '#232327' : '#fff',
    border: `1px solid ${dark ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.08)'}`,
    boxShadow: '0 14px 30px rgba(0,0,0,.28)',
  };
  const rowSt = (on) => ({
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 10, padding: '11px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
    background: on ? (dark ? 'rgba(255,255,255,.09)' : '#F5F5F7') : 'transparent',
    color: ink, fontFamily: "'DM Sans'", fontSize: 14, fontWeight: on ? 800 : 600, textAlign: 'left',
  });
  const Chevron = ({ open }) => (
    <svg width="16" height="16" viewBox="0 0 16 16" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .18s' }}>
      <path d="M3.5 6 8 10.5 12.5 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  const SuggPanel = ({ opts, current, onPick, empty }) => (
    <div style={panelSt}>
      {opts.length === 0 && (
        <div style={{ padding: '11px 12px', color: sub, fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 600 }}>{empty}</div>
      )}
      {opts.map(o => (
        <button key={(o.brand || '') + o.v} onClick={() => onPick(o)}
          style={rowSt(o.v.toLowerCase() === current.trim().toLowerCase())}>
          <span>{o.v}</span>
          {o.brand && <span style={{ color: sub, fontSize: 11.5, fontWeight: 700 }}>{o.brand}</span>}
        </button>
      ))}
    </div>
  );

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
      tank_gal: f.tank_gal === '' ? null : parseFloat(f.tank_gal),
      fuel_pref: f.fuel_pref || null,
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
          {mode === 'look' ? 'Personalizar vehículo'
            : mode === 'data' ? 'Datos y ajustes'
            : editing ? 'Editar vehículo' : 'Agregar vehículo'}
        </div>

        {showLook && (<>
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
        </>)}

        {showLook && (<>
  {/* Tipo */}
          <label style={lbl}>Tipo de vehículo</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {VEHICLE_TYPES.map(t => (
              <button key={t.k} onClick={() => changeType(t.k)} style={{ ...chip(f.vtype === t.k), display: 'flex', alignItems: 'center', gap: 6 }}>
                <t.Icon size={16} /> {t.label}
              </button>
            ))}
          </div>

          {/* Color */}
          <label style={lbl}>Color</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, alignItems: 'center' }}>
            {VEHICLE_COLORS.map(c => (
              <button key={c} onClick={() => set('color', c)} aria-label={`Color ${c}`} style={{
                width: 34, height: 34, borderRadius: 12, background: c, cursor: 'pointer',
                border: f.color === c ? `3px solid ${BRAND_ORANGE}` : `1px solid ${dark ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.12)'}`,
                boxSizing: 'border-box',
              }} />
            ))}
            {/* E3c (pedido del dueño): color PERSONALIZADO — selector del
                sistema; si el color actual no es de los 12, esta ficha lo
                muestra seleccionado */}
            {(() => {
              const isCustom = !VEHICLE_COLORS.some(c => c.toLowerCase() === (f.color || '').toLowerCase());
              return (
                <label aria-label="Color personalizado" style={{
                  width: 34, height: 34, borderRadius: 12, cursor: 'pointer', boxSizing: 'border-box',
                  border: isCustom ? `3px solid ${BRAND_ORANGE}` : `1px solid ${dark ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.12)'}`,
                  background: isCustom ? f.color
                    : 'conic-gradient(#E53935, #FB8C00, #FDD835, #43A047, #00ACC1, #1E88E5, #8E24AA, #E53935)',
                  position: 'relative', overflow: 'hidden', display: 'inline-block',
                }}>
                  <input type="color" value={f.color} onChange={e => set('color', e.target.value)}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', border: 'none', padding: 0 }} />
                </label>
              );
            })()}
          </div>
          <div style={{ fontSize: 10.5, color: sub, fontWeight: 600, marginTop: 6 }}>
            La ficha multicolor abre el selector para elegir cualquier tono.
          </div>

          {/* Marca / modelo / versión — catálogo híbrido D23 con desplegable
              propio (E1.25): la flecha abre la lista completa del tipo y
              escribir filtra; la entrada libre sigue permitida. */}
          {openSugg && <div onClick={() => setOpenSugg(null)} style={{ position: 'fixed', inset: 0, zIndex: 5 }} />}
          <label style={lbl}>Marca</label>
          <div style={{ position: 'relative' }}>
            <input value={f.brand} onChange={e => set('brand', e.target.value)}
              onFocus={() => setOpenSugg('brand')}
              placeholder={brandSugg.slice(0, 3).join(', ') + '...'}
              style={{ ...input, paddingRight: 44 }} />
            <button aria-label="Ver marcas" onClick={() => setOpenSugg(openSugg === 'brand' ? null : 'brand')}
              style={arrowBtn(openSugg === 'brand')}><Chevron open={openSugg === 'brand'} /></button>
            {openSugg === 'brand' && (
              <SuggPanel opts={brandOpts} current={f.brand} onPick={pickBrand}
                empty="Sin sugerencias — escribe la marca" />
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1.4 }}>
              <label style={lbl}>Modelo / línea</label>
              <div style={{ position: 'relative' }}>
                <input value={f.model} onChange={e => set('model', e.target.value)}
                  onFocus={() => setOpenSugg('model')}
                  placeholder={modelSugg[0] || 'Corolla'}
                  style={{ ...input, paddingRight: 44 }} />
                <button aria-label="Ver modelos" onClick={() => setOpenSugg(openSugg === 'model' ? null : 'model')}
                  style={arrowBtn(openSugg === 'model')}><Chevron open={openSugg === 'model'} /></button>
                {openSugg === 'model' && (
                  <SuggPanel opts={modelOpts} current={f.model} onPick={pickModel}
                    empty="Sin sugerencias — escribe el modelo" />
                )}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Versión / año</label>
              <input value={f.version} onChange={e => set('version', e.target.value)}
                placeholder="2022" style={input} />
            </div>
          </div>
        </>)}

        {showData && (<>
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

          {/* E3d: combustible habitual + capacidad del tanque — el
              habitual alimenta el detector de cargas mal asignadas y
              el tanque la autonomía estimada (tanque × km/gal) */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1.6 }}>
              <label style={lbl}>Combustible habitual</label>
              <div style={{ display: 'flex', gap: 7 }}>
                {[['regular', 'Regular'], ['super', 'Súper'], ['diesel', 'Diésel']].map(([k, label]) => (
                  <button key={k} onClick={() => set('fuel_pref', f.fuel_pref === k ? '' : k)} style={chip(f.fuel_pref === k)}>{label}</button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Tanque (gal)</label>
              <input value={f.tank_gal} inputMode="decimal" placeholder="12.5"
                onChange={e => {
                  let v = e.target.value.replace(/[^0-9.]/g, '');
                  const i = v.indexOf('.');
                  if (i >= 0) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, '');
                  set('tank_gal', v.slice(0, 5));
                }}
                style={{ ...input, fontFamily: "'JetBrains Mono', monospace" }} />
            </div>
          </div>

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
        </>)}

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
