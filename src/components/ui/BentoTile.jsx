// src/components/ui/BentoTile.jsx
// R1b (FORMATO GENERAL) — Tile del bento grid del home: color sólido
// plano, icono SVG blanco grande arriba-izquierda, título uppercase y
// subtítulo abajo. Entrada con stagger (animationDelay por índice) y
// press-scale vía .pp-tile. `icon` acepta un nodo (BentoIcons) o texto.
import { bento } from '../../constants/styles';

// `ink` = color del texto/chevron (default blanco; los cuadros claros
// como Encuesta usan tinta oscura — referencia colores inicio).
// `titleColor` = color SOLO del título (los cuadros negros de BLACK
// llevan título dorado con contenido blanco — referencia nivel black).
export default function BentoTile({
  color, icon, title, sub, onClick, ink = '#fff', titleColor,
  dimmed = false, badge = null, span = 1, square = false, index = 0,
  children,
}) {
  const wide = span === 2;
  return (
    <div
      onClick={onClick}
      // pp-bento-row: en pantallas cortas los tiles medianos pasan a
      // layout horizontal (icono a la izquierda) para que el home quepa.
      className={`pp-tile${!wide && !square ? ' pp-bento-row' : ''}`}
      style={{
        gridColumn: wide ? '1 / -1' : 'auto',
        background: color,
        borderRadius: bento.radius,
        // Horizontal 13 (antes 16): margen interno reducido para que
        // títulos largos (SATISFACCIÓN/UBICACIÓN) quepan SIN guion en
        // teléfonos angostos y el home siga entrando completo (img2
        // POR CORREGIR 4-ago — el guionado rompía la estética).
        padding: wide ? '16px 18px' : '15px 13px 14px',
        // square: proporción 1:1 fija (Promos/Vehículo); el resto se
        // estira con la fila del grid (adaptable a la resolución).
        aspectRatio: square ? '1 / 1' : undefined,
        minHeight: wide ? 64 : (square ? undefined : 96),
        color: ink,
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        opacity: dimmed ? 0.55 : 1,
        animationDelay: `${index * 60}ms`,
        display: 'flex',
        flexDirection: wide ? 'row' : 'column',
        alignItems: wide ? 'center' : 'flex-start',
        gap: wide ? 14 : 0,
      }}
    >
      {badge && (
        <span style={{
          position: 'absolute', top: 8, right: 8, zIndex: 2,
          fontSize: 8, fontWeight: 900, letterSpacing: 0.5,
          background: 'rgba(255,255,255,.25)', padding: '3px 7px', borderRadius: 8,
        }}>
          {badge}
        </span>
      )}
      {children || (
        <>
          <div className="pp-bento-ico" style={{ lineHeight: 1, flexShrink: 0, display: 'flex' }}>{icon}</div>
          <div className="pp-bento-body" style={wide ? { flex: 1, minWidth: 0 } : { marginTop: 'auto', paddingTop: 10, minWidth: 0 }}>
            {/* hyphens = ÚLTIMO recurso: solo si aun con el margen
                reducido la palabra no cabe (lang="es" en index.html) */}
            <div style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 1.2, color: titleColor || 'inherit', hyphens: 'auto', overflowWrap: 'break-word' }}>
              {title}
            </div>
            {sub && (
              <div style={{ fontSize: 11.5, opacity: 0.9, marginTop: 3, lineHeight: 1.35, fontWeight: 500 }}>
                {sub}
              </div>
            )}
          </div>
          {wide && <div style={{ fontSize: 22, opacity: 0.85, flexShrink: 0, fontWeight: 700 }}>›</div>}
        </>
      )}
    </div>
  );
}
