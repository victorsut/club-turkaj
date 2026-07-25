// src/views/admin/MemberDetail.jsx
// Admin member detail — profile, stats, activity history, edit, purchase, card swap
import { useState, useEffect } from 'react';
import { sb } from '../../lib/supabaseClient';
import { sMono, adminTheme as AT, btnYellow, btnDark, inputStyle } from '../../constants/styles';
import Badge from '../../components/ui/Badge';
import TierBenefitsCard from '../../components/ui/TierBenefitsCard';
import InactivityWarning from '../../components/ui/InactivityWarning';
import { Back } from '../../components/ui/Icons';
import ReasonModal from '../../components/ui/ReasonModal';
import { updateMemberWithAudit } from '../../services/rpcServices';
import { plateMask } from '../../lib/inputMasks';

// Tipos de vehículo (espejo de VEHICLE_TYPES del cliente — el admin
// conserva por ahora su lenguaje visual con emojis).
const V_ICONS = { camion: '🚛', camion_ligero: '🚚', picop: '🛻', microbus: '🚌', liviano: '🚗', mototaxi: '🛺', moto: '🏍️', otro: '🔧' };
const V_LABELS = { camion: 'Camión', camion_ligero: 'Camión ligero', picop: 'Picop', microbus: 'Micro Bus', liviano: 'Vehículo liviano', mototaxi: 'Moto Taxi', moto: 'Motocicleta', otro: 'Otros' };
const parseV = (v) => { if (!v) return []; if (Array.isArray(v)) return v; try { return JSON.parse(v); } catch { return []; } };

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
  const [fieldErrors, setFieldErrors] = useState({});
  // Edición INDIVIDUAL de vehículos (25-jul, pedido del dueño):
  // { idx: null (nuevo) | número (editar), type, plate }
  const [vehModal, setVehModal] = useState(null);

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
          vehicles: m.vehicles || [],
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

  // F0.3.8.6: validacion por campo. Devuelve mensaje de error o null.
  // phone/dpi son bloqueantes (formato estricto); el resto valida solo
  // si no esta vacio. name se valida en validateForm (pre-submit).
  const validateField = (field, value) => {
    const v = (value || '').toString().trim();
    switch (field) {
      case 'name':
        return null;
      case 'phone':
        if (!v) return null;
        if (!/^\d{8}$/.test(v)) return 'Telefono debe tener exactamente 8 digitos';
        return null;
      case 'dpi':
        if (!v) return null;
        if (!/^\d{13}$/.test(v)) return 'DPI debe tener exactamente 13 digitos';
        return null;
      case 'email':
        if (!v) return null;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Email invalido';
        return null;
      case 'bday':
        if (!v) return null;
        // Acepta MM-DD (registros viejos) y YYYY-MM-DD (fecha completa)
        if (!/^(\d{4}-)?(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v)) return 'Formato MM-DD o YYYY-MM-DD';
        return null;
      case 'points': {
        if (v === '') return null;
        const p = Number(v);
        if (isNaN(p) || p < 0 || !Number.isInteger(p)) return 'Debe ser entero >= 0';
        return null;
      }
      case 'gallons': {
        if (v === '') return null;
        const g = Number(v);
        if (isNaN(g) || g < 0) return 'Debe ser numero >= 0';
        return null;
      }
      default:
        return null;
    }
  };

  // F0.3.8.6: validacion completa pre-submit. Devuelve mapa de errores.
  const validateForm = (edited) => {
    const errors = {};
    ['phone', 'dpi', 'email', 'bday', 'points', 'gallons'].forEach(f => {
      const err = validateField(f, edited[f]);
      if (err) errors[f] = err;
    });
    const name = (edited.name || '').trim();
    if (!name || name.length < 2) errors.name = 'Nombre requerido (minimo 2 caracteres)';
    return errors;
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

    // F0.3.8.6: validacion pre-submit (bloqueante).
    const errors = validateForm(edited);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      fire('Corrige los errores del formulario');
      return;
    }

    const changes = buildDiff(c, edited);

    if (Object.keys(changes).length === 0) {
      fire('Sin cambios');
      setEditMember(null);
      setFieldErrors({});
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
      // SEC.B.8.2: si la sesión expiró (28000), expireSession ya hizo logout +
      // redirect al login + aviso. Salimos sin reabrir el form ni pisar el toast
      // con el crudo. Va ANTES de la ramificación por code (22023/23505).
      if (result.sessionExpired) return;
      setShowReasonModal(false);
      const errMsg = result.error?.message || 'Error desconocido';
      fire('Error: ' + errMsg);
      // Errores corregibles (validacion 22023 / UNIQUE 23505): reabrir el
      // form con lo editado intacto para que el admin pueda corregir.
      // Los cambios de VEHÍCULOS no usan ese form — no reabrir nada.
      if (!pendingChanges.isVehicles && (result.error?.code === '23505' || result.error?.code === '22023')) {
        setEditMember(pendingChanges.edited);
      }
      setPendingChanges(null);
      return;
    }

    // Exito: refrescar state local (custs, freshMember y me si aplica).
    const { edited: ed, memberId } = pendingChanges;
    // Normalizar campos numericos: los inputs type="number" devuelven
    // strings ("45.5"), y al hacer spread pisarian points/gallons con
    // strings, rompiendo componentes que usan .toFixed() (tarjeta de nivel, etc).
    const edN = { ...ed, points: +ed.points || 0, gallons: +ed.gallons || 0 };
    setCusts(prev => prev.map(m => m.id === memberId ? { ...m, ...edN } : m));
    setFreshMember(prev => (prev && prev.id === memberId ? { ...prev, ...edN } : prev));
    if (me?.id === memberId) setMe(prev => ({ ...prev, ...edN }));

    setShowReasonModal(false);
    setPendingChanges(null);
    setFieldErrors({});
    const n = result.data?.categories_updated?.length || 0;
    fire('✅ Cliente actualizado (' + n + ' cambio' + (n === 1 ? '' : 's') + ')');
  };

  // ── Vehículos: edición INDIVIDUAL auditada (25-jul) ─────────
  // Cada operación (agregar/editar/eliminar) manda la lista RESULTANTE
  // por el mismo RPC auditado (profile.vehicles + plate legacy = placa
  // del primer vehículo, convención de Mi Cuenta del cliente).
  const vList = parseV(c.vehicles);
  const queueVehicleChange = (updated) => {
    if (!loggedAdmin?.id) { fire('Error: sesion admin no disponible. Cerra sesion y volve a ingresar.'); return; }
    setPendingChanges({
      memberId: c.id,
      isVehicles: true,
      changes: { profile: { vehicles: updated, plate: updated[0]?.plate || '' } },
      edited: { ...c, vehicles: updated, plate: updated[0]?.plate || '' },
    });
    setVehModal(null);
    setShowReasonModal(true);
  };
  const saveVehModal = () => {
    if (!vehModal) return;
    if (!plateMask.complete(vehModal.plate)) { fire('Placa incompleta — formato: P 123 ABC'); return; }
    const entry = { type: vehModal.type, plate: vehModal.plate };
    const updated = vehModal.idx == null
      ? [...vList, entry]
      : vList.map((v, i) => (i === vehModal.idx ? entry : v));
    queueVehicleChange(updated);
  };
  const deleteVehicle = (i) => queueVehicleChange(vList.filter((_, j) => j !== i));

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

      {/* Vehículos — edición INDIVIDUAL, aparte del form de datos (25-jul) */}
      <div style={{ margin: '0 20px 12px', padding: 16, background: AT.card, borderRadius: 18, border: `1px solid ${AT.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: 1 }}>🚗 Vehículos ({vList.length})</div>
          <button onClick={() => setVehModal({ idx: null, type: 'liviano', plate: '' })}
            style={{ padding: '6px 12px', borderRadius: 10, border: `1px solid ${AT.border}`, background: 'transparent', color: '#FBBC04', fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
            + Agregar
          </button>
        </div>
        {vList.length === 0 && (
          <div style={{ fontSize: 12, color: '#777', textAlign: 'center', padding: '8px 0' }}>Sin vehículos registrados</div>
        )}
        {vList.map((v, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < vList.length - 1 ? `1px solid ${AT.border}` : 'none' }}>
            <span style={{ fontSize: 22 }}>{V_ICONS[v.type] || '🚗'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#E0E0E0', ...sMono }}>{(v.plate || '').length === 7 ? plateMask.format(v.plate) : v.plate}</div>
              <div style={{ fontSize: 11, color: '#777' }}>{V_LABELS[v.type] || v.type}</div>
            </div>
            <button onClick={() => setVehModal({ idx: i, type: v.type || 'liviano', plate: v.plate || '' })}
              style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${AT.border}`, background: 'transparent', color: '#64B5F6', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans'", flexShrink: 0 }}>Editar</button>
            <button onClick={() => deleteVehicle(i)}
              style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${AT.border}`, background: 'transparent', color: '#EF5350', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans'", flexShrink: 0 }}>Eliminar</button>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, padding: '0 20px', marginBottom: 16 }}>
        <button onClick={() => { setSel(c); setModal('buy'); }} style={{ ...btnYellow, flex: 1, padding: 14, borderRadius: 14, fontSize: 14 }}>⛽ Compra</button>
        <button onClick={() => setEditMember({ ...c })} style={{ ...btnDark, flex: 1, padding: 14, borderRadius: 14, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>✏️ Editar</button>
      </div>

      {/* Tarjeta de nivel del miembro (FORMATO GENERAL) */}
      <TierBenefitsCard
        t={t} cfg={cfg} surface={AT.card} ink={AT.txt}
        pill={`Nivel actual · ${c.gallons.toFixed(0)} gal`}
        style={{ margin: '0 20px' }}
      />

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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(6px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => { setEditMember(null); setFieldErrors({}); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '28px 28px 0 0', padding: '28px 24px 32px', maxWidth: 480, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ width: 40, height: 4, background: '#E0E0E0', borderRadius: 2, margin: '0 auto 20px' }} />
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>✏️ Editar Miembro</div>
            {[
              { k: 'name',  l: 'Nombre',     t: 'text',  max: 60 },
              { k: 'phone', l: 'Teléfono',   t: 'tel',   max: 8,  numeric: true },
              { k: 'dpi',   l: 'DPI',        t: 'text',  max: 13, numeric: true },
              { k: 'plate', l: 'Placa',      t: 'text',  max: 10 },
              { k: 'email', l: 'Email',      t: 'email', max: 80 },
              { k: 'nit',   l: 'NIT',        t: 'text',  max: 12 },
              { k: 'bday',  l: 'Cumpleaños', t: 'text',  max: 10 },
            ].map(f => (
              <div key={f.k} style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#9E9E9E', marginBottom: 4 }}>{f.l}</label>
                <input
                  type={f.t}
                  value={editMember[f.k] || ''}
                  maxLength={f.max}
                  inputMode={f.numeric ? 'numeric' : undefined}
                  onChange={e => {
                    let val = e.target.value;
                    if (f.numeric) val = val.replace(/[^0-9]/g, '');
                    setEditMember(p => ({ ...p, [f.k]: val }));
                    if (fieldErrors[f.k]) setFieldErrors(prev => ({ ...prev, [f.k]: null }));
                  }}
                  onBlur={e => {
                    let val = e.target.value;
                    if (!f.numeric && val !== val.trim()) {
                      val = val.trim();
                      setEditMember(p => ({ ...p, [f.k]: val }));
                    }
                    setFieldErrors(prev => ({ ...prev, [f.k]: validateField(f.k, val) }));
                  }}
                  style={{ ...inputStyle, fontSize: 13, padding: '10px 12px', borderColor: fieldErrors[f.k] ? '#ef4444' : undefined, borderWidth: fieldErrors[f.k] ? 2 : 1 }}
                />
                {fieldErrors[f.k] && (
                  <div style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{fieldErrors[f.k]}</div>
                )}
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '16px 0' }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9E9E9E', marginBottom: 4 }}>Puntos</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={editMember.points ?? ''}
                  onChange={e => {
                    setEditMember(p => ({ ...p, points: e.target.value }));
                    if (fieldErrors.points) setFieldErrors(prev => ({ ...prev, points: null }));
                  }}
                  onBlur={e => setFieldErrors(prev => ({ ...prev, points: validateField('points', e.target.value) }))}
                  style={{ ...inputStyle, ...sMono, fontSize: 14, textAlign: 'center', padding: 10, borderColor: fieldErrors.points ? '#ef4444' : undefined, borderWidth: fieldErrors.points ? 2 : 1 }}
                />
                {fieldErrors.points && (
                  <div style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{fieldErrors.points}</div>
                )}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9E9E9E', marginBottom: 4 }}>Galones</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={editMember.gallons ?? ''}
                  onChange={e => {
                    setEditMember(p => ({ ...p, gallons: e.target.value }));
                    if (fieldErrors.gallons) setFieldErrors(prev => ({ ...prev, gallons: null }));
                  }}
                  onBlur={e => setFieldErrors(prev => ({ ...prev, gallons: validateField('gallons', e.target.value) }))}
                  style={{ ...inputStyle, ...sMono, fontSize: 14, textAlign: 'center', padding: 10, borderColor: fieldErrors.gallons ? '#ef4444' : undefined, borderWidth: fieldErrors.gallons ? 2 : 1 }}
                />
                {fieldErrors.gallons && (
                  <div style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{fieldErrors.gallons}</div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setEditMember(null); setFieldErrors({}); }} style={{ ...btnDark, flex: 1 }}>Cancelar</button>
              <button onClick={() => saveMember(editMember)} style={{ ...btnYellow, flex: 2 }}>Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: agregar/editar UN vehículo (25-jul) — pasa por el mismo
          flujo auditado (ReasonModal → update_member_with_audit) */}
      {vehModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(6px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setVehModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '28px 28px 0 0', padding: '28px 24px 32px', maxWidth: 480, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ width: 40, height: 4, background: '#E0E0E0', borderRadius: 2, margin: '0 auto 20px' }} />
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>
              {vehModal.idx == null ? '🚗 Agregar Vehículo' : '🚗 Editar Vehículo'}
            </div>
            <label style={sLbl}>Tipo de vehículo</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {Object.keys(V_LABELS).map(k => (
                <button key={k} onClick={() => setVehModal(p => ({ ...p, type: k }))} style={{
                  padding: '10px 8px', borderRadius: 12, cursor: 'pointer',
                  border: vehModal.type === k ? '2px solid #FBBC04' : '2px solid #eee',
                  background: vehModal.type === k ? '#FFF8E1' : '#fff',
                  fontFamily: "'DM Sans'", fontWeight: 700, fontSize: 12, color: '#424242',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <span style={{ fontSize: 16 }}>{V_ICONS[k]}</span>{V_LABELS[k]}
                </button>
              ))}
            </div>
            <label style={sLbl}>Placa</label>
            <input
              placeholder="Placa (ej: P 123 ABC)"
              value={plateMask.format(vehModal.plate)}
              autoCapitalize="characters"
              onChange={e => setVehModal(p => ({ ...p, plate: plateMask.clean(e.target.value) }))}
              style={{ ...inputStyle, marginBottom: 16, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, letterSpacing: 2 }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setVehModal(null)} style={{ ...btnDark, flex: 1 }}>Cancelar</button>
              <button onClick={saveVehModal} style={{ ...btnYellow, flex: 2 }}>
                {vehModal.idx == null ? 'Agregar' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* F0.3.8.4: motivo obligatorio para auditar la edicion del miembro */}
      <ReasonModal
        open={showReasonModal}
        onClose={() => {
          setShowReasonModal(false);
          // Reabrir el modal de edicion con lo editado intacto si cancela
          // (solo para el form de datos — los vehículos no lo usan).
          if (pendingChanges?.edited && !pendingChanges.isVehicles) setEditMember(pendingChanges.edited);
          setPendingChanges(null);
        }}
        onConfirm={confirmEditWithReason}
        actionLabel="Guardar cambios del cliente"
        loading={false}
      />
    </div>
  );
}
