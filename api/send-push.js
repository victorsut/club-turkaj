import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

webpush.setVapidDetails('mailto:clubturkaj@gmail.com', VAPID_PUBLIC, VAPID_PRIVATE);
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { member_id, title, body, data } = req.body;
    if (!member_id) return res.status(400).json({ error: 'member_id required' });

    const { data: subs, error } = await sb
      .from('push_subscriptions')
      .select('*')
      .eq('member_id', member_id);

    if (error) return res.status(500).json({ error: error.message });
    if (!subs?.length) return res.status(200).json({ sent: 0, message: 'No subscriptions' });

    const payload = JSON.stringify({
      title: title || 'Puntos Plus',
      body: body || 'Tenés una notificación',
      icon: '/favicon.svg',
      tag: 'purchase-' + Date.now(),
      url: '/',
      ...(data || {}),
    });

    let sent = 0;
    for (const sub of subs) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
        }, payload);
        sent++;
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await sb.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
    }

    return res.status(200).json({ sent });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
