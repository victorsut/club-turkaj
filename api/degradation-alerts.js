// api/degradation-alerts.js — cron diario (Vercel, 09:00 Guatemala) de
// alertas push de degradación por inactividad. Decisión 28-jul-2026:
// los avisos arrancan el DÍA 11 (5 días antes de empezar a bajar).
//
// Fuente: RPC list_degradation_alerts() — mismo cálculo de actividad y
// mismo interruptor que el motor real (apagado → lista vacía, el cron
// es un no-op hasta el lanzamiento).
//
// Cadencia por miembro (el cron corre 1 vez al día, así que cada hito
// dispara una sola vez; `notifications` deduplica corridas manuales):
//   PLATINO/BLACK · d11–15  aviso previo diario "tu nivel baja en X días"
//                 · d16     empezó a bajar
//                 · d>16    recordatorio cada 3 días
//                 · reset−5 y reset−1: aviso de reinicio total (prioridad)
//   ORO           · d40–44  aviso diario de reinicio (reset d45)
//
// Seguridad: exige CRON_SECRET (Vercel lo manda como Bearer en los
// crons cuando la env var existe). Sin la env var configurada → 500.
import { sb, pushToMembers } from './_lib/push.js';

function milestoneFor({ base_tier, days_inactive: d, reset_day: reset }) {
  const DROP = 16;
  // El reinicio total es lo más grave: sus avisos ganan a cualquier otro
  if (d === reset - 5 || d === reset - 1 || (base_tier === 'ORO' && d >= reset - 5 && d < reset)) {
    return { kind: 'reinicio', daysLeft: reset - d };
  }
  if (base_tier === 'ORO') return null; // ORO solo tiene el reinicio
  if (d >= 11 && d < DROP) return { kind: 'previo', daysLeft: DROP - d };
  if (d === DROP) return { kind: 'inicio' };
  if (d > DROP && (d - DROP) % 3 === 0) return { kind: 'bajando' };
  return null;
}

function messageFor(row, m) {
  const { base_tier, days_inactive: d } = row;
  switch (m.kind) {
    case 'previo': return {
      title: `Tu nivel ${base_tier} está en riesgo`,
      body: `Llevás ${d} días sin visitarnos. En ${m.daysLeft} ${m.daysLeft === 1 ? 'día' : 'días'} tus galones empiezan a bajar — una compra en Turkaj mantiene tu nivel.`,
    };
    case 'inicio': return {
      title: 'Tus galones empezaron a bajar',
      body: `Alcanzaste ${d} días sin actividad y tus galones comenzaron a descender. Visitá cualquier estación Turkaj para detenerlo.`,
    };
    case 'bajando': return {
      title: 'Seguís perdiendo galones',
      body: `Llevás ${d} días sin actividad y tus galones siguen bajando. Una compra detiene el descenso y conserva lo que te queda.`,
    };
    case 'reinicio': return {
      title: `Tu cuenta se reinicia en ${m.daysLeft} ${m.daysLeft === 1 ? 'día' : 'días'}`,
      body: `Por inactividad, tus puntos y galones volverán a 0 en ${m.daysLeft} ${m.daysLeft === 1 ? 'día' : 'días'}. Todavía estás a tiempo: cualquier compra o actividad reinicia tu contador.`,
    };
    default: return null;
  }
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(500).json({ error: 'CRON_SECRET no configurada' });
  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const { data: rows, error } = await sb.rpc('list_degradation_alerts');
    if (error) return res.status(500).json({ error: error.message });
    if (!rows?.length) return res.status(200).json({ enabled: true, candidates: 0, sent: 0 });

    // Dedupe: quien ya recibió una alerta de degradación en las últimas
    // 20 h no recibe otra (protege re-ejecuciones manuales del cron).
    const since = new Date(Date.now() - 20 * 3600 * 1000).toISOString();
    const { data: recent } = await sb
      .from('notifications')
      .select('member_id')
      .eq('type', 'degradacion')
      .gte('sent_at', since)
      .in('member_id', rows.map(r => r.member_id));
    const already = new Set((recent || []).map(n => n.member_id));

    let sent = 0, notified = 0;
    for (const row of rows) {
      if (already.has(row.member_id)) continue;
      const m = milestoneFor(row);
      if (!m) continue;
      const msg = messageFor(row, m);
      if (!msg) continue;
      const r = await pushToMembers(row.member_id, {
        type: 'degradacion',
        title: msg.title,
        body: msg.body,
        url: '/',
        data: { kind: m.kind, daysInactive: row.days_inactive, tier: row.base_tier },
      });
      notified++;
      sent += r.sent;
    }

    return res.status(200).json({ enabled: true, candidates: rows.length, notified, sent });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
