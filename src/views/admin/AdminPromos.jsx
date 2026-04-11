// src/views/admin/AdminPromos.jsx
// Gestión de promociones del carrusel en la vista del miembro
import { useState } from 'react';
import { sb } from '../../lib/supabaseClient';
import { inputStyle, btnYellow, adminTheme as AT } from '../../constants/styles';

const GRADIENTS = [
  { label: 'Dorado',    value: 'linear-gradient(135deg,#FBBC04,#FFD540)' },
  { label: 'Rojo',      value: 'linear-gradient(135deg,#E53935,#EF9A9A)' },
  { label: 'Verde',     value: 'linear-gradient(135deg,#2E7D32,#66BB6A)' },
  { label: 'Azul',      value: 'linear-gradient(135deg,#1565C0,#42A5F5)' },
  { label: 'Morado',    value: 'linear-gradient(135deg,#6A1B9A,#CE93D8)' },
  { label: 'Naranja',   value: 'linear-gradient(135deg,#E65100,#FFA726)' },
  { label: 'Galaxia',   value: 'radial-gradient(ellipse at 20% 30%,#0d0d1a 0%,#050508 60%,#000 100%)' },
  { label: 'Turquesa',  value: 'linear-gradient(135deg,#00695C,#4DB6AC)' },
];

const EMPTY = { title: '', desc: '', icon: '', bg_gradient: GRADIENTS[0].value, text_color: '#ffffff', sort_order: 0, active: true };

