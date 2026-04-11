// src/views/client/ClientRaffle.jsx
import { sMono } from '../../constants/styles';
import GalaxyDust from '../../components/ui/GalaxyDust';

export default function ClientRaffle(ctx) {
  const { me, gT, cfg, cTier, TH, raffleCal, rafData, buyTickets, curMonth } = ctx;
  if (!me) return null;

  const rm = raffleCal[curMonth] || { m: 'Mes', p: '🎁 Premio', v: 'Q0' };
  const rd = rafData[curMonth]   || { participants: [] };

  const myEntry      = rd.participants.find(p => p.cid === me.id);
  const myTickets    = myEntry?.tickets || 0;
  const totalTickets = rd.participants.reduce((s, p) => s + p.tickets, 0);

  // ── Tema por tier ─────────────────────────────────────
  const tier      = cTier?.name || 'ORO';
  const isDark    = tier === 'BLACK';
  const isPlatino = tier === 'PLATINO';

  const T = {
    bg:          isDark ? '#06060C'                 : isPlatino ? '#E8E8E8'              : '#fff',
    headerBg:    isDark ? 'radial-gradient(ellipse at 20% 30%, #0d0d1a 0%, #050508 60%, #000 100%)'
                        : isPlatino ? 'linear-gradient(135deg,#1565C0,#1976D2,#42A5F5)'
                        : 'linear-gradient(135deg,#FBBC04,#FFD540)',
    headerTxt:   isDark ? '#fff'                    : isPlatino ? '#fff'                 : '#0D0D0D',
    headerSub:   isDark ? 'rgba(255,255,255,.6)'    : isPlatino ? 'rgba(255,255,255,.7)' : 'rgba(0,0,0,.5)',
    headerShad:  isDark ? '0 8px 32px rgba(0,0,0,.6)' : isPlatino ? '0 8px 32px rgba(21,101,192,.4)' : '0 8px 32px rgba(251,188,4,.35)',
    myTicketCol: isDark ? '#FFD54F'                 : isPlatino ? '#fff'                 : '#0D0D0D',
    divider:     isDark ? 'rgba(255,255,255,.15)'   : isPlatino ? 'rgba(255,255,255,.25)': 'rgba(0,0,0,.15)',
    accent:      isDark ? '#FFD54F'                 : isPlatino ? '#1565C0'              : '#F0A500',
    accentLight: isDark ? 'rgba(255,213,79,.1)'     : isPlatino ? 'rgba(21,101,192,.1)'  : '#FFF8E1',
    accentBorder:isDark ? 'rgba(255,213,79,.3)'     : isPlatino ? 'rgba(21,101,192,.4)'  : '#FFE082',
    ptsBg:       isDark ? 'rgba(255,255,255,.06)'   : isPlatino ? 'rgba(0,0,0,.06)'      : '#F5F5F5',
    ptsTxt:      isDark ? '#FFD54F'                 : isPlatino ? '#1565C0'              : TH.pri,
    subTxt:      isDark ? 'rgba(255,255,255,.5)'    : '#9E9E9E',
    textCol:     isDark ? '#fff'                    : '#0D0D0D',
    btnBorder:   isDark ? '#FFD54F'                 : isPlatino ? '#1565C0'              : '#FBBC04',
    btnBg:       isDark ? 'rgba(255,213,79,.1)'     : isPlatino ? 'rgba(21,101,192,.1)'  : '#FFF8E1',
    btnTxt:      isDark ? '#FFD54F'                 : isPlatino ? '#1565C0'              : '#F0A500',
    cardBg:      isDark ? 'rgba(255,255,255,.04)'   : isPlatino ? 'rgba(255,255,255,.5)' : '#fff',
    cardBorder:  isDark ? 'rgba(255,255,255,.08)'   : isPlatino ? '#BDBDBD'              : '#eee',
    rowBorder:   isDark ? 'rgba(255,255,255,.06)'   : isPlatino ? '#BDBDBD'              : '#F5F5F5',
    meBg:        isDark ? 'rgba(255,213,79,.06)'    : isPlatino ? 'rgba(21,101,192,.06)' : '#FFFDE7',
    meTxt:       isDark ? '#FFD54F'                 : isPlatino ? '#1565C0'              : '#F0A500',
    rankBg:      isDark ? 'rgba(255,255,255,.08)'   : isPlatino ? 'rgba(0,0,0,.08)'      : '#F5F5F5',
    activeRow:   isDark ? 'rgba(255,213,79,.1)'     : isPlatino ? 'rgba(21,101,192,.1)'  : '#FFF8E1',
    activeBorder:isDark ? 'rgba(255,213,79,.3)'     : isPlatino ? 'rgba(21,101,192,.3)'  : '#FFE082',
    activeTag:   isDark ? '#FFD54F'                 : isPlatino ? '#1565C0'              : '#F0A500',
    activeTagBg: isDark ? 'rgba(255,213,79,.15)'    : isPlatino ? 'rgba(21,101,192,.15)' : '#FFF8E1',
    prizeValCol: isDark ? '#FFD54F'                 : isPlatino ? '#1565C0'              : '#F0A500',
  };

  return (
    <div style={{ paddingBottom: 100, minHeight: '100vh', background: T.bg }}>

      {/* ── Premio del mes ── */}
      <div style={{
        margin: '16px 20px', padding: '24px 20px', borderRadius: 22,
        position: 'relative', overflow: 'hidden',
        background: T.headerBg, color: T.headerTxt,
        boxShadow: T.headerShad,
      }}>
        {isDark && <GalaxyDust n={20} />}
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', opacity: .7, marginBottom: 8 }}>
            Premio de {rm.m}
          </div>
          <div style={{ fontSize: 52, marginBottom: 8 }}>{rm.p?.split(' ')[0]}</div>
          <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 4 }}>
            {rm.p?.replace(/^[^\s]+\s/, '')}
          </div>
          <div style={{ fontSize: 13, opacity: .65, marginBottom: 20 }}>{rm.v}</div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 32 }}>
            <div>
              <div style={{ ...sMono, fontSize: 32, fontWeight: 900, color: T.myTicketCol }}>{myTickets}</div>
              <div style={{ fontSize: 10, opacity: .6, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>Mis boletos</div>
            </div>
            <div style={{ width: 1, background: T.divider }} />
            <div>
              <div style={{ ...sMono, fontSize: 32, fontWeight: 900 }}>{totalTickets}</div>
              <div style={{ fontSize: 10, opacity: .6, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>Total</div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Comprar boletos ── */}
      <div style={{ padding: '0 20px', marginBottom: 20 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 10, padding: '10px 16px', borderRadius: 12, background: T.ptsBg,
        }}>
          <span style={{ fontSize: 12, color: T.subTxt, fontWeight: 600 }}>Tus puntos</span>
          <span style={{ ...sMono, fontSize: 18, fontWeight: 800, color: T.ptsTxt }}>{me.points}</span>
          <span style={{ fontSize: 11, color: T.subTxt, fontWeight: 600 }}>{cfg.ticketPts} pts/boleto</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[1, 3, 5, 10].map(n => {
            const canBuy = me.points >= n * cfg.ticketPts;
            return (
              <button key={n} onClick={() => buyTickets(n)} disabled={!canBuy} style={{
                flex: 1, padding: 14, borderRadius: 14,
                border: `2px solid ${canBuy ? T.btnBorder : '#E0E0E0'}`,
                background: canBuy ? T.btnBg : (isDark ? 'rgba(255,255,255,.04)' : '#F5F5F5'),
                fontFamily: "'DM Sans'", fontSize: 16, fontWeight: 900,
                cursor: canBuy ? 'pointer' : 'default',
                color: canBuy ? T.btnTxt : '#BDBDBD',
                opacity: canBuy ? 1 : .5,
              }}>{n}</button>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: T.subTxt, textAlign: 'center', marginTop: 8 }}>
          Tocá para comprar boletos
        </div>
      </div>

      {/* ── Participantes ── */}
      <div style={{ padding: '0 20px' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#BDBDBD', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>
          Participantes ({rd.participants.length})
        </div>
        {rd.participants.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: T.subTxt, fontSize: 13 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎟️</div>
            Aún no hay participantes este mes.<br />¡Sé el primero!
          </div>
        ) : (
          <div style={{ background: T.cardBg, borderRadius: 16, border: `1px solid ${T.cardBorder}`, overflow: 'hidden' }}>
            {rd.participants.slice().sort((a, b) => b.tickets - a.tickets).map((p, i, arr) => {
              const isMe  = p.cid === me.id;
              return (
                <div key={p.cid} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  borderBottom: i < arr.length - 1 ? `1px solid ${T.rowBorder}` : 'none',
                  background: isMe ? T.meBg : 'transparent',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: i === 0 ? '#FFD54F' : i === 1 ? '#E0E0E0' : i === 2 ? '#FFAB40' : T.rankBg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 900, color: i < 3 ? '#0D0D0D' : T.subTxt,
                  }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: isMe ? 900 : 700, color: isMe ? T.meTxt : T.textCol, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name} {isMe && '← Tú'}
                    </div>

                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ ...sMono, fontSize: 15, fontWeight: 800, color: T.textCol }}>{p.tickets}</div>
                    <div style={{ fontSize: 9, color: T.subTxt, fontWeight: 700 }}>BOLETOS</div>
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
