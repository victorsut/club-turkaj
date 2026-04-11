// src/views/admin/AdminPremios.jsx
// Vista admin con 3 sub-secciones: Premios para canjear, Rifa mensual y Días festivos
import { useState } from 'react';
import { sb } from '../../lib/supabaseClient';
import { adminTheme as AT, btnYellow, inputStyle } from '../../constants/styles';
import Catalog from '../shared/Catalog';
import AdminRaffle from './AdminRaffle';

// ─── Sub-sección: Días Festivos ───────────────────────────
function SpecialDays({ fire, sbConnected }) {
  const [days, setDays]       = useState(null); // null = no cargado
  const [loading, setLoading] = useState(false);
  const [form, setForm]       = useState({ name: '', month: 5, day: 1, points: 50, icon: '🎉', active: true });
  const [adding, setAdding]   = useState(false);
  const [saving, setSaving]   = useState(false);

  const load = async () => {
    if (!sb || !sbConnected) return;
    setLoading(true);
    const { data, error } = await sb.from('special_days').select('*').order('month').order('day');
    setLoading(false);
    if (error) { fire('❌ ' + error.message); return; }
    setDays(data || []);
  };

  if (days === null && !loading) load();

  const save = async () => {
    if (!form.name.trim()) { fire('❌ El nombre es obligatorio'); return; }
    setSaving(true);
    const { data, error } = await sb.from('special_days').insert({
      name: form.name.trim(), month: parseInt(form.month), day: parseInt(form.day),
      points: parseInt(form.points) || 50, icon: form.icon || '🎉', active: form.active, system: false,
    }).select();
    setSaving(false);
    if (error) { fire('❌ ' + error.message); return; }
    setDays(p => [...(p || []), data[0]]);
    setForm({ name: '', month: 5, day: 1, points: 50, icon: '🎉', active: true });
    setAdding(false);
    fire('✅ Día festivo agregado');
  };

  const toggle = async (d) => {
    const { error } = await sb.from('special_days').update({ active: !d.active }).eq('id', d.id);
    if (error) { fire('❌ ' + error.message); return; }
    setDays(p => p.map(x => x.id === d.id ? { ...x, active: !x.active } : x));
    fire(!d.active ? '✅ Día festivo activado' : '⏸ Día festivo desactivado');
  };

  const remove = async (d) => {
    if (d.system) { fire('❌ Este día no se puede eliminar'); return; }
    const { error } = await sb.from('special_days').delete().eq('id', d.id);
    if (error) { fire('❌ ' + error.message); return; }
    setDays(p => p.filter(x => x.id !== d.id));
    fire('🗑️ Día festivo eliminado');
  };

  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const AT_card = { background: AT.card, borderRadius: 14, padding: 16, border: `1px solid ${AT.border}`, marginBottom: 10 };

  return (
    <div style={{ padding: '0 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: AT.sub, fontWeight: 600 }}>
          Los puntos se otorgan automáticamente la primera vez que el miembro abre la app en esa fecha.
        </div>
      </div>

      {/* Formulario nuevo */}
      {adding && (
        <div style={{ ...AT_card, border: `1px solid #FBBC04` }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: AT.txt, marginBottom: 14 }}>➕ Nuevo día festivo</div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: AT.sub, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>Nombre</div>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Ej: Día del Combustible"
              style={{ ...inputStyle, background: '#333', border: `1px solid ${AT.border}`, color: AT.txt }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: AT.sub, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>Mes</div>
              <select value={form.month} onChange={e => setForm(p => ({ ...p, month: e.target.value }))}
                style={{ ...inputStyle, background: '#333', border: `1px solid ${AT.border}`, color: AT.txt, padding: '10px 12px' }}>
                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: AT.sub, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>Día</div>
              <input type="number" min="1" max="31" value={form.day}
                onChange={e => setForm(p => ({ ...p, day: e.target.value }))}
                style={{ ...inputStyle, background: '#333', border: `1px solid ${AT.border}`, color: AT.txt }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: AT.sub, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>Puntos</div>
              <input type="number" min="1" value={form.points}
                onChange={e => setForm(p => ({ ...p, points: e.target.value }))}
                style={{ ...inputStyle, background: '#333', border: `1px solid ${AT.border}`, color: AT.txt }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: AT.sub, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>Ícono</div>
              <input value={form.icon} onChange={e => setForm(p => ({ ...p, icon: e.target.value }))}
                placeholder="🎉"
                style={{ ...inputStyle, background: '#333', border: `1px solid ${AT.border}`, color: AT.txt }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setAdding(false)} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${AT.border}`, background: 'none', color: AT.sub, fontFamily: "'DM Sans'", fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
            <button onClick={save} disabled={saving} style={{ ...btnYellow, flex: 2, padding: 12, fontSize: 13, opacity: saving ? .7 : 1 }}>
              {saving ? 'Guardando...' : 'Agregar día festivo'}
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading && <div style={{ textAlign: 'center', padding: 32, color: AT.sub }}>Cargando...</div>}
      {!loading && days?.map(d => (
        <div key={d.id} style={{ ...AT_card, opacity: d.active ? 1 : .5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 32, flexShrink: 0 }}>{d.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: AT.txt }}>
                {d.name}
                {d.system && <span style={{ fontSize: 9, fontWeight: 700, color: '#FBBC04', background: 'rgba(251,188,4,.15)', padding: '2px 6px', borderRadius: 6, marginLeft: 8 }}>SISTEMA</span>}
              </div>
              <div style={{ fontSize: 12, color: AT.sub, marginTop: 2 }}>
                {d.month === 0 ? 'Fecha de cumpleaños del miembro' : `${String(d.day).padStart(2,'0')} / ${months[d.month-1]}`}
                {' · '}<span style={{ color: '#FBBC04', fontWeight: 700 }}>+{d.points} pts</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => toggle(d)} style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${AT.border}`, background: 'none', color: d.active ? '#FF8F00' : '#66BB6A', fontFamily: "'DM Sans'", fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                {d.active ? '⏸' : '▶'}
              </button>
              {!d.system && (
                <button onClick={() => remove(d)} style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${AT.border}`, background: 'none', color: '#EF5350', fontFamily: "'DM Sans'", fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                  🗑
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      {!loading && days?.length === 0 && (
        <div style={{ textAlign: 'center', padding: 32, color: AT.sub }}>No hay días festivos configurados.</div>
      )}

      {!adding && (
        <button onClick={() => setAdding(true)} style={{ ...btnYellow, marginTop: 8 }}>
          + Agregar día festivo
        </button>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────
export default function AdminPremios(ctx) {
  const [sub, setSub] = useState('canjear'); // 'canjear' | 'rifa' | 'festivos'

  const tabs = [
    { id: 'canjear',  label: '🎁 Canjear' },
    { id: 'rifa',     label: '🎟️ Rifa'    },
    { id: 'festivos', label: '🎉 Festivos' },
  ];

  return (
    <div style={{ paddingBottom: 100, background: AT.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 0', fontSize: 20, fontWeight: 800, color: AT.txt, marginBottom: 16 }}>
        🏆 Premios
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 8, padding: '0 20px', marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setSub(t.id)} style={{
            flex: 1, padding: '10px 6px', borderRadius: 12, border: 'none',
            background: sub === t.id ? '#FBBC04' : AT.card,
            color: sub === t.id ? '#0D0D0D' : AT.sub,
            fontFamily: "'DM Sans'", fontWeight: 800, fontSize: 11,
            cursor: 'pointer', textAlign: 'center',
            border: sub === t.id ? 'none' : `1px solid ${AT.border}`,
          }}>{t.label}</button>
        ))}
      </div>

      {/* Contenido por sub-sección */}
      {sub === 'canjear'  && <Catalog {...ctx} client={false} />}
      {sub === 'rifa'     && <AdminRaffle {...ctx} />}
      {sub === 'festivos' && <SpecialDays fire={ctx.fire} sbConnected={ctx.sbConnected} />}
    </div>
  );
}
