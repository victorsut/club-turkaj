// src/lib/dates.js
// Helpers de fecha compartidos (App.jsx + bootLoader). Guatemala es
// UTC-6 — usar siempre fecha/hora local, nunca UTC. Extraídos de
// App.jsx en la división etapa 2 (12-ago-2026) sin cambios.

// Fecha local YYYY-MM-DD
export function localDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Convierte un timestamp UTC de Supabase a fecha local YYYY-MM-DD
export function utcToLocal(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
