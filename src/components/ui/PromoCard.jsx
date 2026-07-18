// src/components/ui/PromoCard.jsx
// R1b.2 (D33) — Card de promoción compuesta por código (layout firmado
// por el dueño 18-jul):
//   · Arriba-izquierda:  título.
//   · Debajo del título: descripción (siempre alineada a la izquierda).
//   · Abajo-izquierda:   restricciones (condiciones + "Válido hasta"),
//                        solo en la card vertical de la vista PROMOCIONES.
//   · Media/inferior derecha: sujeto de la imagen (image_url de
//                        Storage, idealmente PNG recortado). Sin
//                        imagen → ícono emoji como fallback.
// Ratios: '3:4' (vertical, vista PROMOCIONES en grid de 2 columnas
// como la referencia — toda la info) y '1:1' (cuadro del home, solo
// título + descripción + sujeto).

const fmtDate = (d) => {
  if (!d) return null;
  const [y, m, day] = String(d).slice(0, 10).split('-');
  return `${day}/${m}/${y}`;
};

// Métricas por ratio: la 3:4 es angosta (media pantalla) y alta, así
// que el texto usa casi todo el ancho y el sujeto vive en la franja
// media; la 1:1 es compacta.
const CFG = {
  '3:4': {
    aspect: '3 / 4', pad: '14px 14px 13px',
    title: 17, titleMax: '94%', desc: 12, descMax: '88%', descLines: 3,
    img: { right: '4%', bottom: '17%', w: '64%', h: '42%' },
    icon: 52, iconPos: { right: '8%', bottom: '20%' },
    restricciones: true,
  },
  '1:1': {
    aspect: '1 / 1', pad: '12px 12px 11px',
    title: 14, titleMax: '78%', desc: 10, descMax: '72%', descLines: 2,
    img: { right: '4%', bottom: '10%', w: '52%', h: '58%' },
    icon: 42, iconPos: { right: '7%', bottom: '12%' },
    restricciones: false,
  },
};

export default function PromoCard({ promo, ratio = '3:4', style = {}, onClick }) {
  const c = CFG[ratio] || CFG['3:4'];
  const color = promo.color || '#fff';
  const validez = fmtDate(promo.valid_until);
  const hasRestricciones = c.restricciones && (promo.conditions || validez);

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative', overflow: 'hidden',
        aspectRatio: c.aspect,
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
            position: 'absolute', right: c.img.right, bottom: c.img.bottom,
            width: c.img.w, height: c.img.h,
            objectFit: 'contain', objectPosition: 'right bottom',
            pointerEvents: 'none',
            filter: 'drop-shadow(0 6px 14px rgba(0,0,0,.25))',
          }}
        />
      ) : promo.icon ? (
        <div style={{
          position: 'absolute', right: c.iconPos.right, bottom: c.iconPos.bottom,
          fontSize: c.icon, lineHeight: 1, pointerEvents: 'none',
          filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.25))',
        }}>{promo.icon}</div>
      ) : null}

      {/* Bloques de texto — columna izquierda */}
      <div style={{
        position: 'absolute', inset: 0,
        padding: c.pad,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left',
      }}>
        {/* Título (arriba-izquierda) */}
        <div style={{
          fontSize: c.title, fontWeight: 900, lineHeight: 1.15,
          maxWidth: c.titleMax,
          textShadow: '0 1px 3px rgba(0,0,0,.18)',
        }}>
          {promo.title}
        </div>
        {/* Descripción (debajo del título, alineada a la izquierda) */}
        {promo.desc && (
          <div style={{
            marginTop: 4,
            fontSize: c.desc, fontWeight: 600, lineHeight: 1.3,
            opacity: 0.92, maxWidth: c.descMax,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: c.descLines, WebkitBoxOrient: 'vertical',
          }}>
            {promo.desc}
          </div>
        )}

        {/* Restricciones (abajo-izquierda, solo card vertical) */}
        {hasRestricciones && (
          <div style={{ marginTop: 'auto', maxWidth: '85%' }}>
            {promo.conditions && (
              <div style={{ fontSize: 10.5, fontWeight: 600, opacity: 0.85, lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {promo.conditions}
              </div>
            )}
            {validez && (
              <div style={{ fontSize: 10.5, fontWeight: 700, opacity: 0.85, marginTop: promo.conditions ? 3 : 0 }}>
                Válido hasta {validez}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
