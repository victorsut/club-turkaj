// src/views/client/vehicles/ServiceConfirmSheet.jsx
// F6 E4 (3-sep-2026) — CONFIRMACIÓN DE SERVICIO. Se abre al tocar el
// push/inbox de servicio o el botón "¿Ya hiciste el servicio?" de la
// ventana Vehículos cuando el servicio está en época o vencido.
// Dos pasos: (1) ¿ya lo hiciste? — "Aún no" cierra y los recordatorios
// SIGUEN llegando; (2) "Sí" → fecha en que se hizo, odómetro y el
// PRÓXIMO servicio (fecha y/o km, al menos uno) → RPC
// confirm_my_vehicle_service; al guardar, las alertas se cortan solas
// porque el próximo servicio vuelve a estar en el futuro.
import { useState } from 'react';
import { BRAND_ORANGE } from '../../../constants/styles';
import { confirmMyVehicleService } from '../../../services/vehicleService';
import BottomSheet from '../../../components/ui/BottomSheet';

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const addDays = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(y, m - 1, d + n);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};
const diffDays = (a, b) => {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((new Date(by, bm - 1, bd) - new Date(ay, am - 1, ad)) / 86400000);
};
const fmtDate = (iso) => {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' });
};
const fmtKm = (km) => `${Number(km).toLocaleString('en-US')} km`;

