// src/views/client/raffle/RafflePrizeCarousel.jsx
// Rifa (4-sep-2026, pedido del dueño): el cambio de MES usa la misma
// animación que el cambio de vehículo — carrusel de tarjetas de premio
// (una por mes del año en curso hasta el actual) que sigue al dedo y
// encaja con rebote; la activa a escala completa, las vecinas atrás y
// atenuadas; puntos abajo para saltar a un mes. Cada tarjeta trae el
// premio del mes, el resultado del sorteo y mis boletos / total.
import { useLayoutEffect, useRef, useState } from 'react';
import { bento, BRAND_ORANGE } from '../../../constants/styles';
import { SNAP_EASE } from '../../../hooks/useSwipeTrack';
import { rewardIconFor } from '../../../components/ui/RewardIcon';

export default function RafflePrizeCarousel({
  months, rafData, me, curMonth, idx, swipe, dark, colors, winnerNameFor,
}) {
  const { headerTxt, subTxt, surface, rowLine, good } = colors;
  // La altura del carril SIGUE a la tarjeta activa (los meses pasados
  // llevan el chip del sorteo y son más altos): sin esto el mes en curso
  // dejaba un hueco bajo su tarjeta. Se mide al cambiar de mes y la
  // altura transiciona con la misma curva del encaje.
  const slideRefs = useRef([]);
  const [h, setH] = useState(null);
  useLayoutEffect(() => {
    const el = slideRefs.current[idx];
    if (el) setH(el.offsetHeight);
  }, [idx, months, rafData]);
  return (
    <>
      <div {...swipe.handlers} style={{ ...swipe.viewportStyle, margin: '0 16px 4px', height: h ?? 'auto', transition: `height .42s ${SNAP_EASE}` }}>
        <div ref={swipe.trackRef} style={{ ...swipe.trackStyle, alignItems: 'flex-start' }}>
          {months.map((rm, i) => {
            const parts = rafData[i]?.participants || [];
            const myTickets = parts.find(p => p.cid === me.id)?.tickets || 0;
            const totalTickets = parts.reduce((s, p) => s + p.tickets, 0);
            const winnerName = winnerNameFor(rm, parts);
            const PrizeIcon = rewardIconFor({ name: rm.name || '', icon: rm.icon || '' });
            return (
              <div key={i} ref={el => { slideRefs.current[i] = el; }} style={swipe.slideStyle(i)}>
                <div style={{ padding: '16px 16px 12px', borderRadius: 20, background: surface, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: subTxt, marginBottom: 10 }}>
                    Premio de {rm.m}
                  </div>
                  {rm.img ? (
                    <img src={rm.img} alt={rm.name || 'Premio'} draggable={false} style={{
                      width: '100%', maxWidth: 220, aspectRatio: '4 / 3', objectFit: 'cover',
                      borderRadius: 14, margin: '0 auto 10px', display: 'block',
                    }} />
                  ) : (
                    <div style={{
                      width: 56, height: 56, borderRadius: 16, margin: '0 auto 10px',
                      background: bento.red, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <div style={{ transform: 'scale(1.4)', lineHeight: 0 }}><PrizeIcon /></div>
                    </div>
                  )}
                  <div style={{ fontSize: 17, fontWeight: 800, color: headerTxt, lineHeight: 1.25 }}>
                    {rm.name || 'Premio por anunciar'}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: subTxt, marginTop: 2 }}>
                    Valorado en {rm.v}
                  </div>

                  {/* Resultado del sorteo (meses anteriores) */}
                  {i !== curMonth && (
                    winnerName ? (
                      <div style={{
                        display: 'inline-block', marginTop: 10, padding: '7px 14px', borderRadius: 12,
                        background: dark ? 'rgba(30,122,51,.25)' : 'rgba(30,122,51,.12)',
                        fontSize: 12.5, fontWeight: 800, color: good,
                      }}>
                        GANADOR · {winnerName}
                      </div>
                    ) : (
                      <div style={{
                        display: 'inline-block', marginTop: 10, padding: '7px 14px', borderRadius: 12,
                        background: dark ? 'rgba(255,255,255,.06)' : '#F5F5F7',
                        fontSize: 12, fontWeight: 700, color: subTxt,
                      }}>
                        {totalTickets > 0 ? 'Sorteo pendiente' : 'Sin participantes este mes'}
                      </div>
                    )
                  )}

                  {/* Mis boletos / Total — integrados a la tarjeta del premio */}
                  <div style={{ display: 'flex', marginTop: 14, paddingTop: 12, borderTop: `1px solid ${rowLine}` }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 24, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: BRAND_ORANGE }}>{myTickets}</div>
                      <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: subTxt, marginTop: 1 }}>Mis boletos</div>
                    </div>
                    <div style={{ width: 1, background: rowLine }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 24, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: headerTxt }}>{totalTickets}</div>
                      <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: subTxt, marginTop: 1 }}>Total del mes</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* puntos: un mes por punto (mismo trazo que los del carrusel de vehículos) */}
      {months.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, margin: '6px 0 10px' }}>
          {months.map((rm, i) => (
            <button key={i} onClick={() => swipe.go(i)} aria-label={rm.m} style={{
              width: i === idx ? 20 : 7, height: 7, borderRadius: 4, border: 'none', padding: 0, cursor: 'pointer',
              background: i === idx ? BRAND_ORANGE : (dark ? 'rgba(255,255,255,.25)' : '#D5D5D8'),
              transition: 'width .25s ease',
            }} />
          ))}
        </div>
      )}
    </>
  );
}
