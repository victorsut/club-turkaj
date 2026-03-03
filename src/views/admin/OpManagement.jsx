// src/views/admin/OpManagement.jsx
// Admin operator management — list, register, edit, toggle active
import { useState } from 'react';
import { sMono, adminTheme as AT, btnYellow, btnDark, inputStyle } from '../../constants/styles';
import { Back, Plus } from '../../components/ui/Icons';

export default function OpManagement(ctx) {
  const {
    operators, setOperators, setScr, fire, opRatings,
    showOpReg, setShowOpReg, editOp, setEditOp,
    newOp, setNewOp,
  } = ctx;

  const saveOp = () => {
    if (!newOp.name || !newOp.user || !newOp.password || !newOp.dpi || !newOp.gafete) {
      fire('❌ Nombre, usuario, contraseña, DPI y gafete son obligatorios'); return;
    }
    if (editOp) {
      setOperators(prev => prev.map(o => o.id === editOp.id ? { ...o, ...newOp } : o));
      fire('✅ Operador actualizado');
    } else {
      const id = 'OP-' + String(operators.length + 1).padStart(3, '0');
      setOperators(prev => [...prev, { id, ...newOp, registered: new Date().toISOString().split('T')[0], active: true }]);
      fire('✅ Operador registrado: ' + newOp.name);
    }
    setNewOp({ name: '', user: '', password: '', dpi: '', gafete: '', phone: '', station: 'Turkaj I', bomba: '', turno: 'Matutino', email: '' });
    setEditOp(null);
    setShowOpReg(false);
  };

  const toggleOp = (id) => {
    setOperators(prev => prev.map(o => o.id === id ? { ...o, active: !o.active } : o));
  };

  const aSec = { padding: '20px 20px 8px', fontSize: 12, fontWeight: 800, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: 2 };
  const sLbl = { display: 'block', fontSize: 11, fontWeight: 700, color: '#757575', marginBottom: 4, textTransform: 'uppercase', letterSpacing: .8 };

  return (
    <div style={{ paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${AT.border}`, background: '#252525', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setScr('cfg')} style={{ background: 'none', border: 'none', color: '#9E9E9E', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600 }}><Back /> Config</button>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Operadores</div>
        <button onClick={() => { setShowOpReg(true); setEditOp(null); setNewOp({ name: '', user: '', password: '', dpi: '', gafete: '', phone: '', station: 'Turkaj I', bomba: '', turno: 'Matutino', email: '' }); }}
          style={{ ...btnYellow, padding: '8px 16px', fontSize: 12, width: 'auto', borderRadius: 12 }}><Plus /> Nuevo</button>
      </div>

      {/* Stats */}
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

      {/* Operator list */}
      <div style={aSec}>Lista de Operadores</div>
      {operators.map(op => (
        <div key={op.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: `1px solid ${AT.border}`, opacity: op.active ? 1 : .5 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: op.active ? '#2E7D32' : '#616161', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>{op.name.charAt(0)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#E0E0E0' }}>{op.name}</div>
            <div style={{ fontSize: 11, color: '#777', marginTop: 2 }}>
              🏪 {op.station} · 🔖 {op.gafete} · {op.turno}
            </div>
            <div style={{ fontSize: 10, color: '#555', marginTop: 2, ...sMono }}>{op.id} · 📱 {op.phone || '—'}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={() => { setEditOp(op); setNewOp({ ...op }); setShowOpReg(true); }}
              style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${AT.border}`, background: AT.card, fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 700, cursor: 'pointer', color: '#64B5F6' }}>✏️</button>
            <button onClick={() => toggleOp(op.id)}
              style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${AT.border}`, background: AT.card, fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 700, cursor: 'pointer', color: op.active ? '#EF5350' : '#2E7D32' }}>{op.active ? '⏸️' : '▶️'}</button>
          </div>
        </div>
      ))}

      {/* Register/Edit Modal */}
      {showOpReg && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(6px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowOpReg(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '28px 28px 0 0', padding: '28px 24px 32px', maxWidth: 480, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ width: 40, height: 4, background: '#E0E0E0', borderRadius: 2, margin: '0 auto 20px' }} />
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>{editOp ? '✏️ Editar' : '👷 Nuevo'} Operador</div>
            {[
              { k: 'name', l: 'Nombre completo *', p: 'Juan Pérez' },
              { k: 'user', l: 'Usuario *', p: 'jperez' },
              { k: 'password', l: 'Contraseña *', p: '••••••', t: 'password' },
              { k: 'dpi', l: 'DPI *', p: '1234567890101' },
              { k: 'gafete', l: 'No. Gafete *', p: 'GAF-001' },
              { k: 'phone', l: 'Teléfono', p: '5551-2345' },
              { k: 'bomba', l: 'No. Bomba', p: '1' },
              { k: 'email', l: 'Email', p: 'operador@turkaj.com' },
            ].map(f => (
              <div key={f.k} style={{ marginBottom: 12 }}>
                <label style={sLbl}>{f.l}</label>
                <input type={f.t || 'text'} placeholder={f.p} value={newOp[f.k] || ''} onChange={e => setNewOp(p => ({ ...p, [f.k]: e.target.value }))}
                  style={{ ...inputStyle }} />
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div>
                <label style={sLbl}>Estación</label>
                <select value={newOp.station} onChange={e => setNewOp(p => ({ ...p, station: e.target.value }))}
                  style={{ ...inputStyle, appearance: 'none' }}>
                  <option>Turkaj I</option><option>Turkaj II</option><option>Turkaj III</option>
                </select>
              </div>
              <div>
                <label style={sLbl}>Turno</label>
                <select value={newOp.turno} onChange={e => setNewOp(p => ({ ...p, turno: e.target.value }))}
                  style={{ ...inputStyle, appearance: 'none' }}>
                  <option>Matutino</option><option>Vespertino</option><option>Nocturno</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowOpReg(false); setEditOp(null); }} style={{ ...btnDark, flex: 1 }}>Cancelar</button>
              <button onClick={saveOp} style={{ ...btnYellow, flex: 2 }}>{editOp ? 'Guardar' : 'Registrar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
