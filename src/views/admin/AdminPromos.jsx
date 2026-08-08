// src/views/admin/AdminPromos.jsx
// Gestión de promociones del carrusel/vista del miembro.
// R1b.2 (D33): el formulario vive en AdminPromoForm.jsx (campos
// visuales: categoría, vigencia, condiciones, sujeto de imagen en
// Storage, vínculo con regla PROMO-1). Acá queda la lista + acciones
// auditadas (patrón F0.3.7: edit/delete/toggle vía ReasonModal,
// client-first; create sin auditoría, consistente con F0.3.5/F0.3.6).
// Admin v2 (8-ago-2026, FORMATO GENERAL): flat sin emojis; el botón
// "Motor" se retiró (la navegación vive en el sidebar). El mini
// preview de cada card SÍ conserva el contenido real de la promo
// (imagen/ícono elegidos) — es la vista previa de lo que ve el cliente.
import { useState } from 'react';
import { sb } from '../../lib/supabaseClient';
import { btnYellow, adminTheme as AT } from '../../constants/styles';
import { Plus, Megaphone } from '../../components/ui/Icons';
import ReasonModal from '../../components/ui/ReasonModal';
import { adminWriteCatalog } from '../../services/secureReads';
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
  const { promos, setPromos, fire, sbConnected, loggedAdmin } = ctx;

  const [editing, setEditing] = useState(null);   // null | 'new' | promo
  const [saving, setSaving]   = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [pendingAction, setPendingAction]     = useState(null);

  const AT_card = { background: AT.card, borderRadius: 16, padding: 20, border: `1px solid ${AT.border}`, marginBottom: 12 };

  // ── Submit del form (create directo / edit vía ReasonModal) ──
  const onFormSubmit = async (data) => {
    if (!sb || !sbConnected) { fire('Sin conexión a Supabase'); return; }

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

    // CREATE: SEC.C.4 — promotions perdió la escritura abierta; el RPC
    // valida la sesión de admin y registra la auditoría.
    setSaving(true);
    const res = await adminWriteCatalog('promotion', 'create', {
      data,
      audit: { adminId: loggedAdmin?.id, adminName: loggedAdmin?.name, adminEmail: loggedAdmin?.email },
    });
    setSaving(false);
    if (res.error) { fire('Error: ' + res.error); return; }
    setPromos(p => [...p, mapRow(res.row || { ...data, id: res.id })].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
    fire('Promoción creada');
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
          // SEC.C.4: escritura + auditoría atómica en el RPC.
          const res = await adminWriteCatalog('promotion', 'update', {
            id: eid, data: pendingAction.payload.updates, audit,
          });
          if (res.error) {
            setShowReasonModal(false);
            setEditing(pendingAction.payload.reopen);   // Reabrir form
            fire('Error: ' + res.error);
            return;
          }

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
          const res = await adminWriteCatalog('promotion', 'delete', { id: eid, audit });
          if (res.error) { setShowReasonModal(false); fire('Error: ' + res.error); return; }
          setPromos(prev => prev.filter(p => p.id !== eid));
          fire('Promocion eliminada');
          break;
        }

        case 'toggle': {
          const res = await adminWriteCatalog('promotion', 'update', {
            id: eid, data: { active: pendingAction.payload.newActive }, audit,
          });
          if (res.error) { setShowReasonModal(false); fire('Error: ' + res.error); return; }
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

  const activeCount = promos.filter(p => p.active !== false).length;

  return (
    <div style={{ padding: '22px 22px 60px' }}>
      {/* Encabezado (FORMATO GENERAL Admin v2 — la navegación al Motor
          vive en el sidebar) */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 21, fontWeight: 800, color: '#fff' }}>Promociones</div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#9E9E9E', marginTop: 2 }}>
            {promos.length.toLocaleString('en-US')} promociones — {activeCount.toLocaleString('en-US')} activas · las cards que ve el cliente
          </div>
        </div>
        <button onClick={() => setEditing('new')}
          style={{ ...btnYellow, display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 12, fontSize: 13, padding: '11px 18px', width: 'auto' }}>
          <span style={{ display: 'flex', transform: 'scale(.8)' }}><Plus /></span> Nueva promoción
        </button>
      </div>

      {promos.length === 0 && !editing && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#777' }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, margin: '0 auto 12px', background: AT.card, border: `1px solid ${AT.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}><Megaphone /></div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#9E9E9E' }}>No hay promociones creadas aún</div>
          <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>Creá la primera con "Nueva promoción"</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
        {promos.map(p => (
          <div key={p.id} style={{ ...AT_card, marginBottom: 0, opacity: p.active ? 1 : .55 }}>
            {/* Preview mini — contenido REAL de la promo (lo que ve el cliente) */}
            <div style={{ borderRadius: 12, padding: '12px 16px', background: p.bg || '#333', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, position: 'relative', overflow: 'hidden' }}>
              {p.image_url
                ? <img src={p.image_url} alt="" style={{ width: 44, height: 44, objectFit: 'contain', flexShrink: 0 }} />
                : p.icon && <div style={{ fontSize: 28, flexShrink: 0 }}>{p.icon}</div>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: p.color || '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                {p.desc && <div style={{ fontSize: 11, color: p.color || '#fff', opacity: .7, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.desc}</div>}
              </div>
              <div style={{ fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: p.active ? 'rgba(76,175,80,.3)' : 'rgba(158,158,158,.3)', color: p.active ? '#81C784' : AT.sub, flexShrink: 0, letterSpacing: .5 }}>
                {p.active ? 'ACTIVA' : 'INACTIVA'}
              </div>
            </div>

            {/* Meta R1b.2: categoría + vigencia + vínculo con el motor */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 9, fontWeight: 800, background: 'rgba(255,255,255,.08)', color: '#aaa', padding: '2px 8px', borderRadius: 6, letterSpacing: .3 }}>
                {(CATEGORY_LABELS[p.category] || 'Sin categoría').toUpperCase()}
              </span>
              {p.valid_until && (
                <span style={{ fontSize: 10.5, color: '#9E9E9E', fontWeight: 700 }}>Válido hasta {p.valid_until.split('-').reverse().join('/')}</span>
              )}
              {p.promo_rule_id && (
                <span style={{ fontSize: 9, fontWeight: 800, background: 'rgba(251,188,4,.15)', color: '#FBBC04', padding: '2px 8px', borderRadius: 6, letterSpacing: .3 }}>VINCULADA AL MOTOR</span>
              )}
              {p.conditions && (
                <span style={{ fontSize: 10.5, color: '#777', fontWeight: 600, width: '100%' }}>{p.conditions}</span>
              )}
            </div>

            {/* Acciones */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setEditing(p)} style={{
                flex: 1, padding: '9px 0', borderRadius: 10, border: `1px solid ${AT.border}`,
                background: 'none', color: '#64B5F6', fontFamily: "'DM Sans'", fontWeight: 700, fontSize: 12, cursor: 'pointer',
              }}>
                Editar
              </button>
              <button onClick={() => toggleActive(p)} style={{
                flex: 1, padding: '9px 0', borderRadius: 10, border: `1px solid ${AT.border}`,
                background: 'none', color: p.active ? '#FF8F00' : '#81C784',
                fontFamily: "'DM Sans'", fontWeight: 700, fontSize: 12, cursor: 'pointer',
              }}>
                {p.active ? 'Desactivar' : 'Activar'}
              </button>
              <button onClick={() => deletePromo(p)} style={{
                padding: '9px 14px', borderRadius: 10, border: `1px solid ${AT.border}`,
                background: 'none', color: '#EF5350', fontFamily: "'DM Sans'", fontWeight: 700, fontSize: 12, cursor: 'pointer',
              }}>
                Eliminar
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
