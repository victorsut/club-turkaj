// src/views/operator/OpRaffle.jsx
// Operator view — sell raffle tickets to clients via card scan
import { sMono, inputStyle } from '../../constants/styles';
import Badge from '../../components/ui/Badge';
import { Back } from '../../components/ui/Icons';

export default function OpRaffle(ctx) {
  const {
    custs, setCusts, gT, cfg, fire, me, setMe,
    raffleCal, rafData, setRafData, curMonth,
    opRafClient, setOpRafClient,
    opRafScan, setOpRafScan,
    opRafQty, setOpRafQty,
    opSearch, setOpSearch,
    cards, syncMember, logActivity,
  } = ctx;

  const rm = raffleCal[curMonth];
  const rd = rafData[curMonth] || { participants: [] };
  const totalTickets = rd.participants.reduce((s, p) => s + p.tickets, 0);

  // Scan card simulation (TODO: replace with real QR/NFC)
  const scanCard = () => {
    setOpRafScan('scanning');
    setTimeout(() => {
      const activeCards = (cards || []).filter(c => c.status === 'active');
      if (activeCards.length === 0) { setOpRafScan('nocard'); return; }
      const pick = activeCards[Math.floor(Math.random() * activeCards.length)];
      const cust = custs.find(c => c.cardId === pick.id);
      if (cust) {
        setOpRafScan({ id: pick.id, tier: pick.tier });
        setOpRafClient(cust);
      } else {
        setOpRafScan('nocard');
      }
    }, 1500);
  };

  const cl = opRafClient;
  const clTickets = cl
    ? (rd.participants.find(p => p.cid === cl.id) || { tickets: 0 }).tickets
    : 0;

  // Buy tickets
  const doBuy = (n) => {
    if (!cl) return;
    const cost = n * cfg.ticketPts;
    if (cl.points >= cost) {
      setCusts(p => p.map(c => c.id === cl.id
        ? { ...c, points: c.points - cost, tickets: c.tickets + n }
        : c
      ));
      if (me?.id === cl.id) setMe(p => ({ ...p, points: p.points - cost, tickets: p.tickets + n }));
      setRafData(p => p.map((r, i) => {
        if (i !== curMonth) return r;
        const ps = [...r.participants];
        const ex = ps.findIndex(p2 => p2.cid === cl.id);
        if (ex >= 0) ps[ex] = { ...ps[ex], tickets: ps[ex].tickets + n };
        else ps.push({ cid: cl.id, name: cl.name, tickets: n });
        return { ...r, participants: ps };
      }));
      setOpRafClient({ ...cl, points: cl.points - cost, tickets: cl.tickets + n });
      fire(`🎟️ ${cl.name} compró ${n} boleto${n > 1 ? 's' : ''} · -${cost} pts`);
      syncMember(cl.id, { points: cl.points - cost, tickets: cl.tickets + n, updated_at: new Date().toISOString() });
      logActivity(cl.id, 'rifa', `Compró ${n} boletos de rifa (operador)`, -cost);
    } else {
      fire('❌ Puntos insuficientes');
    }
  };

  const hdr = { padding: '14px 20px', borderBottom: '1px solid #E0E0E0', background: 'linear-gradient(135deg,#FBBC04 0%,#FFF8E1 60%,#FAFAFA 100%)' };
  const secLbl = { fontSize: 11, fontWeight: 800, color: '#BDBDBD', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 };

  return (
    <div style={{ paddingBottom: 90 }}>
      {/* Header */}
      <div style={hdr}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#0D0D0D' }}>Rifa · Operador</div>
      </div>

      {/* Prize banner */}
      <div style={{ margin: '16px 20px', padding: 20, background: '#FBBC04', borderRadius: 20, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-30%', right: '-20%', width: '50%', height: '80%', background: 'rgba(255,255,255,.15)', borderRadius: '50%' }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 36 }}>{(rm?.p || '').split(' ')[0]}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{rm?.p}</div>
            <div style={{ fontSize: 12, opacity: .6 }}>{rm?.m} 2026</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 800, ...sMono }}>{totalTickets}</div>
            <div style={{ fontSize: 9, fontWeight: 700, opacity: .5, textTransform: 'uppercase', letterSpacing: 1 }}>boletos</div>
          </div>
        </div>
      </div>

      {/* ── No client selected: scan or search ── */}
      {!cl ? (
        <div style={{ padding: '0 20px' }}>
          {/* Scan card */}
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #E0E0E0', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎟️</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#424242', marginBottom: 4 }}>Comprar boletos con tarjeta</div>
            <div style={{ fontSize: 13, color: '#9E9E9E', marginBottom: 20 }}>El cliente presenta su tarjeta para comprar boletos de rifa</div>

            {!opRafScan && (
              <button onClick={scanCard} style={{
                width: '100%', padding: 16, borderRadius: 16, border: '2px dashed #FBBC04',
                background: '#FFF8E1', fontFamily: "'DM Sans'", fontSize: 15, fontWeight: 800,
                cursor: 'pointer', color: '#F0A500', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>📷 Escanear Tarjeta</button>
            )}

            {opRafScan === 'scanning' && (
              <div style={{ padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8, animation: 'pulse 1s infinite' }}>📷</div>
                <div style={{ height: 4, borderRadius: 2, overflow: 'hidden', background: '#eee', margin: '12px 0' }}>
                  <div style={{ height: '100%', borderRadius: 2, background: '#FBBC04', animation: 'scanBar 1.5s ease forwards' }} />
                </div>
                <div style={{ fontSize: 13, color: '#9E9E9E' }}>Leyendo tarjeta...</div>
              </div>
            )}

            {opRafScan === 'nocard' && (
              <div style={{ padding: 16, background: '#FFF3E0', borderRadius: 14, border: '1px solid #FFCC80' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#E65100' }}>⚠️ Tarjeta no encontrada</div>
                <button onClick={() => setOpRafScan(null)} style={{
                  marginTop: 10, padding: '8px 20px', borderRadius: 10, border: 'none',
                  background: '#FBBC04', fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}>Reintentar</button>
              </div>
            )}
          </div>

          {/* Search by name */}
          <div style={{ margin: '20px 0', background: '#fff', borderRadius: 18, padding: 20, border: '1px solid #E0E0E0' }}>
            <div style={secLbl}>O buscar por nombre</div>
            <input
              placeholder="Buscar cliente..."
              value={opSearch || ''}
              onChange={e => setOpSearch(e.target.value)}
              style={{ ...inputStyle, background: '#fff', border: '1px solid #E0E0E0', color: '#0D0D0D' }}
            />
            {opSearch && opSearch.length > 1 && custs
              .filter(c => c.name.toLowerCase().includes(opSearch.toLowerCase()))
              .slice(0, 5)
              .map(c2 => {
                const ct = gT(c2.gallons);
                return (
                  <div key={c2.id} onClick={() => { setOpRafClient(c2); setOpRafScan({ id: c2.cardId, tier: ct.name }); setOpSearch(''); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #F0F0F0', cursor: 'pointer' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: ct.bg, color: ct.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800 }}>
                      {c2.name.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#424242' }}>{c2.name}</div>
                      <div style={{ fontSize: 11, color: '#9E9E9E' }}>{c2.points} pts · <Badge t={ct} /></div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ) : (
        /* ── Client selected: buy tickets ── */
        <div style={{ padding: '0 20px' }}>
          {/* Back + card ID */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <button onClick={() => { setOpRafClient(null); setOpRafScan(null); setOpRafQty(1); }}
              style={{ background: 'none', border: 'none', color: '#757575', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600 }}>
              <Back /> Escanear otra
            </button>
            <div style={{ fontSize: 12, color: '#9E9E9E' }}>💳 {opRafScan?.id || ''}</div>
          </div>

          {/* Client summary */}
          <div style={{ background: '#fff', borderRadius: 18, padding: 20, border: '1px solid #E0E0E0', textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#424242' }}>{cl.name}</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 6 }}>
              <Badge t={gT(cl.gallons)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 14 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#424242', ...sMono }}>{cl.points}</div>
                <div style={{ fontSize: 10, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>puntos</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#F0A500', ...sMono }}>{clTickets}</div>
                <div style={{ fontSize: 10, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>boletos</div>
              </div>
            </div>
          </div>

          {/* Ticket selector */}
          <div style={{ background: '#fff', borderRadius: 18, padding: 20, border: '1px solid #E0E0E0', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: '#9E9E9E', marginBottom: 14, textAlign: 'center' }}>
              Precio: <strong style={{ color: '#2E7D32', ...sMono }}>{cfg.ticketPts} pts</strong> por boleto
            </div>

            {/* Quantity buttons */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {[1, 3, 5, 10].map(n => (
                <button key={n} onClick={() => setOpRafQty(n)} style={{
                  flex: 1, padding: 12, borderRadius: 12,
                  border: `2px solid ${opRafQty === n ? '#FBBC04' : '#E0E0E0'}`,
                  background: opRafQty === n ? '#FFF8E1' : '#fff',
                  fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 800, cursor: 'pointer',
                  color: opRafQty === n ? '#F0A500' : '#9E9E9E',
                }}>{n}</button>
              ))}
            </div>

            {/* Total cost */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, padding: '10px 14px', borderRadius: 12, background: '#F5F5F5' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#757575' }}>Costo total:</span>
              <span style={{
                fontSize: 16, fontWeight: 800, ...sMono,
                color: cl.points >= opRafQty * cfg.ticketPts ? '#2E7D32' : '#C62828',
              }}>{opRafQty * cfg.ticketPts} pts</span>
            </div>

            {/* Buy button */}
            <button onClick={() => doBuy(opRafQty)}
              disabled={opRafQty * cfg.ticketPts > cl.points}
              style={{
                width: '100%', padding: 16, borderRadius: 14, border: 'none',
                background: '#FBBC04', fontFamily: "'DM Sans'", fontSize: 15, fontWeight: 800,
                cursor: 'pointer', color: '#0D0D0D',
                opacity: cl.points >= opRafQty * cfg.ticketPts ? 1 : .5,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
              🎟️ Comprar {opRafQty} boleto{opRafQty > 1 ? 's' : ''}
            </button>
          </div>

          {/* Participants this month */}
          <div style={{ background: '#fff', borderRadius: 18, padding: 16, border: '1px solid #E0E0E0' }}>
            <div style={secLbl}>Participantes este mes</div>
            {rd.participants.length === 0 && (
              <div style={{ fontSize: 13, color: '#9E9E9E', textAlign: 'center', padding: 12 }}>Aún no hay participantes</div>
            )}
            {rd.participants.map((p, i) => (
              <div key={p.cid} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 0', borderBottom: i < rd.participants.length - 1 ? '1px solid #F0F0F0' : 'none',
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: p.cid === cl.id ? '#F0A500' : '#424242' }}>
                  {p.name}{p.cid === cl.id ? ' ←' : ''}
                </span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#757575', ...sMono }}>{p.tickets} 🎟️</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
