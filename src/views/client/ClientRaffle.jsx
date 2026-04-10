// src/views/client/ClientRaffle.jsx
import { sMono, clientTheme } from '../../constants/styles';
import GalaxyDust from '../../components/ui/GalaxyDust';

export default function ClientRaffle(ctx) {
  const { me, gT, cfg, cTier, TH, raffleCal, rafData, buyTickets, curMonth } = ctx;
  if (!me) return null;

  const rm  = raffleCal[curMonth] || { m: 'Mes', p: '🎁 Premio', v: 'Q0' };
  const rd  = rafData[curMonth]   || { participants: [] };

  const myEntry    = rd.participants.find(p => p.cid === me.id);
  const myTickets  = myEntry?.tickets || 0;
  const totalTickets = rd.participants.reduce((s, p) => s + p.tickets, 0);
  const myOdds     = totalTickets > 0 ? ((myTickets / totalTickets) * 100).toFixed(1) : '0.0';

  const isDark  = cTier.name === 'BLACK';
  const textCol = isDark ? '#fff' : '#0D0D0D';
  const subCol  = isDark ? 'rgba(255,255,255,.5)' : '#9E9E9E';

  return (
    <div style={{ paddingBottom: 100 }}>

      {/* ── Premio del mes ── */}
      <div style={{
        margin: '16px 20px', padding: '24px 20px', borderRadius: 22,
        position: 'relative', overflow: 'hidden',
        background: isDark
          ? 'radial-gradient(ellipse at 20% 30%, #0d0d1a 0%, #050508 60%, #000 100%)'
          : 'linear-gradient(135deg,#FBBC04,#FFD540)',
        color: isDark ? '#fff' : '#0D0D0D',
        boxShadow: isDark ? '0 8px 32px rgba(0,0,0,.6)' : '0 8px 32px rgba(251,188,4,.35)',
      }}>
        {isDark && <GalaxyDust n={20} />}
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', opacity: .6, marginBottom: 8 }}>
            Premio de {rm.m}
          </div>
          <div style={{ fontSize: 52, marginBottom: 8 }}>{rm.p?.split(' ')[0]}</div>
          <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 4 }}>
            {rm.p?.replace(/^[^\s]+\s/, '')}
          </div>
          <div style={{ fontSize: 13, opacity: .65, marginBottom: 20 }}>{rm.v}</div>

          {/* Stats */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 32 }}>
            <div>
              <div style={{ ...sMono, fontSize: 32, fontWeight: 900, color: isDark ? '#FFD54F' : '#0D0D0D' }}>
                {myTickets}
              </div>
              <div style={{ fontSize: 10, opacity: .6, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                Mis boletos
              </div>
            </div>
            <div style={{ width: 1, background: isDark ? 'rgba(255,255,255,.15)' : 'rgba(0,0,0,.15)' }} />
            <div>
              <div style={{ ...sMono, fontSize: 32, fontWeight: 900 }}>{totalTickets}</div>
              <div style={{ fontSize: 10, opacity: .6, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                Total
              </div>
            </div>
            {myTickets > 0 && (
              <>
                <div style={{ width: 1, background: isDark ? 'rgba(255,255,255,.15)' : 'rgba(0,0,0,.15)' }} />
                <div>
                  <div style={{ ...sMono, fontSize: 32, fontWeight: 900, color: isDark ? '#69F0AE' : '#2E7D32' }}>
                    {myOdds}%
                  </div>
                  <div style={{ fontSize: 10, opacity: .6, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                    Probabilidad
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Comprar boletos ── */}
      <div style={{ padding: '0 20px', marginBottom: 20 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 10, padding: '10px 16px', borderRadius: 12,
          background: isDark ? 'rgba(255,255,255,.06)' : '#F5F5F5',
        }}>
          <span style={{ fontSize: 12, color: subCol, fontWeight: 600 }}>Tus puntos</span>
          <span style={{ ...sMono, fontSize: 18, fontWeight: 800, color: isDark ? '#FFD54F' : TH.pri }}>
            {me.points}
          </span>
          <span style={{ fontSize: 11, color: subCol, fontWeight: 600 }}>
            {cfg.ticketPts} pts/boleto
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[1, 3, 5, 10].map(n => {
            const canBuy = me.points >= n * cfg.ticketPts;
            return (
              <button key={n} onClick={() => buyTickets(n)} disabled={!canBuy} style={{
                flex: 1, padding: 14, borderRadius: 14,
                border: `2px solid ${canBuy ? '#FBBC04' : '#E0E0E0'}`,
                background: canBuy ? '#FFF8E1' : (isDark ? 'rgba(255,255,255,.04)' : '#F5F5F5'),
                fontFamily: "'DM Sans'", fontSize: 16, fontWeight: 900,
                cursor: canBuy ? 'pointer' : 'default',
                color: canBuy ? '#F0A500' : '#BDBDBD',
                opacity: canBuy ? 1 : .5,
              }}>
                {n}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: subCol, textAlign: 'center', marginTop: 8 }}>
          Tocá para comprar boletos
        </div>
      </div>

      {/* ── Participantes ── */}
      <div style={{ padding: '0 20px' }}>
        <div style={{
          fontSize: 11, fontWeight: 800, color: '#BDBDBD',
          textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12,
        }}>
          Participantes ({rd.participants.length})
        </div>

        {rd.participants.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: subCol, fontSize: 13 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎟️</div>
            Aún no hay participantes este mes.<br />¡Sé el primero!
          </div>
        ) : (
          <div style={{
            background: isDark ? 'rgba(255,255,255,.04)' : '#fff',
            borderRadius: 16,
            border: `1px solid ${isDark ? 'rgba(255,255,255,.08)' : '#eee'}`,
            overflow: 'hidden',
          }}>
            {rd.participants
              .slice()
              .sort((a, b) => b.tickets - a.tickets)
              .map((p, i, arr) => {
                const isMe = p.cid === me.id;
                const odds = totalTickets > 0 ? ((p.tickets / totalTickets) * 100).toFixed(1) : '0';
                return (
                  <div key={p.cid} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px',
                    borderBottom: i < arr.length - 1 ? `1px solid ${isDark ? 'rgba(255,255,255,.06)' : '#F5F5F5'}` : 'none',
                    background: isMe ? (isDark ? 'rgba(255,213,79,.06)' : '#FFFDE7') : 'transparent',
                  }}>
                    {/* Posición */}
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: i === 0 ? '#FFD54F' : i === 1 ? '#E0E0E0' : i === 2 ? '#FFAB40' : (isDark ? 'rgba(255,255,255,.08)' : '#F5F5F5'),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 900,
                      color: i < 3 ? '#0D0D0D' : subCol,
                    }}>
                      {i + 1}
                    </div>
                    {/* Nombre */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: isMe ? 900 : 700,
                        color: isMe ? (isDark ? '#FFD54F' : '#F0A500') : textCol,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {p.name} {isMe && '← Tú'}
                      </div>
                      <div style={{ fontSize: 10, color: subCol, marginTop: 1 }}>
                        {odds}% probabilidad
                      </div>
                    </div>
                    {/* Boletos */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ ...sMono, fontSize: 15, fontWeight: 800, color: textCol }}>
                        {p.tickets}
                      </div>
                      <div style={{ fontSize: 9, color: subCol, fontWeight: 700 }}>BOLETOS</div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* ── Premios del año ── */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#BDBDBD', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>
          Premios del año
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {raffleCal.map((r, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
              borderRadius: 12,
              background: i === curMonth
                ? (isDark ? 'rgba(255,213,79,.1)' : '#FFF8E1')
                : (isDark ? 'rgba(255,255,255,.04)' : '#F9F9F9'),
              border: i === curMonth
                ? `1px solid ${isDark ? 'rgba(255,213,79,.3)' : '#FFE082'}`
                : `1px solid transparent`,
            }}>
              <div style={{ fontSize: 22, flexShrink: 0 }}>{r.p?.split(' ')[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: textCol }}>{r.p?.replace(/^[^\s]+\s/, '')}</div>
                <div style={{ fontSize: 10, color: subCol }}>{r.m}</div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 800, color: isDark ? '#FFD54F' : '#F0A500' }}>{r.v}</div>
              {i === curMonth && (
                <div style={{ fontSize: 9, fontWeight: 800, color: isDark ? '#FFD54F' : '#F0A500', background: isDark ? 'rgba(255,213,79,.15)' : '#FFF8E1', padding: '2px 8px', borderRadius: 6 }}>
                  ACTIVO
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
