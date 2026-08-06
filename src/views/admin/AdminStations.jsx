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
  const { stations, setStations, stores, setStores, setScr, fire, loggedAdmin } = ctx;

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

  // ── D18 (6-ago): tiendas asociadas — alta/edición/baja por
  //    admin_write_catalog('store', …); las usan las localizaciones
  //    de canje de los premios (D17). ──
  const [storeForms, setStoreForms] = useState([]);
  const [newStore, setNewStore] = useState({ name: '', address: '' });
  const [storeBusy, setStoreBusy] = useState(null);   // id | 'new' | null
  const [delArm, setDelArm] = useState(null);         // doble tap para eliminar
  useEffect(() => {
    setStoreForms((stores || []).map(s => ({
      id: s.id, name: s.name || '', address: s.address || '', active: s.active !== false,
    })));
  }, [stores]);
  const updStore = (id, k, v) => setStoreForms(p => p.map(f => f.id === id ? { ...f, [k]: v } : f));
  const storeAudit = { adminId: loggedAdmin?.id, adminName: loggedAdmin?.name, adminEmail: loggedAdmin?.email };

  const addStore = async () => {
    if (!newStore.name.trim()) { fire('El nombre de la tienda es obligatorio', 'error'); return; }
    setStoreBusy('new');
    const res = await adminWriteCatalog('store', 'create', {
      data: { name: newStore.name.trim(), address: newStore.address.trim() },
      audit: storeAudit,
    });
    setStoreBusy(null);
    if (res.error) { fire('Error: ' + res.error, 'error'); return; }
    setStores(p => [...p, res.row].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    setNewStore({ name: '', address: '' });
    fire('Tienda agregada', 'success');
  };

  const saveStore = async (f) => {
    if (!f.name.trim()) { fire('El nombre de la tienda es obligatorio', 'error'); return; }
    setStoreBusy(f.id);
    const res = await adminWriteCatalog('store', 'update', {
      id: f.id,
      data: { name: f.name.trim(), address: f.address.trim(), active: f.active },
      audit: storeAudit,
    });
    setStoreBusy(null);
    if (res.error) { fire('Error: ' + res.error, 'error'); return; }
    setStores(p => p.map(s => s.id === f.id ? res.row : s));
    fire(`${f.name.trim()} actualizada`, 'success');
  };

  const delStore = async (f) => {
    // Primer tap arma la eliminación; el segundo la ejecuta (los
    // premios que la referencien la pierden de su localización).
    if (delArm !== f.id) { setDelArm(f.id); return; }
    setDelArm(null);
    setStoreBusy(f.id);
    const res = await adminWriteCatalog('store', 'delete', { id: f.id, audit: storeAudit });
    setStoreBusy(null);
    if (res.error) { fire('Error: ' + res.error, 'error'); return; }
    setStores(p => p.filter(s => s.id !== f.id));
    fire('Tienda eliminada', 'success');
  };

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
        <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Estaciones y Tiendas</div>
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

      {/* ── D18: Tiendas Asociadas ── */}
      <div style={{ padding: '20px 20px 8px', fontSize: 12, fontWeight: 800, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: 2 }}>
        🏬 Tiendas Asociadas
      </div>
      <div style={{ fontSize: 11, color: '#777', lineHeight: 1.5, padding: '0 20px 4px' }}>
        Comercios aliados (Tienda Betel, Súper 24…) donde ciertos premios pueden
        canjearse. Cada premio elige sus estaciones y tiendas válidas en
        Premios → editar. Eliminar una tienda la quita de esos premios.
      </div>

      <div className="pp-adm-grid" style={{ padding: '10px 20px' }}>
        {storeForms.map(f => (
          <div key={f.id} style={{ background: AT.card, border: `1px solid ${AT.border}`, borderRadius: 18, padding: 16, marginBottom: 14, opacity: f.active ? 1 : .6 }}>
            <label style={sLbl}>Nombre</label>
            <input value={f.name} onChange={e => updStore(f.id, 'name', e.target.value)} style={{ ...inputStyleDark, marginBottom: 10 }} />

            <label style={sLbl}>Dirección (opcional)</label>
            <input value={f.address} onChange={e => updStore(f.id, 'address', e.target.value)} placeholder="Ej: 6a Calle Zona 1" style={{ ...inputStyleDark, marginBottom: 12 }} />

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => updStore(f.id, 'active', !f.active)} style={{
                padding: '10px 14px', borderRadius: 12, border: `1px solid ${AT.border}`,
                background: 'transparent', color: f.active ? '#69F0AE' : '#9E9E9E',
                fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 800, cursor: 'pointer',
              }}>
                {f.active ? 'ACTIVA' : 'INACTIVA'}
              </button>
              <button onClick={() => saveStore(f)} disabled={storeBusy === f.id} style={{
                flex: 1, padding: 10, borderRadius: 12, border: 'none',
                background: storeBusy === f.id ? '#3A3A3A' : '#FBBC04',
                color: storeBusy === f.id ? '#777' : '#0D0D0D',
                fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 800,
                cursor: storeBusy === f.id ? 'not-allowed' : 'pointer',
              }}>
                {storeBusy === f.id ? '...' : 'Guardar'}
              </button>
              <button onClick={() => delStore(f)} disabled={storeBusy === f.id} style={{
                padding: '10px 14px', borderRadius: 12, border: `1px solid ${delArm === f.id ? '#EF5350' : AT.border}`,
                background: delArm === f.id ? 'rgba(239,83,80,.15)' : 'transparent',
                color: '#EF5350', fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 800, cursor: 'pointer',
              }}>
                {delArm === f.id ? '¿Eliminar?' : 'Eliminar'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Alta de tienda */}
      <div style={{ padding: '0 20px 10px' }}>
        <div style={{ background: AT.card, border: `1px dashed ${AT.border}`, borderRadius: 18, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#E0E0E0', marginBottom: 10 }}>+ Agregar tienda</div>
          <label style={sLbl}>Nombre</label>
          <input value={newStore.name} onChange={e => setNewStore(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Tienda Betel" style={{ ...inputStyleDark, marginBottom: 10 }} />
          <label style={sLbl}>Dirección (opcional)</label>
          <input value={newStore.address} onChange={e => setNewStore(p => ({ ...p, address: e.target.value }))} placeholder="Ej: 6a Calle Zona 1" style={{ ...inputStyleDark, marginBottom: 12 }} />
          <button onClick={addStore} disabled={storeBusy === 'new'} style={{
            width: '100%', padding: 12, borderRadius: 12, border: 'none',
            background: storeBusy === 'new' ? '#3A3A3A' : '#FBBC04',
            color: storeBusy === 'new' ? '#777' : '#0D0D0D',
            fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 800,
            cursor: storeBusy === 'new' ? 'not-allowed' : 'pointer',
          }}>
            {storeBusy === 'new' ? 'Agregando...' : 'Agregar tienda'}
          </button>
        </div>
      </div>
    </div>
  );
}
