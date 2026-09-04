// api/vehicle-service-alerts.js — cron diario (Vercel, 09:00 Guatemala)
// de alertas push de PRÓXIMO SERVICIO del vehículo (F6 E3d / D24).
//
// Fuente: RPC list_vehicle_service_alerts() (solo service_role) —
// vehículos NO silenciados con servicio por FECHA a ≤ `days` días o
// vencido, y por KM a ≤ `km` km o pasado, con el odómetro conocido.
//
// Umbrales (D24, 4-sep): program_config('service_alerts'), editables en
// Admin → Configuración → Alertas de servicio:
//   days               · aviso previo por fecha (default 7)
//   km                 · aviso previo por kilometraje (default 500)
//   overdue_every_days · vencido por fecha: re-aviso cada N días (7)
//   km_every_days      · por km: re-aviso cada N días (14)
//
// Cadencia (el cron corre 1 vez al día):
//   fecha · el día del umbral y luego a 3 / 1 días y el día 0 (los hitos
//           mayores que el umbral no aplican) · vencido: cada
//           overdue_every_days
//   km    · un aviso al cruzar el umbral y al pasarse, re-aviso cada
//           km_every_days (dedupe por notifications con data.vehicle_id
//           + kind — el odómetro no avanza a diario)
//
// Seguridad: exige CRON_SECRET (mismo patrón de degradation-alerts).
import { sb, pushToMembers } from './_lib/push.js';

const DEFAULTS = { days: 7, km: 500, overdue_every_days: 7, km_every_days: 14 };

async function loadConfig() {
  const { data } = await sb.from('program_config').select('value').eq('key', 'service_alerts').maybeSingle();
  const v = data?.value && typeof data.value === 'object' ? data.value : {};
  const num = (k) => (Number.isFinite(+v[k]) && +v[k] > 0 ? +v[k] : DEFAULTS[k]);
  return { days: num('days'), km: num('km'), overdue_every_days: num('overdue_every_days'), km_every_days: num('km_every_days') };
}

function shouldSendFecha(daysLeft, cfg) {
  if (daysLeft === cfg.days) return true;
  if ([3, 1, 0].includes(daysLeft) && daysLeft < cfg.days) return true;
  if (daysLeft < 0 && (-daysLeft) % cfg.overdue_every_days === 0) return true;
  return false;
}

function messageFor(row) {
  const name = row.vehicle_name;
  if (row.kind === 'fecha') {
    const d = row.days_left;
    if (d > 0) return {
      title: `Servicio de ${name} en ${d} ${d === 1 ? 'día' : 'días'}`,
      body: `El próximo servicio de ${name} está programado para ${d === 1 ? 'mañana' : `dentro de ${d} días`}. Agendalo con tiempo.`,
    };
    if (d === 0) return {
      title: `¡Hoy toca el servicio de ${name}!`,
      body: `Tenés programado el servicio de ${name} para hoy.`,
    };
    return {
      title: `El servicio de ${name} está vencido`,
      body: `El servicio de ${name} venció hace ${-d} ${-d === 1 ? 'día' : 'días'}. Un mantenimiento a tiempo cuida su rendimiento.`,
    };
  }
  const k = row.km_left;
  if (k > 0) return {
    title: `A ${name} le faltan ${k.toLocaleString('en-US')} km para su servicio`,
    body: `Según tu odómetro, ${name} llega a su servicio en ~${k.toLocaleString('en-US')} km. Andá planificándolo.`,
  };
  return {
    title: `${name} ya pasó su kilometraje de servicio`,
    body: `Tu odómetro marca ${(-k).toLocaleString('en-US')} km más allá del servicio programado de ${name}.`,
  };
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(500).json({ error: 'CRON_SECRET no configurada' });
  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const cfg = await loadConfig();
    const { data: rows, error } = await sb.rpc('list_vehicle_service_alerts');
    if (error) return res.status(500).json({ error: error.message });
    if (!rows?.length) return res.status(200).json({ candidates: 0, sent: 0, cfg });

    // Dedupe: notificaciones de servicio recientes — las de FECHA solo
    // bloquean re-corridas del mismo día (20 h); las de KM bloquean
    // km_every_days por vehículo (el hito no cambia a diario).
    const sinceKm = new Date(Date.now() - cfg.km_every_days * 86400 * 1000).toISOString();
    const since20h = new Date(Date.now() - 20 * 3600 * 1000).toISOString();
    const { data: recent } = await sb
      .from('notifications')
      .select('member_id, sent_at, data')
      .eq('type', 'vehiculo_servicio')
      .gte('sent_at', sinceKm)
      .in('member_id', [...new Set(rows.map(r => r.member_id))]);

    const blocked = (row) => (recent || []).some(n =>
      n.member_id === row.member_id &&
      n.data?.vehicle_id === row.vehicle_id &&
      n.data?.kind === row.kind &&
      (row.kind === 'km' || n.sent_at >= since20h)
    );

    let sent = 0, notified = 0;
    for (const row of rows) {
      if (row.kind === 'fecha' && !shouldSendFecha(row.days_left, cfg)) continue;
      if (blocked(row)) continue;
      const msg = messageFor(row);
      // E4: el toque abre la ventana VEHÍCULOS en ese vehículo con la
      // confirmación de servicio (app cerrada → deep-link; abierta →
      // NOTIFICATION_CLICK con los mismos datos). Los recordatorios
      // siguen hasta que el socio confirme o silencie el vehículo.
      const r = await pushToMembers(row.member_id, {
        type: 'vehiculo_servicio',
        title: msg.title,
        body: msg.body + ' Tocá para confirmar si ya lo hiciste.',
        url: `/?goto=vehiculo&vehicle=${row.vehicle_id}`,
        data: { vehicle_id: row.vehicle_id, kind: row.kind, days_left: row.days_left, km_left: row.km_left },
      });
      notified++;
      sent += r.sent;
    }

    return res.status(200).json({ candidates: rows.length, notified, sent, cfg });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
