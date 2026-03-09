// src/views/admin/OpManagement.jsx
// Admin operator management — list, register, edit, toggle active
import { useState } from 'react';
import { sb } from '../../lib/supabaseClient';
import { sMono, adminTheme as AT, btnYellow, btnDark, inputStyle } from '../../constants/styles';
import { Back, Plus } from '../../components/ui/Icons';

export default function OpManagement(ctx) {
  const {
    operators, setOperators, stations, setScr, fire, opRatings,
    showOpReg, setShowOpReg, editOp, setEditOp,
    newOp, setNewOp, sbConnected,
  } = ctx;

  const [saving, setSaving] = useState(false);

  const saveOp = async () => {
    if (!newOp.name || !newOp.user || !newOp.password || !newOp.dpi || !newOp.gafete) {
      fire('❌ Nombre, usuario, contraseña, DPI y gafete son obligatorios'); return;
    }
    setSaving(true);

    // Resolve station_id from station name
    const stationObj = (stations || []).find(s => s.name === newOp.station);
    const stationId = stationObj?.id || null;

    const dbData = {
      name: newOp.name,
      username: newOp.user,
      password_hash: newOp.password,
      dpi: newOp.dpi,
      gafete: newOp.gafete,
      phone: newOp.phone || null,
      email: newOp.email || null,
      station_id: stationId,
      bomba: newOp.bomba || null,
      turno: newOp.turno || 'Matutino',
    };

    if (sb && sbConnected) {
      if (editOp) {
        // Update existing
        const { error } = await sb.from('operators').update(dbData).eq('id', editOp.id);
        if (error) {
          fire('❌ Error: ' + error.message);
          setSaving(false);
          return;
        }
        setOperators(prev => prev.map(o => o.id === editOp.id ? {
          ...o, ...newOp, station: newOp.station, stationId,
        } : o));
        fire('✅ Operador actualizado');
      } else {
        // Insert new
        const { data, error } = await sb.from('operators').insert(dbData).select();
        if (error) {
          if (error.message.includes('unique')) fire('❌ El usuario o gafete ya existe');
          else fire('❌ Error: ' + error.message);
          setSaving(false);
          return;
        }
        if (data?.[0]) {
          setOperators(prev => [...prev, {
            id: data[0].id, name: newOp.name, user: newOp.user, password: newOp.password,
            dpi: newOp.dpi, gafete: newOp.gafete, phone: newOp.phone || '',
            email: newOp.email || '', station: newOp.station, stationId,
            bomba: newOp.bomba || '', turno: newOp.turno || 'Matutino', active: true,
          }]);
        }
        fire('✅ Operador registrado: ' + newOp.name);
      }
    } else {
      fire('❌ Sin conexión a Supabase');
      setSaving(false);
      return;
    }

    setNewOp({ name: '', user: '', password: '', dpi: '', gafete: '', phone: '', station: 'Turkaj I', bomba: '', turno: 'Matutino', email: '' });
    setEditOp(null);
    setShowOpReg(false);
    setSaving(false);
  };

  const toggleOp = async (id, currentActive) => {
    if (sb && sbConnected) {
      const { error } = await sb.from('operators').update({ active: !currentActive }).eq('id', id);
      if (error) { fire('❌ Error: ' + error.message); return; }
    }
    setOperators(prev => prev.map(o => o.id === id ? { ...o, active: !o.active } : o));
    fire(currentActive ? '⏸️ Operador desactivado' : '▶️ Operador activado');
  };

  const aSec = { padding: '20px 20px 8px', fontSize: 12, fontWeight: 800, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: 2 };
  const sLbl = { display: 'block', fontSize: 11, fontWeight: 700, color: '#757575', marginBottom: 4, textTransform: 'uppercase', letterSpacing: .8 };

  // Station names for dropdown
  const stationNames = (stations || []).length > 0
    ? stations.filter(s => s.active !== false).map(s => s.name)
    : ['Turkaj I', 'Turkaj II', 'Turkaj III'];

  return (
    <div style={{ paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${AT.border}`, background: '#252525', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setScr('dash')} style={{ background: 'none', border: 'none', color: '#9E9E9E', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600 }}><Back /> Inicio</button>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Operadores</div>
        <button onClick={() => { setShowOpReg(true); setEditOp(null); setNewOp({ name: '', user: '', password: '', dpi: '', gafete: '', phone: '', station: stationNames[0] || 'Turkaj I', bomba: '', turno: 'Matutino', email: '' }); }}
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
      <div style={aSec}>Lista de Operadores ({operators.length})</div>
      {operators.length === 0 && (
        <div style={{ textAlign: 'center', padding: 32, color: '#777', fontSize: 13 }}>No hay operadores registrados</div>
      )}
      {operators.map(op => {
        const rats = opRatings[op.id] || [];
        const avg = rats.length > 0 ? (rats.reduce((s, r) => s + (r.stars || r.score || 0), 0) / rats.length).toFixed(1) : null;
        return (
          <div key={op.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: `1px solid ${AT.border}`, opacity: op.active ? 1 : .5 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: op.active ? '#2E7D32' : '#616161', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>{op.name.charAt(0)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#E0E0E0' }}>{op.name}</div>
              <div style={{ fontSize: 11, color: '#777', marginTop: 2 }}>
                🏪 {op.station || '—'} · 🔖 {op.gafete} · {op.turno}
              </div>
              <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>
                👤 @{op.user} · 📱 {op.phone || '—'} {avg ? ` · ⭐ ${avg}` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={() => { setEditOp(op); setNewOp({ name: op.name, user: op.user, password: op.password, dpi: op.dpi, gafete: op.gafete, phone: op.phone, station: op.station || stationNames[0], bomba: op.bomba, turno: op.turno, email: op.email }); setShowOpReg(true); }}
                style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${AT.border}`, background: AT.card, fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 700, cursor: 'pointer', color: '#64B5F6' }}>✏️</button>
              <button onClick={() => toggleOp(op.id, op.active)}
                style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${AT.border}`, background: AT.card, fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 700, cursor: 'pointer', color: op.active ? '#EF5350' : '#2E7D32' }}>{op.active ? '⏸️' : '▶️'}</button>
            </div>
          </div>
        );
      })}

      {/* Register/Edit Modal */}
      {showOpReg && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(6px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => { if (!saving) { setShowOpReg(false); setEditOp(null); } }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '28px 28px 0 0', padding: '28px 24px 32px', maxWidth: 480, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ width: 40, height: 4, background: '#E0E0E0', borderRadius: 2, margin: '0 auto 20px' }} />
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>{editOp ? '✏️ Editar' : '👷 Nuevo'} Operador</div>
            {[
              { k: 'name', l: 'Nombre completo *', p: 'Juan Pérez' },
              { k: 'user', l: 'Usuario *', p: 'jperez' },
              { k: 'password', l: 'Contraseña *', p: '••••••', t: editOp ? 'text' : 'password' },
              { k: 'dpi', l: 'DPI *', p: '1234567890101', num: true, max: 13 },
              { k: 'gafete', l: 'No. Gafete *', p: 'GAF-001' },
              { k: 'phone', l: 'Teléfono', p: '55512345', num: true, max: 8 },
              { k: 'bomba', l: 'No. Bomba', p: '1' },
              { k: 'email', l: 'Email', p: 'operador@turkaj.com', t: 'email' },
            ].map(f => (
              <div key={f.k} style={{ marginBottom: 12 }}>
                <label style={sLbl}>{f.l}</label>
                <input type={f.t || 'text'}
                  placeholder={f.p}
                  inputMode={f.num ? 'numeric' : undefined}
                  maxLength={f.max}
                  value={newOp[f.k] || ''}
                  onChange={e => {
                    let val = f.num ? e.target.value.replace(/[^0-9]/g, '') : e.target.value;
                    setNewOp(p => ({ ...p, [f.k]: val }));
                  }}
                  style={inputStyle} />
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div>
                <label style={sLbl}>Estación</label>
                <select value={newOp.station} onChange={e => setNewOp(p => ({ ...p, station: e.target.value }))}
                  style={{ ...inputStyle, appearance: 'none' }}>
                  {stationNames.map(s => <option key={s} value={s}>{s}</option>)}
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
              <button onClick={() => { setShowOpReg(false); setEditOp(null); }} disabled={saving}
                style={{ ...btnDark, flex: 1, opacity: saving ? .5 : 1 }}>Cancelar</button>
              <button onClick={saveOp} disabled={saving}
                style={{ ...btnYellow, flex: 2, opacity: saving ? .7 : 1 }}>
                {saving ? '⏳ Guardando...' : editOp ? 'Guardar Cambios' : 'Registrar Operador'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
