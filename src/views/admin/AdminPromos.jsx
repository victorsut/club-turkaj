// src/views/admin/AdminPromos.jsx
// Gestión de promociones del carrusel en la vista del miembro
import { useState } from 'react';
import { sb } from '../../lib/supabaseClient';
import { inputStyle, btnYellow, adminTheme as AT } from '../../constants/styles';
import ReasonModal from '../../components/ui/ReasonModal';
import { logAdminAction } from '../../services/rpcServices';

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

// F0.3.9 S3.1: campo de texto reutilizable. DEBE vivir a nivel de modulo
// (no dentro de AdminPromos): declararlo in-line creaba una funcion nueva
// en cada render, lo que hacia que React remontara el <input> y perdiera
// el focus tras cada tecla. AT e inputStyle son imports de modulo; form y
// setForm se reciben como props.
const F = ({ label, fieldKey, type = 'text', placeholder = '', form, setForm }) => (
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

export default function AdminPromos(ctx) {
  const { promos, setPromos, fire, sbConnected, loggedAdmin } = ctx;

  const [editing, setEditing]   = useState(null);  // promo en edición
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);
  // F0.3.7: ReasonModal unificado para acciones sensibles (edit/delete/toggle).
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [pendingAction, setPendingAction]     = useState(null);

  const AT_card = { background: AT.card, borderRadius: 16, padding: 20, border: `1px solid ${AT.border}`, marginBottom: 12 };

  const openNew  = () => { setForm(EMPTY); setEditing('new'); };
  const openEdit = (p) => { setForm({ title: p.title, desc: p.desc || '', icon: p.icon || '', bg_gradient: p.bg || GRADIENTS[0].value, text_color: p.color || '#ffffff', sort_order: p.sort_order || 0, active: p.active !== false }); setEditing(p.id); };
  const cancel   = () => { setEditing(null); setForm(EMPTY); };

  const save = async () => {
    if (!form.title.trim()) { fire('❌ El título es obligatorio'); return; }
    if (!sb || !sbConnected) { fire('❌ Sin conexión a Supabase'); return; }

    // RAMA EDIT: auditar via ReasonModal (el UPDATE real ocurre en confirmAction).
    if (editing !== 'new') {
      if (!loggedAdmin?.id) { fire('Error: sesion admin no disponible'); return; }
      const oldPromo = promos.find(p => p.id === editing);
      const oldSnapshot = oldPromo ? {
        title: oldPromo.title,
        description: oldPromo.desc,
        icon: oldPromo.icon,
        bg_gradient: oldPromo.bg,
        text_color: oldPromo.color,
        sort_order: oldPromo.sort_order,
        active: oldPromo.active !== false,
      } : null;
      const updates = {
        title:       form.title.trim(),
        description: form.desc.trim(),
        icon:        form.icon.trim(),
        bg_gradient: form.bg_gradient,
        text_color:  form.text_color,
        sort_order:  parseInt(form.sort_order) || 0,
      };
      setPendingAction({
        type: 'edit',
        entityId: editing,
        payload: { updates },
        actionLabel: 'Editar promocion: ' + updates.title,
        oldSnapshot,
      });
      setEditing(null);   // Cerrar form inline (se reabre si el update falla)
      setShowReasonModal(true);
      return;
    }

    // RAMA CREATE: insert directo, sin auditoria (consistente con F0.3.5/F0.3.6).
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
    const res = await sb.from('promotions').insert(data).select();
    setSaving(false);
    if (res.error) { fire('❌ Error: ' + res.error.message); return; }

    const updated = res.data[0];
    const mapped = { id: updated.id, title: updated.title, desc: updated.description, icon: updated.icon, bg: updated.bg_gradient, color: updated.text_color, sort_order: updated.sort_order, active: updated.active };
    setPromos(p => [...p, mapped].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
    fire('✅ Promoción creada');
    cancel();
  };

  // F0.3.7: toggle ahora es accion auditada. Encola y abre ReasonModal.
  const toggleActive = (promo) => {
    if (!loggedAdmin?.id) { fire('Error: sesion admin no disponible'); return; }
    const isActive = promo.active !== false;
    const newActive = !isActive;
    setPendingAction({
      type: 'toggle',
      entityId: promo.id,
      payload: { newActive },
      actionLabel: (isActive ? 'Desactivar promocion: ' : 'Activar promocion: ') + promo.title,
      oldSnapshot: { active: isActive },
    });
    setShowReasonModal(true);
  };

  // F0.3.7: eliminar ahora pasa por ReasonModal (reemplaza el delete instantaneo).
  const deletePromo = (promo) => {
    if (!loggedAdmin?.id) { fire('Error: sesion admin no disponible'); return; }
    setPendingAction({
      type: 'delete',
      entityId: promo.id,
      payload: { entity: promo },
      actionLabel: 'Eliminar promocion: ' + promo.title,
      oldSnapshot: {
        title: promo.title,
        description: promo.desc,
        icon: promo.icon,
        bg_gradient: promo.bg,
        text_color: promo.color,
        sort_order: promo.sort_order,
        active: promo.active !== false,
      },
    });
    setShowReasonModal(true);
  };

  // F0.3.7: ejecutor unificado de acciones sensibles (edit/delete/toggle).
  // Patron client-first: muta primero, audita despues; si el log falla NO se
  // revierte (warning + console.error). Espeja AdminPremios F0.3.6.
  const confirmAction = async (reason) => {
    if (!loggedAdmin?.id) {
      setShowReasonModal(false);
      fire('Error: sesion admin no disponible');
      return;
    }
    if (!pendingAction) { setShowReasonModal(false); return; }

    const audit = {
      adminId: loggedAdmin.id,
      adminName: loggedAdmin.name,
      adminEmail: loggedAdmin.email,
      reasonText: reason,
    };
    const eid = pendingAction.entityId;
    setSaving(true);
    try {
      switch (pendingAction.type) {
        case 'edit': {
          const { error: upErr } = await sb.from('promotions').update(pendingAction.payload.updates).eq('id', eid);
          if (upErr) {
            setShowReasonModal(false);
            setEditing(eid);   // Reabrir form inline
            fire('Error: ' + upErr.message);
            return;
          }
          const { error: logErr } = await logAdminAction({
            ...audit,
            action: 'update_promotion',
            entityType: 'promotion',
            entityId: eid,
            oldValue: pendingAction.oldSnapshot,
            newValue: pendingAction.payload.updates,
          });
          if (logErr) { console.error('[F0.3.7] log update_promotion fallo:', logErr); fire('⚠️ Actualizado, pero la auditoria fallo'); }

          const u = pendingAction.payload.updates;
          setPromos(prev => prev.map(p => p.id === eid ? {
            ...p, title: u.title, desc: u.description, icon: u.icon,
            bg: u.bg_gradient, color: u.text_color, sort_order: u.sort_order,
          } : p));
          fire('Promocion actualizada');
          break;
        }

        case 'delete': {
          const { error: delErr } = await sb.from('promotions').delete().eq('id', eid);
          if (delErr) { setShowReasonModal(false); fire('Error: ' + delErr.message); return; }
          const { error: logErr } = await logAdminAction({
            ...audit,
            action: 'delete_promotion',
            entityType: 'promotion',
            entityId: eid,
            oldValue: pendingAction.oldSnapshot,
            newValue: null,
          });
          if (logErr) { console.error('[F0.3.7] log delete_promotion fallo:', logErr); fire('⚠️ Eliminado, pero la auditoria fallo'); }

          setPromos(prev => prev.filter(p => p.id !== eid));
          fire('Promocion eliminada');
          break;
        }

        case 'toggle': {
          const { error: upErr } = await sb.from('promotions').update({ active: pendingAction.payload.newActive }).eq('id', eid);
          if (upErr) { setShowReasonModal(false); fire('Error: ' + upErr.message); return; }
          const { error: logErr } = await logAdminAction({
            ...audit,
            action: 'toggle_promotion_active',
            entityType: 'promotion',
            entityId: eid,
            oldValue: pendingAction.oldSnapshot,
            newValue: { active: pendingAction.payload.newActive },
          });
          if (logErr) { console.error('[F0.3.7] log toggle_promotion_active fallo:', logErr); fire('⚠️ Toggle aplicado, pero la auditoria fallo'); }

          setPromos(prev => prev.map(p => p.id === eid ? { ...p, active: pendingAction.payload.newActive } : p));
          fire(pendingAction.payload.newActive ? 'Promocion activada' : 'Promocion desactivada');
          break;
        }

        default:
          break;
      }
    } finally {
      setSaving(false);
      setPendingAction(null);
      setShowReasonModal(false);
    }
  };

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
          <div
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,.6)',
              zIndex: 400,
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            }}
            onClick={() => !saving && cancel()}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: AT.card,
                border: `1px solid #FBBC04`,
                borderRadius: '24px 24px 0 0',
                width: '100%',
                maxWidth: 480,
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: '20px 20px 40px',
              }}
            >
              <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,.2)', borderRadius: 4, margin: '0 auto 20px' }} />

              <div style={{ fontSize: 14, fontWeight: 800, color: AT.txt, marginBottom: 16 }}>
                {editing === 'new' ? '➕ Nueva promoción' : '✏️ Editar promoción'}
              </div>

              <F label="Título *" fieldKey="title" placeholder="Ej: ¡Combustible al 10% off!" form={form} setForm={setForm} />
              <F label="Descripción" fieldKey="desc" placeholder="Descripción breve de la promo" form={form} setForm={setForm} />
              <F label="Ícono (emoji)" fieldKey="icon" placeholder="🎉" form={form} setForm={setForm} />

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

              <F label="Orden (número)" fieldKey="sort_order" type="number" placeholder="0" form={form} setForm={setForm} />

              {/* Activa — solo en CREATE. En EDIT el estado se gestiona via el
                  boton Desact./Activar de la lista (auditado por ReasonModal). */}
              {editing === 'new' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div onClick={() => setForm(p => ({ ...p, active: !p.active }))} style={{
                    width: 44, height: 24, borderRadius: 12, background: form.active ? '#FBBC04' : '#555',
                    position: 'relative', cursor: 'pointer', transition: 'background .2s',
                  }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: form.active ? 23 : 3, transition: 'left .2s' }} />
                  </div>
                  <span style={{ fontSize: 13, color: AT.txt, fontWeight: 600 }}>{form.active ? 'Activa' : 'Inactiva'}</span>
                </div>
              )}

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
              <button onClick={() => deletePromo(p)} style={{
                padding: '9px 14px', borderRadius: 10, border: `1px solid ${AT.border}`,
                background: 'none', color: '#EF5350', fontFamily: "'DM Sans'", fontWeight: 700, fontSize: 12, cursor: 'pointer',
              }}>
                🗑
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* F0.3.7: ReasonModal unificado para edit/delete/toggle de promociones */}
      <ReasonModal
        open={showReasonModal}
        onClose={() => { if (!saving) { setShowReasonModal(false); setPendingAction(null); } }}
        onConfirm={confirmAction}
        actionLabel={pendingAction?.actionLabel || 'Confirmar accion'}
        loading={saving}
      />
    </div>
  );
}
