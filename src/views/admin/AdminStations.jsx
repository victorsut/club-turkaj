// src/views/admin/AdminStations.jsx
// ESTACIONES Y TIENDAS — Admin v2 (11-ago-2026, FORMATO GENERAL):
// flat sin emojis, encabezado v2 con 'Nueva tienda' a la derecha,
// tarjetas de SOLO LECTURA en grid auto-fill 340px y modales OSCUROS
// centrados (patrón ReasonModal) para editar estación / crear-editar
// tienda. La LÓGICA no cambió (F1 4-ago + D18 6-ago): todo por
// admin_write_catalog('station'|'store', …) con sesión de admin y
// auditoría atómica (SEC.C.4); las estaciones NO se crean ni eliminan
// desde el panel (regla del cierre de catálogo).
// 12-ago-2026 (decisión del dueño): editar estación y editar/activar/
// desactivar/eliminar tienda exigen MOTIVO obligatorio (ReasonModal,
// patrón F0.3.7 del resto del panel: crear directo con auditoría, lo
// demás con motivo). El doble-tap de '¿Eliminar?' se sustituye por el
// motivo, que es una guarda más fuerte.
import { useState } from 'react';
import { sMono, adminTheme as AT, btnYellow, inputStyleDark } from '../../constants/styles';
import { Plus, Fuel, House } from '../../components/ui/Icons';
import { adminWriteCatalog } from '../../services/secureReads';
import ReasonModal from '../../components/ui/ReasonModal';

