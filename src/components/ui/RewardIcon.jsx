// src/components/ui/RewardIcon.jsx
// R1b.4 — Resuelve el ícono SVG de un premio canjeado (sin emojis).
// Prioridad: 1) rewards.icon de la BD (el emoji que elige el admin
// funciona como CLAVE semántica), 2) palabras del nombre del premio,
// 3) categoría, 4) regalo genérico. Así los premios nuevos que cree el
// admin obtienen ícono correcto sin tocar código.
import { Fuel, Gift, Coffee, Soda, Drops, Shirt, Gamepad, Headphones, Tv, Speaker, Key, Ball, Utensils } from './Icons';

const norm = (e) => String(e || '').replace(/️/g, '').trim();

const BY_EMOJI = {
  '⛽': Fuel, '☕': Coffee, '🥤': Soda, '🚿': Drops, '✨': Drops,
  '🎧': Headphones, '🎮': Gamepad, '👕': Shirt, '🔑': Key, '⚽': Ball,
  '📺': Tv, '🔊': Speaker, '🍽': Utensils,
};

const BY_NAME = [
  [/lavado/i, Drops],
  [/caf[eé]/i, Coffee],
  [/gaseosa|bebida|refresco|soda|pach[oó]n/i, Soda],
  [/combustible|tanque|di[eé]sel|gasolina|vale/i, Fuel],
  [/playera|camisa|camiseta/i, Shirt],
  [/aud[ií]fono|airpods|headphone/i, Headphones],
  [/pantalla|televisor|\btv\b/i, Tv],
  [/bocina|parlante|altavoz/i, Speaker],
  [/llavero|llave/i, Key],
  [/pelota|bal[oó]n/i, Ball],
  [/cena|almuerzo|comida/i, Utensils],
  [/playstation|xbox|consola|videojuego/i, Gamepad],
];

export function rewardIconFor(reward = {}) {
  const hit = BY_EMOJI[norm(reward.icon)];
  if (hit) return hit;
  const name = reward.name || '';
  for (const [re, C] of BY_NAME) if (re.test(name)) return C;
  if ((reward.cat || reward.category) === 'combustible') return Fuel;
  return Gift;
}

export default function RewardIcon({ reward }) {
  const C = rewardIconFor(reward);
  return <C />;
}
