// src/views/admin/PromoRuleForm.jsx
// PROMO-1: formulario bottom-sheet de creación/edición de reglas de
// promoción. Estado local propio; el submit devuelve al padre el
// objeto `rule` COMPLETO listo para manage_promo_rule (la RPC valida
// todo de nuevo server-side — acá solo validaciones de UX).
import { useState } from 'react';
import { inputStyle, btnYellow, adminTheme as AT } from '../../constants/styles';

// Semántica server-side: arrays vacíos = sin restricción (NULL).
const WEEKDAYS = [
  { v: 1, label: 'L' }, { v: 2, label: 'M' }, { v: 3, label: 'X' },
  { v: 4, label: 'J' }, { v: 5, label: 'V' }, { v: 6, label: 'S' },
  { v: 7, label: 'D' },
];
const FUELS = [
  { v: 'super',   label: 'Súper'   },
  { v: 'regular', label: 'Regular' },
  { v: 'diesel',  label: 'Diésel'  },
];
const TIERS = ['ORO', 'PLATINO', 'BLACK'];

const label = { fontSize: 11, fontWeight: 700, color: AT.sub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 };
const darkInput = { ...inputStyle, background: '#333', border: `1px solid ${AT.border}`, color: AT.txt };

// Chip seleccionable genérico (weekdays / fuels / tiers / estaciones)
function Chip({ on, children, onClick, minWidth = 0 }) {
  return (
    <div onClick={onClick} style={{
      padding: '8px 12px', minWidth, textAlign: 'center', borderRadius: 10,
      background: on ? '#FBBC04' : '#333', color: on ? '#0D0D0D' : AT.sub,
      border: `1px solid ${on ? '#FBBC04' : AT.border}`,
      fontSize: 12, fontWeight: 700, cursor: 'pointer', userSelect: 'none',
    }}>{children}</div>
  );
}

function seedForm(rule) {
  if (!rule || rule === 'new') return {
    name: '', description: '', effect_type: 'points_multiplier', effect_value: '2', reward_id: '',
    starts_on: '', ends_on: '', weekdays: [], specific_dates: [],
    fuel_types: [], min_amount: '', tiers: [], station_ids: [],
    max_uses_total: '', max_uses_per_member: '', active: true,
  };
  return {
    name: rule.name || '',
    description: rule.description || '',
    effect_type: rule.effect_type || 'points_multiplier',
    effect_value: rule.effect_value != null ? String(rule.effect_value) : '',
    reward_id: rule.reward_id || '',
    starts_on: rule.starts_on || '',
    ends_on: rule.ends_on || '',
    weekdays: rule.weekdays || [],
    specific_dates: rule.specific_dates || [],
    fuel_types: rule.fuel_types || [],
    min_amount: rule.min_amount != null ? String(rule.min_amount) : '',
    tiers: rule.tiers || [],
    station_ids: rule.station_ids || [],
    max_uses_total: rule.max_uses_total != null ? String(rule.max_uses_total) : '',
    max_uses_per_member: rule.max_uses_per_member != null ? String(rule.max_uses_per_member) : '',
    active: rule.active !== false,
  };
}

