// src/views/admin/AdminCatalog.jsx
// CATÁLOGO DE CANJES — Admin v2 (8-ago-2026, FORMATO GENERAL): la
// gestión de premios canjeables se MUDÓ acá desde Premios y Festivos
// (pedido del dueño — esa vista queda solo para festivos). Flat,
// minimalista, SIN emojis: el selector de ícono es SVG y guarda la
// CLAVE semántica (emoji en BD) que RewardIcon ya resuelve — el
// cliente no cambia. CRUD auditado de siempre (SEC.C.4:
// admin_write_catalog con sesión; editar/desactivar/borrar con
// ReasonModal, crear directo con auditoría).
import { useState } from 'react';
import { sb } from '../../lib/supabaseClient';
import { sMono, adminTheme as AT, btnYellow, inputStyleDark, CAT_LABELS, CAT_COLORS } from '../../constants/styles';
import { Plus, Fuel, Gift, Coffee, Soda, Drops, Shirt, Gamepad, Headphones, Tv, Speaker, Key, Ball, Utensils } from '../../components/ui/Icons';
import RewardIcon from '../../components/ui/RewardIcon';
import ReasonModal from '../../components/ui/ReasonModal';
import { adminWriteCatalog } from '../../services/secureReads';

const CATS  = Object.keys(CAT_LABELS);
const TIERS = ['todos', 'ORO', 'PLATINO', 'BLACK'];

// Ícono del premio: la UI muestra SVG; en BD viaja la CLAVE semántica
// (el "emoji" histórico) que RewardIcon resuelve en toda la app.
const ICON_OPTIONS = [
  { k: '🎁', I: Gift,       t: 'Regalo' },
  { k: '⛽', I: Fuel,       t: 'Combustible' },
  { k: '🚿', I: Drops,      t: 'Lavado' },
  { k: '☕', I: Coffee,     t: 'Café' },
  { k: '🥤', I: Soda,       t: 'Bebida' },
  { k: '🍽', I: Utensils,   t: 'Comida' },
  { k: '👕', I: Shirt,      t: 'Ropa' },
  { k: '🎧', I: Headphones, t: 'Audífonos' },
  { k: '🔊', I: Speaker,    t: 'Bocina' },
  { k: '📺', I: Tv,         t: 'Pantalla' },
  { k: '🎮', I: Gamepad,    t: 'Videojuegos' },
  { k: '🔑', I: Key,        t: 'Llavero' },
  { k: '⚽', I: Ball,       t: 'Deporte' },
];

const EMPTY = { name: '', pts: '', icon: '🎁', cat: 'merch', tier: 'todos', active: true, description: '', stationIds: [], storeIds: [] };

