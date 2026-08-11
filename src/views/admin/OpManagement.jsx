// src/views/admin/OpManagement.jsx
// OPERADORES — Admin v2 (8-ago-2026, FORMATO GENERAL): flat sin
// emojis, encabezado v2 con botón a la derecha, tarjetas en grid,
// form y ficha como modales OSCUROS centrados (patrón ReasonModal),
// máscaras de DPI/teléfono (regla ampliada 8-ago: también en admin) y
// rating con CONTEO de calificaciones. La LÓGICA no cambió: alta por
// create_operator, edición/contraseña/toggle auditadas vía
// ReasonModal → RPCs (Objetivo #1), historial por RPCs SEC.C.2.
import { useState, useEffect } from 'react';
import { sb } from '../../lib/supabaseClient';
import { sMono, adminTheme as AT, btnYellow, inputStyleDark } from '../../constants/styles';
import { Plus, XMark } from '../../components/ui/Icons';
import RewardIcon from '../../components/ui/RewardIcon';
import { phoneMask, dpiMask } from '../../lib/inputMasks';
import { createOperatorRPC, updateOperatorPassword, toggleOperatorActive, updateOperatorProfile } from '../../services/operatorAuthService';
import { fetchOperatorPurchases, fetchOperatorRedemptions } from '../../services/secureReads';
import ReasonModal from '../../components/ui/ReasonModal';

