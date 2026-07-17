// src/views/client/HistorySheet.jsx
// R1b (D34) — Ventana full-screen de historiales (compras / canjes)
// con agrupación por período: Hoy · Mes · Año · Todo (decisión del
// dueño, 17-jul-2026). Entra desde su tile con animación de sheet.
import { useState } from 'react';
import { sMono } from '../../constants/styles';
import { Back } from '../../components/ui/Icons';

const PERIODS = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'mes', label: 'Este mes' },
  { id: 'anio', label: 'Este año' },
  { id: 'todo', label: 'Todo' },
];

// Fecha del item normalizada a 'YYYY-MM-DD' en hora de Guatemala.
const itemDay = (raw) => {
  if (!raw) return '';
  const s = String(raw);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  try {
    return new Date(s).toLocaleDateString('en-CA', { timeZone: 'America/Guatemala' });
  } catch { return s.slice(0, 10); }
};

export default function HistorySheet({ type, onClose, acts, redeemed, tierName }) {
  const [period, setPeriod] = useState('hoy');
  const isBlack = tierName === 'BLACK';

  const todayGT = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guatemala' });
  const inPeriod = (day) => {
    if (!day) return period === 'todo';
    if (period === 'hoy') return day === todayGT;
    if (period === 'mes') return day.slice(0, 7) === todayGT.slice(0, 7);
    if (period === 'anio') return day.slice(0, 4) === todayGT.slice(0, 4);
    return true;
  };

  const isCompras = type === 'compras';
  const items = isCompras
    ? (acts || []).filter(a => a.type === 'compra' && inPeriod(itemDay(a.date)))
    : (redeemed || []).filter(rd => inPeriod(itemDay(rd.date)));

  const totalPts = isCompras
    ? items.reduce((s, a) => s + (parseInt(a.pts, 10) || 0), 0)
    : items.reduce((s, rd) => s + (rd.cost || 0), 0);

  const TH = {
    bg: isBlack ? '#06060C' : '#F5F5F7',
    surface: isBlack ? 'rgba(255,255,255,.05)' : '#fff',
    header: isBlack ? '#fff' : '#0D0D0D',
    txt: isBlack ? '#E0E0E0' : '#424242',
    sub: isBlack ? 'rgba(255,255,255,.5)' : '#9E9E9E',
    border: isBlack ? 'rgba(255,255,255,.08)' : '#EDEDED',
    chipOn: isCompras ? '#E65100' : '#00838F',
  };

  return (
    <div className="pp-sheet" style={{
      position: 'fixed', top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480, zIndex: 180,
      background: TH.bg, overflowY: 'auto', paddingBottom: 40,
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 2, background: TH.bg,
        padding: '16px 20px 10px', display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: `1px solid ${TH.border}`,
      }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: TH.sub, cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 }}>
          <Back />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: TH.header }}>
            {isCompras ? '🧾 Historial de Compras' : '🎁 Historial de Canjes'}
          </div>
          <div style={{ fontSize: 11, color: TH.sub, fontWeight: 600 }}>
            {items.length} {items.length === 1 ? 'registro' : 'registros'}
            {items.length > 0 && (isCompras ? ` · +${totalPts} pts ganados` : ` · ${totalPts} pts canjeados`)}
          </div>
        </div>
      </div>

      {/* Chips de período: Hoy · Mes · Año · Todo */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 20px' }}>
        {PERIODS.map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id)} style={{
            flex: 1, padding: '9px 0', borderRadius: 18, border: 'none',
            background: period === p.id ? TH.chipOn : TH.surface,
            color: period === p.id ? '#fff' : TH.txt,
            fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 800, cursor: 'pointer',
            boxShadow: period === p.id ? '0 2px 8px rgba(0,0,0,.15)' : 'none',
            transition: 'background .2s ease',
          }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: TH.sub, fontSize: 13 }}>
          {isCompras ? 'Sin compras en este período' : 'Sin canjes en este período'}
        </div>
      )}

      <div style={{ padding: '0 16px' }}>
        {isCompras
          ? items.map((a, i) => {
              const day = itemDay(a.date);
              const pts = parseInt(a.pts, 10) || 0;
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  background: TH.surface, borderRadius: 14, marginBottom: 8,
                  border: `1px solid ${TH.border}`,
                  animation: `slideIn .3s ${Math.min(i, 10) * 0.03}s both`,
                }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(230,81,0,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>⛽</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: TH.txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.desc}</div>
                    <div style={{ fontSize: 10, color: TH.sub, ...sMono, marginTop: 2 }}>{day}</div>
                  </div>
                  {pts !== 0 && (
                    <div style={{ ...sMono, fontSize: 13, fontWeight: 800, color: '#2E7D32', flexShrink: 0 }}>+{pts}</div>
                  )}
                </div>
              );
            })
          : items.map((rd, i) => (
              <div key={rd.id || i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                background: TH.surface, borderRadius: 14, marginBottom: 8,
                border: `1px solid ${TH.border}`,
                animation: `slideIn .3s ${Math.min(i, 10) * 0.03}s both`,
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(0,131,143,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }}>
                  {rd.reward?.icon || '🎁'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: TH.txt }}>{rd.reward?.name || 'Premio'}</div>
                  <div style={{ fontSize: 10, color: TH.sub, ...sMono, marginTop: 2 }}>{itemDay(rd.date)} · {rd.code}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ ...sMono, fontSize: 13, fontWeight: 800, color: '#C62828' }}>-{rd.cost} pts</div>
                  <div style={{ fontSize: 9, fontWeight: 700, marginTop: 2, color: rd.collected ? '#2E7D32' : '#FF8F00' }}>
                    {rd.collected ? '✅ Recogido' : '⏳ Pendiente'}
                  </div>
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}
