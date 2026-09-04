// src/views/client/history/HistoryFilters.jsx
// Filtros compactos del historial (pedido del dueño 4-sep-2026): de
// hasta TRES filas de chips (período · mes/año · tipo) a UNA fila de
// períodos + un ICONO de tipo en la esquina superior derecha.
//   · PeriodRow: una sola fila desplazable derivada de los datos —
//     "Hoy" (si hay movimientos hoy), los meses con movimientos, los
//     años y "Todo". Valor: 'hoy' | 'm:YYYY-MM' | 'y:YYYY' | 'todo'.
//   · TypeFilterButton: embudo en el hueco derecho del encabezado (el
//     mismo que ocupa el reloj de pendientes en Canjes); abre un menú
//     anclado con "Todos" + los grupos CON movimientos, cada uno con su
//     icono; con un tipo elegido el embudo se pinta de acento y lleva
//     un punto (misma lectura que el globito rojo del reloj).
import { useEffect, useState } from 'react';
import ChipScroller from '../../../components/ui/ChipScroller';
import { Fuel, Gift, Ticket, Clipboard, Cake, StarLine, Check } from '../../../components/ui/Icons';

const MES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
export const monthLabel = (ym) => `${MES_CORTO[parseInt(ym.slice(5, 7), 10) - 1] || '?'} ${ym.slice(0, 4)}`;

// Etiqueta legible del período (para el subtítulo del encabezado)
export const periodLabel = (p) => {
  if (p === 'hoy') return 'Hoy';
  if (p === 'todo') return 'Todo';
  if (p?.startsWith('m:')) return monthLabel(p.slice(2));
  if (p?.startsWith('y:')) return p.slice(2);
  return '';
};

export function PeriodRow({ hasToday, months, years, value, onChange, chip }) {
  const opts = [
    ...(hasToday ? [{ id: 'hoy', label: 'Hoy' }] : []),
    ...months.map(ym => ({ id: `m:${ym}`, label: monthLabel(ym) })),
    ...years.map(y => ({ id: `y:${y}`, label: y })),
    { id: 'todo', label: 'Todo' },
  ];
  return (
    <ChipScroller padding="10px 14px 8px">
      {opts.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)} style={chip(value === o.id)}>
          {o.label}
        </button>
      ))}
    </ChipScroller>
  );
}

const GROUP_ICONS = { compra: Fuel, canje: Gift, rifa: Ticket, encuesta: Clipboard, evento: Cake, otros: StarLine };

const FunnelIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 5h18l-7 8.5V19l-4 2v-7.5L3 5z" />
  </svg>
);

export function TypeFilterButton({ groups, value, onChange, TH }) {
  const [open, setOpen] = useState(false);
  const active = value !== 'todos';
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const items = [{ id: 'todos', label: 'Todos', Icon: null }, ...groups.map(g => ({ ...g, Icon: GROUP_ICONS[g.id] || StarLine }))];

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button onClick={() => setOpen(o => !o)} aria-label="Filtrar por tipo" aria-expanded={open} style={{
        width: 40, height: 40, border: 'none', cursor: 'pointer', padding: 0,
        borderRadius: 12, position: 'relative',
        background: active || open ? TH.chipOn : 'none',
        color: active || open ? TH.chipInk : TH.header,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background .2s, color .2s',
      }}>
        <FunnelIcon />
        {active && (
          <span style={{
            position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4,
            background: '#fff', border: `2px solid ${TH.chipOn}`, boxSizing: 'content-box',
          }} />
        )}
      </button>

      {open && (
        <>
          {/* tocar fuera cierra */}
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 3 }} />
          <div role="menu" style={{
            position: 'absolute', top: 46, right: 0, zIndex: 4, minWidth: 190,
            background: TH.menuBg, borderRadius: 16, padding: 6,
            boxShadow: '0 12px 32px rgba(0,0,0,.28)', border: `1px solid ${TH.border}`,
            animation: 'ppFade .15s ease',
          }}>
            {items.map(it => {
              const sel = value === it.id;
              return (
                <button key={it.id} role="menuitemradio" aria-checked={sel}
                  onClick={() => { onChange(it.id); setOpen(false); }} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 11, border: 'none', cursor: 'pointer',
                    background: sel ? TH.chipOn : 'transparent',
                    color: sel ? TH.chipInk : TH.txt,
                    fontFamily: "'DM Sans'", fontSize: 13, fontWeight: sel ? 800 : 700, textAlign: 'left',
                  }}>
                  <span style={{ width: 20, display: 'flex', justifyContent: 'center', opacity: it.Icon ? 1 : .0 }}>
                    {it.Icon ? <it.Icon /> : <StarLine />}
                  </span>
                  <span style={{ flex: 1 }}>{it.label}</span>
                  {sel && <Check />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
