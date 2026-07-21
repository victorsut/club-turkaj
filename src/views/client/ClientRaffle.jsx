// src/views/client/ClientRaffle.jsx
// R1b.4 — Pestaña RIFA con FORMATO GENERAL (estructura original:
// premio → boletos → participantes), ahora con:
//   · Navegación a meses anteriores (‹ ›): premio del mes y GANADOR.
//   · Imagen real del premio (raffle_calendar.prize_image_url) con
//     fallback al ícono SVG adecuado (rewardIconFor).
//   · MIS BOLETOS = comprados por mí en el mes; TOTAL = de todos.
//   · Participantes en orden ALEATORIO, salvo yo siempre primero.
// El sorteo es automático al cierre del mes (draw_due_raffles, ponderado
// por boletos); acá solo se muestra el resultado.
import { useState, useMemo } from 'react';
import { bento, BRAND_RED } from '../../constants/styles';
import { Back, Chev, TicketStar } from '../../components/ui/Icons';
import { rewardIconFor } from '../../components/ui/RewardIcon';

const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export default function ClientRaffle(ctx) {
  const { me, cfg, cTier, raffleCal, rafData, buyTickets, curMonth, custs } = ctx;
  const [viewMonth, setViewMonth] = useState(curMonth);

  const parts = rafData[viewMonth]?.participants || [];
  // Orden aleatorio con "yo" siempre en la primera fila. Se rebaraja
  // solo al cambiar de mes o de datos (no en cada render).
  const ordered = useMemo(() => {
    const mine = parts.filter(p => p.cid === me?.id);
    return [...mine, ...shuffle(parts.filter(p => p.cid !== me?.id))];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMonth, rafData, me?.id]);

  if (!me) return null;

  const rm = raffleCal[viewMonth] || { m: 'Mes', name: null, icon: null, img: null, v: 'Q0', winnerId: null };
  const isCurrent = viewMonth === curMonth;
  const isBlack = cTier?.name === 'BLACK';

  const headerTxt = isBlack ? '#fff' : '#0D0D0D';
  const subTxt = isBlack ? 'rgba(255,255,255,.55)' : '#6E6E73';
  const surface = isBlack ? 'rgba(255,255,255,.06)' : '#fff';
  const rowLine = isBlack ? 'rgba(255,255,255,.08)' : '#F0F0F0';
  const good = isBlack ? '#7CD98F' : bento.green;

  const myTickets = parts.find(p => p.cid === me.id)?.tickets || 0;
  const totalTickets = parts.reduce((s, p) => s + p.tickets, 0);
  const winnerName = rm.winnerId
    ? ((custs || []).find(c => c.id === rm.winnerId)?.name || 'Ganador')
    : null;
  const PrizeIcon = rewardIconFor({ name: rm.name || '', icon: rm.icon || '' });

  // Chevrons de navegación: sin caja (solo el glifo), rojos cuando hay
  // a dónde ir — se leen como control, no como cuadro de información.
  const navBtn = (enabled) => ({
    width: 38, height: 38, border: 'none', background: 'none', padding: 0,
    color: enabled ? BRAND_RED : (isBlack ? 'rgba(255,255,255,.2)' : '#C7C7CC'),
    cursor: enabled ? 'pointer' : 'default',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  });

  return (
    <div style={{ paddingBottom: 100, minHeight: '100vh', background: isBlack ? 'transparent' : bento.pageBg }}>

      {/* Header compacto: navegación de meses integrada al título */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '14px 12px 10px' }}>
        <button onClick={() => viewMonth > 0 && setViewMonth(viewMonth - 1)} aria-label="Mes anterior" style={navBtn(viewMonth > 0)}>
          <Back />
        </button>
        <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: headerTxt }}>Rifa Mensual</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: subTxt, marginTop: 1 }}>
            {rm.m} {rm.year || ''} · sorteo al cierre del mes
          </div>
        </div>
        <button onClick={() => viewMonth < curMonth && setViewMonth(viewMonth + 1)} aria-label="Mes siguiente" style={navBtn(viewMonth < curMonth)}>
          <Chev />
        </button>
      </div>

      {/* ── Premio del mes + mis boletos/total (una sola tarjeta de
          información — los números NO son botones) ── */}
      <div style={{ margin: '0 16px 10px', padding: '16px 16px 12px', borderRadius: 20, background: surface, textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: subTxt, marginBottom: 10 }}>
          Premio de {rm.m}
        </div>
        {rm.img ? (
          <img src={rm.img} alt={rm.name || 'Premio'} style={{
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
        {!isCurrent && (
          winnerName ? (
            <div style={{
              display: 'inline-block', marginTop: 10, padding: '7px 14px', borderRadius: 12,
              background: isBlack ? 'rgba(30,122,51,.25)' : 'rgba(30,122,51,.12)',
              fontSize: 12.5, fontWeight: 800, color: good,
            }}>
              GANADOR · {winnerName}
            </div>
          ) : (
            <div style={{
              display: 'inline-block', marginTop: 10, padding: '7px 14px', borderRadius: 12,
              background: isBlack ? 'rgba(255,255,255,.06)' : '#F5F5F7',
              fontSize: 12, fontWeight: 700, color: subTxt,
            }}>
              {totalTickets > 0 ? 'Sorteo pendiente' : 'Sin participantes este mes'}
            </div>
          )
        )}

        {/* Mis boletos / Total — integrados a la tarjeta del premio */}
        <div style={{
          display: 'flex', marginTop: 14, paddingTop: 12,
          borderTop: `1px solid ${rowLine}`,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 24, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: BRAND_RED }}>{myTickets}</div>
            <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: subTxt, marginTop: 1 }}>Mis boletos</div>
          </div>
          <div style={{ width: 1, background: rowLine }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 24, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: headerTxt }}>{totalTickets}</div>
            <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: subTxt, marginTop: 1 }}>Total del mes</div>
          </div>
        </div>
      </div>

      {/* ── Comprar boletos (solo mes en curso) — UNA tarjeta; los
          botones son ROJOS sólidos para diferenciarse de la info ── */}
      {isCurrent && (
        <div style={{ margin: '0 16px 14px', padding: '12px 14px', borderRadius: 20, background: surface }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: subTxt, fontWeight: 600 }}>Tus puntos</span>
            <span style={{ fontSize: 15, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: headerTxt }}>{me.points}</span>
            <span style={{ fontSize: 11, color: subTxt, fontWeight: 600 }}>{cfg.ticketPts} pts/boleto</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 3, 5, 10].map(n => {
              const canBuy = me.points >= n * cfg.ticketPts;
              return (
                <button key={n} onClick={() => canBuy && buyTickets(n)} disabled={!canBuy} style={{
                  flex: 1, padding: '12px 0', borderRadius: 12, border: 'none',
                  background: canBuy ? BRAND_RED : (isBlack ? 'rgba(255,255,255,.05)' : '#ECECEE'),
                  fontFamily: "'DM Sans'", fontSize: 15, fontWeight: 800,
                  fontVariantNumeric: 'tabular-nums',
                  cursor: canBuy ? 'pointer' : 'default',
                  color: canBuy ? '#fff' : (isBlack ? 'rgba(255,255,255,.25)' : '#BDBDBD'),
                }}>+{n}</button>
              );
            })}
          </div>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: subTxt, textAlign: 'center', marginTop: 8 }}>
            Tocá para comprar boletos · más boletos, más posibilidades
          </div>
        </div>
      )}

      {/* ── Participantes (orden aleatorio, yo primero) ── */}
      <div style={{ padding: '0 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: subTxt, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>
          Participantes ({parts.length})
        </div>
        {parts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: subTxt }}>
            <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
              <TicketStar />
            </div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>
              {isCurrent ? <>Aún no hay participantes este mes.<br />¡Sé el primero!</> : 'No hubo participantes este mes'}
            </div>
          </div>
        ) : (
          <div style={{ background: surface, borderRadius: 16, overflow: 'hidden' }}>
            {ordered.map((p, i, arr) => {
              const isMe = p.cid === me.id;
              const isWinner = rm.winnerId && p.cid === rm.winnerId;
              return (
                <div key={p.cid} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  borderBottom: i < arr.length - 1 ? `1px solid ${rowLine}` : 'none',
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                    background: isMe ? BRAND_RED : (isBlack ? 'rgba(255,255,255,.1)' : '#E5E5EA'),
                    color: isMe ? '#fff' : subTxt,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 800,
                  }}>
                    {(p.name || '?').trim().charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 13, fontWeight: isMe ? 800 : 700,
                      color: isMe ? BRAND_RED : (isBlack ? '#E0E0E0' : '#0D0D0D'),
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {p.name}{isMe ? ' (Tú)' : ''}
                    </span>
                    {isWinner && (
                      <span style={{
                        flexShrink: 0, padding: '2px 8px', borderRadius: 8,
                        background: isBlack ? 'rgba(30,122,51,.25)' : 'rgba(30,122,51,.12)',
                        fontSize: 9, fontWeight: 800, letterSpacing: 0.5, color: good,
                      }}>
                        GANADOR
                      </span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: headerTxt }}>{p.tickets}</div>
                    <div style={{ fontSize: 9, color: subTxt, fontWeight: 700, letterSpacing: 0.5 }}>BOLETOS</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
