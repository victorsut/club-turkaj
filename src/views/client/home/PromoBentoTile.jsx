// src/views/client/home/PromoBentoTile.jsx
// Cuadro 1 del bento (R1b.2/D33): card 1:1 compuesta del carrusel de
// promociones. Tap → ventana PROMOCIONES; arrastre horizontal DENTRO
// del cuadro → cambia el carrusel (un swipe no navega). Extraído
// VERBATIM de ClientHome (división 14-ago).
import { useRef } from 'react';
import { bento } from '../../../constants/styles';
import PromoCard from '../../../components/ui/PromoCard';
import { GiftIcon } from '../../../components/ui/BentoIcons';

export default function PromoBentoTile({ activePromos, promoIdx, setPromoIdx, onOpen }) {
  // R1b.2: tracking del arrastre del carrusel de promos (un swipe
  // horizontal cambia la card; un tap navega a la ventana PROMOCIONES).
  const promoTouchRef = useRef(null);
  const promoSwipedRef = useRef(false);

  return (
    <div
      className="pp-tile"
      onTouchStart={(e) => {
        promoTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        promoSwipedRef.current = false;
      }}
      onTouchEnd={(e) => {
        const t = promoTouchRef.current;
        if (!t || activePromos.length < 2) return;
        const dx = e.changedTouches[0].clientX - t.x;
        const dy = e.changedTouches[0].clientY - t.y;
        if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) {
          promoSwipedRef.current = true;
          setPromoIdx(i => (i + (dx < 0 ? 1 : -1) + activePromos.length) % activePromos.length);
        }
      }}
      onClick={(e) => {
        // Un arrastre no navega: solo cambia la card visible.
        if (promoSwipedRef.current) { promoSwipedRef.current = false; return; }
        onOpen(e);
      }}
      style={{
        background: bento.red, borderRadius: bento.radius, aspectRatio: '1 / 1',
        position: 'relative', overflow: 'hidden',
        cursor: 'pointer', color: '#fff', animationDelay: '0ms',
        touchAction: 'pan-y',
      }}
    >
      {activePromos.length === 0 ? (
        <div style={{ position: 'absolute', inset: 0, padding: '15px 16px 14px', display: 'flex', flexDirection: 'column' }}>
          <GiftIcon />
          <div style={{ marginTop: 'auto', paddingTop: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>Promociones</div>
            <div style={{ fontSize: 11.5, opacity: 0.9, marginTop: 3, fontWeight: 500 }}>Descubre ofertas exclusivas</div>
          </div>
        </div>
      ) : (
        <>
          {activePromos.map((p, i) => (
            <PromoCard
              key={p.id}
              promo={p}
              ratio="1:1"
              style={{
                position: 'absolute', inset: 0, aspectRatio: 'auto', borderRadius: 0,
                opacity: i === promoIdx ? 1 : 0, transition: 'opacity .5s ease',
                pointerEvents: 'none',
              }}
            />
          ))}
          {activePromos.length > 1 && (
            <div style={{ position: 'absolute', bottom: 7, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 4 }}>
              {activePromos.map((_, i) => (
                <div key={i} style={{ width: i === promoIdx ? 14 : 5, height: 5, borderRadius: 3, background: '#fff', opacity: i === promoIdx ? 0.95 : 0.45, transition: 'all .3s' }} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