export default function AdminStations(ctx) {
  const { stations, setStations, stores, setStores, fire, loggedAdmin } = ctx;

  const audit = { adminId: loggedAdmin?.id, adminName: loggedAdmin?.name, adminEmail: loggedAdmin?.email };

  // ── F0.3.7: acción pendiente de motivo (ReasonModal) ────
  const [showReason, setShowReason] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [reasonBusy, setReasonBusy] = useState(false);

  // ── Estaciones: modal de edición (una a la vez) ─────────
  const [stForm, setStForm] = useState(null); // { id, name, address, schedule, lat, lng, externalCode, ssid, pass }

  const openStation = (s) => setStForm({
    id: s.id, name: s.name || '', address: s.address || '',
    schedule: s.schedule || '', lat: s.lat != null ? String(s.lat) : '',
    lng: s.lng != null ? String(s.lng) : '', externalCode: s.externalCode || '',
    ssid: s.wifiSsid || '', pass: s.wifiPassword || '',
  });
  const updSt = (k, v) => setStForm(p => ({ ...p, [k]: v }));

  const saveStation = () => {
    const f = stForm;
    if (!f.name.trim()) { fire('El nombre es obligatorio', 'error'); return; }
    const lat = f.lat.trim() === '' ? null : parseFloat(f.lat);
    const lng = f.lng.trim() === '' ? null : parseFloat(f.lng);
    if ((lat !== null && Number.isNaN(lat)) || (lng !== null && Number.isNaN(lng))) {
      fire('Coordenadas inválidas — usa números decimales', 'error'); return;
    }
    // El form se cierra y el write espera el motivo; si el update
    // falla, el form se reabre con lo escrito (patrón AdminPromos).
    setPendingAction({
      type: 'station-edit', form: f, lat, lng,
      actionLabel: 'Editar estacion: ' + f.name.trim(),
    });
    setStForm(null);
    setShowReason(true);
  };

  // ── D18: tiendas asociadas — alta/edición/baja ──────────
  const [storeModal, setStoreModal] = useState(null); // { id: null = alta, name, address }
  const [storeBusy, setStoreBusy] = useState(false);  // alta directa en curso

  const saveStoreModal = async () => {
    const f = storeModal;
    if (!f.name.trim()) { fire('El nombre de la tienda es obligatorio', 'error'); return; }

    if (f.id) {
      // Edición: exige motivo (el modal se reabre si el update falla).
      setPendingAction({ type: 'store-edit', form: f, actionLabel: 'Editar tienda: ' + f.name.trim() });
      setStoreModal(null);
      setShowReason(true);
      return;
    }

    // Alta: directa con auditoría (patrón del panel — create sin motivo).
    setStoreBusy(true);
    const res = await adminWriteCatalog('store', 'create', {
      data: { name: f.name.trim(), address: f.address.trim() },
      audit,
    });
    setStoreBusy(false);
    if (res.error) { fire('Error: ' + res.error, 'error'); return; }
    setStores(p => [...p, res.row].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    fire('Tienda agregada', 'success');
    setStoreModal(null);
  };

  const toggleStore = (s) => {
    const next = s.active === false;
    setPendingAction({
      type: 'store-toggle', store: s, next,
      actionLabel: (next ? 'Activar tienda: ' : 'Desactivar tienda: ') + (s.name || ''),
    });
    setShowReason(true);
  };

  const delStore = (s) => {
    setPendingAction({ type: 'store-delete', store: s, actionLabel: 'Eliminar tienda: ' + (s.name || '') });
    setShowReason(true);
  };

  // Ejecutor unificado: corre la acción pendiente con el motivo — el
  // RPC escribe y audita atómico (SEC.C.4), acá solo se refleja en state.
  const confirmReason = async (reason) => {
    if (!pendingAction) { setShowReason(false); return; }
    const auditR = { ...audit, reasonText: reason };
    setReasonBusy(true);
    try {
      switch (pendingAction.type) {
        case 'station-edit': {
          const f = pendingAction.form;
          const res = await adminWriteCatalog('station', 'update', {
            id: f.id,
            data: {
              name: f.name.trim(), address: f.address.trim(),
              schedule: f.schedule.trim() || null,
              lat: f.lat.trim(), lng: f.lng.trim(),
              external_code: f.externalCode.trim(),
              wifi_ssid: f.ssid.trim() || null, wifi_password: f.pass.trim() || null,
            },
            audit: auditR,
          });
          if (res.error) { setStForm(f); fire('Error: ' + res.error, 'error'); return; }
          if (setStations) {
            setStations(p => p.map(s => s.id === f.id ? {
              ...s, name: f.name.trim(), address: f.address.trim(),
              schedule: f.schedule.trim() || null,
              lat: pendingAction.lat, lng: pendingAction.lng,
              externalCode: f.externalCode.trim(),
              wifiSsid: f.ssid.trim() || null, wifiPassword: f.pass.trim() || null,
            } : s));
          }
          fire(`${f.name.trim()} actualizada`, 'success');
          break;
        }

        case 'store-edit': {
          const f = pendingAction.form;
          const res = await adminWriteCatalog('store', 'update', {
            id: f.id,
            data: { name: f.name.trim(), address: f.address.trim(), active: f.active },
            audit: auditR,
          });
          if (res.error) { setStoreModal(f); fire('Error: ' + res.error, 'error'); return; }
          setStores(p => p.map(s => s.id === f.id ? res.row : s));
          fire(`${f.name.trim()} actualizada`, 'success');
          break;
        }

        case 'store-toggle': {
          const s = pendingAction.store;
          const next = pendingAction.next;
          const res = await adminWriteCatalog('store', 'update', {
            id: s.id,
            data: { name: s.name || '', address: s.address || '', active: next },
            audit: auditR,
          });
          if (res.error) { fire('Error: ' + res.error, 'error'); return; }
          setStores(p => p.map(x => x.id === s.id ? res.row : x));
          fire(next ? 'Tienda activada' : 'Tienda desactivada', 'success');
          break;
        }

        case 'store-delete': {
          // Los premios que la referencien la pierden de su localización.
          const s = pendingAction.store;
          const res = await adminWriteCatalog('store', 'delete', { id: s.id, audit: auditR });
          if (res.error) { fire('Error: ' + res.error, 'error'); return; }
          setStores(p => p.filter(x => x.id !== s.id));
          fire('Tienda eliminada', 'success');
          break;
        }

        default:
          break;
      }
    } finally {
      setReasonBusy(false);
      setPendingAction(null);
      setShowReason(false);
    }
  };

  // ── estilos (FORMATO GENERAL Admin v2) ──────────────────
  const secTitle = { fontSize: 11, fontWeight: 800, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: 1.5, margin: '18px 0 4px' };
  const secHint = { fontSize: 11, color: '#777', lineHeight: 1.5, marginBottom: 10 };
  const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 10, alignItems: 'start' };
  const cardRow = { fontSize: 11, color: '#777', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
  const lbl = { display: 'block', fontSize: 11, fontWeight: 800, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 5 };
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
    borderRadius: 20, padding: 24, width: '100%', maxWidth: 440,
    maxHeight: '90vh', overflowY: 'auto',
  };
  const ghostBtn = {
    flex: 1, padding: 13, borderRadius: 12, cursor: 'pointer',
    border: `1px solid ${AT.border}`, background: 'transparent', color: '#9E9E9E',
    fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700,
  };
  const mainBtn = {
    flex: 2, padding: 13, borderRadius: 12, cursor: 'pointer', border: 'none',
    background: '#FBBC04', color: '#0D0D0D',
    fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 800,
  };

  const stationList = stations || [];
  const storeList = stores || [];

  return (
    <div style={{ padding: '22px 22px 60px' }}>
      {/* Encabezado v2 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 21, fontWeight: 800, color: '#fff' }}>Estaciones y Tiendas</div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#9E9E9E', marginTop: 2 }}>
            {stationList.length.toLocaleString('en-US')} estaciones · {storeList.length.toLocaleString('en-US')} tiendas asociadas — toda edición exige motivo y queda auditada
          </div>
        </div>
        <button onClick={() => setStoreModal({ id: null, name: '', address: '' })}
          style={{ ...btnYellow, width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 12, fontSize: 13, padding: '11px 18px' }}>
          <span style={{ display: 'flex', transform: 'scale(.8)' }}><Plus /></span> Nueva tienda
        </button>
      </div>

      {/* ── Estaciones ── */}
      <div style={secTitle}>Estaciones</div>
      <div style={secHint}>
        La dirección, horario y coordenadas alimentan el modal de Ubicación y la
        detección de estación del WiFi del cliente. El código PROPER identifica la
        estación en las facturas del POS. Las estaciones no se crean ni eliminan.
      </div>

      {stationList.length === 0 && (
        <div style={{ textAlign: 'center', padding: 32, color: '#777', fontSize: 13, fontWeight: 700 }}>Cargando estaciones...</div>
      )}

      <div style={grid}>
        {stationList.map(s => (
          <div key={s.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            background: AT.card, border: `1px solid ${AT.border}`,
            borderRadius: 16, padding: '12px 14px',
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: 'rgba(21,101,192,.3)', color: '#64B5F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Fuel size={20} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 13.5, color: '#E0E0E0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name || 'Estación'}</div>
              <div style={cardRow}>{s.address || 'Sin dirección'}{s.schedule ? ` · ${s.schedule}` : ''}</div>
              <div style={{ ...cardRow, ...sMono, fontSize: 10.5, color: '#555' }}>
                {s.lat != null && s.lng != null ? `${s.lat}, ${s.lng}` : 'Sin coordenadas'} · PROPER {s.externalCode || '—'}
              </div>
              <div style={{ ...cardRow, fontSize: 10.5 }}>
                {s.wifiSsid ? <>WiFi {s.wifiSsid} · <span style={sMono}>{s.wifiPassword || '—'}</span></> : 'Sin WiFi por app'}
              </div>
            </div>
            <button onClick={() => openStation(s)} style={miniBtn('#64B5F6')}>Editar</button>
          </div>
        ))}
      </div>

      {/* ── D18: Tiendas Asociadas ── */}
      <div style={secTitle}>Tiendas Asociadas</div>
      <div style={secHint}>
        Comercios aliados (Tienda Betel, Súper 24…) donde ciertos premios pueden
        canjearse. Cada premio elige sus estaciones y tiendas válidas en
        Catálogo de Canjes → editar. Eliminar una tienda la quita de esos premios.
      </div>

      {storeList.length === 0 && (
        <div style={{ textAlign: 'center', padding: 32, color: '#777', fontSize: 13, fontWeight: 700 }}>No hay tiendas asociadas — agregá la primera con "Nueva tienda"</div>
      )}

      <div style={grid}>
        {storeList.map(s => {
          const active = s.active !== false;
          return (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: AT.card, border: `1px solid ${AT.border}`,
              borderRadius: 16, padding: '12px 14px', opacity: active ? 1 : .55,
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 13, background: active ? 'rgba(46,125,50,.3)' : 'rgba(255,255,255,.08)', color: active ? '#81C784' : '#999', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><House /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 13.5, color: '#E0E0E0' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                  {!active && <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 800, letterSpacing: .5, padding: '2px 7px', borderRadius: 7, background: 'rgba(255,255,255,.08)', color: '#999' }}>INACTIVA</span>}
                </div>
                <div style={cardRow}>{s.address || 'Sin dirección'}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                <button onClick={() => setStoreModal({ id: s.id, name: s.name || '', address: s.address || '', active })} style={miniBtn('#64B5F6')}>Editar</button>
                <button onClick={() => toggleStore(s)} style={miniBtn(active ? '#FF8F00' : '#81C784')}>
                  {active ? 'Desactivar' : 'Activar'}
                </button>
                <button onClick={() => delStore(s)} style={miniBtn('#EF5350')}>Eliminar</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Modal: editar estación (oscuro centrado) ── */}
      {stForm && (
        <div style={overlay} onClick={() => setStForm(null)}>
          <div onClick={e => e.stopPropagation()} style={sheet}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 16 }}>Editar estación</div>

            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Nombre *</label>
              <input value={stForm.name} onChange={e => updSt('name', e.target.value)} style={{ ...inputStyleDark, fontSize: 13, padding: '10px 12px' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Dirección</label>
              <input value={stForm.address} onChange={e => updSt('address', e.target.value)} placeholder="Ej: 7a Av 6-10 Zona 1" style={{ ...inputStyleDark, fontSize: 13, padding: '10px 12px' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Horario de atención</label>
              <input value={stForm.schedule} onChange={e => updSt('schedule', e.target.value)} placeholder="Ej: 5:00 am – 9:30 pm" style={{ ...inputStyleDark, fontSize: 13, padding: '10px 12px' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div>
                <label style={lbl}>Latitud</label>
                <input value={stForm.lat} onChange={e => updSt('lat', e.target.value)} placeholder="14.942641" inputMode="decimal" style={{ ...inputStyleDark, fontSize: 12, padding: '10px 12px', ...sMono }} />
              </div>
              <div>
                <label style={lbl}>Longitud</label>
                <input value={stForm.lng} onChange={e => updSt('lng', e.target.value)} placeholder="-91.109861" inputMode="decimal" style={{ ...inputStyleDark, fontSize: 12, padding: '10px 12px', ...sMono }} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Código PROPER (POS)</label>
              <input value={stForm.externalCode} onChange={e => updSt('externalCode', e.target.value)} placeholder="Código de estación en PROPER" style={{ ...inputStyleDark, fontSize: 12, padding: '10px 12px', ...sMono }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>WiFi — red (SSID)</label>
              <input value={stForm.ssid} onChange={e => updSt('ssid', e.target.value)} placeholder="Vacío = sin WiFi por app" style={{ ...inputStyleDark, fontSize: 13, padding: '10px 12px' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>WiFi — contraseña</label>
              <input value={stForm.pass} onChange={e => updSt('pass', e.target.value)} style={{ ...inputStyleDark, fontSize: 13, padding: '10px 12px', ...sMono }} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStForm(null)} style={ghostBtn}>Cancelar</button>
              <button onClick={saveStation} style={mainBtn}>Guardar cambios</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: tienda asociada — alta o edición (oscuro centrado) ── */}
      {storeModal && (
        <div style={overlay} onClick={() => { if (!storeBusy) setStoreModal(null); }}>
          <div onClick={e => e.stopPropagation()} style={sheet}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 16 }}>
              {storeModal.id ? 'Editar tienda' : 'Nueva tienda asociada'}
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Nombre *</label>
              <input value={storeModal.name} onChange={e => setStoreModal(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Tienda Betel" style={{ ...inputStyleDark, fontSize: 13, padding: '10px 12px' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Dirección (opcional)</label>
              <input value={storeModal.address} onChange={e => setStoreModal(p => ({ ...p, address: e.target.value }))} placeholder="Ej: 6a Calle Zona 1" style={{ ...inputStyleDark, fontSize: 13, padding: '10px 12px' }} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStoreModal(null)} disabled={storeBusy} style={ghostBtn}>Cancelar</button>
              <button onClick={saveStoreModal} disabled={storeBusy} style={mainBtn}>
                {storeBusy ? 'Guardando...' : storeModal.id ? 'Guardar cambios' : 'Agregar tienda'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ReasonModal unificado (F0.3.7): motivo obligatorio ── */}
      <ReasonModal
        open={showReason}
        onClose={() => { if (!reasonBusy) { setShowReason(false); setPendingAction(null); } }}
        onConfirm={confirmReason}
        actionLabel={pendingAction?.actionLabel || ''}
        loading={reasonBusy}
      />
    </div>
  );
}
