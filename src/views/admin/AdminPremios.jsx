// src/views/admin/AdminPremios.jsx
import { useState } from 'react';
import { sb } from '../../lib/supabaseClient';
import { adminTheme as AT, btnYellow, btnDark, inputStyle, sMono } from '../../constants/styles';
import { Back, Plus } from '../../components/ui/Icons';

const CAT_LABELS = {
  combustible: 'Combustible', servicio: 'Servicio', merch: 'Club Turkaj',
  cultural: 'Chichi', shell: 'Shell', premium: 'Premium', apple: 'Apple',
};
const CAT_COLORS = {
  combustible: { bg: '#FFF3E0', c: '#E65100' },
  servicio:    { bg: '#E8F5E9', c: '#2E7D32' },
  merch:       { bg: '#E3F2FD', c: '#1565C0' },
  cultural:    { bg: '#F3E5F5', c: '#7B1FA2' },
  shell:       { bg: '#FFEBEE', c: '#C62828' },
  premium:     { bg: '#FFF8E1', c: '#F57F17' },
  apple:       { bg: '#F5F5F5', c: '#333'    },
};
const CATS  = Object.keys(CAT_LABELS);
const TIERS = ['todos', 'ORO', 'PLATINO', 'BLACK'];
const ICONS = ['🎁','⛽','🧴','🍪','🎟️','🏆','📱','🧽','🎨','🎵','🌮','🎮','👕','🏍️','🚗','🔑','🧳','⌚','💳','🛠️'];

const EMPTY = { name: '', pts: '', icon: '🎁', cat: 'merch', tier: 'todos', active: true, description: '' };

const TABS = [
  { id: 'canjear', label: 'Canjear'  },
  { id: 'rifa',    label: 'Rifa'     },
  { id: 'festivos',label: 'Festivos' },
];