export default function PromoRuleForm({ rule, stations = [], rewards = [], saving, onCancel, onSubmit, fire }) {
  const isNew = rule === 'new';
  const [f, setF] = useState(() => seedForm(rule));
  const [dateDraft, setDateDraft] = useState('');

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const toggleIn = (k, v) => setF(p => ({
    ...p, [k]: p[k].includes(v) ? p[k].filter(x => x !== v) : [...p[k], v],
  }));

  const submit = () => {
    const name = f.name.trim();
    if (name.length < 3) { fire('❌ El nombre debe tener al menos 3 caracteres'); return; }
    const isGrant = f.effect_type === 'grant_reward';
    const val = isGrant ? null : parseFloat(f.effect_value);
    if (isGrant) {
      if (!f.reward_id) { fire('❌ Elegí el premio del catálogo'); return; }
    } else {
      if (!val || val <= 0) { fire('❌ Ingresá el valor del efecto'); return; }
      if (f.effect_type === 'points_multiplier' && (val <= 1 || val > 10)) {
        fire('❌ El multiplicador debe ser mayor a 1 y hasta 10'); return;
      }
    }
    onSubmit({
      name,
      description: f.description.trim(),
      effect_type: f.effect_type,
      effect_value: val,
      reward_id: isGrant ? f.reward_id : null,
      starts_on: f.starts_on || null,
      ends_on: f.ends_on || null,
      weekdays: f.weekdays,
      specific_dates: f.specific_dates,
      fuel_types: f.fuel_types,
      min_amount: f.min_amount ? parseFloat(f.min_amount) : null,
      tiers: f.tiers,
      station_ids: f.station_ids,
      max_uses_total: f.max_uses_total ? parseInt(f.max_uses_total) : null,
      max_uses_per_member: f.max_uses_per_member ? parseInt(f.max_uses_per_member) : null,
      active: f.active,
    });
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 400,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={() => !saving && onCancel()}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: AT.card, border: '1px solid #FBBC04',
          borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480,
          maxHeight: '92vh', overflowY: 'auto', padding: '20px 20px 40px',
        }}
      >
        <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,.2)', borderRadius: 4, margin: '0 auto 20px' }} />
        <div style={{ fontSize: 14, fontWeight: 800, color: AT.txt, marginBottom: 16 }}>
          {isNew ? '➕ Nueva regla de promoción' : '✏️ Editar regla'}
        </div>

        {/* Nombre + descripción */}
        <div style={{ marginBottom: 12 }}>
          <div style={label}>Nombre * <span style={{ textTransform: 'none' }}>(sale en el historial y el comprobante)</span></div>
          <input value={f.name} placeholder="Ej: Dobles puntos" maxLength={60}
            onChange={e => set('name', e.target.value)} style={darkInput} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={label}>Descripción</div>
          <input value={f.description} placeholder="Nota interna (opcional)"
            onChange={e => set('description', e.target.value)} style={darkInput} />
        </div>

        {/* Efecto */}
        <div style={{ marginBottom: 12 }}>
          <div style={label}>Efecto *</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            <Chip on={f.effect_type === 'points_multiplier'} minWidth={0}
              onClick={() => setF(p => ({ ...p, effect_type: 'points_multiplier', effect_value: '2' }))}>
              ✖️ Multiplicar puntos
            </Chip>
            <Chip on={f.effect_type === 'bonus_points'} minWidth={0}
              onClick={() => setF(p => ({ ...p, effect_type: 'bonus_points', effect_value: '' }))}>
              ➕ Bonus fijo
            </Chip>
            <Chip on={f.effect_type === 'grant_reward'} minWidth={0}
              onClick={() => setF(p => ({ ...p, effect_type: 'grant_reward', effect_value: '' }))}>
              🎁 Premio gratis
            </Chip>
          </div>
          {f.effect_type === 'grant_reward' ? (
            <>
              <select value={f.reward_id} onChange={e => set('reward_id', e.target.value)} style={darkInput}>
                <option value="">Elegí el premio del catálogo…</option>
                {rewards.filter(r => r.active !== false).map(r => (
                  <option key={r.id} value={r.id}>{r.icon ? r.icon + ' ' : ''}{r.name} ({r.pts} pts)</option>
                ))}
              </select>
              <div style={{ fontSize: 11, color: AT.sub, marginTop: 6, lineHeight: 1.5 }}>
                La compra genera un canje GRATIS (0 pts) que el cliente retira en
                estación como cualquier canje. Para la regla "gana la de mayor
                beneficio", este efecto vale los puntos del premio.
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="number" value={f.effect_value} style={{ ...darkInput, width: 110 }}
                placeholder={f.effect_type === 'points_multiplier' ? '2' : '50'}
                onChange={e => set('effect_value', e.target.value)} />
              <span style={{ fontSize: 12, color: AT.sub }}>
                {f.effect_type === 'points_multiplier'
                  ? '2 = dobles puntos, 3 = triples…'
                  : 'puntos extra fijos por compra'}
              </span>
            </div>
          )}
        </div>

        {/* Vigencia */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={label}>Desde</div>
            <input type="date" value={f.starts_on} onChange={e => set('starts_on', e.target.value)} style={darkInput} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={label}>Hasta</div>
            <input type="date" value={f.ends_on} onChange={e => set('ends_on', e.target.value)} style={darkInput} />
          </div>
        </div>

        {/* Días de semana */}
        <div style={{ marginBottom: 12 }}>
          <div style={label}>Días de la semana <span style={{ textTransform: 'none' }}>(ninguno = todos)</span></div>
          <div style={{ display: 'flex', gap: 6 }}>
            {WEEKDAYS.map(d => (
              <Chip key={d.v} on={f.weekdays.includes(d.v)} minWidth={30} onClick={() => toggleIn('weekdays', d.v)}>{d.label}</Chip>
            ))}
          </div>
        </div>

        {/* Fechas específicas */}
        <div style={{ marginBottom: 12 }}>
          <div style={label}>Fechas específicas <span style={{ textTransform: 'none' }}>(se suman a los días elegidos)</span></div>
          <div style={{ display: 'flex', gap: 8, marginBottom: f.specific_dates.length ? 8 : 0 }}>
            <input type="date" value={dateDraft} onChange={e => setDateDraft(e.target.value)} style={{ ...darkInput, flex: 1 }} />
            <button
              onClick={() => {
                if (!dateDraft || f.specific_dates.includes(dateDraft)) return;
                setF(p => ({ ...p, specific_dates: [...p.specific_dates, dateDraft].sort() }));
                setDateDraft('');
              }}
              style={{ ...btnYellow, width: 'auto', padding: '0 16px', fontSize: 13 }}
            >+ Agregar</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {f.specific_dates.map(d => (
              <div key={d} onClick={() => setF(p => ({ ...p, specific_dates: p.specific_dates.filter(x => x !== d) }))}
                style={{ padding: '6px 10px', borderRadius: 8, background: '#333', color: AT.txt, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1px solid ${AT.border}` }}>
                {d} ✕
              </div>
            ))}
          </div>
        </div>

        {/* Condiciones */}
        <div style={{ marginBottom: 12 }}>
          <div style={label}>Combustibles <span style={{ textTransform: 'none' }}>(ninguno = todos)</span></div>
          <div style={{ display: 'flex', gap: 6 }}>
            {FUELS.map(fu => (
              <Chip key={fu.v} on={f.fuel_types.includes(fu.v)} onClick={() => toggleIn('fuel_types', fu.v)}>{fu.label}</Chip>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={label}>Niveles <span style={{ textTransform: 'none' }}>(ninguno = todos)</span></div>
          <div style={{ display: 'flex', gap: 6 }}>
            {TIERS.map(t => (
              <Chip key={t} on={f.tiers.includes(t)} onClick={() => toggleIn('tiers', t)}>{t}</Chip>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={label}>Estaciones <span style={{ textTransform: 'none' }}>(ninguna = todas)</span></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {stations.map(s => (
              <Chip key={s.id} on={f.station_ids.includes(s.id)} onClick={() => toggleIn('station_ids', s.id)}>{s.name}</Chip>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={label}>Monto mínimo (Q)</div>
            <input type="number" value={f.min_amount} placeholder="Sin mínimo"
              onChange={e => set('min_amount', e.target.value)} style={darkInput} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={label}>Usos máx. totales</div>
            <input type="number" value={f.max_uses_total} placeholder="Sin límite"
              onChange={e => set('max_uses_total', e.target.value)} style={darkInput} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={label}>Usos máx. x cliente</div>
            <input type="number" value={f.max_uses_per_member} placeholder="Sin límite"
              onChange={e => set('max_uses_per_member', e.target.value)} style={darkInput} />
          </div>
        </div>

        {/* Activa — solo en CREATE (en edit se gestiona con el botón de la lista) */}
        {isNew && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div onClick={() => set('active', !f.active)} style={{
              width: 44, height: 24, borderRadius: 12, background: f.active ? '#FBBC04' : '#555',
              position: 'relative', cursor: 'pointer', transition: 'background .2s',
            }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: f.active ? 23 : 3, transition: 'left .2s' }} />
            </div>
            <span style={{ fontSize: 13, color: AT.txt, fontWeight: 600 }}>{f.active ? 'Activa al crearla' : 'Creada inactiva'}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${AT.border}`, background: 'none', color: AT.sub, fontFamily: "'DM Sans'", fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
            Cancelar
          </button>
          <button onClick={submit} disabled={saving} style={{ ...btnYellow, flex: 2, padding: 12, fontSize: 14, opacity: saving ? .7 : 1 }}>
            {saving ? 'Guardando...' : isNew ? 'Crear regla' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
