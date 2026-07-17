// src/views/client/HistorySheet.jsx
// R1b (D34) — Ventana full-screen de historiales (compras/puntos y
// canjes). Períodos DERIVADOS de los datos (feedback del dueño):
// "Hoy" solo aparece si hay movimientos hoy; "Mes" y "Año" abren un
// selector solo con los meses/años que tienen movimientos.
// Entra desde su tile (container transform D35) y se guarda al cerrar.
import { useState } from 'react';
import { sMono } from '../../constants/styles';
import { Back } from '../../components/ui/Icons';

const CLOSE_MS = 200; // duración de ppGrowOut (+ margen) antes de desmontar

// Icono por tipo de movimiento (libro mayor de puntos)
const TYPE_ICON = {
  compra: '⛽', canje: '🎁', rifa: '🎟️',
  encuesta: '📋', evento: '🎉', registro: '⭐',
  registro_vehiculos: '🚗',
};

const MES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const monthLabel = (ym) => `${MES_CORTO[parseInt(ym.slice(5, 7), 10) - 1] || '?'} ${ym.slice(0, 4)}`;

// Fecha del item normalizada a 'YYYY-MM-DD' en hora de Guatemala.
const itemDay = (raw) => {
  if (!raw) return '';
  const s = String(raw);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  try {
    return new Date(s).toLocaleDateString('en-CA', { timeZone: 'America/Guatemala' });
  } catch { return s.slice(0, 10); }
};