export default function AdminPremios(ctx) {
  const { rewards, setRewards, fire, setScr, sbConnected } = ctx;

  const [sub, setSub]             = useState('canjear');
  const [showForm, setShowForm]   = useState(false);
  const [editR, setEditR]         = useState(null);
  const [form, setForm]           = useState(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [filterCat, setFilterCat] = useState('todos');
  const [delConfirm, setDelConfirm] = useState(null);

  const filtered = (rewards || []).filter(r => filterCat === 'todos' || r.cat === filterCat);

  const openNew = () => { setEditR(null); setForm({ ...EMPTY }); setShowForm(true); };
  const openEdit = (r) => {
    setEditR(r);
    setForm({ name: r.name || '', pts: String(r.pts || ''), icon: r.icon || '🎁', cat: r.cat || 'merch', tier: r.tier || 'todos', active: r.active !== false, description: r.description || '' });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.pts) { fire('Nombre y puntos son obligatorios'); return; }
    setSaving(true);
    const data = { name: form.name.trim(), pts: parseInt(form.pts), icon: form.icon, cat: form.cat, tier: form.tier, active: form.active, description: form.description || null };
    if (sb && sbConnected) {
      if (editR) {
        const { error } = await sb.from('rewards').update(data).eq('id', editR.id);
        if (error) { fire('Error: ' + error.message); setSaving(false); return; }
        setRewards(p => p.map(r => r.id === editR.id ? { ...r, ...data } : r));
        fire('Premio actualizado');
      } else {
        const { data: nd, error } = await sb.from('rewards').insert(data).select().single();
        if (error) { fire('Error: ' + error.message); setSaving(false); return; }
        setRewards(p => [...p, { ...data, id: nd.id }]);
        fire('Premio creado');
      }
    }
    setSaving(false); setShowForm(false); setEditR(null);
  };

  const toggle = async (r) => {
    const val = !r.active;
    if (sb && sbConnected) {
      const { error } = await sb.from('rewards').update({ active: val }).eq('id', r.id);
      if (error) { fire('Error: ' + error.message); return; }
    }
    setRewards(p => p.map(x => x.id === r.id ? { ...x, active: val } : x));
    fire(val ? 'Premio activado' : 'Premio desactivado');
  };

  const del = async (r) => {
    if (sb && sbConnected) {
      const { error } = await sb.from('rewards').delete().eq('id', r.id);
      if (error) { fire('Error: ' + error.message); return; }
    }
    setRewards(p => p.filter(x => x.id !== r.id));
    setDelConfirm(null);
    fire('Premio eliminado');
  };

  const sLbl = { display: 'block', fontSize: 11, fontWeight: 700, color: '#757575', marginBottom: 4, textTransform: 'uppercase', letterSpacing: .8 };

  return (
    <div style={{ paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${AT.border}`, background: '#252525', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setScr('dash')} style={{ background: 'none', border: 'none', color: '#9E9E9E', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600 }}><Back /> Inicio</button>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Premios</div>
        <div style={{ width: 60 }} />
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 20px' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setSub(t.id)} style={{ flex: 1, padding: '10px 6px', borderRadius: 12, background: sub === t.id ? '#FBBC04' : AT.card, color: sub === t.id ? '#0D0D0D' : AT.sub, border: sub === t.id ? 'none' : `1px solid ${AT.border}`, fontFamily: "'DM Sans'", fontWeight: 800, fontSize: 11, cursor: 'pointer' }}>{t.label}</button>
        ))}
      </div>

      {/* CANJEAR */}
      {sub === 'canjear' && (
        <div>
          <div style={{ padding: '0 20px 12px' }}>
            <button onClick={openNew} style={{ ...btnYellow, borderRadius: 14, fontSize: 14 }}><Plus /> Nuevo Premio</button>
          </div>

          {/* Filtro categorias */}
          <div style={{ display: 'flex', gap: 6, padding: '0 20px', overflowX: 'auto', marginBottom: 12 }}>
            {['todos', ...CATS].map(c => (
              <button key={c} onClick={() => setFilterCat(c)} style={{ padding: '6px 12px', borderRadius: 20, border: 'none', background: filterCat === c ? '#FBBC04' : 'rgba(255,255,255,.07)', color: filterCat === c ? '#0D0D0D' : '#9E9E9E', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans'", whiteSpace: 'nowrap', flexShrink: 0 }}>
                {c === 'todos' ? 'Todos' : (CAT_LABELS[c] || c)}
              </button>
            ))}
          </div>

          <div style={{ padding: '0 20px 8px', fontSize: 12, color: '#777' }}>
            {filtered.length} premios — {filtered.filter(r => r.active !== false).length} activos
          </div>

          {filtered.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#555', fontSize: 13 }}>Sin premios</div>}

          {filtered.map(r => {
            const cs = CAT_COLORS[r.cat] || { bg: '#F5F5F5', c: '#616161' };
            const isActive = r.active !== false;
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: `1px solid ${AT.border}`, opacity: isActive ? 1 : .5 }}>
                <div style={{ fontSize: 28, flexShrink: 0 }}>{r.icon || '🎁'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: isActive ? '#E0E0E0' : '#777', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.name}
                    {!isActive && <span style={{ fontSize: 10, color: '#EF5350', marginLeft: 6, fontWeight: 700 }}>INACTIVO</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, background: cs.bg, color: cs.c, padding: '2px 7px', borderRadius: 8, fontWeight: 700 }}>{CAT_LABELS[r.cat] || r.cat}</span>
                    {r.tier && r.tier !== 'todos' && <span style={{ fontSize: 10, background: 'rgba(251,188,4,.15)', color: '#FBBC04', padding: '2px 7px', borderRadius: 8, fontWeight: 700 }}>{r.tier}</span>}
                    <span style={{ ...sMono, fontSize: 11, color: '#FBBC04', fontWeight: 800 }}>{r.pts} pts</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                  <button onClick={() => openEdit(r)} style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${AT.border}`, background: AT.card, color: '#64B5F6', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans'" }}>Editar</button>
                  <button onClick={() => toggle(r)} style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${AT.border}`, background: AT.card, color: isActive ? '#FF8F00' : '#2E7D32', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans'" }}>{isActive ? 'Desact.' : 'Activar'}</button>
                  <button onClick={() => setDelConfirm(r)} style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${AT.border}`, background: AT.card, color: '#EF5350', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans'" }}>Borrar</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL FORM */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => !saving && setShowForm(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1E1E1E', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', padding: '20px 20px 40px' }}>
            <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,.2)', borderRadius: 4, margin: '0 auto 20px' }} />
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 18 }}>{editR ? 'Editar Premio' : 'Nuevo Premio'}</div>

            <div style={{ marginBottom: 14 }}>
              <label style={sLbl}>Nombre *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Lavado de auto" style={{ ...inputStyle, background: '#2A2A2A', color: '#fff', border: '1px solid #3A3A3A' }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={sLbl}>Puntos *</label>
              <input value={form.pts} onChange={e => setForm(p => ({ ...p, pts: e.target.value.replace(/[^0-9]/g, '') }))} placeholder="Ej: 150" inputMode="numeric" style={{ ...inputStyle, background: '#2A2A2A', color: '#fff', border: '1px solid #3A3A3A' }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={sLbl}>Descripcion</label>
              <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Breve descripcion" style={{ ...inputStyle, background: '#2A2A2A', color: '#fff', border: '1px solid #3A3A3A' }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={sLbl}>Icono</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {ICONS.map(ico => (
                  <button key={ico} onClick={() => setForm(p => ({ ...p, icon: ico }))} style={{ fontSize: 22, padding: '6px 8px', borderRadius: 10, border: form.icon === ico ? '2px solid #FBBC04' : '2px solid transparent', background: form.icon === ico ? 'rgba(251,188,4,.15)' : 'rgba(255,255,255,.05)', cursor: 'pointer' }}>{ico}</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={sLbl}>Categoria</label>
                <select value={form.cat} onChange={e => setForm(p => ({ ...p, cat: e.target.value }))} style={{ ...inputStyle, background: '#2A2A2A', color: '#fff', border: '1px solid #3A3A3A', appearance: 'none' }}>
                  {CATS.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
                </select>
              </div>
              <div>
                <label style={sLbl}>Nivel exclusivo</label>
                <select value={form.tier} onChange={e => setForm(p => ({ ...p, tier: e.target.value }))} style={{ ...inputStyle, background: '#2A2A2A', color: '#fff', border: '1px solid #3A3A3A', appearance: 'none' }}>
                  {TIERS.map(t => <option key={t} value={t}>{t === 'todos' ? 'Todos' : t}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,.05)', borderRadius: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#E0E0E0' }}>Premio activo</span>
              <button onClick={() => setForm(p => ({ ...p, active: !p.active }))} style={{ padding: '6px 16px', borderRadius: 10, border: 'none', background: form.active ? '#2E7D32' : '#616161', color: '#fff', fontFamily: "'DM Sans'", fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                {form.active ? 'Activo' : 'Inactivo'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowForm(false)} disabled={saving} style={{ ...btnDark, flex: 1 }}>Cancelar</button>
              <button onClick={save} disabled={saving} style={{ ...btnYellow, flex: 2, opacity: saving ? .7 : 1 }}>
                {saving ? 'Guardando...' : editR ? 'Guardar cambios' : 'Crear premio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR BORRADO */}
      {delConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#1E1E1E', borderRadius: 20, padding: 28, maxWidth: 320, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{delConfirm.icon || '🎁'}</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', marginBottom: 8 }}>Eliminar premio</div>
            <div style={{ fontSize: 13, color: '#9E9E9E', marginBottom: 24 }}>
              Se eliminara <strong style={{ color: '#E0E0E0' }}>{delConfirm.name}</strong> permanentemente.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDelConfirm(null)} style={{ ...btnDark, flex: 1, fontSize: 14 }}>Cancelar</button>
              <button onClick={() => del(delConfirm)} style={{ flex: 1, padding: 14, borderRadius: 14, border: 'none', background: '#C62828', color: '#fff', fontFamily: "'DM Sans'", fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
