// src/views/admin/AdminPremios.jsx
// Gestion de premios canjeables: crear, editar, activar, desactivar, eliminar
import { useState, useEffect } from 'react';
import { sb } from '../../lib/supabaseClient';
import { adminTheme as AT, btnYellow, btnDark, inputStyle, sMono, CAT_LABELS, CAT_STYLES } from '../../constants/styles';
import { Back, Plus } from '../../components/ui/Icons';

const TABS = [
  { id: 'canjear',  label: 'Canjear'   },
  { id: 'rifa',     label: 'Rifa'      },
  { id: 'festivos', label: 'Festivos'  },
];

const TIERS = ['todos', 'ORO', 'PLATINO', 'BLACK'];
const CATS  = ['combustible', 'servicio', 'merch', 'cultural', 'shell', 'premium', 'apple'];
const ICONS = ['🎁','⛽','🧴','🍪','🎟️','🏆','📱','🧽','🎨','🎵','🌮','🎮','👕','🏍️','🚗','🔑','🧳','⌚','💳','🛠️'];

const EMPTY_REWARD = { name: '', pts: '', icon: '🎁', cat: 'merch', tier: 'todos', active: true, description: '' };

export default function AdminPremios(ctx) {
  const { rewards, setRewards, fire, setScr, sbConnected } = ctx;

  const [sub, setSub]           = useState('canjear');
  const [showForm, setShowForm] = useState(false);
  const [editReward, setEditReward] = useState(null); // null = nuevo
  const [form, setForm]         = useState(EMPTY_REWARD);
  const [saving, setSaving]     = useState(false);
  const [filterCat, setFilterCat] = useState('todos');
  const [filterTier, setFilterTier] = useState('todos');
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Filtrar premios
  const filtered = (rewards || []).filter(r => {
    if (filterCat !== 'todos' && r.cat !== filterCat) return false;
    if (filterTier !== 'todos' && r.tier !== filterTier && r.tier !== 'todos') return false;
    return true;
  });

  const openNew = () => {
    setEditReward(null);
    setForm({ ...EMPTY_REWARD });
    setShowForm(true);
  };

  const openEdit = (r) => {
    setEditReward(r);
    setForm({ name: r.name, pts: r.pts, icon: r.icon || '🎁', cat: r.cat || 'merch', tier: r.tier || 'todos', active: r.active !== false, description: r.description || '' });
    setShowForm(true);
  };

  const saveReward = async () => {
    if (!form.name.trim() || !form.pts) { fire('Nombre y puntos son obligatorios'); return; }
    setSaving(true);
    const data = { name: form.name.trim(), pts: parseInt(form.pts), icon: form.icon, cat: form.cat, tier: form.tier, active: form.active, description: form.description };
    if (sb && sbConnected) {
      if (editReward) {
        const { error } = await sb.from('rewards').update(data).eq('id', editReward.id);
        if (error) { fire('Error: ' + error.message); setSaving(false); return; }
        setRewards(p => p.map(r => r.id === editReward.id ? { ...r, ...data } : r));
        fire('Premio actualizado');
      } else {
        const { data: newData, error } = await sb.from('rewards').insert(data).select().single();
        if (error) { fire('Error: ' + error.message); setSaving(false); return; }
        setRewards(p => [...p, { ...data, id: newData.id }]);
        fire('Premio creado');
      }
    }
    setSaving(false);
    setShowForm(false);
    setEditReward(null);
  };

  const toggleActive = async (r) => {
    const newActive = !r.active;
    if (sb && sbConnected) {
      const { error } = await sb.from('rewards').update({ active: newActive }).eq('id', r.id);
      if (error) { fire('Error: ' + error.message); return; }
    }
    setRewards(p => p.map(x => x.id === r.id ? { ...x, active: newActive } : x));
    fire(newActive ? 'Premio activado' : 'Premio desactivado');
  };

  const deleteReward = async (r) => {
    if (sb && sbConnected) {
      const { error } = await sb.from('rewards').delete().eq('id', r.id);
      if (error) { fire('Error: ' + error.message); return; }
    }
    setRewards(p => p.filter(x => x.id !== r.id));
    setConfirmDelete(null);
    fire('Premio eliminado');
  };

  const sLbl = { display: 'block', fontSize: 11, fontWeight: 700, color: '#757575', marginBottom: 4, textTransform: 'uppercase', letterSpacing: .8 };

  return (
    <div style={{ paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${AT.border}`, background: '#252525', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setScr('dash')} style={{ background: 'none', border: 'none', color: '#9E9E9E', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600 }}>
          <Back /> Inicio
        </button>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Premios</div>
        <div style={{ width: 60 }} />
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 20px' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setSub(t.id)} style={{
            flex: 1, padding: '10px 6px', borderRadius: 12,
            background: sub === t.id ? '#FBBC04' : AT.card,
            color: sub === t.id ? '#0D0D0D' : AT.sub,
            border: sub === t.id ? 'none' : `1px solid ${AT.border}`,
            fontFamily: "'DM Sans'", fontWeight: 800, fontSize: 11, cursor: 'pointer',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ---- SECCION CANJEAR ---- */}
      {sub === 'canjear' && (
        <div>
          {/* Boton nuevo premio */}
          <div style={{ padding: '0 20px 12px' }}>
            <button onClick={openNew} style={{ ...btnYellow, borderRadius: 14, fontSize: 14 }}>
              <Plus /> Nuevo Premio
            </button>
          </div>

          {/* Filtros */}
          <div style={{ display: 'flex', gap: 6, padding: '0 20px', overflowX: 'auto', marginBottom: 8 }}>
            {['todos', ...CATS].map(c => (
              <button key={c} onClick={() => setFilterCat(c)} style={{
                padding: '6px 12px', borderRadius: 20, border: 'none',
                background: filterCat === c ? '#FBBC04' : 'rgba(255,255,255,.07)',
                color: filterCat === c ? '#0D0D0D' : '#9E9E9E',
                fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans'", whiteSpace: 'nowrap',
              }}>{c === 'todos' ? 'Todos' : (CAT_LABELS[c] || c)}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, padding: '0 20px', overflowX: 'auto', marginBottom: 12 }}>
            {TIERS.map(t => (
              <button key={t} onClick={() => setFilterTier(t)} style={{
                padding: '6px 12px', borderRadius: 20, border: 'none',
                background: filterTier === t ? '#64B5F6' : 'rgba(255,255,255,.07)',
                color: filterTier === t ? '#0D0D0D' : '#9E9E9E',
                fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans'", whiteSpace: 'nowrap',
              }}>{t === 'todos' ? 'Todos los niveles' : t}</button>
            ))}
          </div>

          {/* Contador */}
          <div style={{ padding: '0 20px 8px', fontSize: 12, color: '#777' }}>
            {filtered.length} premio{filtered.length !== 1 ? 's' : ''} - {filtered.filter(r => r.active !== false).length} activos
          </div>

          {/* Lista de premios */}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#555' }}>Sin premios para estos filtros</div>
          )}
          {filtered.map(r => {
            const cs = CAT_STYLES[r.cat] || { bg: '#F5F5F5', c: '#616161' };
            const isActive = r.active !== false;
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: `1px solid ${AT.border}`, opacity: isActive ? 1 : .5 }}>
                <div style={{ fontSize: 28, flexShrink: 0 }}>{r.icon || '🎁'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: isActive ? '#E0E0E0' : '#777', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.name}
                    {!isActive && <span style={{ fontSize: 10, color: '#EF5350', marginLeft: 6, fontWeight: 700 }}>INACTIVO</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, background: cs.bg, color: cs.c, padding: '2px 7px', borderRadius: 8, fontWeight: 700 }}>{CAT_LABELS[r.cat] || r.cat}</span>
                    {r.tier && r.tier !== 'todos' && <span style={{ fontSize: 10, background: 'rgba(251,188,4,.15)', color: '#FBBC04', padding: '2px 7px', borderRadius: 8, fontWeight: 700 }}>{r.tier}</span>}
                    <span style={{ ...sMono, fontSize: 10, color: '#FBBC04', fontWeight: 800 }}>{r.pts} pts</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => openEdit(r)} style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${AT.border}`, background: AT.card, color: '#64B5F6', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans'" }}>Editar</button>
                  <button onClick={() => toggleActive(r)} style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${AT.border}`, background: AT.card, color: isActive ? '#FF8F00' : '#2E7D32', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans'" }}>
                    {isActive ? 'Desact.' : 'Activar'}
                  </button>
                  <button onClick={() => setConfirmDelete(r)} style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${AT.border}`, background: AT.card, color: '#EF5350', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans'" }}>Borrar</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---- MODAL FORM ---- */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => !saving && setShowForm(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1E1E1E', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', padding: '24px 20px 40px' }}>
            <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,.2)', borderRadius: 4, margin: '0 auto 20px' }} />
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 20 }}>{editReward ? 'Editar Premio' : 'Nuevo Premio'}</div>

            {/* Nombre */}
            <div style={{ marginBottom: 14 }}>
              <label style={sLbl}>Nombre del premio *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Lavado de Auto" style={{ ...inputStyle, background: '#2A2A2A', color: '#fff', border: '1px solid #3A3A3A' }} />
            </div>

            {/* Puntos */}
            <div style={{ marginBottom: 14 }}>
              <label style={sLbl}>Costo en puntos *</label>
              <input value={form.pts} onChange={e => setForm(p => ({ ...p, pts: e.target.value.replace(/[^0-9]/g, '') }))} placeholder="Ej: 150" inputMode="numeric" style={{ ...inputStyle, background: '#2A2A2A', color: '#fff', border: '1px solid #3A3A3A' }} />
            </div>

            {/* Descripcion */}
            <div style={{ marginBottom: 14 }}>
              <label style={sLbl}>Descripcion (opcional)</label>
              <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Descripcion breve del premio" style={{ ...inputStyle, background: '#2A2A2A', color: '#fff', border: '1px solid #3A3A3A' }} />
            </div>

            {/* Icono */}
            <div style={{ marginBottom: 14 }}>
              <label style={sLbl}>Icono</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {ICONS.map(ico => (
                  <button key={ico} onClick={() => setForm(p => ({ ...p, icon: ico }))} style={{ fontSize: 22, padding: '6px 8px', borderRadius: 10, border: form.icon === ico ? '2px solid #FBBC04' : '2px solid transparent', background: form.icon === ico ? 'rgba(251,188,4,.15)' : 'rgba(255,255,255,.05)', cursor: 'pointer' }}>{ico}</button>
                ))}
              </div>
            </div>

            {/* Categoria */}
            <div style={{ marginBottom: 14 }}>
              <label style={sLbl}>Categoria</label>
              <select value={form.cat} onChange={e => setForm(p => ({ ...p, cat: e.target.value }))} style={{ ...inputStyle, background: '#2A2A2A', color: '#fff', border: '1px solid #3A3A3A', appearance: 'none' }}>
                {CATS.map(c => <option key={c} value={c}>{CAT_LABELS[c] || c}</option>)}
              </select>
            </div>

            {/* Nivel exclusivo */}
            <div style={{ marginBottom: 14 }}>
              <label style={sLbl}>Nivel exclusivo</label>
              <select value={form.tier} onChange={e => setForm(p => ({ ...p, tier: e.target.value }))} style={{ ...inputStyle, background: '#2A2A2A', color: '#fff', border: '1px solid #3A3A3A', appearance: 'none' }}>
                <option value="todos">Todos los niveles</option>
                <option value="ORO">Solo ORO</option>
                <option value="PLATINO">Solo PLATINO</option>
                <option value="BLACK">Solo BLACK</option>
              </select>
            </div>

            {/* Estado activo */}
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,.05)', borderRadius: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#E0E0E0' }}>Premio activo</span>
              <button onClick={() => setForm(p => ({ ...p, active: !p.active }))} style={{ padding: '6px 16px', borderRadius: 10, border: 'none', background: form.active ? '#2E7D32' : '#616161', color: '#fff', fontFamily: "'DM Sans'", fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                {form.active ? 'Activo' : 'Inactivo'}
              </button>
            </div>

            {/* Botones */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowForm(false)} disabled={saving} style={{ ...btnDark, flex: 1 }}>Cancelar</button>
              <button onClick={saveReward} disabled={saving} style={{ ...btnYellow, flex: 2, opacity: saving ? .7 : 1 }}>
                {saving ? 'Guardando...' : editReward ? 'Guardar cambios' : 'Crear premio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- MODAL CONFIRMAR BORRADO ---- */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#1E1E1E', borderRadius: 20, padding: 28, maxWidth: 320, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{confirmDelete.icon || '🎁'}</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', marginBottom: 8 }}>Eliminar premio</div>
            <div style={{ fontSize: 13, color: '#9E9E9E', marginBottom: 24 }}>
              Se eliminara permanentemente <strong style={{ color: '#E0E0E0' }}>{confirmDelete.name}</strong>. Esta accion no se puede deshacer.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ ...btnDark, flex: 1, fontSize: 14 }}>Cancelar</button>
              <button onClick={() => deleteReward(confirmDelete)} style={{ flex: 1, padding: 14, borderRadius: 14, border: 'none', background: '#C62828', color: '#fff', fontFamily: "'DM Sans'", fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
