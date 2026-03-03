// ============================================================
// Club Turkaj — Supabase Client (Singleton)
// ============================================================
// Este archivo es el ÚNICO punto de conexión a Supabase.
// Todas las vistas y servicios importan `sb` desde aquí.
// ============================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
  || 'https://rfharnrsatgliynzcuwp.supabase.co';

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
  || 'sb_publishable_W7UvMRT26o2NNeQvKeWCFQ__iM_dOnO';

// Crear cliente con opciones optimizadas para PWA
export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,     // Para OAuth callbacks (Google/Apple)
    storage: globalThis.localStorage,
  },
  global: {
    headers: { 'x-app-name': 'club-turkaj' },
  },
  realtime: {
    params: { eventsPerSecond: 2 },
  },
});

// Helper: verificar si la conexión a Supabase está activa
export async function checkConnection() {
  try {
    const { error } = await sb.from('program_config').select('key').limit(1);
    return !error;
  } catch {
    return false;
  }
}

export default sb;
