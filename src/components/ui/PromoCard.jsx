// src/components/ui/PromoCard.jsx
// R1b.2 (D33) — Card de promoción compuesta por código (layout firmado
// por el dueño 18-jul, ajuste 2):
//   · La imagen subida (900×1200 px, 3:4) es el FONDO COMPLETO de la
//     card (object-fit cover; en la 1:1 del home se recorta centrada).
//     Sin imagen → degradado + ícono emoji como fallback.
//   · Los textos van ENCIMA de la imagen: título arriba-izquierda,
//     descripción debajo, restricciones (condiciones + "Válido hasta")
//     abajo-izquierda solo en la card vertical.
//   · Los tres campos respetan los SALTOS DE LÍNEA manuales del admin
//     (white-space: pre-line) para no tapar el arte de la imagen — el
//     admin acomoda el texto con Enter y lo ve en el preview en vivo.
// Ratios: '3:4' (vertical, vista PROMOCIONES en grid de 2 columnas)
// y '1:1' (cuadro del home: solo título + descripción).

const fmtDate = (d) => {
  if (!d) return null;
  const [y, m, day] = String(d).slice(0, 10).split('-');
  return `${day}/${m}/${y}`;
};

// Métricas por ratio.
const CFG = {
  '3:4': {
    aspect: '3 / 4', pad: '14px 14px 13px',
    title: 17, desc: 12,
    icon: 52, iconPos: { right: '8%', bottom: '20%' },
    restricciones: true,
  },
  '1:1': {
    aspect: '1 / 1', pad: '12px 12px 11px',
    title: 14, desc: 10,
    icon: 42, iconPos: { right: '7%', bottom: '12%' },
    restricciones: false,
  },
};

export default function PromoCard({ promo, ratio = '3:4', style = {}, onClick }) {
  const c = CFG[ratio] || CFG['3:4'];
  const color = promo.color || '#fff';
  // Color individual por bloque (text_colors jsonb) con fallback al
  // color general — permite convivir con zonas claras/oscuras del arte.
  const blockColor = (block) => promo.text_colors?.[block] || color;
  const validez = fmtDate(promo.valid_until);
  const hasRestricciones = c.restricciones && (promo.conditions || validez);
  const hasImage = !!promo.image_url;

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
      {/* Imagen de fondo completa (900×1200 = 3:4 exacto; en 1:1 se
          recorta centrada). El degradado queda debajo por si tarda. */}
      {hasImage && (
        <img
          src={promo.image_url}
          alt=""
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Sin imagen: brillo sutil bento + ícono emoji como sujeto */}
      {!hasImage && (
        <>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 18% 12%, rgba(255,255,255,.18), transparent 55%)', pointerEvents: 'none' }} />
          {promo.icon && (
            <div style={{
              position: 'absolute', right: c.iconPos.right, bottom: c.iconPos.bottom,
              fontSize: c.icon, lineHeight: 1, pointerEvents: 'none',
              filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.25))',
            }}>{promo.icon}</div>
          )}
        </>
      )}

      {/* Bloques de texto — encima de la imagen, saltos de línea del
          admin respetados (pre-line) para no tapar el arte */}
      <div style={{
        position: 'absolute', inset: 0,
        padding: c.pad,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left',
      }}>
        {/* Título (arriba-izquierda) */}
        <div style={{
          fontSize: c.title, fontWeight: 900, lineHeight: 1.15,
          whiteSpace: 'pre-line', color: blockColor('title'),
          textShadow: '0 1px 3px rgba(0,0,0,.18)',
        }}>
          {promo.title}
        </div>
        {/* Descripción (debajo del título, alineada a la izquierda) */}
        {promo.desc && (
          <div style={{
            marginTop: 4,
            fontSize: c.desc, fontWeight: 600, lineHeight: 1.3,
            opacity: 0.92, whiteSpace: 'pre-line', color: blockColor('desc'),
            textShadow: '0 1px 3px rgba(0,0,0,.15)',
          }}>
            {promo.desc}
          </div>
        )}

        {/* Restricciones (abajo-izquierda, solo card vertical) */}
        {hasRestricciones && (
          <div style={{ marginTop: 'auto', color: blockColor('conditions') }}>
            {promo.conditions && (
              <div style={{ fontSize: 10.5, fontWeight: 600, opacity: 0.9, lineHeight: 1.35, whiteSpace: 'pre-line', textShadow: '0 1px 3px rgba(0,0,0,.15)' }}>
                {promo.conditions}
              </div>
            )}
            {validez && (
              <div style={{ fontSize: 10.5, fontWeight: 700, opacity: 0.9, marginTop: promo.conditions ? 3 : 0, textShadow: '0 1px 3px rgba(0,0,0,.15)' }}>
                Válido hasta {validez}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
