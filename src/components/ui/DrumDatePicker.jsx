// src/components/ui/DrumDatePicker.jsx
// Drum picker de fecha (nacimiento) + bottom sheet contenedor.
// Extraído de GoogleProfile.jsx (regla de modularidad <500 líneas).
// F0.3.9.2: todos los componentes viven a nivel de módulo — declararlos
// dentro del padre creaba un tipo nuevo por render y remontaba el tambor.
import { useState, useRef, useEffect } from 'react';
import { BRAND_ORANGE } from '../../constants/styles';

const ITEM_H   = 48;
const VISIBLE  = 5;
const CENTER_Y = ITEM_H * Math.floor(VISIBLE / 2);

function DrumPicker({ items, selectedIndex, onChange }) {
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
          <div key={i} style={{ height: ITEM_H, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: i === selectedIndex ? 17 : 14, fontWeight: i === selectedIndex ? 800 : 400, color: i === selectedIndex ? '#0D0D0D' : '#BDBDBD', fontFamily: "'DM Sans'", userSelect: 'none' }}>
            {item.label}
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: CENTER_Y, background: 'linear-gradient(to bottom, rgba(255,255,255,.97), rgba(255,255,255,0))', pointerEvents: 'none', zIndex: 3 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: CENTER_Y, background: 'linear-gradient(to top, rgba(255,255,255,.97), rgba(255,255,255,0))', pointerEvents: 'none', zIndex: 3 }} />
    </div>
  );
}

const MONTHS      = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS_ITEMS  = Array.from({ length: 31 }, (_, i) => ({ label: String(i + 1).padStart(2, '0') }));
const MONTH_ITEMS = MONTHS.map(m => ({ label: m }));

export function DateDrumPicker({ value, onChange }) {
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

  const emit = (d, m, y) => {
    const year  = parseInt(years[y].label);
    onChange(`${year}-${String(m + 1).padStart(2,'0')}-${String(d + 1).padStart(2,'0')}`);
  };

  return (
    <div style={{ display: 'flex', background: '#fff', borderRadius: 16, overflow: 'hidden' }}>
      <DrumPicker items={DAYS_ITEMS}  selectedIndex={di} onChange={i => { setDi(i); emit(i, mi, yi); }} />
      <div style={{ width: 1, background: '#F0F0F0' }} />
      <DrumPicker items={MONTH_ITEMS} selectedIndex={mi} onChange={i => { setMi(i); emit(di, i, yi); }} />
      <div style={{ width: 1, background: '#F0F0F0' }} />
      <DrumPicker items={years}       selectedIndex={yi} onChange={i => { setYi(i); emit(di, mi, i); }} />
    </div>
  );
}

// Bottom sheet del drum picker (FORMATO GENERAL: flat, acción en rojo)
export const DatePickerSheet = ({ tempDate, setTempDate, setShowDatePicker, setRegProfile }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
    <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '0 0 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
        <button onClick={() => setShowDatePicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#9E9E9E', fontFamily: "'DM Sans'" }}>Cancelar</button>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#0D0D0D' }}>Fecha de nacimiento</div>
        <button onClick={() => { setRegProfile(p => ({ ...p, bday: tempDate })); setShowDatePicker(false); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 800, color: BRAND_ORANGE, fontFamily: "'DM Sans'" }}>Seleccionar</button>
      </div>
      <div style={{ padding: '12px 20px 0' }}>
        <DateDrumPicker value={tempDate} onChange={setTempDate} />
      </div>
    </div>
  </div>
);
