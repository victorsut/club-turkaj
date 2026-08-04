// src/components/ui/DrumDatePicker.jsx
// Drum picker de fecha (nacimiento) + bottom sheet contenedor.
// Extraído de GoogleProfile.jsx (regla de modularidad <500 líneas).
// F0.3.9.2: todos los componentes viven a nivel de módulo — declararlos
// dentro del padre creaba un tipo nuevo por render y remontaba el tambor.
import { useState, useRef, useEffect } from 'react';
import { BRAND_ORANGE } from '../../constants/styles';
import { ArrowLeft } from './Icons';

const ITEM_H   = 48;
const VISIBLE  = 5;
const CENTER_Y = ITEM_H * Math.floor(VISIBLE / 2);

function DrumPicker({ items, selectedIndex, onChange, dark }) {
  const indexToY = idx => CENTER_Y - idx * ITEM_H;
  const yToIndex = y   => Math.round((CENTER_Y - y) / ITEM_H);

  const translateRef  = useRef(indexToY(selectedIndex));
  const [displayY, setDisplayY]     = useState(translateRef.current);
  const [isSnapping, setIsSnapping] = useState(false);
  const isDragging    = useRef(false);
  const startYRef     = useRef(0);
  const startTransRef = useRef(0);
  const containerRef  = useRef(null);

  useEffect(() => {
    if (!isDragging.current) {
      const target = indexToY(selectedIndex);
      translateRef.current = target;
      setIsSnapping(true);
      setDisplayY(target);
    }
  }, [selectedIndex]);

  const onDown = e => {
    e.preventDefault();
    isDragging.current    = true;
    startYRef.current     = e.clientY;
    startTransRef.current = translateRef.current;
    setIsSnapping(false);
    containerRef.current?.setPointerCapture(e.pointerId);
  };
  const onMove = e => {
    if (!isDragging.current) return;
    const newY = startTransRef.current + (e.clientY - startYRef.current);
    translateRef.current = newY;
    setDisplayY(newY);
  };
  const onUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const idx    = Math.max(0, Math.min(items.length - 1, yToIndex(translateRef.current)));
    const snappy = indexToY(idx);
    translateRef.current = snappy;
    setIsSnapping(true);
    setDisplayY(snappy);
    onChange(idx);
  };

  return (
    <div ref={containerRef}
      style={{ flex: 1, height: ITEM_H * VISIBLE, overflow: 'hidden', position: 'relative', cursor: 'grab', touchAction: 'none', userSelect: 'none' }}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
    >
      <div style={{ position: 'absolute', top: CENTER_Y, left: 6, right: 6, height: ITEM_H, background: 'rgba(250,84,8,.06)', borderRadius: 10, borderTop: '1.5px solid rgba(250,84,8,.35)', borderBottom: '1.5px solid rgba(250,84,8,.35)', pointerEvents: 'none', zIndex: 2 }} />
      <div style={{ transform: `translateY(${displayY}px)`, transition: isSnapping ? 'transform .22s ease' : 'none', willChange: 'transform' }}>
        {items.map((item, i) => (
          <div key={i} style={{ height: ITEM_H, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: i === selectedIndex ? 17 : 14, fontWeight: i === selectedIndex ? 800 : 400, color: i === selectedIndex ? (dark ? '#fff' : '#0D0D0D') : (dark ? 'rgba(255,255,255,.35)' : '#BDBDBD'), fontFamily: "'DM Sans'", userSelect: 'none' }}>
            {item.label}
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: CENTER_Y, background: dark ? 'linear-gradient(to bottom, rgba(22,22,26,.97), rgba(22,22,26,0))' : 'linear-gradient(to bottom, rgba(255,255,255,.97), rgba(255,255,255,0))', pointerEvents: 'none', zIndex: 3 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: CENTER_Y, background: dark ? 'linear-gradient(to top, rgba(22,22,26,.97), rgba(22,22,26,0))' : 'linear-gradient(to top, rgba(255,255,255,.97), rgba(255,255,255,0))', pointerEvents: 'none', zIndex: 3 }} />
    </div>
  );
}

const MONTHS      = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MONTH_ITEMS = MONTHS.map(m => ({ label: m }));