export default function AdminCatalog(ctx) {
  const { rewards, setRewards, fire, sbConnected, loggedAdmin, stations = [], stores = [] } = ctx;

  const adminAudit = (reasonText = null) => ({
    adminId: loggedAdmin?.id, adminName: loggedAdmin?.name,
    adminEmail: loggedAdmin?.email, reasonText,
  });

  const [filterCat, setFilterCat] = useState('todos');
  const [showForm, setShowForm]   = useState(false);
  const [editR, setEditR]         = useState(null);
  const [form, setForm]           = useState(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [showReason, setShowReason] = useState(false);
  const [pending, setPending]     = useState(null);

  const filtered = (rewards || []).filter(r => filterCat === 'todos' || (r.category || r.cat) === filterCat);
  const activeCount = filtered.filter(r => r.active !== false).length;

  const openNew = () => { setEditR(null); setForm({ ...EMPTY }); setShowForm(true); };
  const openEdit = (r) => {
    setEditR(r);
    setForm({
      name: r.name || '', pts: String(r.points_cost || r.pts || ''), icon: r.icon || '🎁',
      cat: r.category || r.cat || 'merch', tier: r.tier_exclusive || r.tier || 'todos',
      active: r.active !== false, description: r.description || '',
      // D17: localizaciones (vacío = todas las estaciones)
      stationIds: r.stationIds || r.station_ids || [], storeIds: r.storeIds || r.store_ids || [],
    });
    setShowForm(true);
  };
  const toggleLoc = (k, id) => setForm(p => ({
    ...p, [k]: p[k].includes(id) ? p[k].filter(x => x !== id) : [...p[k], id],
  }));

  const save = async () => {
    if (!form.name.trim() || !form.pts) { fire('Nombre y puntos son obligatorios'); return; }
    const data = {
      name: form.name.trim(), points_cost: parseInt(form.pts), icon: form.icon,
      category: form.cat, tier_exclusive: form.tier !== 'todos' ? form.tier : null,
      active: form.active, description: form.description || null,
      station_ids: form.stationIds, store_ids: form.storeIds,
    };
    if (editR) {
      if (!loggedAdmin?.id) { fire('Error: sesion admin no disponible. Cerra sesion y volve a ingresar.'); return; }
      setPending({ type: 'edit', entityId: editR.id, data, label: 'Editar premio: ' + data.name });
      setShowForm(false);
      setShowReason(true);
      return;
    }
    setSaving(true);
    if (sb && sbConnected) {
      const res = await adminWriteCatalog('reward', 'create', { data, audit: adminAudit() });
      if (res.error) { fire('Error: ' + res.error); setSaving(false); return; }
      setRewards(p => [...p, { ...data, id: res.id, pts: data.points_cost, cat: data.category, tier: data.tier_exclusive }]);
      fire('Premio creado');
    }
    setSaving(false); setShowForm(false); setEditR(null);
  };

  const toggle = (r) => {
    if (!loggedAdmin?.id) { fire('Error: sesion admin no disponible. Cerra sesion y volve a ingresar.'); return; }
    const isActive = r.active !== false;
    setPending({
      type: 'toggle', entityId: r.id, data: { active: !isActive },
      label: (isActive ? 'Desactivar premio: ' : 'Activar premio: ') + r.name,
    });
    setShowReason(true);
  };

  const del = (r) => {
    if (!loggedAdmin?.id) { fire('Error: sesion admin no disponible. Cerra sesion y volve a ingresar.'); return; }
    setPending({ type: 'delete', entityId: r.id, data: null, label: 'Eliminar premio: ' + r.name });
    setShowReason(true);
  };

  const confirmAction = async (reason) => {
    if (!pending || !loggedAdmin?.id) { setShowReason(false); return; }
    const audit = adminAudit(reason);
    const eid = pending.entityId;
    setSaving(true);
    try {
      if (pending.type === 'edit') {
        const res = sb && sbConnected
          ? await adminWriteCatalog('reward', 'update', { id: eid, data: pending.data, audit })
          : {};
        if (res.error) { setShowReason(false); setShowForm(true); fire('Error: ' + res.error); return; }
        setRewards(prev => prev.map(r => r.id === eid
          ? { ...r, ...pending.data, pts: pending.data.points_cost, cat: pending.data.category, tier: pending.data.tier_exclusive }
          : r));
        setEditR(null); setForm({ ...EMPTY });
        fire('Premio actualizado');
      } else if (pending.type === 'toggle') {
        const res = sb && sbConnected
          ? await adminWriteCatalog('reward', 'update', { id: eid, data: pending.data, audit })
          : {};
        if (res.error) { setShowReason(false); fire('Error: ' + res.error); return; }
        setRewards(prev => prev.map(r => r.id === eid ? { ...r, active: pending.data.active } : r));
        fire(pending.data.active ? 'Premio activado' : 'Premio desactivado');
      } else {
        const res = sb && sbConnected
          ? await adminWriteCatalog('reward', 'delete', { id: eid, audit })
          : {};
        if (res.error) { setShowReason(false); fire('Error: ' + res.error); return; }
        setRewards(prev => prev.filter(r => r.id !== eid));
        fire('Premio eliminado');
      }
      setShowReason(false);
      setPending(null);
    } finally {
      setSaving(false);
    }
  };

  // ── estilos (FORMATO GENERAL Admin v2) ──
  const groupLbl = { fontSize: 10, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: '#777', marginBottom: 6 };
  const chipBtn = (on) => ({
    padding: '7px 14px', borderRadius: 10, cursor: 'pointer', whiteSpace: 'nowrap',
    border: `1px solid ${on ? '#FBBC04' : AT.border}`,
    background: on ? '#FBBC04' : AT.card,
    color: on ? '#0D0D0D' : '#9E9E9E',
    fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 700,
  });
  const miniBtn = (color) => ({
    padding: '5px 10px', borderRadius: 8, border: `1px solid ${AT.border}`,
    background: 'transparent', color, fontSize: 11, fontWeight: 700,
    cursor: 'pointer', fontFamily: "'DM Sans'", flexShrink: 0,
  });
  const lbl = { display: 'block', fontSize: 11, fontWeight: 800, color: '#9E9E9E', marginBottom: 5, textTransform: 'uppercase', letterSpacing: .8 };
  const locChip = (on) => ({
    padding: '6px 12px', borderRadius: 10, cursor: 'pointer',
    border: `1px solid ${on ? '#FBBC04' : AT.border}`,
    background: on ? 'rgba(251,188,4,.15)' : 'transparent',
    color: on ? '#FBBC04' : '#9E9E9E',
    fontFamily: "'DM Sans'", fontSize: 11.5, fontWeight: 700,
  });

  return (
    <div style={{ padding: '22px 22px 60px' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 21, fontWeight: 800, color: '#fff' }}>Catálogo de Canjes</div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#9E9E9E', marginTop: 2 }}>
            {filtered.length.toLocaleString('en-US')} premios — {activeCount.toLocaleString('en-US')} activos · es el catálogo que ve el cliente
          </div>
        </div>
        <button onClick={openNew}
          style={{ ...btnYellow, display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 12, fontSize: 13, padding: '11px 18px' }}>
          <span style={{ display: 'flex', transform: 'scale(.8)' }}><Plus /></span> Nuevo premio
        </button>
      </div>

      {/* Filtro por categoría */}
      <div style={{ background: AT.card, border: `1px solid ${AT.border}`, borderRadius: 18, padding: 16, marginBottom: 16 }}>
        <div style={groupLbl}>Categoría</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['todos', ...CATS].map(c => (
            <button key={c} onClick={() => setFilterCat(c)} style={chipBtn(filterCat === c)}>
              {c === 'todos' ? 'Todos' : (CAT_LABELS[c] || c)}
            </button>
          ))}
        </div>
      </div>

      {/* Premios */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#777', fontSize: 13, fontWeight: 700 }}>Sin premios en esta categoría</div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 10 }}>
        {filtered.map(r => {
          const cs = CAT_COLORS[r.category || r.cat] || { bg: '#F5F5F5', c: '#616161' };
          const isActive = r.active !== false;
          const tier = r.tier_exclusive || r.tier;
          const locs = (r.stationIds || r.station_ids || []).length + (r.storeIds || r.store_ids || []).length;
          return (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: AT.card, border: `1px solid ${AT.border}`,
              borderRadius: 16, padding: '12px 14px', opacity: isActive ? 1 : .55,
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,.06)', color: '#E0E0E0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <RewardIcon reward={r} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: isActive ? '#E0E0E0' : '#777', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.name}
                  {!isActive && <span style={{ fontSize: 9, color: '#EF5350', marginLeft: 6, fontWeight: 800, letterSpacing: .5 }}>INACTIVO</span>}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ ...sMono, fontSize: 11.5, color: '#FBBC04', fontWeight: 800 }}>{(r.points_cost || r.pts || 0).toLocaleString('en-US')} pts</span>
                  <span style={{ fontSize: 9, background: cs.bg, color: cs.c, padding: '2px 7px', borderRadius: 6, fontWeight: 800, letterSpacing: .3 }}>{CAT_LABELS[r.category || r.cat] || r.category || r.cat}</span>
                  {tier && <span style={{ fontSize: 9, background: 'rgba(251,188,4,.15)', color: '#FBBC04', padding: '2px 7px', borderRadius: 6, fontWeight: 800 }}>{tier}</span>}
                  {locs > 0 && <span style={{ fontSize: 9, background: 'rgba(100,181,246,.15)', color: '#64B5F6', padding: '2px 7px', borderRadius: 6, fontWeight: 800 }}>{locs} LOCALIZACIÓN{locs > 1 ? 'ES' : ''}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                <button onClick={() => openEdit(r)} style={miniBtn('#64B5F6')}>Editar</button>
                <button onClick={() => toggle(r)} style={miniBtn(isActive ? '#FF8F00' : '#81C784')}>{isActive ? 'Desactivar' : 'Activar'}</button>
                <button onClick={() => del(r)} style={miniBtn('#EF5350')}>Eliminar</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Form (modal oscuro centrado, patrón ReasonModal) ── */}
      {showForm && (
        <div onClick={() => !saving && setShowForm(false)} style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: AT.bg, border: `1px solid ${AT.border}`,
            borderRadius: 20, padding: 24, width: '100%', maxWidth: 480,
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 16 }}>{editR ? 'Editar premio' : 'Nuevo premio'}</div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={lbl}>Nombre *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ej: Lavado de auto" style={{ ...inputStyleDark, fontSize: 13, padding: '10px 12px' }} />
              </div>
              <div>
                <label style={lbl}>Puntos *</label>
                <input value={form.pts} onChange={e => setForm(p => ({ ...p, pts: e.target.value.replace(/[^0-9]/g, '') }))}
                  placeholder="150" inputMode="numeric" style={{ ...inputStyleDark, ...sMono, fontSize: 13, padding: '10px 12px', textAlign: 'center' }} />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Descripción</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={4}
                placeholder="Detalle del premio: describe el servicio o bien que el cliente adquiere con el canje (se muestra al confirmar el canje)"
                style={{ ...inputStyleDark, fontSize: 13, padding: '10px 12px', resize: 'vertical', lineHeight: 1.5 }} />
            </div>

            {/* Ícono SVG — guarda la clave que RewardIcon resuelve en el cliente */}
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Ícono</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))', gap: 6 }}>
                {ICON_OPTIONS.map(o => {
                  const on = form.icon === o.k;
                  return (
                    <button key={o.k} onClick={() => setForm(p => ({ ...p, icon: o.k }))} title={o.t} style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      padding: '9px 4px', borderRadius: 12, cursor: 'pointer',
                      border: `1px solid ${on ? '#FBBC04' : AT.border}`,
                      background: on ? 'rgba(251,188,4,.12)' : 'transparent',
                      color: on ? '#FBBC04' : '#9E9E9E', fontFamily: "'DM Sans'",
                    }}>
                      <o.I />
                      <span style={{ fontSize: 9.5, fontWeight: 700 }}>{o.t}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 12 }}>
              <div>
                <label style={lbl}>Categoría</label>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {CATS.map(c => (
                    <button key={c} onClick={() => setForm(p => ({ ...p, cat: c }))} style={locChip(form.cat === c)}>{CAT_LABELS[c]}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={lbl}>Nivel exclusivo</label>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {TIERS.map(t => (
                    <button key={t} onClick={() => setForm(p => ({ ...p, tier: t }))} style={locChip(form.tier === t)}>{t === 'todos' ? 'Todos' : t}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* D17: localizaciones de canje — ninguna = todas las estaciones */}
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Válido en (ninguna = todas las estaciones)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {stations.map(s => (
                  <button key={s.id} onClick={() => toggleLoc('stationIds', s.id)} style={locChip(form.stationIds.includes(s.id))}>{s.name}</button>
                ))}
                {(stores || []).map(s => (
                  <button key={s.id} onClick={() => toggleLoc('storeIds', s.id)} style={locChip(form.storeIds.includes(s.id))}>{s.name}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,.05)', borderRadius: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#E0E0E0' }}>Premio activo</span>
              <button onClick={() => setForm(p => ({ ...p, active: !p.active }))} style={{
                padding: '6px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: form.active ? '#2E7D32' : '#616161', color: '#fff',
                fontFamily: "'DM Sans'", fontWeight: 800, fontSize: 12,
              }}>
                {form.active ? 'Activo' : 'Inactivo'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowForm(false)} disabled={saving} style={{
                flex: 1, padding: 13, borderRadius: 12, cursor: 'pointer',
                border: `1px solid ${AT.border}`, background: 'transparent', color: '#9E9E9E',
                fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700,
              }}>Cancelar</button>
              <button onClick={save} disabled={saving} style={{
                flex: 2, padding: 13, borderRadius: 12, cursor: 'pointer', border: 'none',
                background: '#FBBC04', color: '#0D0D0D', opacity: saving ? .7 : 1,
                fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 800,
              }}>
                {saving ? 'Guardando...' : editR ? 'Guardar cambios' : 'Crear premio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Motivo obligatorio para editar/desactivar/eliminar (auditado) */}
      <ReasonModal
        open={showReason}
        onClose={() => {
          setShowReason(false);
          // Editar cancelado → reabrir el form con lo editado intacto
          if (pending?.type === 'edit') setShowForm(true);
          setPending(null);
        }}
        onConfirm={confirmAction}
        actionLabel={pending?.label || ''}
        loading={saving}
      />
    </div>
  );
}