export default function OpManagement(ctx) {
  const { operators, setOperators, stations, fire, opRatings, showOpReg, setShowOpReg, editOp, setEditOp, newOp, setNewOp, sbConnected, loggedAdmin } = ctx;
  const [saving, setSaving]           = useState(false);
  const [selOp, setSelOp]             = useState(null);
  const [histTab, setHistTab]         = useState('compras'); // 'compras' | 'canjes'
  const [opHistory, setOpHistory]     = useState([]);
  const [opRedeems, setOpRedeems]     = useState([]);
  const [loadingHist, setLoadingHist] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [pendingAction, setPendingAction]     = useState(null);

  useEffect(() => {
    if (!selOp?.id || !sb) return;
    setLoadingHist(true);
    setOpHistory([]);
    setOpRedeems([]);
    // SEC.C.2: purchases y redemptions ya no tienen SELECT abierto — el
    // historial del operador llega por RPC con la sesión de admin (el
    // nombre del miembro viene resuelto server-side).
    Promise.all([
      fetchOperatorPurchases(selOp.id, 100),
      fetchOperatorRedemptions(selOp.id, { limit: 100 }),
    ]).then(([purchRows, redeemRows]) => {
      setLoadingHist(false);
      if (purchRows.length) setOpHistory(purchRows.map(p => ({
        id: p.id,
        memberName: p.member_name || '-',
        desc: (typeof p.gallons === 'number' ? p.gallons.toFixed(1) : p.gallons) + ' gal - Q' + p.amount,
        pts: p.points_earned, date: p.created_at, fuel: p.fuel_type,
      })));
      if (redeemRows.length) setOpRedeems(redeemRows.map(r => ({
        id: r.id,
        memberName: r.member_name || '-',
        rewardName: r.reward_name || 'Premio',
        rewardIcon: r.reward_icon || '',
        pts: r.points_spent,
        code: r.redemption_code,
        date: r.collected_at || r.created_at, // fecha de entrega, no de canje
      })));
    });
  }, [selOp?.id]);

  const saveOp = async () => {
    const isEdit = !!editOp;
    const requirePass = !isEdit;

    if (!newOp.name || !newOp.user || !newOp.dpi || !newOp.gafete) {
      fire('Campos obligatorios incompletos'); return;
    }
    if (requirePass && !newOp.password) {
      fire('La contraseña es obligatoria para nuevos operadores'); return;
    }
    if (!sb || !sbConnected) { fire('Sin conexion'); return; }

    const stationObj = (stations || []).find(s => s.name === newOp.station);
    const stationId  = stationObj?.id || null;

    // EDITAR: encolar la acción y pasar por ReasonModal (auditoría
    // obligatoria F0.3.5). El UPDATE real ocurre en confirmAction.
    if (isEdit) {
      if (!loggedAdmin?.id) {
        fire('Error: sesion admin no disponible. Cerra sesion y volve a ingresar.');
        return;
      }
      const updates = {
        name: newOp.name,
        username: newOp.user,
        dpi: newOp.dpi,
        gafete: newOp.gafete,
        phone: newOp.phone || null,
        email: newOp.email || null,
        station_id: stationId,
        bomba: newOp.bomba || null,
        turno: newOp.turno || 'Matutino',
        updated_at: new Date().toISOString(),
      };
      const hasPassword = !!(newOp.password && newOp.password.trim());
      setPendingAction({
        type: hasPassword ? 'edit_with_password' : 'edit',
        operatorId: editOp.id,
        operatorUsername: newOp.user,
        payload: { updates, newPassword: newOp.password, station: newOp.station, stationId },
        actionLabel: hasPassword ? 'Editar operador y cambiar contraseña' : 'Editar operador',
      });
      setShowOpReg(false);        // NO limpiar newOp/editOp: poder reabrir si falla
      setShowReasonModal(true);
      return;
    }

    // CREAR: directo al RPC, sin ReasonModal ni auditoría.
    setSaving(true);
    try {
      const { data, error } = await createOperatorRPC({
        name: newOp.name,
        username: newOp.user,
        password: newOp.password,
        dpi: newOp.dpi,
        gafete: newOp.gafete,
        stationId,
        phone: newOp.phone || null,
        email: newOp.email || null,
        bomba: newOp.bomba || null,
        turno: newOp.turno || 'Matutino',
      });
      if (error) {
        const msg = (error.message || '').toLowerCase();
        fire(msg.includes('unique') || msg.includes('duplicate')
          ? 'Usuario o gafete ya existe'
          : 'Error: ' + error.message);
        setSaving(false); return;
      }
      if (data) {
        setOperators(prev => [...prev, {
          id: data.id, name: data.name, user: data.username,
          dpi: data.dpi, gafete: data.gafete,
          phone: data.phone || '', email: data.email || '',
          station: newOp.station, stationId: data.station_id,
          bomba: data.bomba || '', turno: data.turno || 'Matutino',
          active: data.active,
        }]);
      }
      fire('Operador registrado: ' + newOp.name);

      setNewOp({ name: '', user: '', password: '', dpi: '', gafete: '', phone: '', station: 'Turkaj I', bomba: '', turno: 'Matutino', email: '' });
      setEditOp(null);
      setShowOpReg(false);
    } finally {
      setSaving(false);
    }
  };

  // Ejecuta la acción encolada (editar / editar+password / toggle)
  // recibiendo el motivo del ReasonModal. Patrón client-first F0.3.5:
  // muta primero, audita después; si el log falla NO se revierte
  // (warning rojo + console.error).
  const confirmAction = async (reason) => {
    if (!loggedAdmin?.id) {
      setShowReasonModal(false);
      fire('Error: sesion admin no disponible. Cerra sesion y volve a ingresar.');
      return;
    }
    if (!pendingAction) { setShowReasonModal(false); return; }

    const audit = {
      adminId: loggedAdmin.id,
      adminName: loggedAdmin.name,
      adminEmail: loggedAdmin.email,
      reasonText: reason,
    };
    const { type, operatorId, payload } = pendingAction;

    setSaving(true);
    try {
      switch (type) {
        case 'edit':
        case 'edit_with_password': {
          // El old_value/new_value de la auditoría los arma el RPC
          // server-side (lee la fila antes y después del UPDATE).
          // Objetivo #1 (29-jul): `operators` perdió la escritura
          // directa — el RPC actualiza Y audita en la misma transacción
          // (antes el log era client-first y podía quedar sin rastro).
          const { ok: upOk, error: upErr } = await updateOperatorProfile(operatorId, payload.updates, audit);
          if (!upOk) {
            setShowReasonModal(false);
            setShowOpReg(true);   // reabrir modal de edición con datos intactos
            fire('Error: ' + (upErr || 'no se pudo actualizar'));
            return;
          }

          // Cambio de contraseña (RPC con auditoría atómica propia).
          if (type === 'edit_with_password') {
            const { ok, error: pwErr } = await updateOperatorPassword(operatorId, payload.newPassword, audit);
            if (pwErr || !ok) {
              fire('Datos guardados, pero falló cambio de contraseña: ' + (pwErr?.message || 'desconocido'));
            }
          }

          // Pick explícito (11-ago): antes `...newOp` metía la CONTRASEÑA
          // en claro al estado global de operadores, que se comparte con
          // toda la app (incl. la vista cliente, que usa `operators` para
          // el modal de calificación). Solo se copian los campos de perfil.
          setOperators(prev => prev.map(o =>
            o.id === operatorId
              ? {
                  ...o,
                  name: newOp.name, user: newOp.user, dpi: newOp.dpi,
                  gafete: newOp.gafete, phone: newOp.phone, email: newOp.email,
                  bomba: newOp.bomba, turno: newOp.turno,
                  station: payload.station, stationId: payload.stationId,
                }
              : o
          ));
          setShowReasonModal(false);
          setNewOp({ name: '', user: '', password: '', dpi: '', gafete: '', phone: '', station: 'Turkaj I', bomba: '', turno: 'Matutino', email: '' });
          setEditOp(null);
          fire('Operador actualizado');
          break;
        }

        case 'toggle': {
          const { ok, error } = await toggleOperatorActive(operatorId, payload.newActive, audit);
          if (error || !ok) {
            setShowReasonModal(false);
            fire('Error: ' + (error?.message || 'no se pudo cambiar el estado'));
            return;
          }
          setOperators(prev => prev.map(o => o.id === operatorId ? { ...o, active: payload.newActive } : o));
          setShowReasonModal(false);
          fire(payload.newActive ? 'Operador activado' : 'Operador desactivado');
          break;
        }

        default:
          setShowReasonModal(false);
      }
    } finally {
      setSaving(false);
      setPendingAction(null);
    }
  };

  // Encola el toggle y abre el ReasonModal (toggle_operator_active es
  // acción sensible: reason obligatorio).
  const toggleOp = (op) => {
    if (!loggedAdmin?.id) {
      fire('Error: sesion admin no disponible. Cerra sesion y volve a ingresar.');
      return;
    }
    if (!sb || !sbConnected) { fire('Sin conexion'); return; }
    setPendingAction({
      type: 'toggle',
      operatorId: op.id,
      operatorUsername: op.user,
      payload: { newActive: !op.active },
      actionLabel: op.active ? 'Desactivar operador' : 'Activar operador',
    });
    setShowReasonModal(true);
  };

  // ── estilos (FORMATO GENERAL Admin v2) ──────────────────────
  const lbl = { display: 'block', fontSize: 11, fontWeight: 800, color: '#9E9E9E', marginBottom: 5, textTransform: 'uppercase', letterSpacing: .8 };
  const miniBtn = (color) => ({
    padding: '6px 10px', borderRadius: 8, border: `1px solid ${AT.border}`,
    background: 'transparent', color, fontSize: 11, fontWeight: 700,
    cursor: 'pointer', fontFamily: "'DM Sans'", flexShrink: 0,
  });
  const overlay = {
    position: 'fixed', inset: 0, zIndex: 200,
    background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  };
  const sheet = {
    background: AT.bg, border: `1px solid ${AT.border}`,
    borderRadius: 20, padding: 24, width: '100%', maxWidth: 460,
    maxHeight: '90vh', overflowY: 'auto',
  };
  const stationNames = (stations || []).length > 0 ? stations.filter(s => s.active !== false).map(s => s.name) : ['Turkaj I', 'Turkaj II', 'Turkaj III'];
  const ratingOf = (id) => {
    const rats = opRatings[id] || [];
    if (!rats.length) return null;
    return { avg: (rats.reduce((s, r) => s + (r.stars || 0), 0) / rats.length).toFixed(1), n: rats.length };
  };

  const activeCount = operators.filter(o => o.active).length;

  return (
    <div style={{ padding: '22px 22px 60px' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 21, fontWeight: 800, color: '#fff' }}>Operadores</div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#9E9E9E', marginTop: 2 }}>
            {operators.length.toLocaleString('en-US')} operadores — {activeCount.toLocaleString('en-US')} activos · {(operators.length - activeCount).toLocaleString('en-US')} inactivos
          </div>
        </div>
        <button onClick={() => { setShowOpReg(true); setEditOp(null); setNewOp({ name: '', user: '', password: '', dpi: '', gafete: '', phone: '', station: stationNames[0] || 'Turkaj I', bomba: '', turno: 'Matutino', email: '' }); }}
          style={{ ...btnYellow, width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 12, fontSize: 13, padding: '11px 18px' }}>
          <span style={{ display: 'flex', transform: 'scale(.8)' }}><Plus /></span> Nuevo operador
        </button>
      </div>

      {operators.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: '#777', fontSize: 13, fontWeight: 700 }}>No hay operadores registrados</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 10 }}>
        {operators.map(op => {
          const rat = ratingOf(op.id);
          return (
            <div key={op.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: AT.card, border: `1px solid ${AT.border}`,
              borderRadius: 16, padding: '12px 14px', opacity: op.active ? 1 : .55,
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 13, background: op.active ? 'rgba(46,125,50,.25)' : 'rgba(255,255,255,.08)', color: op.active ? '#81C784' : '#999', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>{op.name.charAt(0)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div onClick={() => setSelOp(op)} style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 13.5, color: '#E0E0E0', cursor: 'pointer' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.name}</span>
                  {op.external === 'proper' && <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 800, letterSpacing: 1, padding: '2px 7px', borderRadius: 7, background: 'rgba(250,84,8,.15)', color: '#FA5408' }}>PROPER</span>}
                  {!op.active && <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 800, letterSpacing: .5, padding: '2px 7px', borderRadius: 7, background: 'rgba(255,255,255,.08)', color: '#999' }}>INACTIVO</span>}
                </div>
                {/* Espejo de PROPER: su estación es la última donde despachó
                    (viaja con cada factura, ya no es una asignación fija). */}
                <div style={{ fontSize: 11, color: '#777', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {op.external === 'proper' ? `Despachó en ${op.station || '—'}` : (op.station || '—')} · Gafete {op.gafete} · {op.turno}
                </div>
                <div style={{ fontSize: 10.5, color: '#555', marginTop: 2, ...sMono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  @{op.user}{op.phone ? ` · ${phoneMask.format(op.phone)}` : ''}{rat ? ` · ${rat.avg} (${rat.n} calif.)` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                <button onClick={() => { setEditOp(op); setNewOp({ name: op.name, user: op.user, password: '', dpi: op.dpi, gafete: op.gafete, phone: op.phone, station: op.station || stationNames[0], bomba: op.bomba, turno: op.turno, email: op.email }); setShowOpReg(true); }} style={miniBtn('#64B5F6')}>Editar</button>
                <button onClick={() => toggleOp(op)} style={miniBtn(op.active ? '#FF8F00' : '#81C784')}>{op.active ? 'Desactivar' : 'Activar'}</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Form alta/edición (modal oscuro centrado) ── */}
      {showOpReg && (
        <div style={overlay} onClick={() => { if (!saving) { setShowOpReg(false); setEditOp(null); } }}>
          <div onClick={e => e.stopPropagation()} style={sheet}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 16 }}>{editOp ? 'Editar operador' : 'Nuevo operador'}</div>
            {[
              { k: 'name', l: 'Nombre completo *', p: 'Juan Perez' },
              { k: 'user', l: 'Usuario *', p: 'jperez' },
              { k: 'password', l: editOp ? 'Contraseña (vacío = no cambiar)' : 'Contraseña *', p: editOp ? 'Dejar vacío para no cambiar' : 'Mínimo 6 caracteres', t: 'password' },
              { k: 'dpi', l: 'DPI *', p: '1234 56789 0123', mask: dpiMask, inputMode: 'numeric' },
              { k: 'gafete', l: 'No. Gafete *', p: 'GAF-001' },
              { k: 'phone', l: 'Teléfono', p: '5551 2345', mask: phoneMask, inputMode: 'numeric' },
              { k: 'bomba', l: 'No. Bomba', p: '1' },
              { k: 'email', l: 'Email', p: 'operador@turkaj.com', t: 'email' },
            ].map(f => (
              <div key={f.k} style={{ marginBottom: 12 }}>
                <label style={lbl}>{f.l}</label>
                <input
                  type={f.t || 'text'} placeholder={f.p} inputMode={f.inputMode}
                  value={f.mask ? f.mask.format(newOp[f.k] || '') : (newOp[f.k] || '')}
                  onChange={e => {
                    const val = f.mask ? f.mask.clean(e.target.value) : e.target.value;
                    setNewOp(p => ({ ...p, [f.k]: val }));
                  }}
                  style={{ ...inputStyleDark, fontSize: 13, padding: '10px 12px', ...(f.mask ? { fontVariantNumeric: 'tabular-nums', letterSpacing: .5 } : {}) }}
                />
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
              <div>
                <label style={lbl}>Estación</label>
                <select value={newOp.station} onChange={e => setNewOp(p => ({ ...p, station: e.target.value }))} style={{ ...inputStyleDark, appearance: 'none', fontSize: 13, padding: '10px 12px' }}>
                  {stationNames.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Turno</label>
                <select value={newOp.turno} onChange={e => setNewOp(p => ({ ...p, turno: e.target.value }))} style={{ ...inputStyleDark, appearance: 'none', fontSize: 13, padding: '10px 12px' }}>
                  <option>Matutino</option>
                  <option>Vespertino</option>
                  <option>Nocturno</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowOpReg(false); setEditOp(null); }} disabled={saving} style={{
                flex: 1, padding: 13, borderRadius: 12, cursor: 'pointer',
                border: `1px solid ${AT.border}`, background: 'transparent', color: '#9E9E9E',
                fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700, opacity: saving ? .5 : 1,
              }}>Cancelar</button>
              <button onClick={saveOp} disabled={saving} style={{
                flex: 2, padding: 13, borderRadius: 12, cursor: 'pointer', border: 'none',
                background: '#FBBC04', color: '#0D0D0D', opacity: saving ? .7 : 1,
                fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 800,
              }}>{saving ? 'Guardando...' : editOp ? 'Guardar cambios' : 'Registrar operador'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Ficha del operador (historial de compras y entregas) ── */}
      {selOp && (
        <div style={{ ...overlay, zIndex: 300 }} onClick={() => { setSelOp(null); setOpHistory([]); setOpRedeems([]); setHistTab('compras'); }}>
          <div onClick={e => e.stopPropagation()} style={{ ...sheet, padding: 0, maxWidth: 520, display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>
            <div style={{ padding: '18px 20px 12px', borderBottom: `1px solid ${AT.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selOp.name}</div>
                <div style={{ fontSize: 11, color: '#777', marginTop: 2 }}>{selOp.station || '—'} · Gafete {selOp.gafete} · {selOp.turno}</div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
                {(() => {
                  const rat = ratingOf(selOp.id);
                  return rat ? <div style={{ fontSize: 13, fontWeight: 800, color: '#FBBC04', ...sMono }}>{rat.avg} <span style={{ fontSize: 10, color: '#777' }}>({rat.n})</span></div> : null;
                })()}
                <button onClick={() => setSelOp(null)} aria-label="Cerrar" style={{ background: 'none', border: 'none', color: '#9E9E9E', cursor: 'pointer', display: 'flex', padding: 4 }}><XMark /></button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '12px 20px', borderBottom: `1px solid ${AT.border}` }}>
              {[
                { l: 'Compras', v: opHistory.length.toLocaleString('en-US'), c: '#FBBC04' },
                { l: 'Pts otorgados', v: opHistory.reduce((s, t) => s + (t.pts || 0), 0).toLocaleString('en-US'), c: '#81C784' },
                { l: 'Canjes', v: opRedeems.length.toLocaleString('en-US'), c: '#64B5F6' },
              ].map(s => (
                <div key={s.l} style={{ background: 'rgba(255,255,255,.05)', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                  <div style={{ ...sMono, fontSize: 16, fontWeight: 800, color: s.c }}>{s.v}</div>
                  <div style={{ fontSize: 9, color: '#777', textTransform: 'uppercase', letterSpacing: .5, fontWeight: 700, marginTop: 3 }}>{s.l}</div>
                </div>
              ))}
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 20 }}>
              {/* Pestañas */}
              <div style={{ display: 'flex', gap: 8, padding: '10px 20px 0' }}>
                {[{ id: 'compras', l: `Compras (${opHistory.length})` }, { id: 'canjes', l: `Canjes (${opRedeems.length})` }].map(t => (
                  <button key={t.id} onClick={() => setHistTab(t.id)} style={{ flex: 1, padding: '8px 4px', borderRadius: 10, border: 'none', background: histTab === t.id ? '#FBBC04' : 'rgba(255,255,255,.07)', color: histTab === t.id ? '#0D0D0D' : '#9E9E9E', fontFamily: "'DM Sans'", fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>{t.l}</button>
                ))}
              </div>

              {loadingHist && <div style={{ textAlign: 'center', padding: 32, color: '#777', fontSize: 13, fontWeight: 700 }}>Cargando...</div>}

              {/* Lista compras */}
              {!loadingHist && histTab === 'compras' && (
                opHistory.length === 0
                  ? <div style={{ textAlign: 'center', padding: 32, color: '#555', fontSize: 13 }}>Sin compras registradas</div>
                  : opHistory.map((h) => {
                      const d = h.date ? new Date(h.date) : null;
                      const dateStr = d ? d.toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
                      const timeStr = d ? d.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }) : '';
                      return (
                        <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderBottom: `1px solid ${AT.border}` }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(251,188,4,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#FBBC04', flexShrink: 0, ...sMono }}>Q</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#E0E0E0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.memberName}</div>
                            <div style={{ fontSize: 11, color: '#777', marginTop: 2 }}>{h.desc} · {h.fuel}</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: '#FBBC04', ...sMono }}>+{h.pts} pts</div>
                            <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>{dateStr}</div>
                            <div style={{ fontSize: 9, color: '#444' }}>{timeStr}</div>
                          </div>
                        </div>
                      );
                    })
              )}

              {/* Lista canjes */}
              {!loadingHist && histTab === 'canjes' && (
                opRedeems.length === 0
                  ? <div style={{ textAlign: 'center', padding: 32, color: '#555', fontSize: 13 }}>Sin canjes registrados</div>
                  : opRedeems.map((h) => {
                      const d = h.date ? new Date(h.date) : null;
                      const dateStr = d ? d.toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
                      const timeStr = d ? d.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }) : '';
                      return (
                        <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderBottom: `1px solid ${AT.border}` }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(100,181,246,.15)', color: '#64B5F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <RewardIcon reward={{ icon: h.rewardIcon, name: h.rewardName }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#E0E0E0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.memberName}</div>
                            <div style={{ fontSize: 11, color: '#777', marginTop: 2 }}>{h.rewardName}</div>
                            <div style={{ fontSize: 10, color: '#555', ...sMono, marginTop: 1 }}>{h.code}</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: '#64B5F6', ...sMono }}>-{h.pts} pts</div>
                            <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>{dateStr}</div>
                            <div style={{ fontSize: 9, color: '#444' }}>{timeStr}</div>
                          </div>
                        </div>
                      );
                    })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: motivo del cambio (auditoría F0.3.5) ─── */}
      <ReasonModal
        open={showReasonModal}
        onClose={() => { if (!saving) { setShowReasonModal(false); setPendingAction(null); } }}
        onConfirm={confirmAction}
        actionLabel={pendingAction?.actionLabel || 'Confirmar acción'}
        loading={saving}
      />

    </div>
  );
}
