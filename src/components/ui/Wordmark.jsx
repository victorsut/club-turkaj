// src/components/ui/Wordmark.jsx
// R1a — Wordmark tipográfico provisional de Puntos Plus (D30):
// "Puntos" en el color del contexto + "Plus" en el naranja del logo
// (decisión del dueño 23-jul). Cuando exista el logo definitivo se
// reemplaza acá, sin tocar los call sites.
import { BRAND_ORANGE } from '../../constants/styles';

export default function Wordmark({ size = 24, color = '#0D0D0D', stacked = false, accent = BRAND_ORANGE }) {
  if (stacked) {
    // Versión compacta de dos líneas (logo de header, como la referencia).
    return (
      <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1, textAlign: 'left' }}>
        <span style={{ fontSize: Math.round(size * 0.55), fontWeight: 900, letterSpacing: 1.5, color }}>PUNTOS</span>
        <span style={{ fontSize: size, fontWeight: 900, letterSpacing: 1, color: accent }}>PLUS</span>
      </span>
    );
  }
  return (
    <span style={{ fontSize: size, fontWeight: 900, color, whiteSpace: 'nowrap' }}>
      Puntos <span style={{ color: accent }}>Plus</span>
    </span>
  );
}
