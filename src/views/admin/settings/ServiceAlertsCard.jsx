// src/views/admin/settings/ServiceAlertsCard.jsx
// D24 (4-sep-2026) — Tarjeta de Admin → Configuración para los UMBRALES
// de las alertas push de servicio de vehículos: aviso previo por fecha
// (días) y por kilometraje (km), y la cadencia de los recordatorios de
// vencido (por fecha y por km). Guarda por set_service_alerts_config
// (sesión de admin STRICT + auditoría server-side). Los mismos valores
// pintan el aviso naranja y el botón "¿Ya hiciste el servicio?" en la
// ventana Vehículos del socio (cfg.serviceAlerts).
import { useEffect, useState } from 'react';
import { sb } from '../../../lib/supabaseClient';
import { getAdminToken } from '../../../services/sessionTokens';
import { adminTheme as AT, inputStyleDark } from '../../../constants/styles';

const FIELDS = [
  { k: 'days', label: 'Aviso previo por fecha', unit: 'días antes', min: 1, max: 60 },
  { k: 'km', label: 'Aviso previo por kilometraje', unit: 'km antes', min: 50, max: 5000 },
  { k: 'overdueEveryDays', label: 'Vencido por fecha: recordar cada', unit: 'días', min: 1, max: 30 },
  { k: 'kmEveryDays', label: 'Por kilometraje: recordar cada', unit: 'días', min: 1, max: 60 },
];

export default function ServiceAlertsCard({ cfg, setCfg, loggedAdmin, fire, card, cardTitle, cardHint }) {
  const cur = cfg.serviceAlerts || { days: 7, km: 500, overdueEveryDays: 7, kmEveryDays: 14 };
  const [form, setForm] = useState(cur);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setForm(cur); }, [cfg.serviceAlerts]);

  const dirty = FIELDS.some(f => String(form[f.k]) !== String(cur[f.k]));

  const save = async () => {
    if (!sb) { fire('Sin conexión', 'error'); return; }
    for (const f of FIELDS) {
      const n = parseInt(form[f.k], 10);
      if (!Number.isFinite(n) || n < f.min || n > f.max) {
        fire(`${f.label}: entre ${f.min} y ${f.max.toLocaleString('en-US')}`, 'error');
        return;
      }
    }
    setSaving(true);
    const { data, error } = await sb.rpc('set_service_alerts_config', {
      p_session_token: getAdminToken()?.token || null,
      p_data: {
        days: parseInt(form.days, 10), km: parseInt(form.km, 10),
        overdue_every_days: parseInt(form.overdueEveryDays, 10),
        km_every_days: parseInt(form.kmEveryDays, 10),
      },
      p_admin_id: loggedAdmin?.id,
      p_admin_name: loggedAdmin?.name,
      p_admin_email: loggedAdmin?.email,
      p_reason_text: null,
    });
    setSaving(false);
    if (error) { fire('Error: ' + error.message, 'error'); return; }
    if (data?.error) { fire(data.error, 'error'); return; }
    setCfg(p => ({ ...p, serviceAlerts: {
      days: data.days, km: data.km, overdueEveryDays: data.overdue_every_days, kmEveryDays: data.km_every_days,
    } }));
    fire('Umbrales de alertas de servicio guardados', 'success');
  };

  return (
    <div style={card}>
      <div style={cardTitle}>Alertas de servicio (vehículos)</div>
      <div style={cardHint}>
        Push diario (09:10) cuando el próximo servicio de un vehículo se acerca por fecha o por
        kilometraje. Estos umbrales aplican a todos los socios; cada socio puede apagar los
        recordatorios de un vehículo desde su ventana Vehículos.
      </div>
      {FIELDS.map(f => (
        <div key={f.k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '7px 0', borderBottom: `1px solid ${AT.border}` }}>
          <span style={{ fontSize: 12, color: '#BDBDBD', fontWeight: 600 }}>{f.label}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <input
              value={form[f.k] ?? ''} inputMode="numeric"
              onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value.replace(/[^0-9]/g, '').slice(0, 5) }))}
              style={{ ...inputStyleDark, width: 72, textAlign: 'right', padding: '7px 9px', fontFamily: "'JetBrains Mono', monospace" }}
            />
            <span style={{ fontSize: 11, color: '#777', fontWeight: 700, width: 66 }}>{f.unit}</span>
          </span>
        </div>
      ))}
      <button onClick={save} disabled={saving || !dirty} style={{
        marginTop: 12, width: '100%', padding: '10px 0', borderRadius: 10, border: 'none',
        background: saving || !dirty ? 'rgba(255,255,255,.06)' : 'rgba(255,152,0,.18)',
        color: saving || !dirty ? '#666' : '#FFB74D',
        fontFamily: "'DM Sans'", fontWeight: 800, fontSize: 12, cursor: saving || !dirty ? 'not-allowed' : 'pointer',
      }}>
        {saving ? 'Guardando...' : 'Guardar umbrales'}
      </button>
    </div>
  );
}
