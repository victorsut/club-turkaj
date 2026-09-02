// src/views/client/vehicles/VehicleCharts.jsx
// F6 E3e (2-sep-2026) — GRÁFICAS de telemetría en SVG puro (cero
// librerías, regla del proyecto). Dos formas elegidas por el trabajo
// del dato (método dataviz):
//   · TrendChart  — rendimiento km/gal POR TRAMO en el tiempo (línea,
//     serie única) con el PROMEDIO como referencia punteada.
//   · MonthBars   — gasto (Q) POR MES (barras, serie única, extremos
//     redondeados anclados a la línea base).
// Color de la serie VALIDADO con el validador de paleta (banda de
// luminosidad + contraste ≥3:1 sobre la superficie de cada modo):
// claro #3E6DC4 · oscuro #5A85D8. El texto SIEMPRE usa tinta de texto
// (ink/sub), nunca el color de la serie. Serie única → sin leyenda (el
// título de la tarjeta la nombra). Tap en un punto/barra = burbuja con
// el detalle (capa de interacción táctil); el "modo tabla" existe: el
// historial de cargas y las filas de consumo.
import { useState } from 'react';

const DATA_C = (dark) => (dark ? '#5A85D8' : '#3E6DC4');
const fmtN = (n, d = 1) => (+n).toLocaleString('en-US', { maximumFractionDigits: d });

// Barra con extremo superior redondeado (r) y base recta en y0
const barPath = (x, y, w, y0, r) => {
  const rr = Math.min(r, w / 2, Math.max(0, y0 - y));
  return `M${x} ${y0} L${x} ${y + rr} Q${x} ${y} ${x + rr} ${y} L${x + w - rr} ${y} Q${x + w} ${y} ${x + w} ${y + rr} L${x + w} ${y0} Z`;
};

// ── Rendimiento por tramo (línea) ────────────────────────────
export function TrendChart({ points, avg, dark, ink, sub, surface }) {
  const [sel, setSel] = useState(null);
  if (!points || points.length < 2) return null;
  const W = 320, H = 128, PL = 10, PR = 52, PT = 26, PB = 22;
  const vs = points.map(p => p.v);
  const lo = Math.min(...vs, avg), hi = Math.max(...vs, avg);
  const span = Math.max(hi - lo, 1);
  const y = (v) => PT + (H - PT - PB) * (1 - (v - lo) / span);
  const x = (i) => PL + (W - PL - PR) * (points.length === 1 ? 0.5 : i / (points.length - 1));
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ');
  const last = points.length - 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {/* referencia: promedio punteado (neutro, recesivo) */}
      <line x1={PL} x2={W - PR} y1={y(avg)} y2={y(avg)} stroke={sub} strokeWidth="1" strokeDasharray="3 4" opacity=".7" />
      <text x={W - PR + 5} y={y(avg) + 3} fontSize="8.5" fontWeight="700" fill={sub} fontFamily="'DM Sans'">prom {fmtN(avg)}</text>
      {/* línea base sutil */}
      <line x1={PL} x2={W - PR} y1={H - PB} y2={H - PB} stroke={sub} strokeWidth="1" opacity=".25" />
      <path d={line} fill="none" stroke={DATA_C(dark)} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={i} onClick={() => setSel(sel === i ? null : i)} style={{ cursor: 'pointer' }}>
          {/* blanco de toque mayor que la marca */}
          <circle cx={x(i)} cy={y(p.v)} r="12" fill="transparent" />
          <circle cx={x(i)} cy={y(p.v)} r="4" fill={DATA_C(dark)} stroke={surface} strokeWidth="2" />
        </g>
      ))}
      {/* etiqueta directa SOLO en el último punto */}
      <text x={x(last)} y={y(points[last].v) - 9} textAnchor="end" fontSize="10.5" fontWeight="800" fill={ink} fontFamily="'DM Sans'">
        {fmtN(points[last].v)} km/gal
      </text>
      {/* eje x: primera y última fecha */}
      <text x={PL} y={H - 7} fontSize="9" fontWeight="700" fill={sub} fontFamily="'DM Sans'">{points[0].label}</text>
      <text x={W - PR} y={H - 7} textAnchor="end" fontSize="9" fontWeight="700" fill={sub} fontFamily="'DM Sans'">{points[last].label}</text>
      {/* burbuja del punto tocado */}
      {sel != null && sel !== last && (
        <g>
          <rect x={Math.min(Math.max(x(sel) - 42, 2), W - 86)} y={Math.max(y(points[sel].v) - 26, 2)} width="84" height="17" rx="6"
            fill={dark ? '#2B2B31' : '#FFFFFF'} stroke={sub} strokeOpacity=".35" />
          <text x={Math.min(Math.max(x(sel) - 42, 2), W - 86) + 42} y={Math.max(y(points[sel].v) - 26, 2) + 12} textAnchor="middle"
            fontSize="9.5" fontWeight="800" fill={ink} fontFamily="'DM Sans'">
            {points[sel].label} · {fmtN(points[sel].v)} km/gal
          </text>
        </g>
      )}
    </svg>
  );
}

// ── Gasto por mes (barras) ───────────────────────────────────
export function MonthBars({ months, dark, ink, sub }) {
  const [sel, setSel] = useState(null);
  if (!months || months.length < 2) return null;
  const W = 320, H = 132, PB = 20, PT = 30;
  const n = months.length;
  const maxV = Math.max(...months.map(m => m.amt), 1);
  const slot = W / n;
  const bw = Math.min(38, slot - 14);
  const y = (v) => PT + (H - PT - PB) * (1 - v / maxV);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <line x1="0" x2={W} y1={H - PB} y2={H - PB} stroke={sub} strokeWidth="1" opacity=".25" />
      {months.map((m, i) => {
        const bx = slot * i + (slot - bw) / 2;
        const by = y(m.amt);
        return (
          <g key={m.label} onClick={() => setSel(sel === i ? null : i)} style={{ cursor: 'pointer' }}>
            <rect x={slot * i} y={PT - 8} width={slot} height={H - PT - PB + 8 + PB} fill="transparent" />
            <path d={barPath(bx, by, bw, H - PB, 4)} fill={DATA_C(dark)} opacity={sel == null || sel === i ? 1 : 0.45} />
            {/* valor en tinta de texto sobre la barra */}
            <text x={bx + bw / 2} y={by - 5} textAnchor="middle" fontSize="9.5" fontWeight="800" fill={ink} fontFamily="'DM Sans'">
              Q{fmtN(m.amt, 0)}
            </text>
            <text x={bx + bw / 2} y={H - 6} textAnchor="middle" fontSize="9" fontWeight="700" fill={sub} fontFamily="'DM Sans'">{m.short}</text>
          </g>
        );
      })}
      {/* burbuja del mes tocado: cargas y galones */}
      {sel != null && (
        <text x={W / 2} y={12} textAnchor="middle" fontSize="9.5" fontWeight="800" fill={ink} fontFamily="'DM Sans'">
          {months[sel].label}: {months[sel].n} carga{months[sel].n === 1 ? '' : 's'} · {fmtN(months[sel].gal)} gal · Q{fmtN(months[sel].amt, 0)}
        </text>
      )}
    </svg>
  );
}
