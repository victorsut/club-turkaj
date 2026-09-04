// src/views/admin/Settings.jsx
// CONFIGURACIÓN — Admin v2 (11-ago-2026, FORMATO GENERAL): flat sin
// emojis, encabezado v2 sin back-link (navegación en el sidebar),
// tarjetas de sección en grid auto-fill 340px, modales oscuros
// centrados. La LÓGICA no cambió: todos los RPCs auditados intactos
// (set_loyalty_config, updateFuelPrices, set_support_phone,
// set_company_info, set_degradation_enabled, createApiClient).
// "Pts referido" queda OMITIDO (pedido del dueño 11-ago): la función
// "Refiere a un amigo" está fuera del programa por ahora — posible
// implementación futura; cfg.referralPts sigue en config como dato.
import { useState, useEffect } from 'react';
import { sb } from '../../lib/supabaseClient';
import { sMono, adminTheme as AT, inputStyleDark } from '../../constants/styles';
import { getAdminToken } from '../../services/sessionTokens';
import ReasonModal from '../../components/ui/ReasonModal';
// División 15-ago-2026 (regla de 500 líneas): los modales de llaves
// API y de precios de combustible viven en views/admin/settings/.
import ApiKeyModal from './settings/ApiKeyModal';
import FuelPricesModal from './settings/FuelPricesModal';

