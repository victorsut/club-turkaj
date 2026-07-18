// src/views/admin/AdminPromos.jsx
// Gestión de promociones del carrusel/vista del miembro.
// R1b.2 (D33): el formulario vive en AdminPromoForm.jsx (campos
// visuales: categoría, vigencia, condiciones, sujeto de imagen en
// Storage, vínculo con regla PROMO-1). Acá queda la lista + acciones
// auditadas (patrón F0.3.7: edit/delete/toggle vía ReasonModal,
// client-first; create sin auditoría, consistente con F0.3.5/F0.3.6).
import { useState } from 'react';
import { sb } from '../../lib/supabaseClient';
import { btnYellow, adminTheme as AT } from '../../constants/styles';
import ReasonModal from '../../components/ui/ReasonModal';
import { logAdminAction } from '../../services/rpcServices';
import AdminPromoForm from './AdminPromoForm';

const CATEGORY_LABELS = { combustible: 'Combustible', tienda: 'Tienda', servicios: 'Servicios' };

// Snapshot para auditoría (old_value) — incluye los campos R1b.2.
const snap = (p) => ({
  title: p.title,
  description: p.desc,
  icon: p.icon,
  bg_gradient: p.bg,
  text_color: p.color,
  sort_order: p.sort_order,
  active: p.active !== false,
  image_url: p.image_url || null,
  category: p.category || null,
  valid_until: p.valid_until || null,
  conditions: p.conditions || null,
  promo_rule_id: p.promo_rule_id || null,
  text_colors: p.text_colors || null,
});

// Fila de la DB → shape del estado local (App.jsx usa el mismo).
const mapRow = (r) => ({
  id: r.id, title: r.title, desc: r.description, icon: r.icon,
  bg: r.bg_gradient, color: r.text_color, sort_order: r.sort_order,
  active: r.active !== false,
  image_url: r.image_url || null, category: r.category || null,
  valid_until: r.valid_until || null, conditions: r.conditions || null,
  promo_rule_id: r.promo_rule_id || null,
  text_colors: r.text_colors || null,
});

