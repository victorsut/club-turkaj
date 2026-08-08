// src/views/admin/MemberDetail.jsx
// Ficha del miembro — Admin v2 (8-ago-2026, FORMATO GENERAL): flat,
// minimalista, SIN emojis, desktop-first en grid de dos columnas
// (apila en móvil), botón de volver a Miembros (pedido del dueño).
// Vehículos con iconos SVG del cliente (VehicleIcons). Los modales
// (editar / contraseña / vehículo) viven en MemberDetailModals —
// oscuros centrados, patrón ReasonModal. La LÓGICA no cambió: todo
// sigue auditado (ReasonModal → RPCs de siempre).
import { useState, useEffect } from 'react';
import { sb } from '../../lib/supabaseClient';
import { sMono, adminTheme as AT } from '../../constants/styles';
import Badge from '../../components/ui/Badge';
import TierBenefitsCard from '../../components/ui/TierBenefitsCard';
import InactivityWarning from '../../components/ui/InactivityWarning';
import { Back, Plus } from '../../components/ui/Icons';
import ReasonModal from '../../components/ui/ReasonModal';
import { VEHICLE_TYPES } from '../../components/ui/VehicleIcons';
import { EditMemberModal, PwResetModal, VehicleModal, buildDiff, validateForm } from './MemberDetailModals';
import { updateMemberWithAudit, adminResetMemberPassword } from '../../services/rpcServices';
import { fetchActivityStaff } from '../../services/secureReads';
import { plateMask, phoneMask, dpiMask } from '../../lib/inputMasks';
import { stripEmojis } from '../../lib/text';
import { getAdminToken } from '../../services/sessionTokens';

const parseV = (v) => { if (!v) return []; if (Array.isArray(v)) return v; try { return JSON.parse(v); } catch { return []; } };
const vType = (k) => VEHICLE_TYPES.find(t => t.k === k) || VEHICLE_TYPES.find(t => t.k === 'liviano') || VEHICLE_TYPES[0];

