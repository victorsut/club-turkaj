// src/components/ui/LegalFooter.jsx
// R1a — Disclaimer legal permanente (D28). Texto fijo por decisión
// de producto; no parametrizar el contenido.
export default function LegalFooter({ color = '#9E9E9E' }) {
  return (
    <div style={{ padding: '18px 28px 10px', textAlign: 'center', fontSize: 10, color, lineHeight: 1.6, opacity: .85 }}>
      Puntos Plus es una app ajena a Shell Guatemala y aplica únicamente a gasolineras Turkaj en Chichicastenango.
    </div>
  );
}
