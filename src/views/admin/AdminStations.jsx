// src/views/admin/AdminStations.jsx
// F1 (4-ago-2026) — Gestión COMPLETA de estaciones desde el panel:
// nombre, dirección, horario, coordenadas, código PROPER y WiFi.
// Todo por admin_write_catalog('station', 'update') con sesión de
// admin y auditoría atómica (SEC.C.4); las estaciones no se crean ni
// eliminan desde el panel (regla del cierre de catálogo). El WiFi
// vivía en Configuración → se movió acá con el resto de la ficha.
import { useState, useEffect } from 'react';
import { sMono, adminTheme as AT, inputStyleDark } from '../../constants/styles';
import { Back } from '../../components/ui/Icons';
import { adminWriteCatalog } from '../../services/secureReads';

const sLbl = { display: 'block', fontSize: 11, fontWeight: 800, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 };

export default function AdminStations(ctx) {
  const { stations, setStations, setScr, fire, loggedAdmin } = ctx;

  // Copia editable por estación (id → form)
  const [forms, setForms] = useState([]);
  const [savingId, setSavingId] = useState(null);
  useEffect(() => {
    setForms((stations || []).map(s => ({
      id: s.id, name: s.name || '', address: s.address || '',
      schedule: s.schedule || '', lat: s.lat != null ? String(s.lat) : '',
      lng: s.lng != null ? String(s.lng) : '', externalCode: s.externalCode || '',
      ssid: s.wifiSsid || '', pass: s.wifiPassword || '',
    })));
  }, [stations]);

  const upd = (id, k, v) => setForms(p => p.map(f => f.id === id ? { ...f, [k]: v } : f));

  const save = async (f) => {
    if (!f.name.trim()) { fire('El nombre es obligatorio', 'error'); return; }
    const lat = f.lat.trim() === '' ? null : parseFloat(f.lat);
    const lng = f.lng.trim() === '' ? null : parseFloat(f.lng);
    if ((lat !== null && Number.isNaN(lat)) || (lng !== null && Number.isNaN(lng))) {
      fire('Coordenadas inválidas — usa números decimales', 'error'); return;
    }
    setSavingId(f.id);
    const res = await adminWriteCatalog('station', 'update', {
      id: f.id,
      data: {
        name: f.name.trim(), address: f.address.trim(),
        schedule: f.schedule.trim() || null,
        lat: f.lat.trim(), lng: f.lng.trim(),
        external_code: f.externalCode.trim(),
        wifi_ssid: f.ssid.trim() || null, wifi_password: f.pass.trim() || null,
      },
      audit: { adminId: loggedAdmin?.id, adminName: loggedAdmin?.name, adminEmail: loggedAdmin?.email },
    });
    setSavingId(null);
    if (res.error) { fire('Error: ' + res.error, 'error'); return; }
    if (setStations) {
      setStations(p => p.map(s => s.id === f.id ? {
        ...s, name: f.name.trim(), address: f.address.trim(),
        schedule: f.schedule.trim() || null, lat, lng,
        externalCode: f.externalCode.trim(),
        wifiSsid: f.ssid.trim() || null, wifiPassword: f.pass.trim() || null,
      } : s));
    }
    fire(`${f.name.trim()} actualizada`, 'success');
  };

  return (
    <div style={{ paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${AT.border}`, background: '#252525', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setScr('cfg')} style={{ background: 'none', border: 'none', color: '#9E9E9E', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600 }}><Back /> Configuración</button>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Estaciones</div>
        <div style={{ width: 110 }} />
      </div>

      <div style={{ fontSize: 11, color: '#777', lineHeight: 1.5, padding: '14px 20px 4px' }}>
        La dirección, horario y coordenadas alimentan el modal de Ubicación y la
        detección de estación del WiFi del cliente. El código PROPER identifica la
        estación en las facturas del POS. Las estaciones no se crean ni eliminan.
      </div>

      {/* Fichas por estación — en pantallas anchas fluyen en columnas */}
      <div className="pp-adm-grid" style={{ padding: '10px 20px' }}>
        {forms.map(f => (
          <div key={f.id} style={{ background: AT.card, border: `1px solid ${AT.border}`, borderRadius: 18, padding: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#64B5F6', marginBottom: 12 }}>{f.name || 'Estación'}</div>

            <label style={sLbl}>Nombre</label>
            <input value={f.name} onChange={e => upd(f.id, 'name', e.target.value)} style={{ ...inputStyleDark, marginBottom: 10 }} />

            <label style={sLbl}>Dirección</label>
            <input value={f.address} onChange={e => upd(f.id, 'address', e.target.value)} placeholder="Ej: 7a Av 6-10 Zona 1" style={{ ...inputStyleDark, marginBottom: 10 }} />

            <label style={sLbl}>Horario de atención</label>
            <input value={f.schedule} onChange={e => upd(f.id, 'schedule', e.target.value)} placeholder="Ej: 5:00 am – 9:30 pm" style={{ ...inputStyleDark, marginBottom: 10 }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={sLbl}>Latitud</label>
                <input value={f.lat} onChange={e => upd(f.id, 'lat', e.target.value)} placeholder="14.942641" inputMode="decimal" style={{ ...inputStyleDark, marginBottom: 10, ...sMono, fontSize: 12 }} />
              </div>
              <div>
                <label style={sLbl}>Longitud</label>
                <input value={f.lng} onChange={e => upd(f.id, 'lng', e.target.value)} placeholder="-91.109861" inputMode="decimal" style={{ ...inputStyleDark, marginBottom: 10, ...sMono, fontSize: 12 }} />
              </div>
            </div>

            <label style={sLbl}>Código PROPER (POS)</label>
            <input value={f.externalCode} onChange={e => upd(f.id, 'externalCode', e.target.value)} placeholder="Código de estación en PROPER" style={{ ...inputStyleDark, marginBottom: 10, ...sMono, fontSize: 12 }} />

            <label style={sLbl}>WiFi — red (SSID)</label>
            <input value={f.ssid} onChange={e => upd(f.id, 'ssid', e.target.value)} placeholder="Vacío = sin WiFi por app" style={{ ...inputStyleDark, marginBottom: 10 }} />

            <label style={sLbl}>WiFi — contraseña</label>
            <input value={f.pass} onChange={e => upd(f.id, 'pass', e.target.value)} style={{ ...inputStyleDark, marginBottom: 12, ...sMono, fontSize: 13 }} />

            <button onClick={() => save(f)} disabled={savingId === f.id} style={{
              width: '100%', padding: 12, borderRadius: 12, border: 'none',
              background: savingId === f.id ? '#3A3A3A' : '#FBBC04',
              color: savingId === f.id ? '#777' : '#0D0D0D',
              fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 800,
              cursor: savingId === f.id ? 'not-allowed' : 'pointer',
            }}>
              {savingId === f.id ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        ))}
      </div>

      {forms.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#777', fontSize: 13 }}>Cargando estaciones...</div>
      )}
    </div>
  );
}
