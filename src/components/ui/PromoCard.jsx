// src/components/ui/PromoCard.jsx
// R1b.2 (D33) — Card de promoción compuesta por código (layout firmado
// por el dueño 18-jul):
//   · Arriba-izquierda:  título.
//   · Debajo del título: descripción (siempre alineada a la izquierda).
//   · Abajo-izquierda:   restricciones (condiciones + "Válido hasta"),
//                        SOLO en ratio 4:3 (vista PROMOCIONES).
//   · Media/inferior derecha: sujeto de la imagen (image_url de
//                        Storage, idealmente PNG recortado). Sin
//                        imagen → ícono emoji como fallback.
// Ratios: '4:3' (vista PROMOCIONES, toda la info) y '1:1' (cuadro del
// home, solo título + descripción + sujeto).

const fmtDate = (d) => {
  if (!d) return null;
  const [y, m, day] = String(d).slice(0, 10).split('-');
  return `${day}/${m}/${y}`;
};

export default function PromoCard({ promo, ratio = '4:3', style = {}, onClick }) {
  const sq = ratio === '1:1';
  const color = promo.color || '#fff';
  const validez = fmtDate(promo.valid_until);
  const hasRestricciones = !sq && (promo.conditions || validez);

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative', overflow: 'hidden',
        aspectRatio: sq ? '1 / 1' : '4 / 3',
        borderRadius: 20,
        background: promo.bg || 'linear-gradient(135deg,#E53935,#EF9A9A)',
        color,
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {/* brillo sutil, coherente con los tiles bento */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 18% 12%, rgba(255,255,255,.18), transparent 55%)', pointerEvents: 'none' }} />

      {/* Sujeto de la imagen — zona media/inferior derecha */}
      {promo.image_url ? (
        <img
          src={promo.image_url}
          alt=""
          style={{
            position: 'absolute', right: sq ? '4%' : '5%', bottom: sq ? '10%' : '8%',
            width: sq ? '52%' : '46%', height: sq ? '58%' : '68%',
            objectFit: 'contain', objectPosition: 'right bottom',
            pointerEvents: 'none',
            filter: 'drop-shadow(0 6px 14px rgba(0,0,0,.25))',
          }}
        />
      ) : promo.icon ? (
        <div style={{
          position: 'absolute', right: sq ? '7%' : '8%', bottom: sq ? '12%' : '12%',
          fontSize: sq ? 42 : 72, lineHeight: 1, pointerEvents: 'none',
          filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.25))',
        }}>{promo.icon}</div>
      ) : null}

      {/* Bloques de texto — columna izquierda */}
      <div style={{
        position: 'absolute', inset: 0,
        padding: sq ? '12px 12px 11px' : '18px 18px 16px',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left',
      }}>
        {/* Título (arriba-izquierda) */}
        <div style={{
          fontSize: sq ? 14 : 22, fontWeight: 900, lineHeight: 1.15,
          maxWidth: sq ? '78%' : '58%',
          textShadow: '0 1px 3px rgba(0,0,0,.18)',
        }}>
          {promo.title}
        </div>
        {/* Descripción (debajo del título, alineada a la izquierda) */}
        {promo.desc && (
          <div style={{
            marginTop: sq ? 3 : 6,
            fontSize: sq ? 10 : 13.5, fontWeight: 600, lineHeight: 1.3,
            opacity: 0.92, maxWidth: sq ? '72%' : '52%',
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: sq ? 2 : 3, WebkitBoxOrient: 'vertical',
          }}>
            {promo.desc}
          </div>
        )}

        {/* Restricciones (abajo-izquierda, solo 4:3) */}
        {hasRestricciones && (
          <div style={{ marginTop: 'auto', maxWidth: '55%' }}>
            {promo.conditions && (
              <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.85, lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {promo.conditions}
              </div>
            )}
            {validez && (
              <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.85, marginTop: promo.conditions ? 3 : 0 }}>
                Válido hasta {validez}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