export default function AdminPromos(ctx) {
  const { promos, setPromos, fire, sbConnected } = ctx;

  const [editing, setEditing]   = useState(null);  // promo en edición
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);

  const AT_card = { background: AT.card, borderRadius: 16, padding: 20, border: `1px solid ${AT.border}`, marginBottom: 12 };

  const openNew  = () => { setForm(EMPTY); setEditing('new'); };
  const openEdit = (p) => { setForm({ title: p.title, desc: p.desc || '', icon: p.icon || '', bg_gradient: p.bg || GRADIENTS[0].value, text_color: p.color || '#ffffff', sort_order: p.sort_order || 0, active: p.active !== false }); setEditing(p.id); };
  const cancel   = () => { setEditing(null); setForm(EMPTY); };

  const save = async () => {
    if (!form.title.trim()) { fire('❌ El título es obligatorio'); return; }
    if (!sb || !sbConnected) { fire('❌ Sin conexión a Supabase'); return; }
    setSaving(true);

    const data = {
      title:       form.title.trim(),
      description: form.desc.trim(),
      icon:        form.icon.trim(),
      bg_gradient: form.bg_gradient,
      text_color:  form.text_color,
      sort_order:  parseInt(form.sort_order) || 0,
      active:      form.active,
    };

    let res;
    if (editing === 'new') {
      res = await sb.from('promotions').insert(data).select();
    } else {
      res = await sb.from('promotions').update(data).eq('id', editing).select();
    }

    setSaving(false);
    if (res.error) { fire('❌ Error: ' + res.error.message); return; }

    const updated = res.data[0];
    const mapped = { id: updated.id, title: updated.title, desc: updated.description, icon: updated.icon, bg: updated.bg_gradient, color: updated.text_color, sort_order: updated.sort_order, active: updated.active };

    if (editing === 'new') {
      setPromos(p => [...p, mapped].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
      fire('✅ Promoción creada');
    } else {
      setPromos(p => p.map(x => x.id === editing ? mapped : x));
      fire('✅ Promoción actualizada');
    }
    cancel();
  };

  const toggleActive = async (promo) => {
    if (!sb || !sbConnected) { fire('❌ Sin conexión'); return; }
    const newVal = !promo.active;
    const { error } = await sb.from('promotions').update({ active: newVal }).eq('id', promo.id);
    if (error) {
      console.error('[Promos] toggleActive error:', error);
      fire('❌ Error al actualizar: ' + error.message);
      return;
    }
    setPromos(p => p.map(x => x.id === promo.id ? { ...x, active: newVal } : x));
    fire(newVal ? '✅ Promoción activada' : '⏸️ Promoción desactivada');
  };

  const deletePromo = async (id) => {
    if (!sb || !sbConnected) return;
    await sb.from('promotions').delete().eq('id', id);
    setPromos(p => p.filter(x => x.id !== id));
    fire('🗑️ Promoción eliminada');
    if (editing === id) cancel();
  };

  const F = ({ label, fieldKey, type = 'text', placeholder = '' }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: AT.sub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>{label}</div>
      <input
        type={type}
        value={form[fieldKey] || ''}
        placeholder={placeholder}
        onChange={e => setForm(p => ({ ...p, [fieldKey]: e.target.value }))}
        style={{ ...inputStyle, background: '#333', border: `1px solid ${AT.border}`, color: AT.txt }}
      />
    </div>
  );

  return (
    <div style={{ paddingBottom: 100, background: AT.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 12px' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: AT.txt }}>📢 Promociones</div>
        <button onClick={openNew} style={{ ...btnYellow, padding: '10px 18px', fontSize: 13, width: 'auto' }}>
          + Nueva
        </button>
      </div>

      <div style={{ padding: '0 20px' }}>

        {/* ── Formulario edición/creación ── */}
        {editing && (
          <div style={{ ...AT_card, border: `1px solid #FBBC04` }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: AT.txt, marginBottom: 16 }}>
              {editing === 'new' ? '➕ Nueva promoción' : '✏️ Editar promoción'}
            </div>

            <F label="Título *" fieldKey="title" placeholder="Ej: ¡Combustible al 10% off!" />
            <F label="Descripción" fieldKey="desc" placeholder="Descripción breve de la promo" />
            <F label="Ícono (emoji)" fieldKey="icon" placeholder="🎉" />

            {/* Gradiente */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: AT.sub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>Color de fondo</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {GRADIENTS.map(g => (
                  <div key={g.value} onClick={() => setForm(p => ({ ...p, bg_gradient: g.value }))} style={{
                    height: 36, borderRadius: 10, background: g.value, cursor: 'pointer',
                    border: form.bg_gradient === g.value ? '2px solid #FBBC04' : '2px solid transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 700, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,.5)',
                  }}>{g.label}</div>
                ))}
              </div>
            </div>

            {/* Color texto */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: AT.sub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>Color del texto</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['#ffffff', '#0D0D0D', '#FBBC04', '#FFD54F'].map(c => (
                  <div key={c} onClick={() => setForm(p => ({ ...p, text_color: c }))} style={{
                    width: 36, height: 36, borderRadius: 10, background: c, cursor: 'pointer',
                    border: form.text_color === c ? '2px solid #FBBC04' : `2px solid ${AT.border}`,
                  }} />
                ))}
                <input type="color" value={form.text_color}
                  onChange={e => setForm(p => ({ ...p, text_color: e.target.value }))}
                  style={{ width: 36, height: 36, borderRadius: 10, border: `2px solid ${AT.border}`, background: 'none', cursor: 'pointer', padding: 2 }} />
              </div>
            </div>

            <F label="Orden (número)" fieldKey="sort_order" type="number" placeholder="0" />

            {/* Activa */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div onClick={() => setForm(p => ({ ...p, active: !p.active }))} style={{
                width: 44, height: 24, borderRadius: 12, background: form.active ? '#FBBC04' : '#555',
                position: 'relative', cursor: 'pointer', transition: 'background .2s',
              }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: form.active ? 23 : 3, transition: 'left .2s' }} />
              </div>
              <span style={{ fontSize: 13, color: AT.txt, fontWeight: 600 }}>{form.active ? 'Activa' : 'Inactiva'}</span>
            </div>

            {/* Preview */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: AT.sub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>Vista previa</div>
              <div style={{ borderRadius: 14, padding: '14px 18px', background: form.bg_gradient, display: 'flex', alignItems: 'center', gap: 14 }}>
                {form.icon && <div style={{ fontSize: 32 }}>{form.icon}</div>}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: form.text_color }}>{form.title || 'Título de la promo'}</div>
                  {form.desc && <div style={{ fontSize: 11, color: form.text_color, opacity: .8, marginTop: 2 }}>{form.desc}</div>}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={cancel} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${AT.border}`, background: 'none', color: AT.sub, fontFamily: "'DM Sans'", fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                Cancelar
              </button>
              <button onClick={save} disabled={saving} style={{ ...btnYellow, flex: 2, padding: 12, fontSize: 14, opacity: saving ? .7 : 1 }}>
                {saving ? 'Guardando...' : editing === 'new' ? 'Crear promoción' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        )}

        {/* ── Lista de promociones ── */}
        {promos.length === 0 && !editing && (
          <div style={{ textAlign: 'center', padding: 40, color: AT.sub }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📢</div>
            No hay promociones creadas aún.<br />Presioná "+ Nueva" para comenzar.
          </div>
        )}

        {promos.map(p => (
          <div key={p.id} style={{ ...AT_card, opacity: p.active ? 1 : .5 }}>
            {/* Preview mini */}
            <div style={{ borderRadius: 12, padding: '12px 16px', background: p.bg || '#333', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              {p.icon && <div style={{ fontSize: 28 }}>{p.icon}</div>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: p.color || '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                {p.desc && <div style={{ fontSize: 11, color: p.color || '#fff', opacity: .7, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.desc}</div>}
              </div>
              <div style={{ fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: p.active ? 'rgba(76,175,80,.3)' : 'rgba(158,158,158,.3)', color: p.active ? '#66BB6A' : AT.sub, flexShrink: 0 }}>
                {p.active ? 'ACTIVA' : 'INACTIVA'}
              </div>
            </div>

            {/* Acciones */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => toggleActive(p)} style={{
                flex: 1, padding: '9px 0', borderRadius: 10, border: `1px solid ${AT.border}`,
                background: 'none', color: p.active ? '#FF8F00' : '#66BB6A',
                fontFamily: "'DM Sans'", fontWeight: 700, fontSize: 12, cursor: 'pointer',
              }}>
                {p.active ? '⏸ Desactivar' : '▶ Activar'}
              </button>
              <button onClick={() => openEdit(p)} style={{
                flex: 1, padding: '9px 0', borderRadius: 10, border: `1px solid ${AT.border}`,
                background: 'none', color: '#FBBC04', fontFamily: "'DM Sans'", fontWeight: 700, fontSize: 12, cursor: 'pointer',
              }}>
                ✏️ Editar
              </button>
              <button onClick={() => deletePromo(p.id)} style={{
                padding: '9px 14px', borderRadius: 10, border: `1px solid ${AT.border}`,
                background: 'none', color: '#EF5350', fontFamily: "'DM Sans'", fontWeight: 700, fontSize: 12, cursor: 'pointer',
              }}>
                🗑
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
