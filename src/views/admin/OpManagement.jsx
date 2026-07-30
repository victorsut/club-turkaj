// src/views/admin/OpManagement.jsx
import { useState, useEffect } from 'react';
import { sb } from '../../lib/supabaseClient';
import { sMono, adminTheme as AT, btnYellow, btnDark, inputStyle } from '../../constants/styles';
import { Back, Plus } from '../../components/ui/Icons';
import { createOperatorRPC, updateOperatorPassword, toggleOperatorActive, updateOperatorProfile } from '../../services/operatorAuthService';
import { fetchOperatorPurchases, fetchOperatorRedemptions } from '../../services/secureReads';
import ReasonModal from '../../components/ui/ReasonModal';

export default function OpManagement(ctx) {
  const { operators, setOperators, stations, setScr, fire, opRatings, showOpReg, setShowOpReg, editOp, setEditOp, newOp, setNewOp, sbConnected, loggedAdmin } = ctx;
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
      console.log('[OpMgmt] Compras:', purchRows.length, '· Canjes:', redeemRows.length);
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
    const { type, operatorId, operatorUsername, payload } = pendingAction;

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

          setOperators(prev => prev.map(o =>
            o.id === operatorId
              ? { ...o, ...newOp, station: payload.station, stationId: payload.stationId }
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

  const aSec = { padding: '20px 20px 8px', fontSize: 12, fontWeight: 800, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: 2 };
  const sLbl = { display: 'block', fontSize: 11, fontWeight: 700, color: '#757575', marginBottom: 4, textTransform: 'uppercase', letterSpacing: .8 };
  const stationNames = (stations || []).length > 0 ? stations.filter(s => s.active !== false).map(s => s.name) : ['Turkaj I', 'Turkaj II', 'Turkaj III'];

  return (
    <div style={{ paddingBottom: 90 }}>

      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${AT.border}`, background: '#252525', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setScr('dash')} style={{ background: 'none', border: 'none', color: '#9E9E9E', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600 }}><Back /> Inicio</button>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Operadores</div>
        <button onClick={() => { setShowOpReg(true); setEditOp(null); setNewOp({ name: '', user: '', password: '', dpi: '', gafete: '', phone: '', station: stationNames[0] || 'Turkaj I', bomba: '', turno: 'Matutino', email: '' }); }} style={{ ...btnYellow, padding: '8px 16px', fontSize: 12, width: 'auto', borderRadius: 12 }}><Plus /> Nuevo</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '12px 20px' }}>
        <div style={{ background: AT.card, borderRadius: 14, padding: 14, border: `1px solid ${AT.border}`, textAlign: 'center' }}>
          <div style={{ ...sMono, fontSize: 28, color: '#2E7D32' }}>{operators.filter(o => o.active).length}</div>
          <div style={{ fontSize: 10, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginTop: 4 }}>Activos</div>
        </div>
        <div style={{ background: AT.card, borderRadius: 14, padding: 14, border: `1px solid ${AT.border}`, textAlign: 'center' }}>
          <div style={{ ...sMono, fontSize: 28, color: '#C62828' }}>{operators.filter(o => !o.active).length}</div>
          <div style={{ fontSize: 10, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginTop: 4 }}>Inactivos</div>
        </div>
      </div>

      <div style={aSec}>Lista de Operadores ({operators.length})</div>

      {operators.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: '#777', fontSize: 13 }}>No hay operadores registrados</div>}

      {operators.map(op => {
        const rats = opRatings[op.id] || [];
        const avg  = rats.length > 0 ? (rats.reduce((s, r) => s + (r.stars || 0), 0) / rats.length).toFixed(1) : null;
        return (
          <div key={op.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: `1px solid ${AT.border}`, opacity: op.active ? 1 : .5 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: op.active ? '#2E7D32' : '#616161', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>{op.name.charAt(0)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div onClick={() => setSelOp(op)} style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14, color: '#64B5F6', cursor: 'pointer' }}>
                <span style={{ textDecoration: 'underline', textDecorationStyle: 'dotted', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.name}</span>
                {op.external === 'proper' && <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 800, letterSpacing: 1, padding: '2px 7px', borderRadius: 7, background: 'rgba(250,84,8,.15)', color: '#FA5408' }}>PROPER</span>}
              </div>
              {/* Espejo de PROPER: su estación es la última donde despachó
                  (viaja con cada factura, ya no es una asignación fija). */}
              <div style={{ fontSize: 11, color: '#777', marginTop: 2 }}>{op.external === 'proper' ? `Despachó en ${op.station || '-'}` : (op.station || '-')} | #{op.gafete} | {op.turno}</div>
              <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>@{op.user}{op.phone ? ' | ' + op.phone : ''}{avg ? ' | ' + avg + ' pts' : ''}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={() => { setEditOp(op); setNewOp({ name: op.name, user: op.user, password: '', dpi: op.dpi, gafete: op.gafete, phone: op.phone, station: op.station || stationNames[0], bomba: op.bomba, turno: op.turno, email: op.email }); setShowOpReg(true); }} style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${AT.border}`, background: AT.card, fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 700, cursor: 'pointer', color: '#64B5F6' }}>Editar</button>
              <button onClick={() => toggleOp(op)} style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${AT.border}`, background: AT.card, fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 700, cursor: 'pointer', color: op.active ? '#EF5350' : '#2E7D32' }}>{op.active ? 'Desact.' : 'Activar'}</button>
            </div>
          </div>
        );
      })}

      {showOpReg && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(6px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => { if (!saving) { setShowOpReg(false); setEditOp(null); } }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '28px 28px 0 0', padding: '28px 24px 32px', maxWidth: 480, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ width: 40, height: 4, background: '#E0E0E0', borderRadius: 2, margin: '0 auto 20px' }} />
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>{editOp ? 'Editar' : 'Nuevo'} Operador</div>
            {[
              { k: 'name', l: 'Nombre completo *', p: 'Juan Perez' },
              { k: 'user', l: 'Usuario *', p: 'jperez' },
              { k: 'password', l: editOp ? 'Contrasena (dejar vacio para no cambiar)' : 'Contrasena *', p: editOp ? 'Dejar vacio para no cambiar' : '******', t: 'password' },
              { k: 'dpi', l: 'DPI *', p: '1234567890101', num: true, max: 13 },
              { k: 'gafete', l: 'No. Gafete *', p: 'GAF-001' },
              { k: 'phone', l: 'Telefono', p: '55512345', num: true, max: 8 },
              { k: 'bomba', l: 'No. Bomba', p: '1' },
              { k: 'email', l: 'Email', p: 'operador@turkaj.com', t: 'email' },
            ].map(f => (
              <div key={f.k} style={{ marginBottom: 12 }}>
                <label style={sLbl}>{f.l}</label>
                <input type={f.t || 'text'} placeholder={f.p} inputMode={f.num ? 'numeric' : undefined} maxLength={f.max} value={newOp[f.k] || ''} onChange={e => { const val = f.num ? e.target.value.replace(/[^0-9]/g, '') : e.target.value; setNewOp(p => ({ ...p, [f.k]: val })); }} style={inputStyle} />
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div>
                <label style={sLbl}>Estacion</label>
                <select value={newOp.station} onChange={e => setNewOp(p => ({ ...p, station: e.target.value }))} style={{ ...inputStyle, appearance: 'none' }}>
                  {stationNames.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={sLbl}>Turno</label>
                <select value={newOp.turno} onChange={e => setNewOp(p => ({ ...p, turno: e.target.value }))} style={{ ...inputStyle, appearance: 'none' }}>
                  <option>Matutino</option>
                  <option>Vespertino</option>
                  <option>Nocturno</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowOpReg(false); setEditOp(null); }} disabled={saving} style={{ ...btnDark, flex: 1, opacity: saving ? .5 : 1 }}>Cancelar</button>
              <button onClick={saveOp} disabled={saving} style={{ ...btnYellow, flex: 2, opacity: saving ? .7 : 1 }}>{saving ? 'Guardando...' : editOp ? 'Guardar Cambios' : 'Registrar Operador'}</button>
            </div>
          </div>
        </div>
      )}

      {selOp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => { setSelOp(null); setOpHistory([]); setOpRedeems([]); setHistTab('compras'); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1E1E1E', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column', animation: 'slideUp .3s ease' }}>

            <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,.2)', borderRadius: 4, margin: '12px auto 0' }} />

            <div style={{ padding: '16px 20px 12px', borderBottom: `1px solid ${AT.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>{selOp.name}</div>
                <div style={{ fontSize: 11, color: '#777', marginTop: 2 }}>{selOp.station || '-'} | #{selOp.gafete} | {selOp.turno}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {(() => {
                  const rats = opRatings[selOp.id] || [];
                  const avg  = rats.length > 0 ? (rats.reduce((s, r) => s + (r.stars || 0), 0) / rats.length).toFixed(1) : null;
                  return avg ? <div style={{ fontSize: 13, fontWeight: 800, color: '#FBBC04' }}>* {avg} ({rats.length})</div> : null;
                })()}
                <button onClick={() => setSelOp(null)} style={{ background: 'none', border: 'none', color: '#9E9E9E', fontSize: 20, cursor: 'pointer' }}>X</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '12px 20px', borderBottom: `1px solid ${AT.border}` }}>
              {[
                { l: 'Compras', v: opHistory.length, c: '#FBBC04' },
                { l: 'Pts otorgados', v: opHistory.reduce((s, t) => s + (t.pts || 0), 0).toLocaleString(), c: '#4CAF50' },
                { l: 'Canjes', v: opRedeems.length, c: '#64B5F6' },
              ].map(s => (
                <div key={s.l} style={{ background: 'rgba(255,255,255,.05)', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: s.c }}>{s.v}</div>
                  <div style={{ fontSize: 9, color: '#777', textTransform: 'uppercase', letterSpacing: .5, fontWeight: 700, marginTop: 3 }}>{s.l}</div>
                </div>
              ))}
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 24 }}>
              {/* Pestañas */}
              <div style={{ display: 'flex', gap: 8, padding: '10px 20px 0' }}>
                {[{ id: 'compras', l: 'Compras (' + opHistory.length + ')' }, { id: 'canjes', l: 'Canjes (' + opRedeems.length + ')' }].map(t => (
                  <button key={t.id} onClick={() => setHistTab(t.id)} style={{ flex: 1, padding: '8px 4px', borderRadius: 10, border: 'none', background: histTab === t.id ? '#FBBC04' : 'rgba(255,255,255,.07)', color: histTab === t.id ? '#0D0D0D' : '#9E9E9E', fontFamily: "'DM Sans'", fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>{t.l}</button>
                ))}
              </div>

              {loadingHist && <div style={{ textAlign: 'center', padding: 32, color: '#777' }}>Cargando...</div>}

              {/* Lista compras */}
              {!loadingHist && histTab === 'compras' && (
                opHistory.length === 0
                  ? <div style={{ textAlign: 'center', padding: 32, color: '#555', fontSize: 13 }}>Sin compras registradas</div>
                  : opHistory.map((h) => {
                      const d = h.date ? new Date(h.date) : null;
                      const dateStr = d ? d.toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
                      const timeStr = d ? d.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }) : '';
                      return (
                        <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: `1px solid ${AT.border}` }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(251,188,4,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#FBBC04', flexShrink: 0 }}>Q</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#E0E0E0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.memberName}</div>
                            <div style={{ fontSize: 11, color: '#777', marginTop: 2 }}>{h.desc} | {h.fuel}</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: '#FBBC04' }}>+{h.pts} pts</div>
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
                        <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: `1px solid ${AT.border}` }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(100,181,246,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{h.rewardIcon || 'P'}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#E0E0E0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.memberName}</div>
                            <div style={{ fontSize: 11, color: '#777', marginTop: 2 }}>{h.rewardName}</div>
                            <div style={{ fontSize: 10, color: '#555', fontFamily: 'monospace', marginTop: 1 }}>{h.code}</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: '#64B5F6' }}>-{h.pts} pts</div>
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