export default function Settings(ctx) {
  const { cfg, setCfg, fire, loggedAdmin, custs } = ctx;

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

  // ─── F1 (4-ago): identidad de la empresa ───
  // El WiFi por estación se movió a la vista Estaciones (scr 'stations')
  // junto con dirección, horario, coordenadas y código PROPER.
  const [companyForm, setCompanyForm] = useState({ name: '', location: '' });
  const [savingCompany, setSavingCompany] = useState(false);
  useEffect(() => {
    setCompanyForm({ name: cfg.companyName || '', location: cfg.companyLocation || '' });
  }, [cfg.companyName, cfg.companyLocation]);

  const saveCompany = async () => {
    if (!sb) { fire('Sin conexión', 'error'); return; }
    const name = companyForm.name.trim();
    const location = companyForm.location.trim();
    if (!name || !location) { fire('Nombre y ubicación son obligatorios', 'error'); return; }
    setSavingCompany(true);
    const { data, error } = await sb.rpc('set_company_info', {
      p_session_token: getAdminToken()?.token || null,
      p_data: { name, location },
      p_admin_id: loggedAdmin?.id,
      p_admin_name: loggedAdmin?.name,
      p_admin_email: loggedAdmin?.email,
      p_reason_text: null,
    });
    setSavingCompany(false);
    if (error) { fire('Error: ' + error.message, 'error'); return; }
    if (data?.error) { fire(data.error, 'error'); return; }
    setCfg(p => ({ ...p, companyName: name, companyLocation: location }));
    fire('Datos de la empresa actualizados', 'success');
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

  // ─── F2.1 (6-ago): conversión y eventos POR NIVEL ───
  // ORO Q10=1pt/25pts · PLATINO Q8/35 · BLACK Q6/50 (decisión del
  // dueño). RPC set_loyalty_config: sesión de admin + whitelist
  // (solo qPerPt/evtPts — los umbrales de galones NO se editan acá)
  // + auditoría con razón obligatoria (la economía del programa es
  // sensible, patrón de los precios de combustible).
  const [loyaltyForm, setLoyaltyForm] = useState({
    oro: { qPerPt: '', evtPts: '' },
    platino: { qPerPt: '', evtPts: '' },
    black: { qPerPt: '', evtPts: '' },
  });
  const [savingLoyalty, setSavingLoyalty] = useState(false);
  const [showLoyaltyReason, setShowLoyaltyReason] = useState(false);
  useEffect(() => {
    const t = cfg.tiers || {};
    setLoyaltyForm({
      oro:     { qPerPt: String(t.oro?.qPerPt ?? cfg.qPerPt ?? 10), evtPts: String(t.oro?.evtPts ?? 25) },
      platino: { qPerPt: String(t.platino?.qPerPt ?? 8), evtPts: String(t.platino?.evtPts ?? 35) },
      black:   { qPerPt: String(t.black?.qPerPt ?? 6),   evtPts: String(t.black?.evtPts ?? 50) },
    });
  }, [cfg.tiers, cfg.qPerPt]);

  const loyaltyInvalid = ['oro', 'platino', 'black'].some(k => {
    const q = parseInt(loyaltyForm[k].qPerPt, 10);
    const e = parseInt(loyaltyForm[k].evtPts, 10);
    return !Number.isInteger(q) || q < 1 || q > 100 || !Number.isInteger(e) || e < 0 || e > 1000;
  });

  const setLoyaltyField = (tier, field, raw) =>
    setLoyaltyForm(p => ({ ...p, [tier]: { ...p[tier], [field]: raw.replace(/[^0-9]/g, '').slice(0, 4) } }));

  const saveLoyaltyWithReason = async (reason) => {
    if (!sb) { fire('Sin conexión', 'error'); return; }
    if (!loggedAdmin?.id) {
      setShowLoyaltyReason(false);
      fire('Error: sesion admin no disponible. Cerra sesion y volve a ingresar.', 'error');
      return;
    }
    setSavingLoyalty(true);
    const pData = {};
    ['oro', 'platino', 'black'].forEach(k => {
      pData[k] = {
        qPerPt: parseInt(loyaltyForm[k].qPerPt, 10),
        evtPts: parseInt(loyaltyForm[k].evtPts, 10),
      };
    });
    const { data, error } = await sb.rpc('set_loyalty_config', {
      p_session_token: getAdminToken()?.token || null,
      p_data: pData,
      p_admin_id: loggedAdmin.id,
      p_admin_name: loggedAdmin.name,
      p_admin_email: loggedAdmin.email,
      p_reason_text: reason,
    });
    setSavingLoyalty(false);
    if (error) { fire('Error: ' + error.message, 'error'); return; }
    if (data?.error) { fire(data.error, 'error'); return; }
    setShowLoyaltyReason(false);
    setCfg(p => ({ ...p, tiers: data }));
    fire('Puntos por nivel actualizados', 'success');
  };

  // ─── F7a: llaves de la API externa (PROPER) ───
  // El modal (con su estado y generación) vive en settings/ApiKeyModal.
  const [showApiModal, setShowApiModal] = useState(false);

  // ─── Edición de precios de combustible ───
  // El flujo completo (modal + validación + motivo + RPC auditado)
  // vive en settings/FuelPricesModal; acá solo el interruptor.
  const [showPriceModal, setShowPriceModal] = useState(false);

  // ── estilos (FORMATO GENERAL Admin v2) ──────────────────
  const card = { background: AT.card, borderRadius: 16, border: `1px solid ${AT.border}`, padding: 16 };
  const cardTitle = { fontSize: 11, fontWeight: 800, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 };
  const cardHint = { fontSize: 11, color: '#777', marginBottom: 12, lineHeight: 1.5 };
  const row = { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${AT.border}`, fontSize: 13 };
  const lbl = { display: 'block', fontSize: 11, fontWeight: 800, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 6 };
  const saveBtn = (busy, invalid) => ({
    padding: '11px 16px', borderRadius: 12, border: 'none',
    background: busy || invalid ? '#3A3A3A' : '#FBBC04',
    color: busy || invalid ? '#777' : '#0D0D0D',
    fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 800,
    cursor: busy || invalid ? 'not-allowed' : 'pointer',
  });
  const ghostCardBtn = (color) => ({
    width: '100%', padding: '11px 16px', borderRadius: 12,
    background: 'transparent', border: `1px solid ${AT.border}`,
    color, fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700, cursor: 'pointer',
  });

  return (
    <div style={{ padding: '22px 22px 60px' }}>
      {/* Encabezado v2 (sin back-link: la navegación vive en el sidebar) */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 21, fontWeight: 800, color: '#fff' }}>Configuración</div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#9E9E9E', marginTop: 2 }}>
          Parámetros del programa — los cambios sensibles piden motivo y quedan auditados
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 10, alignItems: 'start' }}>

        {/* F2.1: conversión y eventos POR NIVEL (editable, auditado) */}
        <div style={card}>
          <div style={cardTitle}>Puntos por Nivel</div>
          <div style={cardHint}>
            Quetzales necesarios para ganar 1 punto y puntos otorgados por evento
            especial, según el nivel del cliente. La conversión de cada compra usa
            el nivel que el cliente tenía antes de esa compra.
          </div>
          {[
            { k: 'oro', label: 'ORO', color: '#FBBC04' },
            { k: 'platino', label: 'PLATINO', color: '#9E9E9E' },
            { k: 'black', label: 'BLACK', color: '#CE93D8' },
          ].map(t => (
            <div key={t.k} style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 10 }}>
              <span style={{ width: 74, fontSize: 12, fontWeight: 800, color: t.color, paddingBottom: 10 }}>{t.label}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, color: '#777', fontWeight: 700, marginBottom: 3, textTransform: 'uppercase', letterSpacing: .5 }}>Q por punto</div>
                <input
                  value={loyaltyForm[t.k].qPerPt}
                  onChange={e => setLoyaltyField(t.k, 'qPerPt', e.target.value)}
                  inputMode="numeric"
                  style={{ ...inputStyleDark, width: '100%', boxSizing: 'border-box', ...sMono, fontSize: 13 }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, color: '#777', fontWeight: 700, marginBottom: 3, textTransform: 'uppercase', letterSpacing: .5 }}>Pts por evento</div>
                <input
                  value={loyaltyForm[t.k].evtPts}
                  onChange={e => setLoyaltyField(t.k, 'evtPts', e.target.value)}
                  inputMode="numeric"
                  style={{ ...inputStyleDark, width: '100%', boxSizing: 'border-box', ...sMono, fontSize: 13 }}
                />
              </div>
            </div>
          ))}
          <button
            onClick={() => { if (!loyaltyInvalid) setShowLoyaltyReason(true); }}
            disabled={loyaltyInvalid || savingLoyalty}
            style={{ ...saveBtn(savingLoyalty, loyaltyInvalid), marginTop: 6, width: '100%' }}
          >
            {savingLoyalty ? 'Guardando...' : 'Guardar puntos por nivel'}
          </button>
        </div>

        {/* Conversión */}
        <div style={card}>
          <div style={cardTitle}>Conversión</div>
          <div style={row}>
            <span style={{ color: '#9E9E9E', fontWeight: 600 }}>Pts por boleto rifa (global)</span>
            <span style={{ color: '#FBBC04', fontWeight: 800, ...sMono }}>{cfg.ticketPts} pts</span>
          </div>
          <div style={row}>
            <span style={{ color: '#9E9E9E', fontWeight: 600 }}>Pts registro base</span>
            <span style={{ color: '#81C784', fontWeight: 800, ...sMono }}>{cfg.regBase} pts</span>
          </div>
          <div style={row}>
            <span style={{ color: '#9E9E9E', fontWeight: 600 }}>Pts campo opcional</span>
            <span style={{ color: '#81C784', fontWeight: 800, ...sMono }}>+{cfg.regOptional} pts</span>
          </div>
          {/* "Pts referido" OMITIDO (11-ago-2026, pedido del dueño): la
              función "Refiere a un amigo" queda fuera del programa por
              ahora — posible implementación futura. cfg.referralPts
              sigue existiendo en config solo como dato. */}
          <div style={{ ...row, borderBottom: 'none' }}>
            <span style={{ color: '#9E9E9E', fontWeight: 600 }}>Encuestas diarias</span>
            <span style={{ color: '#64B5F6', fontWeight: 800, ...sMono }}>{cfg.surveyDaily}/día · {cfg.surveyPts} pts</span>
          </div>
        </div>

        {/* Precios de combustible */}
        <div style={card}>
          <div style={cardTitle}>Precios de Combustible</div>
          {[
            { name: 'Súper', price: cfg.fuelPrices?.super ?? 0, color: '#FF8F00' },
            { name: 'Regular', price: cfg.fuelPrices?.regular ?? 0, color: '#81C784' },
            { name: 'Diésel', price: cfg.fuelPrices?.diesel ?? 0, color: '#64B5F6' },
          ].map((f, i) => (
            <div key={f.name} style={{ ...row, borderBottom: i < 2 ? `1px solid ${AT.border}` : 'none' }}>
              <span style={{ color: f.color, fontWeight: 700 }}>{f.name}</span>
              <span style={{ color: '#fff', fontWeight: 800, ...sMono }}>Q{f.price.toFixed(2)}/gal</span>
            </div>
          ))}
          <button onClick={() => setShowPriceModal(true)} style={{ ...ghostCardBtn('#FBBC04'), marginTop: 14 }}>
            Editar precios
          </button>
        </div>

        {/* Canal de asistencia (WhatsApp / llamadas) */}
        <div style={card}>
          <div style={cardTitle}>Canal de Asistencia</div>
          <div style={cardHint}>
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
            <button onClick={saveSupport} disabled={savingSupport} style={{ ...saveBtn(savingSupport), padding: '0 18px' }}>
              {savingSupport ? '...' : 'Guardar'}
            </button>
          </div>
        </div>

        {/* F1: identidad de la empresa (selector + tagline del inicio) */}
        <div style={card}>
          <div style={cardTitle}>Empresa</div>
          <div style={cardHint}>
            Nombre y ubicación que el cliente ve en el selector de empresa y en el encabezado del inicio.
          </div>
          <label style={lbl}>Nombre</label>
          <input value={companyForm.name} onChange={e => setCompanyForm(p => ({ ...p, name: e.target.value }))}
            placeholder="Gasolineras Turkaj" style={{ ...inputStyleDark, marginBottom: 10 }} />
          <label style={lbl}>Ubicación</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={companyForm.location} onChange={e => setCompanyForm(p => ({ ...p, location: e.target.value }))}
              placeholder="Chichicastenango" style={{ ...inputStyleDark, flex: 1 }} />
            <button onClick={saveCompany} disabled={savingCompany} style={{ ...saveBtn(savingCompany), padding: '0 18px' }}>
              {savingCompany ? '...' : 'Guardar'}
            </button>
          </div>
        </div>

        {/* Niveles (informativo — los umbrales no se editan acá) */}
        <div style={card}>
          <div style={cardTitle}>Niveles</div>
          <div style={row}>
            <span style={{ color: '#FBBC04', fontWeight: 800, letterSpacing: 1 }}>ORO</span>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 12, ...sMono }}>0 – {(cfg.tiers?.platino?.gal || 150) - 1} gal</span>
          </div>
          <div style={row}>
            <span style={{ color: '#9E9E9E', fontWeight: 800, letterSpacing: 1 }}>PLATINO</span>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 12, ...sMono }}>{cfg.tiers?.platino?.gal || 150} – {(cfg.tiers?.black?.gal || 500) - 1} gal</span>
          </div>
          <div style={row}>
            <span style={{ color: '#CE93D8', fontWeight: 800, letterSpacing: 1 }}>BLACK</span>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 12, ...sMono }}>{cfg.tiers?.black?.gal || 500}+ gal</span>
          </div>
          {cfg.tiers?.platino && (
            <>
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

        {/* Degradación por inactividad */}
        <div style={card}>
          <div style={cardTitle}>Degradación por Inactividad</div>
          {/* Interruptor del motor (lanzamiento oficial) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#E0E0E0' }}>Motor de degradación</div>
              <div style={{ fontSize: 11, color: '#777', marginTop: 2 }}>
                {cfg.degradEnabled
                  ? `Activo — contando inactividad desde ${cfg.degradEnabledAt ? new Date(cfg.degradEnabledAt).toLocaleDateString('es-GT') : 'la activación'}`
                  : 'Apagado — las reglas se muestran pero NO se aplican'}
              </div>
            </div>
            <button onClick={toggleDegrad} disabled={savingDegrad} style={{
              padding: '8px 16px', borderRadius: 20, border: 'none', flexShrink: 0,
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
          <div style={{ marginTop: 8, fontSize: 11, color: '#81C784', fontWeight: 700 }}>Cualquier compra (desde Q10) resetea el reloj</div>
        </div>

        {/* F7a: llaves de la API externa (PROPER) */}
        <div style={card}>
          <div style={cardTitle}>API Externa (PROPER)</div>
          <div style={cardHint}>
            Llaves de acceso para sistemas externos que acumulan puntos y entregan
            premios (POS de PROPER). Cada llave se muestra una sola vez al generarla.
          </div>
          <button onClick={() => setShowApiModal(true)} style={ghostCardBtn('#80CBC4')}>
            Generar llave de API
          </button>
        </div>

      </div>

      {/* ─── F7a: Modal de llaves de la API externa ─── */}
      {showApiModal && (
        <ApiKeyModal fire={fire} onClose={() => setShowApiModal(false)} />
      )}

      {/* ─── Editar precios de combustible (modal + motivo auditado) ─── */}
      {showPriceModal && (
        <FuelPricesModal
          cfg={cfg} setCfg={setCfg} fire={fire} loggedAdmin={loggedAdmin}
          onClose={() => setShowPriceModal(false)}
        />
      )}

      {/* ─── F2.1: motivo del cambio de puntos por nivel ─── */}
      <ReasonModal
        open={showLoyaltyReason}
        onClose={() => setShowLoyaltyReason(false)}
        onConfirm={saveLoyaltyWithReason}
        actionLabel="Actualizar puntos por nivel"
        loading={savingLoyalty}
      />
    </div>
  );
}
