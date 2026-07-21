// src/views/client/HistorySheet.jsx
// R1b (D34) — Ventana full-screen de historiales (compras/puntos y
// canjes). Períodos DERIVADOS de los datos (feedback del dueño):
// "Hoy" solo aparece si hay movimientos hoy; "Mes" y "Año" abren un
// selector solo con los meses/años que tienen movimientos.
// Entra desde su tile (container transform D35) y se guarda al cerrar.
import { useState } from 'react';
import { sMono, bento } from '../../constants/styles';
import { ArrowLeft, Gift, Clock, Fuel, Ticket, Cake, Car, Clipboard, StarLine } from '../../components/ui/Icons';
import RewardIcon, { rewardIconFor } from '../../components/ui/RewardIcon';

const CLOSE_MS = 200; // duración de ppGrowOut (+ margen) antes de desmontar

// Icono SVG por tipo de movimiento (libro mayor de puntos — sin emojis).
// Los canjes intentan resolver el ícono del PREMIO desde la descripción.
const TYPE_ICONS = {
  compra: Fuel, canje: Gift, rifa: Ticket,
  encuesta: Clipboard, evento: Cake, registro: StarLine,
  registro_vehiculos: Car,
};
const actIconFor = (a) => {
  if (a.type === 'canje') return rewardIconFor({ name: a.desc || '' });
  return TYPE_ICONS[a.type] || StarLine;
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
  // Canjes: vista de PENDIENTES de usar (ícono esquina superior derecha).
  // Ignora el período — un canje pendiente importa hoy, sin importar cuándo se hizo.
  const [pendingOnly, setPendingOnly] = useState(false);
  const pendingCount = isCompras ? 0 : base.filter(x => !x.collected).length;

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
  const items = (!isCompras && pendingOnly)
    ? base.filter(x => !x.collected)
    : base.filter(x => inPeriod(itemDay(x.date)));

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
    chipOn: isCompras ? bento.orange : bento.teal,
  };

  // Modos disponibles según los datos (feedback: sin movimientos, sin chip)
  const modes = [
    ...(hasToday ? [{ id: 'hoy', label: 'Hoy' }] : []),
    ...(months.length ? [{ id: 'mes', label: 'Mes' }] : []),
    ...(years.length ? [{ id: 'anio', label: 'Año' }] : []),
    { id: 'todo', label: 'Todo' },
  ];

  const subChip = (selected) => ({
    padding: '8px 14px', borderRadius: 12, border: 'none', flexShrink: 0,
    background: selected ? TH.chipOn : TH.surface,
    color: selected ? '#fff' : TH.txt,
    fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 700, cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'background .2s, color .2s',
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
      {/* Header (formato de la ventana Promociones: flecha suelta +
          título centrado; en Canjes, ícono de PENDIENTES a la derecha) */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 2, background: TH.bg,
        padding: '16px 14px 8px', display: 'flex', alignItems: 'center',
      }}>
        <button onClick={close} aria-label="Volver" style={{
          width: 40, height: 40, border: 'none', cursor: 'pointer',
          background: 'none', color: TH.header, padding: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <ArrowLeft />
        </button>
        <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: TH.header }}>
            {isCompras ? 'Compras y Puntos' : (pendingOnly ? 'Canjes Pendientes' : 'Historial de Canjes')}
          </div>
          <div style={{ fontSize: 11, color: TH.sub, fontWeight: 600, marginTop: 1 }}>
            {pendingOnly
              ? `${items.length} pendiente${items.length === 1 ? '' : 's'} de usar`
              : <>
                  {items.length} {isCompras
                    ? (items.length === 1 ? 'movimiento' : 'movimientos')
                    : (items.length === 1 ? 'canje' : 'canjes')}
                  {items.length > 0 && (isCompras
                    ? ` · +${ganados}${usados > 0 ? ` / −${usados}` : ''} pts`
                    : ` · ${usados} pts canjeados`)}
                </>}
          </div>
        </div>
        {/* Canjes: toggle de pendientes de entregar/usar */}
        {!isCompras ? (
          <button onClick={() => setPendingOnly(p => !p)} aria-label="Canjes pendientes" style={{
            width: 40, height: 40, border: 'none', cursor: 'pointer', padding: 0,
            borderRadius: 12, position: 'relative', flexShrink: 0,
            background: pendingOnly ? TH.chipOn : 'none',
            color: pendingOnly ? '#fff' : TH.header,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background .2s, color .2s',
          }}>
            <Clock />
            {!pendingOnly && pendingCount > 0 && (
              <span style={{
                position: 'absolute', top: 3, right: 3,
                minWidth: 16, height: 16, borderRadius: 8, padding: '0 4px',
                background: bento.red, color: '#fff',
                fontSize: 9.5, fontWeight: 800, lineHeight: '16px',
                fontFamily: "'DM Sans'", boxSizing: 'border-box',
              }}>
                {pendingCount}
              </span>
            )}
          </button>
        ) : (
          <div style={{ width: 40, flexShrink: 0 }} />
        )}
      </div>

      {/* Chips de período (ocultos en la vista de pendientes): fila fija
          que se reparte el ancho — sin barra de desplazamiento */}
      {!pendingOnly && (<>
      <div style={{ display: 'flex', gap: 7, padding: '10px 14px 8px' }}>
        {modes.map(m => (
          <button key={m.id} onClick={() => setMode(m.id)} style={{
            flex: '1 1 0', minWidth: 0, padding: '10px 2px', borderRadius: 12, border: 'none',
            background: mode === m.id ? TH.chipOn : TH.surface,
            color: mode === m.id ? '#fff' : TH.txt,
            fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 700, cursor: 'pointer',
            textAlign: 'center', whiteSpace: 'nowrap',
            transition: 'background .2s, color .2s',
          }}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Selector de mes (solo meses con movimientos) — wrap, sin scroll */}
      {mode === 'mes' && months.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, padding: '2px 14px 10px' }}>
          {months.map(ym => (
            <button key={ym} onClick={() => setSelMonth(ym)} style={subChip(selMonth === ym)}>
              {monthLabel(ym)}
            </button>
          ))}
        </div>
      )}

      {/* Selector de año (solo años con movimientos) — wrap, sin scroll */}
      {mode === 'anio' && years.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, padding: '2px 14px 10px' }}>
          {years.map(y => (
            <button key={y} onClick={() => setSelYear(y)} style={subChip(selYear === y)}>
              {y}
            </button>
          ))}
        </div>
      )}
      </>)}

      {/* Lista */}
      {items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: TH.sub }}>
          {pendingOnly && (
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
              <Gift />
            </div>
          )}
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            {pendingOnly
              ? 'No tenés canjes pendientes de usar'
              : (isCompras ? 'Sin movimientos de puntos en este período' : 'Sin canjes en este período')}
          </div>
        </div>
      )}

      <div style={{ padding: '0 16px' }}>
        {isCompras
          ? items.map((a, i) => {
              const day = itemDay(a.date);
              const pts = parseInt(a.pts, 10) || 0;
              const pos = pts > 0;
              const ActIcon = actIconFor(a);
              const good = isBlack ? '#7CD98F' : bento.green;
              const bad = isBlack ? '#FF8A80' : bento.red;
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  background: TH.surface, borderRadius: 16, marginBottom: 8,
                  animation: `slideIn .3s ${Math.min(i, 10) * 0.03}s both`,
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                    background: pos ? 'rgba(30,122,51,.12)' : 'rgba(214,40,26,.10)',
                    color: pos ? good : bad,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <ActIcon />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: TH.txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.desc}</div>
                    <div style={{ fontSize: 10, color: TH.sub, ...sMono, marginTop: 2 }}>{day}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: pos ? good : bad, flexShrink: 0 }}>
                    {pos ? '+' : ''}{pts}
                  </div>
                </div>
              );
            })
          : items.map((rd, i) => (
              <div key={rd.id || i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                background: TH.surface, borderRadius: 16, marginBottom: 8,
                animation: `slideIn .3s ${Math.min(i, 10) * 0.03}s both`,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: bento.teal, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <RewardIcon reward={rd.reward} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: TH.txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rd.reward?.name || 'Premio'}</div>
                  <div style={{ fontSize: 10, color: TH.sub, ...sMono, marginTop: 2 }}>{itemDay(rd.date)} · {rd.code}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: isBlack ? '#FF8A80' : bento.red }}>-{rd.cost} pts</div>
                  <div style={{
                    display: 'inline-block', marginTop: 3,
                    padding: '3px 8px', borderRadius: 8,
                    fontSize: 9, fontWeight: 800, letterSpacing: 0.3,
                    background: rd.collected
                      ? (isBlack ? 'rgba(30,122,51,.25)' : 'rgba(30,122,51,.12)')
                      : (isBlack ? 'rgba(217,164,11,.22)' : '#FAF1DC'),
                    color: rd.collected
                      ? (isBlack ? '#7CD98F' : bento.green)
                      : (isBlack ? '#FFD54F' : '#B58000'),
                  }}>
                    {rd.collected ? 'RECOGIDO' : 'PENDIENTE'}
                  </div>
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}
