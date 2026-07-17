// src/components/ui/Wordmark.jsx
// R1a — Wordmark tipográfico provisional de Puntos Plus (D30):
// "Puntos" en el color del contexto + "Plus" en el rojo de marca,
// como la referencia visual. Cuando exista el logo definitivo se
// reemplaza acá, sin tocar los call sites.
import { BRAND_RED } from '../../constants/styles';

export default function Wordmark({ size = 24, color = '#0D0D0D', stacked = false }) {
  if (stacked) {
    // Versión compacta de dos líneas (logo de header, como la referencia).
    return (
      <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1, textAlign: 'left' }}>
        <span style={{ fontSize: Math.round(size * 0.55), fontWeight: 900, letterSpacing: 1.5, color }}>PUNTOS</span>
        <span style={{ fontSize: size, fontWeight: 900, letterSpacing: 1, color: BRAND_RED }}>PLUS</span>
      </span>
    );
  }
  return (
    <span style={{ fontSize: size, fontWeight: 900, color, whiteSpace: 'nowrap' }}>
      Puntos <span style={{ color: BRAND_RED }}>Plus</span>
    </span>
  );
}
