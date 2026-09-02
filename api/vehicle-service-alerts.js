// api/vehicle-service-alerts.js — cron diario (Vercel, 09:00 Guatemala)
// de alertas push de PRÓXIMO SERVICIO del vehículo (F6 E3d / D24).
//
// Fuente: RPC list_vehicle_service_alerts() (solo service_role) —
// vehículos con servicio por FECHA a ≤7 días o vencido (≤30 días), y
// por KM a ≤500 km o pasado (≤3,000 km), con el odómetro conocido.
//
// Cadencia (el cron corre 1 vez al día):
//   fecha · faltan 7 / 3 / 1 días y el día 0 · vencido: cada 7 días
//   km    · un aviso al cruzar los 500 km restantes y al pasarse,
//           re-aviso cada 14 días (dedupe por notifications con
//           data.vehicle_id + kind — el odómetro no avanza a diario)
//
// Seguridad: exige CRON_SECRET (mismo patrón de degradation-alerts).
import { sb, pushToMembers } from './_lib/push.js';

function shouldSendFecha(daysLeft) {
  if (daysLeft === 7 || daysLeft === 3 || daysLeft === 1 || daysLeft === 0) return true;
  if (daysLeft < 0 && (-daysLeft) % 7 === 0) return true;
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
    const { data: rows, error } = await sb.rpc('list_vehicle_service_alerts');
    if (error) return res.status(500).json({ error: error.message });
    if (!rows?.length) return res.status(200).json({ candidates: 0, sent: 0 });

    // Dedupe: notificaciones de servicio de los últimos 14 días — las
    // de FECHA solo bloquean re-corridas del mismo día (20 h); las de
    // KM bloquean 14 días por vehículo (el hito no cambia a diario).
    const since14 = new Date(Date.now() - 14 * 86400 * 1000).toISOString();
    const since20h = new Date(Date.now() - 20 * 3600 * 1000).toISOString();
    const { data: recent } = await sb
      .from('notifications')
      .select('member_id, sent_at, data')
      .eq('type', 'vehiculo_servicio')
      .gte('sent_at', since14)
      .in('member_id', [...new Set(rows.map(r => r.member_id))]);

    const blocked = (row) => (recent || []).some(n =>
      n.member_id === row.member_id &&
      n.data?.vehicle_id === row.vehicle_id &&
      n.data?.kind === row.kind &&
      (row.kind === 'km' || n.sent_at >= since20h)
    );

    let sent = 0, notified = 0;
    for (const row of rows) {
      if (row.kind === 'fecha' && !shouldSendFecha(row.days_left)) continue;
      if (blocked(row)) continue;
      const msg = messageFor(row);
      const r = await pushToMembers(row.member_id, {
        type: 'vehiculo_servicio',
        title: msg.title,
        body: msg.body,
        url: '/',
        data: { vehicle_id: row.vehicle_id, kind: row.kind, days_left: row.days_left, km_left: row.km_left },
      });
      notified++;
      sent += r.sent;
    }

    return res.status(200).json({ candidates: rows.length, notified, sent });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