export default function HistorySheet({ type, origin, tint, onClose, acts, redeemed, tierName }) {
  const isBlack = tierName === 'BLACK';
  const isCompras = type === 'compras';
  const todayGT = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guatemala' });

  // Base del tipo, SIN filtro de período — de acá se derivan los
  // períodos disponibles (solo los que tienen movimientos).
  const base = isCompras
    ? (acts || []).filter(a => (parseInt(a.pts, 10) || 0) !== 0)
    : (redeemed || []);
  const days = base.map(x => itemDay(x.date)).filter(Boolean);
  const hasToday = days.includes(todayGT);
  const months = [...new Set(days.map(d => d.slice(0, 7)))].sort().reverse();
  const years = [...new Set(days.map(d => d.slice(0, 4)))].sort().reverse();

  const [mode, setMode] = useState(() => (hasToday ? 'hoy' : months.length ? 'mes' : 'todo'));
  const [selMonth, setSelMonth] = useState(() => months[0] || null);
  const [selYear, setSelYear] = useState(() => years[0] || null);
  const [closing, setClosing] = useState(false);

  // D35: al cerrar, la ventana "se guarda" en el cuadro de origen.
  const close = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, CLOSE_MS);
  };

  const inPeriod = (day) => {
    if (mode === 'todo') return true;
    if (!day) return false;
    if (mode === 'hoy') return day === todayGT;
    if (mode === 'mes') return !!selMonth && day.slice(0, 7) === selMonth;
    if (mode === 'anio') return !!selYear && day.slice(0, 4) === selYear;
    return true;
  };
  const items = base.filter(x => inPeriod(itemDay(x.date)));

  const ganados = isCompras
    ? items.reduce((s, a) => s + Math.max(0, parseInt(a.pts, 10) || 0), 0)
    : 0;
  const usados = isCompras
    ? items.reduce((s, a) => s - Math.min(0, parseInt(a.pts, 10) || 0), 0)
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

  // Modos disponibles según los datos (feedback: sin movimientos, sin chip)
  const modes = [
    ...(hasToday ? [{ id: 'hoy', label: 'Hoy' }] : []),
    ...(months.length ? [{ id: 'mes', label: 'Mes' }] : []),
    ...(years.length ? [{ id: 'anio', label: 'Año' }] : []),
    { id: 'todo', label: 'Todo' },
  ];

  const subChip = (selected) => ({
    padding: '7px 14px', borderRadius: 16, border: 'none', flexShrink: 0,
    background: selected ? TH.chipOn : TH.surface,
    color: selected ? '#fff' : TH.txt,
    fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 800, cursor: 'pointer',
    whiteSpace: 'nowrap',
    boxShadow: selected ? '0 2px 8px rgba(0,0,0,.15)' : 'none',
  });

  return (
    <div className={closing ? 'pp-grow-out' : 'pp-grow'} style={{
      // inset:0 + margin auto centra SIN transform propio (el transform
      // queda libre para el container-transform).
      position: 'fixed', inset: 0, margin: '0 auto',
      width: '100%', maxWidth: 480, zIndex: 200,
      background: TH.bg, overflowY: 'auto', paddingBottom: 40,
      transformOrigin: origin ? `${origin.x}px ${origin.y}px` : '50% 80%',
    }}>
      {/* Tinte de continuidad: nace del color del tile y se aclara; al
          cerrar se vuelve a teñir mientras se guarda (D35). */}
      {tint && (
        <div className={closing ? 'pp-tint-in' : 'pp-tint'} style={{ position: 'absolute', inset: 0, background: tint, zIndex: 5 }} />
      )}
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 2, background: TH.bg,
        padding: '16px 20px 10px', display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: `1px solid ${TH.border}`,
      }}>
        <button onClick={close} style={{ background: 'none', border: 'none', color: TH.sub, cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 }}>
          <Back />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: TH.header }}>
            {isCompras ? '🧾 Compras y Puntos' : '🎁 Historial de Canjes'}
          </div>
          <div style={{ fontSize: 11, color: TH.sub, fontWeight: 600 }}>
            {items.length} {isCompras
              ? (items.length === 1 ? 'movimiento' : 'movimientos')
              : (items.length === 1 ? 'canje' : 'canjes')}
            {items.length > 0 && (isCompras
              ? ` · +${ganados}${usados > 0 ? ` / −${usados}` : ''} pts`
              : ` · ${usados} pts canjeados`)}
          </div>
        </div>
      </div>

      {/* Chips de modo: Hoy · Mes · Año · Todo (solo los que tienen datos) */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 20px 8px' }}>
        {modes.map(m => (
          <button key={m.id} onClick={() => setMode(m.id)} style={{
            flex: 1, padding: '9px 0', borderRadius: 18, border: 'none',
            background: mode === m.id ? TH.chipOn : TH.surface,
            color: mode === m.id ? '#fff' : TH.txt,
            fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 800, cursor: 'pointer',
            boxShadow: mode === m.id ? '0 2px 8px rgba(0,0,0,.15)' : 'none',
            transition: 'background .2s ease',
          }}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Selector de mes (solo meses con movimientos) */}
      {mode === 'mes' && months.length > 0 && (
        <div style={{ display: 'flex', gap: 8, padding: '2px 20px 10px', overflowX: 'auto' }}>
          {months.map(ym => (
            <button key={ym} onClick={() => setSelMonth(ym)} style={subChip(selMonth === ym)}>
              {monthLabel(ym)}
            </button>
          ))}
        </div>
      )}

      {/* Selector de año (solo años con movimientos) */}
      {mode === 'anio' && years.length > 0 && (
        <div style={{ display: 'flex', gap: 8, padding: '2px 20px 10px', overflowX: 'auto' }}>
          {years.map(y => (
            <button key={y} onClick={() => setSelYear(y)} style={subChip(selYear === y)}>
              {y}
            </button>
          ))}
        </div>
      )}

      {/* Lista */}
      {items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: TH.sub, fontSize: 13 }}>
          {isCompras ? 'Sin movimientos de puntos en este período' : 'Sin canjes en este período'}
        </div>
      )}

      <div style={{ padding: '0 16px' }}>
        {isCompras
          ? items.map((a, i) => {
              const day = itemDay(a.date);
              const pts = parseInt(a.pts, 10) || 0;
              const pos = pts > 0;
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  background: TH.surface, borderRadius: 14, marginBottom: 8,
                  border: `1px solid ${TH.border}`,
                  animation: `slideIn .3s ${Math.min(i, 10) * 0.03}s both`,
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                    background: pos ? 'rgba(46,125,50,.12)' : 'rgba(198,40,40,.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
                  }}>
                    {TYPE_ICON[a.type] || '⭐'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: TH.txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.desc}</div>
                    <div style={{ fontSize: 10, color: TH.sub, ...sMono, marginTop: 2 }}>{day}</div>
                  </div>
                  <div style={{ ...sMono, fontSize: 13, fontWeight: 800, color: pos ? '#2E7D32' : '#C62828', flexShrink: 0 }}>
                    {pos ? '+' : ''}{pts}
                  </div>
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