export function DateDrumPicker({ value, onChange, dark }) {
  const maxYear = new Date().getFullYear() - 16;
  const years   = Array.from({ length: maxYear - 1930 + 1 }, (_, i) => ({ label: String(1930 + i) }));

  const parse = () => {
    if (value && value.includes('-')) {
      const [y, m, d] = value.split('-').map(Number);
      const yi = years.findIndex(yr => yr.label === String(y));
      return { d: isNaN(d) ? 0 : d - 1, m: isNaN(m) ? 0 : m - 1, y: yi < 0 ? years.findIndex(yr => yr.label === '2000') : yi };
    }
    const def = years.findIndex(yr => yr.label === '2000');
    return { d: 0, m: 0, y: def < 0 ? 0 : def };
  };

  const init = parse();
  const [di, setDi] = useState(init.d);
  const [mi, setMi] = useState(init.m);
  const [yi, setYi] = useState(init.y);

  // Días reales del mes/año elegido — evita fechas inválidas (31/feb)
  const daysIn   = (m, y) => new Date(parseInt(years[y].label), m + 1, 0).getDate();
  const dayItems = Array.from({ length: daysIn(mi, yi) }, (_, i) => ({ label: String(i + 1).padStart(2, '0') }));

  const emit = (d, m, y) => {
    const year  = parseInt(years[y].label);
    onChange(`${year}-${String(m + 1).padStart(2,'0')}-${String(d + 1).padStart(2,'0')}`);
  };

  // Al cambiar mes/año, el día se ajusta si supera los días del mes
  const pickDay   = i => { setDi(i); emit(i, mi, yi); };
  const pickMonth = i => { const d = Math.min(di, daysIn(i, yi) - 1); setMi(i); setDi(d); emit(d, i, yi); };
  const pickYear  = i => { const d = Math.min(di, daysIn(mi, i) - 1); setYi(i); setDi(d); emit(d, mi, i); };

  return (
    <div style={{ display: 'flex', background: dark ? '#16161A' : '#fff', borderRadius: 16, overflow: 'hidden' }}>
      <DrumPicker items={dayItems}    selectedIndex={di} onChange={pickDay} dark={dark} />
      <div style={{ width: 1, background: dark ? 'rgba(255,255,255,.08)' : '#F0F0F0' }} />
      <DrumPicker items={MONTH_ITEMS} selectedIndex={mi} onChange={pickMonth} dark={dark} />
      <div style={{ width: 1, background: dark ? 'rgba(255,255,255,.08)' : '#F0F0F0' }} />
      <DrumPicker items={years}       selectedIndex={yi} onChange={pickYear} dark={dark} />
    </div>
  );
}

// Modal CENTRADO del drum picker (FORMATO GENERAL: flat; antes bottom
// sheet — pedido del dueño 4-ago). Cierra con la animación inversa en
// TODOS los caminos (regla D35): Cancelar, Seleccionar y tap-fuera.
export const DatePickerSheet = ({ tempDate, setTempDate, setShowDatePicker, setRegProfile, dark }) => {
  const [closing, setClosing] = useState(false);
  const close = (apply) => {
    if (closing) return;
    if (apply) setRegProfile(p => ({ ...p, bday: tempDate }));
    setClosing(true);
    setTimeout(() => setShowDatePicker(false), 200);
  };
  return (
    <div onClick={() => close(false)}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: closing ? 'ppFadeOut .2s ease forwards' : 'ppFade .2s ease' }}>
      <div className={closing ? 'pp-pop-out' : 'pp-pop'} onClick={e => e.stopPropagation()}
        style={{ background: dark ? '#16161A' : '#fff', borderRadius: 24, width: '100%', maxWidth: 380, padding: '14px 18px 16px' }}>
        {/* Salida = flecha suelta arriba-izquierda (regla de los modales
            del inicio — GrowModal); no hay botón Cancelar */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <button onClick={() => close(false)} aria-label="Volver"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: dark ? '#fff' : '#0D0D0D', width: 36 }}>
            <ArrowLeft />
          </button>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 800, color: dark ? '#fff' : '#0D0D0D' }}>Fecha de nacimiento</div>
          <div style={{ width: 36 }} />
        </div>
        <DateDrumPicker value={tempDate} onChange={setTempDate} dark={dark} />
        <button onClick={() => close(true)}
          style={{ width: '100%', padding: 13, borderRadius: 14, border: 'none', background: BRAND_ORANGE, color: '#fff', fontFamily: "'DM Sans'", fontWeight: 800, cursor: 'pointer', fontSize: 13, marginTop: 16 }}>Seleccionar</button>
      </div>
    </div>
  );
};