export default function AdminPromos(ctx) {
  const { promos, setPromos, fire, sbConnected, loggedAdmin, setScr } = ctx;

  const [editing, setEditing] = useState(null);   // null | 'new' | promo
  const [saving, setSaving]   = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [pendingAction, setPendingAction]     = useState(null);

  const AT_card = { background: AT.card, borderRadius: 16, padding: 20, border: `1px solid ${AT.border}`, marginBottom: 12 };

  // ── Submit del form (create directo / edit vía ReasonModal) ──
  const onFormSubmit = async (data) => {
    if (!sb || !sbConnected) { fire('❌ Sin conexión a Supabase'); return; }

    if (editing !== 'new') {
      if (!loggedAdmin?.id) { fire('Error: sesion admin no disponible'); return; }
      const target = editing;
      setPendingAction({
        type: 'edit',
        entityId: target.id,
        payload: { updates: data, reopen: target },
        actionLabel: 'Editar promocion: ' + data.title,
        oldSnapshot: snap(target),
      });
      setEditing(null);   // Cerrar form (se reabre si el update falla)
      setShowReasonModal(true);
      return;
    }

    // CREATE: insert directo, sin auditoria (consistente con F0.3.5/F0.3.6).
    setSaving(true);
    const res = await sb.from('promotions').insert(data).select();
    setSaving(false);
    if (res.error) { fire('❌ Error: ' + res.error.message); return; }
    setPromos(p => [...p, mapRow(res.data[0])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
    fire('✅ Promoción creada');
    setEditing(null);
  };

  // F0.3.7: toggle y delete son acciones auditadas via ReasonModal.
  const toggleActive = (promo) => {
    if (!loggedAdmin?.id) { fire('Error: sesion admin no disponible'); return; }
    const isActive = promo.active !== false;
    setPendingAction({
      type: 'toggle',
      entityId: promo.id,
      payload: { newActive: !isActive },
      actionLabel: (isActive ? 'Desactivar promocion: ' : 'Activar promocion: ') + promo.title,
      oldSnapshot: { active: isActive },
    });
    setShowReasonModal(true);
  };

  const deletePromo = (promo) => {
    if (!loggedAdmin?.id) { fire('Error: sesion admin no disponible'); return; }
    setPendingAction({
      type: 'delete',
      entityId: promo.id,
      actionLabel: 'Eliminar promocion: ' + promo.title,
      oldSnapshot: snap(promo),
    });
    setShowReasonModal(true);
  };

  // F0.3.7: ejecutor unificado (client-first: muta primero, audita
  // despues; si el log falla NO se revierte — warning + console.error).
  const confirmAction = async (reason) => {
    if (!loggedAdmin?.id) { setShowReasonModal(false); fire('Error: sesion admin no disponible'); return; }
    if (!pendingAction) { setShowReasonModal(false); return; }

    const audit = {
      adminId: loggedAdmin.id, adminName: loggedAdmin.name,
      adminEmail: loggedAdmin.email, reasonText: reason,
    };
    const eid = pendingAction.entityId;
    setSaving(true);
    try {
      switch (pendingAction.type) {
        case 'edit': {
          const { error: upErr } = await sb.from('promotions').update(pendingAction.payload.updates).eq('id', eid);
          if (upErr) {
            setShowReasonModal(false);
            setEditing(pendingAction.payload.reopen);   // Reabrir form
            fire('Error: ' + upErr.message);
            return;
          }
          const { error: logErr } = await logAdminAction({
            ...audit,
            action: 'update_promotion', entityType: 'promotion', entityId: eid,
            oldValue: pendingAction.oldSnapshot, newValue: pendingAction.payload.updates,
          });
          if (logErr) { console.error('[F0.3.7] log update_promotion fallo:', logErr); fire('⚠️ Actualizado, pero la auditoria fallo'); }

          const u = pendingAction.payload.updates;
          setPromos(prev => prev.map(p => p.id === eid ? {
            ...p, title: u.title, desc: u.description, icon: u.icon,
            bg: u.bg_gradient, color: u.text_color, sort_order: u.sort_order,
            image_url: u.image_url, category: u.category,
            valid_until: u.valid_until, conditions: u.conditions,
            promo_rule_id: u.promo_rule_id, text_colors: u.text_colors || null,
          } : p));
          fire('Promocion actualizada');
          break;
        }

        case 'delete': {
          const { error: delErr } = await sb.from('promotions').delete().eq('id', eid);
          if (delErr) { setShowReasonModal(false); fire('Error: ' + delErr.message); return; }
          const { error: logErr } = await logAdminAction({
            ...audit,
            action: 'delete_promotion', entityType: 'promotion', entityId: eid,
            oldValue: pendingAction.oldSnapshot, newValue: null,
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
            action: 'toggle_promotion_active', entityType: 'promotion', entityId: eid,
            oldValue: pendingAction.oldSnapshot, newValue: { active: pendingAction.payload.newActive },
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
        <div style={{ display: 'flex', gap: 8 }}>
          {/* PROMO-1: acceso al motor de reglas (dobles puntos, bonus) */}
          <button onClick={() => setScr('promorules')} style={{
            padding: '10px 14px', fontSize: 13, borderRadius: 12, cursor: 'pointer',
            border: `1px solid ${AT.border}`, background: 'none', color: AT.txt,
            fontFamily: "'DM Sans'", fontWeight: 700,
          }}>
            ⚙️ Motor
          </button>
          <button onClick={() => setEditing('new')} style={{ ...btnYellow, padding: '10px 18px', fontSize: 13, width: 'auto' }}>
            + Nueva
          </button>
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        {promos.length === 0 && !editing && (
          <div style={{ textAlign: 'center', padding: 40, color: AT.sub }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📢</div>
            No hay promociones creadas aún.<br />Presioná "+ Nueva" para comenzar.
          </div>
        )}

        {promos.map(p => (
          <div key={p.id} style={{ ...AT_card, opacity: p.active ? 1 : .5 }}>
            {/* Preview mini */}
            <div style={{ borderRadius: 12, padding: '12px 16px', background: p.bg || '#333', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, position: 'relative', overflow: 'hidden' }}>
              {p.image_url
                ? <img src={p.image_url} alt="" style={{ width: 44, height: 44, objectFit: 'contain', flexShrink: 0 }} />
                : p.icon && <div style={{ fontSize: 28, flexShrink: 0 }}>{p.icon}</div>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: p.color || '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                {p.desc && <div style={{ fontSize: 11, color: p.color || '#fff', opacity: .7, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.desc}</div>}
              </div>
              <div style={{ fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: p.active ? 'rgba(76,175,80,.3)' : 'rgba(158,158,158,.3)', color: p.active ? '#66BB6A' : AT.sub, flexShrink: 0 }}>
                {p.active ? 'ACTIVA' : 'INACTIVA'}
              </div>
            </div>

            {/* Meta R1b.2: categoría + vigencia */}
            <div style={{ fontSize: 11, color: AT.sub, marginBottom: 12 }}>
              {CATEGORY_LABELS[p.category] || 'Sin categoría'}
              {p.valid_until && ` · Válido hasta ${p.valid_until.split('-').reverse().join('/')}`}
              {p.conditions && ` · ${p.conditions}`}
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
              <button onClick={() => setEditing(p)} style={{
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

      {/* R1b.2: form en bottom-sheet propio */}
      {editing && (
        <AdminPromoForm
          key={editing === 'new' ? 'new' : editing.id}
          promo={editing}
          saving={saving}
          fire={fire}
          onCancel={() => setEditing(null)}
          onSubmit={onFormSubmit}
        />
      )}

      {/* F0.3.7: ReasonModal unificado para edit/delete/toggle */}
      <ReasonModal
        open={showReasonModal}
        onClose={() => {
          if (saving) return;
          setShowReasonModal(false);
          if (pendingAction?.payload?.reopen) setEditing(pendingAction.payload.reopen);
          setPendingAction(null);
        }}
        onConfirm={confirmAction}
        actionLabel={pendingAction?.actionLabel || 'Confirmar accion'}
        loading={saving}
      />
    </div>
  );
}