export default function ServiceConfirmSheet({ vehicle: v, dark, fire, onClose, onSaved }) {
  const [step, setStep] = useState('ask');
  const [saving, setSaving] = useState(false);

  // ── propuesta del PRÓXIMO servicio: mismo intervalo que el anterior
  // (si se conoce) o 6 meses / 5,000 km por defecto ──
  const today = todayISO();
  const dateInterval = v.last_service && v.next_service ? Math.max(30, diffDays(v.last_service, v.next_service)) : 182;
  const kmInterval = v.last_service_km != null && v.next_service_km != null && v.next_service_km > v.last_service_km
    ? v.next_service_km - v.last_service_km : 5000;
  const [f, setF] = useState(() => ({
    done_on: today,
    km: v.km != null ? String(v.km) : '',
    next_service: v.next_service ? addDays(today, dateInterval) : '',
    next_service_km: v.next_service_km != null && v.km != null ? String(v.km + kmInterval) : '',
  }));
  const set = (k, val) => setF(p => ({ ...p, [k]: val }));

  // Estado actual del servicio (para el encabezado)
  const name = [v.brand, v.model].filter(Boolean).join(' ') || 'tu vehículo';
  const days = v.next_service ? diffDays(today, v.next_service) : null;
  const kmLeft = v.next_service_km != null && v.km != null ? v.next_service_km - v.km : null;
  const status = days != null && days < 0 ? `Venció hace ${-days} día${days === -1 ? '' : 's'} (${fmtDate(v.next_service)})`
    : days === 0 ? 'Programado para hoy'
    : days != null && days <= 7 ? `Programado para ${fmtDate(v.next_service)} (en ${days} día${days === 1 ? '' : 's'})`
    : kmLeft != null && kmLeft <= 0 ? `Pasado por ${fmtKm(-kmLeft)} (meta ${fmtKm(v.next_service_km)})`
    : kmLeft != null ? `Faltan ${fmtKm(kmLeft)} para la meta de ${fmtKm(v.next_service_km)}`
    : v.next_service ? `Programado para ${fmtDate(v.next_service)}` : 'Sin programar';

  const ink = dark ? '#fff' : '#0D0D0D';
  const sub = dark ? 'rgba(255,255,255,.5)' : '#9E9E9E';
  const fieldBg = dark ? 'rgba(255,255,255,.08)' : '#F5F5F7';
  const input = {
    width: '100%', boxSizing: 'border-box', padding: '13px 14px', borderRadius: 13,
    border: 'none', background: fieldBg, color: ink,
    fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600, outline: 'none',
  };
  const lbl = { display: 'block', fontSize: 11, fontWeight: 800, color: sub, textTransform: 'uppercase', letterSpacing: 1, margin: '16px 0 7px' };
  const small = { fontSize: 10, fontWeight: 700, color: sub, marginBottom: 5 };
  const btn = (primary) => ({
    flex: primary ? 1.6 : 1, padding: 15, borderRadius: 15, border: 'none', cursor: 'pointer',
    background: primary ? BRAND_ORANGE : fieldBg, color: primary ? '#fff' : ink,
    fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 800,
  });

  const save = async (close) => {
    if (saving) return;
    if (!f.done_on || f.done_on > today) { fire('La fecha del servicio no puede ser futura', 'warn'); return; }
    const km = f.km === '' ? null : parseInt(f.km, 10);
    const nextKm = f.next_service_km === '' ? null : parseInt(f.next_service_km, 10);
    if (!f.next_service && nextKm == null) { fire('Anota el próximo servicio: una fecha o un kilometraje', 'warn'); return; }
    if (f.next_service && f.next_service <= f.done_on) { fire('El próximo servicio debe ser después del realizado', 'warn'); return; }
    if (nextKm != null && km != null && nextKm <= km) { fire('El kilometraje del próximo servicio debe ser mayor al actual', 'warn'); return; }
    setSaving(true);
    const { data, error } = await confirmMyVehicleService({
      vehicleId: v.id, doneOn: f.done_on, km, nextService: f.next_service || null, nextServiceKm: nextKm,
    });
    setSaving(false);
    if (error) { fire('Error: ' + (error.message || 'no se pudo guardar'), 'error'); return; }
    const nxt = data.vehicle.next_service ? fmtDate(data.vehicle.next_service)
      : `${fmtKm(data.vehicle.next_service_km)}`;
    fire(`Servicio registrado · próximo: ${nxt}`, 'success');
    close(() => onSaved(data.vehicle));
  };

  return (
    <BottomSheet dark={dark} onClose={onClose}>
      {(close) => (<>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2, color: BRAND_ORANGE, textTransform: 'uppercase' }}>Servicio</div>
        <div style={{ fontSize: 19, fontWeight: 900, color: ink, marginTop: 2 }}>{name}</div>
        <div style={{ fontSize: 12.5, color: '#E65100', fontWeight: 700, marginTop: 6 }}>{status}</div>
        {v.last_service && (
          <div style={{ fontSize: 11.5, color: sub, fontWeight: 600, marginTop: 4 }}>
            Último servicio: {fmtDate(v.last_service)}{v.last_service_km != null ? ` · ${fmtKm(v.last_service_km)}` : ''}
          </div>
        )}

        {step === 'ask' ? (<>
          <div style={{ fontSize: 15, fontWeight: 800, color: ink, margin: '22px 0 6px' }}>¿Ya le hiciste el servicio?</div>
          <div style={{ fontSize: 12.5, color: sub, lineHeight: 1.55 }}>
            Si ya está hecho, anótalo y programa el próximo. Si todavía no, te lo seguiremos
            recordando hasta que lo confirmes.
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
            <button onClick={() => close()} style={btn(false)}>Aún no</button>
            <button onClick={() => setStep('form')} style={btn(true)}>Sí, ya lo hice</button>
          </div>
        </>) : (<>
          <label style={lbl}>Servicio realizado</label>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={small}>Fecha</div>
              <input type="date" value={f.done_on} max={today}
                onChange={e => set('done_on', e.target.value)}
                style={{ ...input, colorScheme: dark ? 'dark' : 'light' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={small}>Kilometraje al hacerlo</div>
              <input value={f.km} inputMode="numeric" placeholder={v.km != null ? String(v.km) : '52000'}
                onChange={e => set('km', e.target.value.replace(/[^0-9]/g, '').slice(0, 7))}
                style={{ ...input, fontFamily: "'JetBrains Mono', monospace" }} />
            </div>
          </div>

          <label style={lbl}>Próximo servicio</label>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={small}>Por fecha</div>
              <input type="date" value={f.next_service} min={addDays(f.done_on || today, 1)}
                onChange={e => set('next_service', e.target.value)}
                style={{ ...input, colorScheme: dark ? 'dark' : 'light' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={small}>O al llegar a (km)</div>
              <input value={f.next_service_km} inputMode="numeric" placeholder="57000"
                onChange={e => set('next_service_km', e.target.value.replace(/[^0-9]/g, '').slice(0, 7))}
                style={{ ...input, fontFamily: "'JetBrains Mono', monospace" }} />
            </div>
          </div>
          <div style={{ fontSize: 11, color: sub, marginTop: 8, lineHeight: 1.5 }}>
            Te proponemos el mismo intervalo del servicio anterior; puedes cambiarlo. Con uno de los dos basta.
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
            <button onClick={() => setStep('ask')} disabled={saving} style={btn(false)}>Atrás</button>
            <button onClick={() => save(close)} disabled={saving} style={{ ...btn(true), background: saving ? (dark ? '#3A3A3A' : '#BDBDBD') : BRAND_ORANGE }}>
              {saving ? 'Guardando...' : 'Guardar servicio'}
            </button>
          </div>
        </>)}
      </>)}
    </BottomSheet>
  );
}
