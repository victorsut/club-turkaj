// src/components/ui/BentoTile.jsx
// R1b — Tile del bento grid del home (referencia visual): degradado
// saturado + brillo radial sutil, icono SVG blanco, título uppercase,
// subtítulo corto. Entrada con stagger (animationDelay por índice) y
// press-scale vía .pp-tile. `icon` acepta un nodo (BentoIcons) o texto.
import { bento } from '../../constants/styles';

export default function BentoTile({
  color, icon, title, sub, onClick,
  dimmed = false, badge = null, span = 1, index = 0,
  children,
}) {
  const wide = span === 2;
  return (
    <div
      onClick={onClick}
      className="pp-tile"
      style={{
        gridColumn: wide ? '1 / -1' : 'auto',
        background: color,
        borderRadius: bento.radius,
        padding: wide ? '12px 16px' : '13px 14px 12px',
        minHeight: wide ? 64 : 106,
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        opacity: dimmed ? 0.55 : 1,
        boxShadow: bento.shadow,
        animationDelay: `${index * 60}ms`,
        display: 'flex',
        flexDirection: wide ? 'row' : 'column',
        alignItems: wide ? 'center' : 'flex-start',
        gap: wide ? 12 : 0,
      }}
    >
      {/* Brillo radial sutil (profundidad del degradado de la referencia) */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 18% 12%, rgba(255,255,255,.22), transparent 55%)', pointerEvents: 'none' }} />
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
          <div style={{ lineHeight: 1, flexShrink: 0, display: 'flex' }}>{icon}</div>
          <div style={wide ? { flex: 1, minWidth: 0 } : { marginTop: 'auto', paddingTop: 8 }}>
            <div style={{ fontSize: 12.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.7, lineHeight: 1.2 }}>
              {title}
            </div>
            {sub && (
              <div style={{ fontSize: 10.5, opacity: 0.85, marginTop: 2, lineHeight: 1.3, fontWeight: 600 }}>
                {sub}
              </div>
            )}
          </div>
          {wide && <div style={{ fontSize: 20, opacity: 0.7, flexShrink: 0 }}>›</div>}
        </>
      )}
    </div>
  );
}
