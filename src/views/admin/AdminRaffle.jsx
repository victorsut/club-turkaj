// src/views/admin/AdminRaffle.jsx
// Admin raffle — manage monthly draws, view participants, spin winner
import { useState } from 'react';
import { sMono, adminTheme as AT, btnYellow } from '../../constants/styles';
import { Back, Ticket } from '../../components/ui/Icons';

export default function AdminRaffle(ctx) {
  const {
    raffleCal, rafData, rafMonth, setRafMonth, cfg,
    custs, gT, setScr, fire, curMonth,
    rafWinners, setRafWinners, rafSpinning, setRafSpinning,
  } = ctx;

  const rm = raffleCal[rafMonth] || { m: '—', p: '—', v: 'Q0' };
  const rd = rafData[rafMonth] || { participants: [] };
  const totalTickets = rd.participants.reduce((s, p) => s + p.tickets, 0);
  const totalPts = totalTickets * cfg.ticketPts;
  const totalClients = rd.participants.length;
  const ptsToQ = +(totalPts * 0.25).toFixed(2);
  const covers = ptsToQ >= (rm.cost || 0);
  const isCur = rafMonth === curMonth;
  const isPast = rafMonth < curMonth;
  const mWin = rafWinners[rafMonth];

  const spinWinner = () => {
    if (rd.participants.length === 0) { fire('❌ No hay participantes'); return; }
    setRafSpinning && setRafSpinning(true);
    const pool = [];
    rd.participants.forEach(p => { for (let i = 0; i < p.tickets; i++) pool.push(p); });
    const w = pool[Math.floor(Math.random() * pool.length)];
    setTimeout(() => {
      setRafWinners(prev => ({ ...prev, [rafMonth]: w }));
      setRafSpinning && setRafSpinning(false);
      fire(`🎉 ¡${w.name} ganó ${rm.p}!`);
    }, 2000);
  };

  const aSec = { padding: '20px 20px 8px', fontSize: 12, fontWeight: 800, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: 2 };

  return (
    <div style={{ paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${AT.border}`, background: '#252525', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setScr('dash')} style={{ background: 'none', border: 'none', color: '#9E9E9E', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600 }}><Back /> Inicio</button>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Rifa Mensual</div>
        <div style={{ width: 80 }} />
      </div>

      {/* Month selector */}
      <div style={{ display: 'flex', gap: 6, padding: '12px 20px', overflowX: 'auto' }}>
        {raffleCal.map((r, i) => (
          <button key={i} onClick={() => setRafMonth(i)} style={{
            padding: '8px 14px', borderRadius: 14, border: `1px solid ${rafMonth === i ? '#FBBC04' : AT.border}`,
            background: rafMonth === i ? '#FBBC04' : AT.card, fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 700,
            cursor: 'pointer', color: rafMonth === i ? '#0D0D0D' : '#777', whiteSpace: 'nowrap',
          }}>{r.m}</button>
        ))}
      </div>

      {/* Prize card */}
      <div style={{ margin: '8px 20px', padding: 20, background: 'linear-gradient(135deg,#FBBC04,#FFD540)', borderRadius: 20, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-30%', right: '-20%', width: '50%', height: '80%', background: 'rgba(255,255,255,.15)', borderRadius: '50%' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 40 }}>{(rm.p || '').split(' ')[0]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{rm.p}</div>
              <div style={{ fontSize: 13, opacity: .6 }}>{rm.m} 2026 · {rm.v}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div style={{ background: 'rgba(0,0,0,.08)', borderRadius: 12, padding: 10, textAlign: 'center' }}>
              <div style={{ ...sMono, fontSize: 22, fontWeight: 800 }}>{totalClients}</div>
              <div style={{ fontSize: 9, fontWeight: 700, opacity: .5, textTransform: 'uppercase', letterSpacing: 1 }}>Clientes</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,.08)', borderRadius: 12, padding: 10, textAlign: 'center' }}>
              <div style={{ ...sMono, fontSize: 22, fontWeight: 800 }}>{totalTickets}</div>
              <div style={{ fontSize: 9, fontWeight: 700, opacity: .5, textTransform: 'uppercase', letterSpacing: 1 }}>Boletos</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,.08)', borderRadius: 12, padding: 10, textAlign: 'center' }}>
              <div style={{ ...sMono, fontSize: 22, fontWeight: 800, color: covers ? '#2E7D32' : '#C62828' }}>Q{ptsToQ}</div>
              <div style={{ fontSize: 9, fontWeight: 700, opacity: .5, textTransform: 'uppercase', letterSpacing: 1 }}>Recaudado</div>
            </div>
          </div>
        </div>
      </div>

      {/* Winner or Draw button */}
      {mWin ? (
        <div style={{ margin: '16px 20px', padding: 20, background: '#E8F5E9', borderRadius: 18, border: '2px solid #2E7D32', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#2E7D32' }}>¡Ganador!</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 8 }}>{mWin.name}</div>
          <div style={{ fontSize: 13, color: '#757575', marginTop: 4 }}>{mWin.tickets} boleto{mWin.tickets > 1 ? 's' : ''}</div>
        </div>
      ) : (isCur || isPast) && (
        <div style={{ margin: '16px 20px' }}>
          <button onClick={spinWinner} disabled={rafSpinning || rd.participants.length === 0}
            style={{ ...btnYellow, width: '100%', opacity: rd.participants.length === 0 ? .5 : 1, fontSize: 16, padding: 16, borderRadius: 16 }}>
            {rafSpinning ? '🎰 Sorteando...' : '🎰 Realizar Sorteo'}
          </button>
        </div>
      )}

      {/* Participants */}
      <div style={aSec}>Participantes ({totalClients})</div>
      {rd.participants.length === 0 && (
        <div style={{ textAlign: 'center', padding: 24, color: '#777', fontSize: 13 }}>Aún no hay participantes</div>
      )}
      {[...rd.participants].sort((a, b) => b.tickets - a.tickets).map((p, i) => {
        const c = custs.find(x => x.id === p.cid);
        const t = c ? gT(c.gallons) : gT(0);
        const prob = totalTickets > 0 ? ((p.tickets / totalTickets) * 100).toFixed(1) : 0;
        return (
          <div key={p.cid} style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: `1px solid ${AT.border}` }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: t.bg, color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, marginRight: 12, flexShrink: 0 }}>{(c?.name || p.name).charAt(0)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#E0E0E0' }}>{p.name}</div>
              <div style={{ fontSize: 11, color: '#777', marginTop: 2 }}>
                🎟️ {p.tickets} boleto{p.tickets > 1 ? 's' : ''} · {prob}% prob.
              </div>
            </div>
            {mWin?.cid === p.cid && <span style={{ fontSize: 12, fontWeight: 800, color: '#2E7D32' }}>🏆</span>}
          </div>
        );
      })}

      {/* Calendar */}
      <div style={aSec}>Calendario 2026</div>
      {raffleCal.map((r, i) => {
        const cur = i === curMonth;
        const past = i < curMonth;
        const w = rafWinners[i];
        return (
          <div key={i} onClick={() => setRafMonth(i)} style={{
            margin: '6px 20px', padding: '14px 18px', borderRadius: 16,
            background: cur ? '#FBBC04' : past ? '#2A2A2A' : AT.card,
            border: cur ? '2px solid #E6A800' : `1px solid ${AT.border}`,
            display: 'flex', alignItems: 'center', gap: 14, opacity: past ? .5 : 1, cursor: 'pointer',
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(0,0,0,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: cur ? '#0D0D0D' : '#aaa', flexShrink: 0, ...sMono }}>{String(i + 1).padStart(2, '0')}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: cur ? '#0D0D0D' : '#ccc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.p}</div>
              {w && <div style={{ fontSize: 11, color: '#2E7D32', fontWeight: 700, marginTop: 2 }}>🎉 {w.name}</div>}
            </div>
            {cur && !w && <div style={{ fontSize: 10, fontWeight: 800, color: '#2E7D32', background: '#E8F5E9', padding: '4px 10px', borderRadius: 8, flexShrink: 0 }}>ACTIVA</div>}
          </div>
        );
      })}
    </div>
  );
}
