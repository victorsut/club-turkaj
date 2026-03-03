// src/views/client/ClientRaffle.jsx
// Client raffle view — buy tickets, see participants, monthly prizes
import { sMono, clientTheme } from '../../constants/styles';
import GalaxyDust from '../../components/ui/GalaxyDust';

export default function ClientRaffle(ctx) {
  const { me, gT, cfg, cTier, TH, raffleCal, rafData, buyTickets, curMonth, fire } = ctx;
  if (!me) return null;

  const rm = raffleCal[curMonth] || { m: 'Mes', p: '🎁 Premio', v: 'Q0' };
  const rd = rafData[curMonth] || { participants: [] };
  const myTickets = rd.participants.find(p => p.cid === me.id)?.tickets || 0;
  const totalTickets = rd.participants.reduce((s, p) => s + p.tickets, 0);

  return (
    <div style={{ paddingBottom: 90 }}>
      {/* Prize header */}
      <div style={{
        margin: '16px 20px', padding: 24, borderRadius: 20, position: 'relative', overflow: 'hidden',
        background: cTier.name === 'BLACK' ? 'radial-gradient(ellipse at 20% 30%, #0d0d1a 0%, #050508 40%, #000 100%)' : 'linear-gradient(135deg,#FBBC04,#FFD540)',
        color: cTier.name === 'BLACK' ? '#fff' : '#0D0D0D',
      }}>
        {cTier.name === 'BLACK' && <GalaxyDust n={20} />}
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{rm.p.split(' ')[0]}</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{rm.p}</div>
          <div style={{ fontSize: 13, opacity: .7, marginTop: 4 }}>{rm.m} 2026 · {rm.v}</div>
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 24 }}>
            <div>
              <div style={{ ...sMono, fontSize: 28, fontWeight: 800, color: cTier.name === 'BLACK' ? '#FFD54F' : '#0D0D0D' }}>{myTickets}</div>
              <div style={{ fontSize: 10, opacity: .6, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>Mis boletos</div>
            </div>
            <div>
              <div style={{ ...sMono, fontSize: 28, fontWeight: 800 }}>{totalTickets}</div>
              <div style={{ fontSize: 10, opacity: .6, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>Total</div>
            </div>
          </div>
        </div>
      </div>

      {/* Buy tickets */}
      <div style={{ padding: '0 20px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: '#9E9E9E', marginBottom: 12, textAlign: 'center' }}>
          Precio: <strong style={{ color: '#2E7D32', ...sMono }}>{cfg.ticketPts} pts</strong> por boleto
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[1, 3, 5, 10].map(n => (
            <button key={n} onClick={() => buyTickets(n)}
              disabled={me.points < n * cfg.ticketPts}
              style={{
                flex: 1, padding: 14, borderRadius: 14,
                border: `2px solid ${me.points >= n * cfg.ticketPts ? '#FBBC04' : '#E0E0E0'}`,
                background: me.points >= n * cfg.ticketPts ? '#FFF8E1' : '#F5F5F5',
                fontFamily: "'DM Sans'", fontSize: 15, fontWeight: 800,
                cursor: me.points >= n * cfg.ticketPts ? 'pointer' : 'default',
                color: me.points >= n * cfg.ticketPts ? '#F0A500' : '#BDBDBD',
                opacity: me.points >= n * cfg.ticketPts ? 1 : .5,
              }}>
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Participants */}
      <div style={{ padding: '0 20px' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#BDBDBD', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>
          Participantes ({rd.participants.length})
        </div>
        {rd.participants.length === 0 && (
          <div style={{ textAlign: 'center', padding: 20, color: '#9E9E9E', fontSize: 13 }}>Aún no hay participantes</div>
        )}
        {rd.participants.sort((a, b) => b.tickets - a.tickets).map((p, i) => (
          <div key={p.cid} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 0', borderBottom: i < rd.participants.length - 1 ? '1px solid #F0F0F0' : 'none',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: p.cid === me.id ? '#F0A500' : '#424242' }}>
              {p.name} {p.cid === me.id ? '←' : ''}
            </span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#757575', ...sMono }}>{p.tickets} 🎟️</span>
          </div>
        ))}
      </div>
    </div>
  );
}