export default function MemberDetail(ctx) {
  const {
    sel, setScr, custs, setCusts, gT, cfg, fire,
    activityLog, me, setMe, loggedAdmin,
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
  // Restablecer contraseña del miembro (25-jul): única vía de
  // recuperación mientras no exista el flujo por SMS/correo.
  const [pwModal, setPwModal] = useState(null); // { pass, confirm } | null

  if (!sel) { setScr('mem'); return null; }

  const c = freshMember || custs.find(x => x.id === sel.id) || sel;
  const t = gT(c.gallons);
  const acts = localActs ?? (activityLog && activityLog[c.id]) ?? [];

  // Cargar datos frescos desde Supabase al abrir el detalle
  useEffect(() => {
    if (!sel?.id || !sb) return;
    setLoadingDetail(true);
    Promise.all([
      // SEC.C.2: el SELECT abierto de activity_log quedó revocado — la
      // actividad de la ficha llega por RPC con la sesión de admin.
      fetchActivityStaff(sel.id, 500),
      // SEC.C.1: la ficha completa exige sesión de admin (RPC)
      sb.rpc('get_member_full', {
        p_session_token: getAdminToken()?.token ?? null,
        p_role: 'admin',
        p_member_id: sel.id,
      }),
    ]).then(([actRows, memRes]) => {
      setLoadingDetail(false);
      if (actRows?.length) {
        setLocalActs(actRows.map(a => ({
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
          name: m.name, nickname: m.nickname || '',
          phone: m.phone || '—', dpi: m.dpi || '—',
          plate: m.plate || '—', email: m.email || '—',
          nit: m.nit || '—', bday: m.birthday || '—',
          address: m.address || null,
          points: m.points || 0, gallons: parseFloat(m.gallons) || 0,
          spent: parseFloat(m.spent) || 0, visits: m.visits || 0,
          tickets: m.tickets || 0, redeemed: m.redeemed_count || 0,
          cardId: m.card_code || m.physical_cards?.card_code || m.card_id || '—',
          registered: m.created_at ? new Date(m.created_at).toLocaleDateString('es-GT') : '—',
          lastBuy: m.last_buy ? new Date(m.last_buy).toLocaleDateString('es-GT') : 'Sin compras',
          lastBuyRaw: m.last_buy || null, // fecha cruda para daysInactive (lastBuy va formateada)
          vehicles: m.vehicles || [],
        });
      }
    });
  }, [sel?.id]);

  const actColors = {
    compra: '#2E7D32', canje: '#1565C0', evento: '#FBBC04',
    rifa: '#7B1FA2', encuesta: '#FBBC04', referido: '#FBBC04',
    registro: '#FBBC04', wifi: '#9E9E9E', degradacion: '#C62828',
    vehiculo: '#6A4FA8', registro_vehiculos: '#6A4FA8',
    entrega: '#00838F',
  };

  // Reglas de edición (validateForm/buildDiff) importadas de
  // MemberDetailModals — el diff maneja '—' como vacío y compara la
  // dirección como JSON (8-ago).

  // Abrir el editor SIN los placeholders '—' de la ficha (si entraran
  // al form, la validación los rechazaría como formato inválido).
  const openEditor = () => {
    const strip = (v) => (v === '—' ? '' : v || '');
    setEditMember({
      ...c,
      nickname: strip(c.nickname), phone: strip(c.phone), dpi: strip(c.dpi),
      email: strip(c.email), nit: strip(c.nit), bday: strip(c.bday),
    });
  };

  // F0.3.8.4: la edicion pasa por auditoria atomica (RPC
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

    // Restablecer contraseña: RPC propia (bcrypt server-side; la
    // contraseña no se guarda en la auditoría).
    if (pendingChanges.isPassword) {
      const { ok, error } = await adminResetMemberPassword(
        pendingChanges.memberId, pendingChanges.newPassword, audit,
      );
      setShowReasonModal(false);
      setPendingChanges(null);
      if (!ok) { fire('Error: ' + (error?.message || 'no se pudo restablecer')); return; }
      fire('Contraseña restablecida — entregala al cliente');
      return;
    }

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
    fire('Cliente actualizado (' + n + ' cambio' + (n === 1 ? '' : 's') + ')');
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

  // ── Restablecer contraseña del miembro (auditado) ───────────
  const submitPwReset = () => {
    if (!loggedAdmin?.id) { fire('Error: sesion admin no disponible. Cerra sesion y volve a ingresar.'); return; }
    if (!pwModal?.pass || pwModal.pass.length < 6) { fire('La contraseña debe tener al menos 6 caracteres'); return; }
    if (pwModal.pass !== pwModal.confirm) { fire('Las contraseñas no coinciden'); return; }
    setPendingChanges({ memberId: c.id, isPassword: true, newPassword: pwModal.pass });
    setPwModal(null);
    setShowReasonModal(true);
  };

  // ── estilos (FORMATO GENERAL Admin v2) ──────────────────────
  const card = { background: AT.card, border: `1px solid ${AT.border}`, borderRadius: 18, padding: 18 };
  const cardLbl = { fontSize: 10, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: '#777', marginBottom: 12 };
  const backBtn = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 14px 7px 10px', borderRadius: 10, cursor: 'pointer',
    border: `1px solid ${AT.border}`, background: AT.card, color: '#9E9E9E',
    fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 700, marginBottom: 16,
  };
  const ghostBtn = (color = '#9E9E9E') => ({
    padding: '12px 16px', borderRadius: 12, cursor: 'pointer',
    border: `1px solid ${AT.border}`, background: 'transparent', color,
    fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700,
  });
  const miniBtn = (color) => ({
    padding: '5px 10px', borderRadius: 8, border: `1px solid ${AT.border}`,
    background: 'transparent', color, fontSize: 11, fontWeight: 700,
    cursor: 'pointer', fontFamily: "'DM Sans'", flexShrink: 0,
  });

  if (loadingDetail && !freshMember) return (
    <div style={{ padding: '22px 22px 60px' }}>
      <button onClick={() => setScr('mem')} style={backBtn}><Back /> Miembros</button>
      <div style={{ textAlign: 'center', padding: 60, color: '#777', fontSize: 13, fontWeight: 700 }}>Cargando datos del miembro...</div>
    </div>
  );

  return (
    <div style={{ padding: '22px 22px 60px' }}>
      {/* Volver a Miembros (pedido del dueño: este botón SÍ permanece) */}
      <button onClick={() => setScr('mem')} style={backBtn}><Back /> Miembros</button>

      {/* fix 25-jul: la prop se llamaba `last` (el componente espera
          `lastBuy`) y la fecha iba formateada es-GT — el aviso jamás
          aparecía en el admin. Solo con el motor de degradación activo. */}
      {cfg.degradEnabled && (
        <div style={{ marginBottom: 16 }}>
          <InactivityWarning lastBuy={c.lastBuyRaw || null} tierName={t.name} />
        </div>
      )}

      {/* ── Dos columnas en monitor, apiladas en móvil ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16, alignItems: 'start' }}>
        {/* Columna 1: perfil + datos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Perfil */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: t.bg, color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 22, flexShrink: 0 }}>{c.name.charAt(0)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
                  <Badge t={t} />
                  <span style={{ ...sMono, fontSize: 11, color: '#9E9E9E' }}>{c.cardId || '—'}</span>
                </div>
                <div style={{ fontSize: 10, color: '#555', marginTop: 4, ...sMono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.id}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
              {[
                { v: (c.points || 0).toLocaleString('en-US'), l: 'Puntos', c: '#FBBC04' },
                { v: Math.round(c.gallons).toLocaleString('en-US'), l: 'Galones', c: '#81C784' },
                { v: 'Q' + Math.round(c.spent).toLocaleString('en-US'), l: 'Gastado', c: '#64B5F6' },
                { v: (c.visits || 0).toLocaleString('en-US'), l: 'Visitas', c: '#E0E0E0' },
                { v: (c.redeemed || 0).toLocaleString('en-US'), l: 'Canjes', c: '#E0E0E0' },
                { v: (c.tickets || 0).toLocaleString('en-US'), l: 'Boletos', c: '#E0E0E0' },
              ].map(s => (
                <div key={s.l} style={{ background: 'rgba(255,255,255,.05)', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
                  <div style={{ ...sMono, fontSize: 16, fontWeight: 800, color: s.c }}>{s.v}</div>
                  <div style={{ fontSize: 9, color: '#777', textTransform: 'uppercase', letterSpacing: 1, marginTop: 3, fontWeight: 700 }}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* Sin "Registrar compra" (8-ago, decisión del dueño): las
                compras las registran los OPERADORES vía la API de PROPER */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={openEditor} style={{ ...ghostBtn('#E0E0E0'), flex: 1, minWidth: 140 }}>Editar datos</button>
              <button onClick={() => setPwModal({ pass: '', confirm: '' })} style={{ ...ghostBtn('#CE93D8'), flex: 1, minWidth: 140 }}>Restablecer contraseña</button>
            </div>
          </div>

          {/* Datos de contacto y programa */}
          <div style={card}>
            <div style={cardLbl}>Datos del miembro</div>
            {[
              { l: 'Apodo', v: c.nickname || '—' },
              // Formato visual del registro (los datos crudos no cambian)
              { l: 'Teléfono', v: c.phone && c.phone !== '—' ? phoneMask.format(c.phone) : '—' },
              { l: 'DPI', v: c.dpi && c.dpi !== '—' ? dpiMask.format(c.dpi) : '—' },
              { l: 'Email', v: c.email || '—' },
              { l: 'NIT', v: c.nit || '—' },
              { l: 'Dirección', v: c.address ? [c.address.canton, c.address.muni].filter(Boolean).join(', ') : '—' },
              { l: 'Fecha de nacimiento', v: c.bday || '—' },
              { l: 'Registro', v: c.registered || '—' },
              { l: 'Última compra', v: c.lastBuy || 'Sin compras' },
            ].map((r, i, arr) => (
              <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 0', borderBottom: i < arr.length - 1 ? `1px solid ${AT.border}` : 'none', fontSize: 13 }}>
                <span style={{ color: '#9E9E9E', fontWeight: 600, flexShrink: 0 }}>{r.l}</span>
                <span style={{ color: '#E0E0E0', fontWeight: 700, ...sMono, fontSize: 12, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.v}</span>
              </div>
            ))}
          </div>

          {/* Nivel y beneficios (ya FORMATO GENERAL) */}
          <TierBenefitsCard
            t={t} cfg={cfg} surface={AT.card} ink={AT.txt}
            pill={`Nivel actual · ${c.gallons.toFixed(0)} gal`}
          />
        </div>

        {/* Columna 2: vehículos + actividad */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Vehículos — edición INDIVIDUAL, aparte del form de datos (25-jul) */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ ...cardLbl, marginBottom: 0 }}>Vehículos ({vList.length})</div>
              <button onClick={() => setVehModal({ idx: null, type: 'liviano', plate: '' })}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 10, border: `1px solid ${AT.border}`, background: 'transparent', color: '#FBBC04', fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
                <span style={{ display: 'flex', transform: 'scale(.75)' }}><Plus /></span> Agregar
              </button>
            </div>
            {vList.length === 0 && (
              <div style={{ fontSize: 12, color: '#777', textAlign: 'center', padding: '10px 0' }}>Sin vehículos registrados</div>
            )}
            {vList.map((v, i) => {
              const vt = vType(v.type);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: i < vList.length - 1 ? `1px solid ${AT.border}` : 'none' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(255,255,255,.06)', color: '#E0E0E0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <vt.Icon size={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#E0E0E0', ...sMono }}>{(v.plate || '').length === 7 ? plateMask.format(v.plate) : v.plate}</div>
                    <div style={{ fontSize: 11, color: '#777', marginTop: 1 }}>{vt.label}</div>
                  </div>
                  <button onClick={() => setVehModal({ idx: i, type: v.type || 'liviano', plate: v.plate || '' })} style={miniBtn('#64B5F6')}>Editar</button>
                  <button onClick={() => deleteVehicle(i)} style={miniBtn('#EF5350')}>Eliminar</button>
                </div>
              );
            })}
          </div>

          {/* Historial de actividad */}
          <div style={{ ...card, padding: '18px 18px 8px' }}>
            <div style={cardLbl}>Historial de actividad</div>
            {acts.length === 0 && (
              <div style={{ textAlign: 'center', padding: '14px 0 24px', color: '#777', fontSize: 13 }}>Sin actividad registrada</div>
            )}
            {acts.slice(0, 30).map((a, i, arr) => {
              const dt = a.date || '';
              const dd = dt.length >= 10 ? `${dt.substring(8, 10)}/${dt.substring(5, 7)}` : dt;
              const pts = typeof a.pts === 'string' ? parseInt(a.pts, 10) : (a.pts || 0);
              const col = actColors[a.type] || '#FBBC04';
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: i < Math.min(arr.length, 30) - 1 ? `1px solid ${AT.border}` : 'none' }}>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', marginRight: 12, flexShrink: 0, background: col }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#E0E0E0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stripEmojis(a.desc)}</div>
                    <div style={{ fontSize: 11, color: '#777', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {dd}
                      {a.station && <span style={{ fontSize: 9, background: 'rgba(255,255,255,.08)', padding: '2px 6px', borderRadius: 6, fontWeight: 700, color: '#aaa' }}>{a.station}</span>}
                    </div>
                  </div>
                  {pts !== 0 && <div style={{ ...sMono, fontSize: 14, color: pts > 0 ? '#81C784' : col }}>{pts > 0 ? '+' : ''}{pts}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Modales (MemberDetailModals — oscuros, patrón ReasonModal) ── */}
      {editMember && editMember.id === c.id && (
        <EditMemberModal
          editMember={editMember} setEditMember={setEditMember}
          fieldErrors={fieldErrors} setFieldErrors={setFieldErrors}
          onSave={saveMember}
          onClose={() => { setEditMember(null); setFieldErrors({}); }}
        />
      )}

      {pwModal && (
        <PwResetModal
          pwModal={pwModal} setPwModal={setPwModal} member={c}
          onSubmit={submitPwReset}
          onClose={() => setPwModal(null)}
        />
      )}

      {vehModal && (
        <VehicleModal
          vehModal={vehModal} setVehModal={setVehModal}
          onSave={saveVehModal}
          onClose={() => setVehModal(null)}
        />
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
        actionLabel={pendingChanges?.isPassword
          ? `Restablecer contraseña de ${c.name}`
          : pendingChanges?.isVehicles
            ? 'Actualizar vehículos del cliente'
            : 'Guardar cambios del cliente'}
        loading={false}
      />
    </div>
  );
}
