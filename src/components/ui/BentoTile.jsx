// src/components/ui/BentoTile.jsx
// R1b — Tile del bento grid del home (referencia visual): color
// saturado, icono, título uppercase, subtítulo corto. Entrada con
// stagger (animationDelay por índice) y press-scale vía .pp-tile.
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
        padding: wide ? '16px 18px' : '16px 16px 14px',
        minHeight: wide ? 84 : 128,
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
        gap: wide ? 14 : 0,
      }}
    >
      {badge && (
        <span style={{
          position: 'absolute', top: 10, right: 10, zIndex: 2,
          fontSize: 8.5, fontWeight: 900, letterSpacing: 0.5,
          background: 'rgba(255,255,255,.25)', padding: '3px 8px', borderRadius: 8,
        }}>
          {badge}
        </span>
      )}
      {children || (
        <>
          <div style={{ fontSize: 30, lineHeight: 1, flexShrink: 0 }}>{icon}</div>
          <div style={wide ? { flex: 1, minWidth: 0 } : { marginTop: 'auto', paddingTop: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.8, lineHeight: 1.2 }}>
              {title}
            </div>
            {sub && (
              <div style={{ fontSize: 11, opacity: 0.85, marginTop: 3, lineHeight: 1.35, fontWeight: 600 }}>
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
