// src/views/admin/MemberDetail.jsx
// Admin member detail — profile, stats, activity history, edit, purchase, card swap
import { useState, useEffect } from 'react';
import { sb } from '../../lib/supabaseClient';
import { sMono, adminTheme as AT, btnYellow, btnDark, inputStyle } from '../../constants/styles';
import Badge from '../../components/ui/Badge';
import TierCard from '../../components/ui/TierCard';
import InactivityWarning from '../../components/ui/InactivityWarning';
import { Back } from '../../components/ui/Icons';
import ReasonModal from '../../components/ui/ReasonModal';
import { updateMemberWithAudit } from '../../services/rpcServices';

export default function MemberDetail(ctx) {
  const {
    sel, setSel, setScr, custs, setCusts, gT, cfg, fire,
    activityLog, setModal, me, setMe, loggedAdmin,
    editMember, setEditMember,
  } = ctx;

  const [localActs, setLocalActs]   = useState(null); // null = cargando
  const [freshMember, setFreshMember] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(null);

  if (!sel) { setScr('mem'); return null; }

  const c = freshMember || custs.find(x => x.id === sel.id) || sel;
  const t = gT(c.gallons);
  const acts = localActs ?? (activityLog && activityLog[c.id]) ?? [];

  // Cargar datos frescos desde Supabase al abrir el detalle
  useEffect(() => {
    if (!sel?.id || !sb) return;
    setLoadingDetail(true);
    Promise.all([
      sb.from('activity_log')
        .select('*')
        .eq('member_id', sel.id)
        .order('created_at', { ascending: false })
        .limit(100),
      sb.from('members')
        .select('*, physical_cards!assigned_to(card_code)')
        .eq('id', sel.id)
        .single(),
    ]).then(([actRes, memRes]) => {
      setLoadingDetail(false);
      if (actRes.data) {
        setLocalActs(actRes.data.map(a => ({
          type: a.activity_type, desc: a.description,
          pts: a.points_change, amount: a.amount ? parseFloat(a.amount) : null,
          date: a.created_at ? new Date(a.created_at).toLocaleDateString('es-GT') : '',
          station: a.station_id || '',
        })));
      }
      if (memRes.data) {
        const m = memRes.data;
        setFreshMember({
          ...sel,
          name: m.name, phone: m.phone || '—', dpi: m.dpi || '—',
          plate: m.plate || '—', email: m.email || '—',
          nit: m.nit || '—', bday: m.birthday || '—',
          points: m.points || 0, gallons: parseFloat(m.gallons) || 0,
          spent: parseFloat(m.spent) || 0, visits: m.visits || 0,
          tickets: m.tickets || 0, redeemed: m.redeemed_count || 0,
          cardId: m.physical_cards?.card_code || m.card_id || '—',
          registered: m.created_at ? new Date(m.created_at).toLocaleDateString('es-GT') : '—',
          lastBuy: m.last_buy ? new Date(m.last_buy).toLocaleDateString('es-GT') : 'Sin compras',
        });
      }
    });
  }, [sel?.id]);

  const actColors = {
    compra: '#2E7D32', canje: '#1565C0', evento: '#FBBC04',
    rifa: '#7B1FA2', encuesta: '#FBBC04', referido: '#FBBC04',
    registro: '#FBBC04', wifi: '#9E9E9E', degradacion: '#C62828',
  };

  const PROFILE_FIELDS = ['name', 'phone', 'dpi', 'plate', 'email', 'nit', 'birthday'];

  // Construye el diff por categoria: solo campos/categorias modificados.
  // `original` y `edited` usan nombres de campo del cliente (bday, no birthday).
  const buildDiff = (original, edited) => {
    const changes = {};
    const profileDiff = {};

    PROFILE_FIELDS.forEach(field => {
      // El cliente guarda el cumpleaños en `bday`; el server lo espera como `birthday`.
      const clientField = field === 'birthday' ? 'bday' : field;
      if ((edited[clientField] || '') !== (original[clientField] || '')) {
        profileDiff[field] = edited[clientField] || null;
      }
    });
    if (Object.keys(profileDiff).length > 0) changes.profile = profileDiff;

    const editedPoints = +edited.points || 0;
    const originalPoints = +original.points || 0;
    if (editedPoints !== originalPoints) changes.points = editedPoints;

    const editedGallons = +edited.gallons || 0;
    const originalGallons = +original.gallons || 0;
    if (editedGallons !== originalGallons) changes.gallons = editedGallons;

    return changes;
  };

  // F0.3.8.4: la edicion ahora pasa por auditoria atomica (RPC
  // update_member_with_audit). El snapshot original es `c` (sin mutar:
  // custs/freshMember no cambian hasta el exito) y `edited` es editMember
  // (el form vivo). Si no hay diff → toast + cerrar. Si hay → ReasonModal.
  const saveMember = (edited) => {
    if (!loggedAdmin?.id) {
      fire('Error: sesion admin no disponible. Cerra sesion y volve a ingresar.');
      return;
    }

    const changes = buildDiff(c, edited);

    if (Object.keys(changes).length === 0) {
      fire('Sin cambios');
      setEditMember(null);
      return;
    }

    setPendingChanges({ memberId: edited.id, changes, edited });
    setEditMember(null);       // cerrar el modal de edicion
    setShowReasonModal(true);  // pedir motivo (obligatorio server-side)
  };

  const confirmEditWithReason = async (reason) => {
    if (!loggedAdmin?.id) {
      setShowReasonModal(false);
      fire('Error: sesion admin no disponible');
      return;
    }
    if (!pendingChanges) { setShowReasonModal(false); return; }

    const audit = {
      adminId: loggedAdmin.id,
      adminName: loggedAdmin.name,
      adminEmail: loggedAdmin.email,
      reasonText: reason,
    };

    const result = await updateMemberWithAudit(
      pendingChanges.memberId,
      audit,
      pendingChanges.changes,
    );

    if (!result.ok) {
      setShowReasonModal(false);
      const errMsg = result.error?.message || 'Error desconocido';
      fire('Error: ' + errMsg);
      // Errores corregibles (validacion 22023 / UNIQUE 23505): reabrir el
      // form con lo editado intacto para que el admin pueda corregir.
      if (result.error?.code === '23505' || result.error?.code === '22023') {
        setEditMember(pendingChanges.edited);
      }
      setPendingChanges(null);
      return;
    }

    // Exito: refrescar state local (custs, freshMember y me si aplica).
    const { edited: ed, memberId } = pendingChanges;
    setCusts(prev => prev.map(m => m.id === memberId ? { ...m, ...ed } : m));
    setFreshMember(prev => (prev && prev.id === memberId ? { ...prev, ...ed } : prev));
    if (me?.id === memberId) setMe(prev => ({ ...prev, ...ed }));

    setShowReasonModal(false);
    setPendingChanges(null);
    const n = result.data?.categories_updated?.length || 0;
    fire('✅ Cliente actualizado (' + n + ' cambio' + (n === 1 ? '' : 's') + ')');
  };

  const sLbl = { display: 'block', fontSize: 12, fontWeight: 700, color: '#757575', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .8 };
  if (loadingDetail && !freshMember) return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${AT.border}`, background: '#252525', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => setScr('mem')} style={{ background: 'none', border: 'none', color: '#9E9E9E', cursor: 'pointer', fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600 }}>← Miembros</button>
      </div>
      <div style={{ textAlign: 'center', padding: 60, color: '#9E9E9E' }}>⏳ Cargando datos...</div>
    </div>
  );

  return (
    <div style={{ paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${AT.border}`, background: '#252525', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setScr('mem')} style={{ background: 'none', border: 'none', color: '#9E9E9E', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600 }}><Back /> Miembros</button>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Detalle</div>
        <div style={{ width: 80 }} />
      </div>

      {/* Profile Card */}
      <div style={{ margin: '16px 20px', padding: 20, background: AT.card, borderRadius: 18, border: `1px solid ${AT.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: t.bg, color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 22, flexShrink: 0 }}>{c.name.charAt(0)}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{c.name}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}><Badge t={t} /></div>
            <div style={{ fontSize: 11, color: '#777', marginTop: 4, ...sMono }}>{c.id}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { v: c.points, l: 'Puntos', c: '#FBBC04' },
            { v: c.gallons.toFixed(0), l: 'Galones', c: '#2E7D32' },
            { v: 'Q' + c.spent.toLocaleString(), l: 'Gastado', c: '#1565C0' },
          ].map(s => (
            <div key={s.l} style={{ background: 'rgba(255,255,255,.05)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
              <div style={{ ...sMono, fontSize: 18, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 9, color: '#777', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4, fontWeight: 700 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      <InactivityWarning last={c.lastBuy} />

      {/* Info rows */}
      <div style={{ margin: '0 20px', padding: 16, background: AT.card, borderRadius: 18, border: `1px solid ${AT.border}`, marginBottom: 12 }}>
        {[
          { l: '📱 Teléfono', v: c.phone || '—' },
          { l: '🪪 DPI', v: c.dpi || '—' },
          { l: '📧 Email', v: c.email || '—' },
          { l: '🧾 NIT', v: c.nit || '—' },
          { l: '🎂 Cumpleaños', v: c.bday || '—' },
          { l: '💳 Tarjeta', v: c.cardId || '—' },
          { l: '📅 Registro', v: c.registered || '—' },
          { l: '🛒 Última compra', v: c.lastBuy || 'Sin compras' },
          { l: '🏪 Visitas', v: c.visits || 0 },
          { l: '🎁 Canjes', v: c.redeemed || 0 },
          { l: '🎟️ Boletos', v: c.tickets || 0 },
        ].map((r, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 11 ? `1px solid ${AT.border}` : 'none', fontSize: 13 }}>
            <span style={{ color: '#9E9E9E', fontWeight: 600 }}>{r.l}</span>
            <span style={{ color: '#E0E0E0', fontWeight: 700, ...sMono, fontSize: 12 }}>{r.v}</span>
          </div>
        ))}
      </div>

      {/* Vehículos */}
      {(() => {
        const parseV = (v) => { if (!v) return []; if (Array.isArray(v)) return v; try { return JSON.parse(v); } catch { return []; } };
        const vList = parseV(c.vehicles || freshMember?.vehicles);
        if (vList.length === 0) return null;
        const ICONS = { camion:'🚛', camion_ligero:'🚚', picop:'🛻', microbus:'🚌', liviano:'🚗', mototaxi:'🛺', moto:'🏍️', otro:'🔧' };
        const LABELS = { camion:'Camión', camion_ligero:'Camión ligero', picop:'Picop', microbus:'Micro Bus', liviano:'Vehículo liviano', mototaxi:'Moto Taxi', moto:'Motocicleta', otro:'Otros' };
        return (
          <div style={{ margin: '0 20px 12px', padding: 16, background: AT.card, borderRadius: 18, border: `1px solid ${AT.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>🚗 Vehículos</div>
            {vList.map((v, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < vList.length - 1 ? `1px solid ${AT.border}` : 'none' }}>
                <span style={{ fontSize: 22 }}>{ICONS[v.type] || '🚗'}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#E0E0E0' }}>{v.plate}</div>
                  <div style={{ fontSize: 11, color: '#777' }}>{LABELS[v.type] || v.type}</div>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, padding: '0 20px', marginBottom: 16 }}>
        <button onClick={() => { setSel(c); setModal('buy'); }} style={{ ...btnYellow, flex: 1, padding: 14, borderRadius: 14, fontSize: 14 }}>⛽ Compra</button>
        <button onClick={() => setEditMember({ ...c })} style={{ ...btnDark, flex: 1, padding: 14, borderRadius: 14, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>✏️ Editar</button>
      </div>

      {/* Tier Card */}
      <TierCard t={t} gal={c.gallons} small cfg={cfg} />

      {/* Activity Log */}
      <div style={{ padding: '20px 20px 8px', fontSize: 12, fontWeight: 800, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: 2 }}>Historial de Actividad</div>
      {acts.length === 0 && (
        <div style={{ textAlign: 'center', padding: 24, color: '#777', fontSize: 13 }}>Sin actividad registrada</div>
      )}
      {acts.slice(0, 30).map((a, i) => {
        const dt = a.date || '';
        const dd = dt.length >= 10 ? `${dt.substring(8, 10)}/${dt.substring(5, 7)}` : dt;
        const pts = typeof a.pts === 'string' ? parseInt(a.pts, 10) : (a.pts || 0);
        const col = actColors[a.type] || '#FBBC04';
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: `1px solid ${AT.border}` }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', marginRight: 14, flexShrink: 0, background: col }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#E0E0E0' }}>{a.desc}</div>
              <div style={{ fontSize: 11, color: '#777', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                {dd}
                {a.station && <span style={{ fontSize: 9, background: 'rgba(255,255,255,.08)', padding: '2px 6px', borderRadius: 6, fontWeight: 700, color: '#aaa' }}>{a.station}</span>}
              </div>
            </div>
            {pts !== 0 && <div style={{ ...sMono, fontSize: 14, color: pts > 0 ? '#2E7D32' : col }}>{pts > 0 ? '+' : ''}{pts}</div>}
          </div>
        );
      })}

      {/* Edit Modal */}
      {editMember && editMember.id === c.id && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(6px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setEditMember(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '28px 28px 0 0', padding: '28px 24px 32px', maxWidth: 480, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ width: 40, height: 4, background: '#E0E0E0', borderRadius: 2, margin: '0 auto 20px' }} />
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>✏️ Editar Miembro</div>
            {[
              { k: 'name', l: 'Nombre', t: 'text' },
              { k: 'phone', l: 'Teléfono', t: 'tel' },
              { k: 'dpi', l: 'DPI', t: 'text' },
              { k: 'plate', l: 'Placa', t: 'text' },
              { k: 'email', l: 'Email', t: 'email' },
              { k: 'nit', l: 'NIT', t: 'text' },
              { k: 'bday', l: 'Cumpleaños', t: 'text' },
            ].map(f => (
              <div key={f.k} style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#9E9E9E', width: 80, flexShrink: 0 }}>{f.l}</span>
                <input type={f.t} value={editMember[f.k] || ''} onChange={e => setEditMember(p => ({ ...p, [f.k]: e.target.value }))}
                  style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '2px solid #eee', fontFamily: "'DM Sans'", fontSize: 13, outline: 'none' }} />
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '16px 0' }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#9E9E9E' }}>Puntos</span>
                <input type="number" value={editMember.points} onChange={e => setEditMember(p => ({ ...p, points: +e.target.value }))}
                  style={{ width: '100%', padding: 8, borderRadius: 8, border: '2px solid #eee', ...sMono, fontSize: 14, textAlign: 'center', outline: 'none', marginTop: 4 }} />
              </div>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#9E9E9E' }}>Galones</span>
                <input type="number" value={editMember.gallons} onChange={e => setEditMember(p => ({ ...p, gallons: +e.target.value }))}
                  style={{ width: '100%', padding: 8, borderRadius: 8, border: '2px solid #eee', ...sMono, fontSize: 14, textAlign: 'center', outline: 'none', marginTop: 4 }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setEditMember(null)} style={{ ...btnDark, flex: 1 }}>Cancelar</button>
              <button onClick={() => saveMember(editMember)} style={{ ...btnYellow, flex: 2 }}>Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}

      {/* F0.3.8.4: motivo obligatorio para auditar la edicion del miembro */}
      <ReasonModal
        open={showReasonModal}
        onClose={() => {
          setShowReasonModal(false);
          // Reabrir el modal de edicion con lo editado intacto si cancela.
          if (pendingChanges?.edited) setEditMember(pendingChanges.edited);
          setPendingChanges(null);
        }}
        onConfirm={confirmEditWithReason}
        actionLabel="Guardar cambios del cliente"
        loading={false}
      />
    </div>
  );
}
