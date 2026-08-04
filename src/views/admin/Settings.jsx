// src/views/admin/Settings.jsx
// Admin settings — program config, fuel prices, tier thresholds
import { useState, useEffect } from 'react';
import { sb } from '../../lib/supabaseClient';
import { sMono, adminTheme as AT, inputStyleDark } from '../../constants/styles';
import { Back } from '../../components/ui/Icons';
import { updateFuelPrices } from '../../services/rpcServices';
import { adminWriteCatalog } from '../../services/secureReads';
import { createApiClient } from '../../services/adminAuthService';
import { getAdminToken } from '../../services/sessionTokens';
import ReasonModal from '../../components/ui/ReasonModal';

export default function Settings(ctx) {
  const { cfg, setCfg, setScr, fire, operators, setScr: navTo, loggedAdmin, stations, setStations } = ctx;

  // ─── Interruptor del motor de degradación (25-jul) ───
  // Apagado hasta el lanzamiento oficial. Al encender, el servidor
  // estampa enabled_at y el contador de inactividad de TODOS arranca
  // desde ese momento (nadie arrastra inactividad previa).
  const [savingDegrad, setSavingDegrad] = useState(false);
  const toggleDegrad = async () => {
    if (!sb) { fire('Sin conexión'); return; }
    if (!loggedAdmin?.id) { fire('Error: sesion admin no disponible. Cerra sesion y volve a ingresar.'); return; }
    const next = !cfg.degradEnabled;
    setSavingDegrad(true);
    const { data, error } = await sb.rpc('set_degradation_enabled', {
      p_enabled: next,
      p_admin_id: loggedAdmin.id,
      p_admin_name: loggedAdmin.name,
      p_admin_email: loggedAdmin.email,
      p_reason_text: null,
    });
    setSavingDegrad(false);
    if (error) { fire('Error: ' + error.message); return; }
    setCfg(p => ({ ...p, degradEnabled: next, degradEnabledAt: data?.enabled_at || p.degradEnabledAt }));
    fire(next
      ? 'Motor de degradación ACTIVADO — el contador de todos arranca desde hoy'
      : 'Motor de degradación desactivado');
  };

  // ─── WiFi por estación (25-jul): SSID + clave editables ───
  // Escritura directa a stations (política RLS abierta, igual que
  // schedule). Vacío = la estación no ofrece WiFi por app y el modal
  // del cliente cae al pase con el operador.
  const [wifiForm, setWifiForm] = useState([]);
  const [savingWifi, setSavingWifi] = useState(null); // id en guardado
  useEffect(() => {
    setWifiForm((stations || []).map(s => ({ id: s.id, name: s.name, ssid: s.wifiSsid || '', pass: s.wifiPassword || '' })));
  }, [stations]);

  const saveWifi = async (row) => {
    if (!sb) { fire('Sin conexión', 'error'); return; }
    setSavingWifi(row.id);
    const ssid = row.ssid.trim() || null;
    const pass = row.pass.trim() || null;
    // SEC.C.4: stations perdió la escritura abierta (dirección,
    // coordenadas y clave WiFi eran editables por cualquiera).
    const res = await adminWriteCatalog('station', 'update', {
      id: row.id,
      data: { wifi_ssid: ssid, wifi_password: pass },
      audit: { adminId: loggedAdmin?.id, adminName: loggedAdmin?.name, adminEmail: loggedAdmin?.email },
    });
    setSavingWifi(null);
    if (res.error) { fire('Error: ' + res.error, 'error'); return; }
    if (setStations) {
      setStations(p => p.map(s => s.id === row.id ? { ...s, wifiSsid: ssid, wifiPassword: pass } : s));
    }
    fire(`WiFi de ${row.name} actualizado`, 'success');
  };

  // ─── Canal de asistencia (4-ago): número WhatsApp/llamadas ───
  // Visible en login y Menú del cliente. RPC auditado con sesión de
  // admin (el número es sensible: redirigirlo permitiría phishing).
  const [supportForm, setSupportForm] = useState('');
  const [savingSupport, setSavingSupport] = useState(false);
  useEffect(() => { setSupportForm(cfg.supportPhone || ''); }, [cfg.supportPhone]);

  const saveSupport = async () => {
    if (!sb) { fire('Sin conexión', 'error'); return; }
    const phone = supportForm.replace(/\D/g, '');
    if (phone.length !== 8) { fire('El número debe tener exactamente 8 dígitos', 'error'); return; }
    setSavingSupport(true);
    const { data, error } = await sb.rpc('set_support_phone', {
      p_session_token: getAdminToken()?.token || null,
      p_phone: phone,
      p_admin_id: loggedAdmin?.id,
      p_admin_name: loggedAdmin?.name,
      p_admin_email: loggedAdmin?.email,
      p_reason_text: null,
    });
    setSavingSupport(false);
    if (error) { fire('Error: ' + error.message, 'error'); return; }
    if (data?.error) { fire(data.error, 'error'); return; }
    setCfg(p => ({ ...p, supportPhone: phone }));
    fire('Número de asistencia actualizado', 'success');
  };

  // ─── F7a: llaves de la API externa (PROPER) ───
  // La llave se muestra UNA sola vez: el hash bcrypt es lo único que
  // queda en la BD. Si se pierde, se genera otra.
  const [showApiModal, setShowApiModal] = useState(false);
  const [apiName, setApiName] = useState('PROPER');
  const [apiKey, setApiKey] = useState('');
  const [apiBusy, setApiBusy] = useState(false);
  const genApiKey = async () => {
    if (!apiName.trim()) { fire('Poné un nombre para identificar el sistema', 'error'); return; }
    setApiBusy(true);
    const res = await createApiClient(apiName.trim());
    setApiBusy(false);
    if (res.error) { fire(res.error, 'error'); return; }
    setApiKey(res.api_key || '');
    fire('Llave generada — copiala ahora', 'success');
  };

  // ─── Modal: edición de precios de combustible ───
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [priceForm, setPriceForm] = useState({ super: '', regular: '', diesel: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Valida un campo de precio (string desde el input).
  // Retorna null si OK, string con mensaje si inválido.
  const fieldError = (v) => {
    const n = parseFloat(v);
    if (Number.isNaN(n)) return 'Ingresá un número';
    if (n < 1 || n > 100) return 'Debe estar entre Q1.00 y Q100.00';
    return null;
  };
  const formInvalid = ['super', 'regular', 'diesel'].some((k) => fieldError(priceForm[k]) !== null);

  const openPriceModal = () => {
    setPriceForm({
      super: String(cfg.fuelPrices?.super ?? 0),
      regular: String(cfg.fuelPrices?.regular ?? 0),
      diesel: String(cfg.fuelPrices?.diesel ?? 0),
    });
    setSaveError('');
    setShowPriceModal(true);
  };

  const closePriceModal = () => {
    if (saving) return;
    setShowPriceModal(false);
    setSaveError('');
  };

  // Esc cierra el modal (a menos que estemos guardando).
  useEffect(() => {
    if (!showPriceModal) return;
    const onKey = (e) => { if (e.key === 'Escape' && !saving) closePriceModal(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showPriceModal, saving]);

  // PASO 1: valida los precios y abre el ReasonModal (cierra el de
  // precios sin tocar priceForm, para poder reabrirlo si el RPC falla).
  const openReasonStep = () => {
    if (formInvalid) return;
    setSaveError('');
    setShowPriceModal(false);
    setShowReasonModal(true);
  };

  // PASO 2: recibe el motivo del ReasonModal y ejecuta el RPC con
  // auditoría. En error reabre el modal de precios con priceForm intacto.
  const confirmSaveWithReason = async (reason) => {
    // Guard: sin admin logueado no se audita ni se guarda (la épica
    // F0.3 exige auditoría obligatoria; no degradar a legacy).
    if (!loggedAdmin || !loggedAdmin.id) {
      setShowReasonModal(false);
      fire('Error: sesion admin no disponible. Cerra sesion y volve a ingresar.');
      return;
    }

    setSaving(true);
    setSaveError('');

    const payload = {
      super: parseFloat(priceForm.super),
      regular: parseFloat(priceForm.regular),
      diesel: parseFloat(priceForm.diesel),
    };

    const audit = {
      adminId: loggedAdmin.id,
      adminName: loggedAdmin.name,
      adminEmail: loggedAdmin.email,
      reasonText: reason,
    };

    try {
      const { data, error } = await updateFuelPrices(payload, audit);

      if (error) {
        // RPC falló: cerrar ReasonModal, reabrir Modal de precios
        // con el error visible.
        setShowReasonModal(false);
        setShowPriceModal(true);
        setSaveError(error.message || 'Error al guardar los precios');
        fire('Error al guardar: ' + (error.message || 'desconocido'));
        return;
      }

      if (!data) {
        setShowReasonModal(false);
        setShowPriceModal(true);
        setSaveError('No se recibieron datos del servidor');
        fire('Error al guardar: respuesta vacia del servidor');
        return;
      }

      // Éxito: actualizar cfg, cerrar ReasonModal, toast de éxito.
      setCfg(prev => ({ ...prev, fuelPrices: data }));
      setShowReasonModal(false);
      fire('Precios actualizados');
    } catch (err) {
      setShowReasonModal(false);
      setShowPriceModal(true);
      setSaveError(err.message || 'Error inesperado');
      fire('Error al guardar: ' + (err.message || 'desconocido'));
    } finally {
      setSaving(false);
    }
  };

  const aSec = { padding: '20px 20px 8px', fontSize: 12, fontWeight: 800, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: 2 };
  const aCard = { background: AT.card, borderRadius: 18, border: `1px solid ${AT.border}`, margin: '0 20px 12px', padding: 16 };
  const row = { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${AT.border}`, fontSize: 13 };

  return (
    <div style={{ paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${AT.border}`, background: '#252525', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setScr('dash')} style={{ background: 'none', border: 'none', color: '#9E9E9E', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600 }}><Back /> Inicio</button>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Configuración</div>
        <div style={{ width: 80 }} />
      </div>

      {/* Quick Links */}
      <div style={{ display: 'flex', gap: 10, padding: '12px 20px' }}>
        <button onClick={() => setScr('rules')} style={{ flex: 1, padding: 14, borderRadius: 14, background: AT.card, border: `1px solid ${AT.border}`, fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#FBBC04' }}>📋 Ver Reglas</button>
        <button onClick={() => setScr('ops')} style={{ flex: 1, padding: 14, borderRadius: 14, background: AT.card, border: `1px solid ${AT.border}`, fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#64B5F6' }}>👷 Operadores</button>
        <button onClick={() => setScr('audit')} style={{ flex: 1, padding: 14, borderRadius: 14, background: AT.card, border: `1px solid ${AT.border}`, fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#CE93D8' }}>📜 Auditoría</button>
      </div>
      {/* Objetivo #1 (29-jul): gestión de administradores desde el panel */}
      <div style={{ display: 'flex', gap: 10, padding: '0 20px 12px' }}>
        <button onClick={() => setScr('admins')} style={{ flex: 1, padding: 14, borderRadius: 14, background: AT.card, border: `1px solid ${AT.border}`, fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#90CAF9' }}>🔐 Administradores</button>
        {/* F7a: llaves de la API externa (PROPER) */}
        <button onClick={() => setShowApiModal(true)} style={{ flex: 1, padding: 14, borderRadius: 14, background: AT.card, border: `1px solid ${AT.border}`, fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#80CBC4' }}>🔌 API externa</button>
      </div>

      {/* Conversión */}
      <div style={aSec}>Conversión</div>
      <div style={aCard}>
        <div style={row}>
          <span style={{ color: '#9E9E9E', fontWeight: 600 }}>Quetzales por punto</span>
          <span style={{ color: '#FBBC04', fontWeight: 800, ...sMono }}>Q{cfg.qPerPt}</span>
        </div>
        <div style={row}>
          <span style={{ color: '#9E9E9E', fontWeight: 600 }}>Pts por boleto rifa (global)</span>
          <span style={{ color: '#FBBC04', fontWeight: 800, ...sMono }}>{cfg.ticketPts} pts</span>
        </div>
        <div style={row}>
          <span style={{ color: '#9E9E9E', fontWeight: 600 }}>Pts registro base</span>
          <span style={{ color: '#2E7D32', fontWeight: 800, ...sMono }}>{cfg.regBase} pts</span>
        </div>
        <div style={row}>
          <span style={{ color: '#9E9E9E', fontWeight: 600 }}>Pts campo opcional</span>
          <span style={{ color: '#2E7D32', fontWeight: 800, ...sMono }}>+{cfg.regOptional} pts</span>
        </div>
        <div style={row}>
          <span style={{ color: '#9E9E9E', fontWeight: 600 }}>Pts referido</span>
          <span style={{ color: '#7B1FA2', fontWeight: 800, ...sMono }}>{cfg.referralPts} pts</span>
        </div>
        <div style={{ ...row, borderBottom: 'none' }}>
          <span style={{ color: '#9E9E9E', fontWeight: 600 }}>Encuestas diarias</span>
          <span style={{ color: '#1565C0', fontWeight: 800, ...sMono }}>{cfg.surveyDaily}/día · {cfg.surveyPts} pts</span>
        </div>
      </div>

      {/* Fuel Prices */}
      <div style={aSec}>Precios de Combustible</div>
      <div style={aCard}>
        {[
          { name: 'Súper', price: cfg.fuelPrices?.super ?? 0, color: '#E65100' },
          { name: 'Regular', price: cfg.fuelPrices?.regular ?? 0, color: '#2E7D32' },
          { name: 'Diésel', price: cfg.fuelPrices?.diesel ?? 0, color: '#1565C0' },
        ].map((f, i) => (
          <div key={f.name} style={{ ...row, borderBottom: i < 2 ? `1px solid ${AT.border}` : 'none' }}>
            <span style={{ color: f.color, fontWeight: 700 }}>⛽ {f.name}</span>
            <span style={{ color: '#fff', fontWeight: 800, ...sMono }}>Q{f.price.toFixed(2)}/gal</span>
          </div>
        ))}
        <button
          onClick={openPriceModal}
          style={{
            marginTop: 14, width: '100%', padding: '11px 16px',
            background: 'transparent', border: `1px solid ${AT.border}`,
            borderRadius: 12, color: '#FBBC04',
            fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >
          ✏️ Editar precios
        </button>
      </div>

      {/* Canal de asistencia (WhatsApp / llamadas) */}
      <div style={aSec}>📞 Canal de Asistencia</div>
      <div style={aCard}>
        <div style={{ fontSize: 11, color: '#777', marginBottom: 12, lineHeight: 1.5 }}>
          Número de WhatsApp y llamadas que el cliente ve en "Asistencia y Ayuda" (login y Menú). Horario mostrado: lunes a viernes, 8:00 a.m. – 4:00 p.m.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={supportForm}
            onChange={e => setSupportForm(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
            placeholder="8 dígitos (ej: 49741067)"
            inputMode="numeric"
            style={{ ...inputStyleDark, flex: 1, ...sMono, fontSize: 13 }}
          />
          <button
            onClick={saveSupport}
            disabled={savingSupport}
            style={{
              padding: '0 18px', borderRadius: 12, border: 'none',
              background: savingSupport ? '#3A3A3A' : '#FBBC04',
              color: savingSupport ? '#777' : '#0D0D0D',
              fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 800,
              cursor: savingSupport ? 'not-allowed' : 'pointer',
            }}
          >
            {savingSupport ? '...' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* WiFi por estación */}
      <div style={aSec}>WiFi de Estaciones</div>
      <div style={aCard}>
        <div style={{ fontSize: 11, color: '#777', marginBottom: 12, lineHeight: 1.5 }}>
          El cliente PLATINO/BLACK que esté en la estación (detección por ubicación) ve esta red y clave en su app. Vacío = la clave la entrega el operador.
        </div>
        {wifiForm.length === 0 && (
          <div style={{ fontSize: 12, color: '#777', textAlign: 'center', padding: 8 }}>Cargando estaciones...</div>
        )}
        {wifiForm.map((w, i) => (
          <div key={w.id} style={{ marginBottom: i < wifiForm.length - 1 ? 18 : 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#64B5F6', marginBottom: 8 }}>{w.name}</div>
            <input
              value={w.ssid}
              onChange={e => setWifiForm(p => p.map(x => x.id === w.id ? { ...x, ssid: e.target.value } : x))}
              placeholder="Nombre de la red (SSID)"
              style={{ ...inputStyleDark, marginBottom: 8 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={w.pass}
                onChange={e => setWifiForm(p => p.map(x => x.id === w.id ? { ...x, pass: e.target.value } : x))}
                placeholder="Contraseña"
                style={{ ...inputStyleDark, flex: 1, ...sMono, fontSize: 13 }}
              />
              <button
                onClick={() => saveWifi(w)}
                disabled={savingWifi === w.id}
                style={{
                  padding: '0 18px', borderRadius: 12, border: 'none',
                  background: savingWifi === w.id ? '#3A3A3A' : '#FBBC04',
                  color: savingWifi === w.id ? '#777' : '#0D0D0D',
                  fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 800,
                  cursor: savingWifi === w.id ? 'not-allowed' : 'pointer',
                }}
              >
                {savingWifi === w.id ? '...' : 'Guardar'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Tiers */}
      <div style={aSec}>Niveles (Tiers)</div>
      <div style={aCard}>
        <div style={row}>
          <span style={{ color: '#FBBC04', fontWeight: 700 }}>🟡 ORO</span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>0 – {(cfg.tiers?.platino?.gal || 150) - 1} gal</span>
        </div>
        <div style={row}>
          <span style={{ color: '#9E9E9E', fontWeight: 700 }}>💎 PLATINO</span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>{cfg.tiers?.platino?.gal || 150} – {(cfg.tiers?.black?.gal || 500) - 1} gal</span>
        </div>
        <div style={row}>
          <span style={{ color: '#9E9E9E', fontWeight: 700 }}>🖤 BLACK</span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>{cfg.tiers?.black?.gal || 500}+ gal</span>
        </div>
        {cfg.tiers?.platino && (
          <>
            <div style={{ height: 1, background: AT.border, margin: '8px 0' }} />
            {/* El descuento por galón se retiró de los beneficios del
                programa (decisión del dueño 24-jul-2026) — ya no se lista. */}
            <div style={row}>
              <span style={{ color: '#9E9E9E', fontWeight: 600 }}>PLATINO desc canje</span>
              <span style={{ ...sMono, color: '#64B5F6' }}>{Math.round(cfg.tiers.platino.discRedeem * 100)}%</span>
            </div>
            <div style={{ ...row, borderBottom: 'none' }}>
              <span style={{ color: '#9E9E9E', fontWeight: 600 }}>BLACK desc canje</span>
              <span style={{ ...sMono, color: '#CE93D8' }}>{Math.round(cfg.tiers.black.discRedeem * 100)}%</span>
            </div>
          </>
        )}
      </div>

      {/* Degradation */}
      <div style={aSec}>Degradación por Inactividad</div>
      <div style={aCard}>
        {/* Interruptor del motor (lanzamiento oficial) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#E0E0E0' }}>Motor de degradación</div>
            <div style={{ fontSize: 11, color: '#777', marginTop: 2 }}>
              {cfg.degradEnabled
                ? `Activo — contando inactividad desde ${cfg.degradEnabledAt ? new Date(cfg.degradEnabledAt).toLocaleDateString('es-GT') : 'la activación'}`
                : 'Apagado — las reglas se muestran pero NO se aplican'}
            </div>
          </div>
          <button onClick={toggleDegrad} disabled={savingDegrad} style={{
            padding: '8px 16px', borderRadius: 20, border: 'none',
            background: savingDegrad ? '#3A3A3A' : cfg.degradEnabled ? 'rgba(46,125,50,.25)' : 'rgba(255,255,255,.08)',
            color: savingDegrad ? '#777' : cfg.degradEnabled ? '#69F0AE' : '#9E9E9E',
            fontFamily: "'DM Sans'", fontWeight: 800, fontSize: 12,
            cursor: savingDegrad ? 'not-allowed' : 'pointer',
          }}>
            {savingDegrad ? '...' : cfg.degradEnabled ? 'ACTIVADO' : 'APAGADO'}
          </button>
        </div>
        <div style={{ height: 1, background: AT.border, margin: '8px 0 12px' }} />
        {(cfg.degrad || []).map((d, i) => (
          <div key={i} style={{ marginBottom: i < (cfg.degrad || []).length - 1 ? 12 : 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 6, color: d.tier === 'BLACK' ? '#CE93D8' : d.tier === 'PLATINO' ? '#64B5F6' : '#FFB74D' }}>{d.tier}</div>
            {d.rules.map((r, j) => (
              <div key={j} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
                <span style={{ color: '#aaa', fontWeight: 700 }}>{r.days} días</span>
                <span style={{ color: '#EF5350', fontWeight: 600 }}>{r.effect}</span>
              </div>
            ))}
          </div>
        ))}
        <div style={{ marginTop: 8, fontSize: 11, color: '#2E7D32', fontWeight: 700 }}>✅ Cualquier compra (hasta Q10) resetea el reloj</div>
      </div>

      {/* ─── F7a: Modal de llaves de la API externa ─── */}
      {showApiModal && (
        <div onClick={() => { if (!apiBusy) { setShowApiModal(false); setApiKey(''); } }}
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: AT.bg, border: `1px solid ${AT.border}`, borderRadius: 20, padding: 24, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 8 }}>API externa (PROPER)</div>
            <div style={{ fontSize: 12, color: '#9E9E9E', lineHeight: 1.6, marginBottom: 16 }}>
              Generá una llave para que un sistema externo acumule puntos y consulte
              premios. La llave se muestra <strong style={{ color: '#FBBC04' }}>una sola vez</strong>:
              guardala antes de cerrar. Si se pierde, generá otra.
            </div>

            <label style={{ fontSize: 11, fontWeight: 700, color: '#9E9E9E', marginBottom: 6, display: 'block' }}>Nombre del sistema</label>
            <input value={apiName} onChange={e => setApiName(e.target.value)} placeholder="PROPER"
              style={{ ...inputStyleDark, width: '100%', marginBottom: 16, boxSizing: 'border-box' }} />

            {apiKey && (
              <div style={{ background: 'rgba(46,125,50,.12)', border: '1px solid rgba(46,125,50,.4)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#81C784', marginBottom: 8, letterSpacing: 1 }}>LLAVE GENERADA</div>
                <div style={{ ...sMono, fontSize: 12, color: '#fff', wordBreak: 'break-all', lineHeight: 1.6 }}>{apiKey}</div>
                <button onClick={() => {
                  navigator.clipboard?.writeText(apiKey)
                    .then(() => fire('Llave copiada', 'success'))
                    .catch(() => fire('Copiala manualmente', 'warn'));
                }} style={{ marginTop: 10, padding: '8px 14px', borderRadius: 10, border: 'none', background: '#2E7D32', color: '#fff', fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Copiar</button>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowApiModal(false); setApiKey(''); }} disabled={apiBusy}
                style={{ flex: 1, padding: 14, borderRadius: 14, background: 'transparent', border: `1px solid ${AT.border}`, color: '#9E9E9E', fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                {apiKey ? 'Listo' : 'Cancelar'}
              </button>
              <button onClick={genApiKey} disabled={apiBusy}
                style={{ flex: 1, padding: 14, borderRadius: 14, background: '#FBBC04', border: 'none', color: '#0D0D0D', fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
                {apiBusy ? 'Generando...' : apiKey ? 'Generar otra' : 'Generar llave'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: editar precios de combustible ─── */}
      {showPriceModal && (
        <div
          onClick={closePriceModal}
          style={{
            position: 'fixed', inset: 0, zIndex: 300,
            background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: AT.bg, border: `1px solid ${AT.border}`,
              borderRadius: 20, padding: 24, width: '100%', maxWidth: 400,
              maxHeight: '90vh', overflowY: 'auto',
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 4 }}>
              Editar precios de combustible
            </div>
            <div style={{ fontSize: 12, color: '#9E9E9E', marginBottom: 20 }}>
              Rango válido: Q1.00 a Q100.00 por galón
            </div>

            {[
              { k: 'super', label: 'Súper', color: '#E65100' },
              { k: 'regular', label: 'Regular', color: '#2E7D32' },
              { k: 'diesel', label: 'Diésel', color: '#1565C0' },
            ].map((f) => {
              const err = fieldError(priceForm[f.k]);
              return (
                <div key={f.k} style={{ marginBottom: 16 }}>
                  <label style={{
                    display: 'block', fontSize: 12, fontWeight: 800,
                    color: f.color, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6,
                  }}>
                    ⛽ {f.label}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max="100"
                    required
                    value={priceForm[f.k]}
                    onChange={(e) => setPriceForm((p) => ({ ...p, [f.k]: e.target.value }))}
                    disabled={saving}
                    style={{
                      ...inputStyleDark,
                      border: `1.5px solid ${err ? '#EF5350' : '#3A3A3A'}`,
                    }}
                  />
                  <div style={{ fontSize: 11, color: '#777', marginTop: 4 }}>Q por galón</div>
                  {err && (
                    <div style={{ fontSize: 11, color: '#EF5350', marginTop: 4, fontWeight: 600 }}>
                      {err}
                    </div>
                  )}
                </div>
              );
            })}

            {saveError && (
              <div style={{
                background: 'rgba(239,83,80,.1)', border: '1px solid rgba(239,83,80,.3)',
                borderRadius: 10, padding: '10px 12px', marginBottom: 16,
                fontSize: 12, color: '#EF5350', fontWeight: 600,
              }}>
                {saveError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button
                onClick={closePriceModal}
                disabled={saving}
                style={{
                  flex: 1, padding: '14px 16px',
                  background: 'transparent', border: `1px solid ${AT.border}`,
                  borderRadius: 14, color: '#9E9E9E',
                  fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={openReasonStep}
                disabled={formInvalid || saving}
                style={{
                  flex: 1, padding: '14px 16px',
                  background: formInvalid || saving ? '#3A3A3A' : '#FBBC04',
                  border: 'none', borderRadius: 14,
                  color: formInvalid || saving ? '#777' : '#0D0D0D',
                  fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 800,
                  cursor: formInvalid || saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: motivo del cambio (auditoría F0.3.3) ─── */}
      <ReasonModal
        open={showReasonModal}
        onClose={() => setShowReasonModal(false)}
        onConfirm={confirmSaveWithReason}
        actionLabel="Actualizar precios de combustible"
        loading={saving}
      />
    </div>
  );
}
