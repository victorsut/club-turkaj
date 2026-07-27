// src/components/ui/AddressPicker.jsx
// Dirección del miembro en cascada: Departamento → Municipio → Cantón.
// Quiché y Chichicastenango vienen preseleccionados (la mayoría de
// clientes); cambiar el departamento recarga los municipios. Solo
// Chichicastenango tiene lista de cantones — el resto usa texto libre.
// Reutilizado por el wizard de registro y Mi Cuenta.
import { useState } from 'react';
import { inputFlat, BRAND_ORANGE } from '../../constants/styles';
import { Pin, House, Chev, Check, Search, XMark } from './Icons';
import { DEPT_NAMES, munisOf, cantonesOf, isAddressComplete, DEFAULT_DEPT, DEFAULT_MUNI } from '../../constants/geoGt';

export const EMPTY_ADDRESS = { dept: DEFAULT_DEPT, muni: DEFAULT_MUNI, canton: '' };

// ── Bottom sheet de opciones (patrón DatePickerSheet: flat, zIndex 500) ──
function PickerSheet({ title, options, value, onSelect, onClose, dark }) {
  const [q, setQ] = useState('');
  const ink = dark ? '#fff' : '#0D0D0D';
  // Búsqueda sin acentos (NFD + strip de diacríticos combinantes)
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const shown = q.trim() ? options.filter(o => norm(o).includes(norm(q))) : options;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: dark ? '#16161A' : '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '0 0 24px', display: 'flex', flexDirection: 'column', maxHeight: '72vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,.08)' : '#f0f0f0'}`, flexShrink: 0 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#9E9E9E', fontFamily: "'DM Sans'" }}>Cancelar</button>
          <div style={{ fontSize: 15, fontWeight: 800, color: ink }}>{title}</div>
          <div style={{ width: 56 }} />
        </div>
        {options.length > 12 && (
          <div style={{ padding: '12px 20px 4px', flexShrink: 0, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 36, top: '50%', transform: 'translateY(-42%)', color: '#9E9E9E', display: 'flex', zIndex: 1 }}><Search /></div>
            <input placeholder="Buscar..." value={q} onChange={e => setQ(e.target.value)}
              style={{ ...inputFlat, background: dark ? 'rgba(255,255,255,.08)' : '#F5F5F7', color: ink, paddingLeft: 44, paddingRight: 40 }} />
            {q && (
              <button onClick={() => setQ('')} aria-label="Limpiar búsqueda"
                style={{ position: 'absolute', right: 30, top: '50%', transform: 'translateY(-42%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9E9E9E', display: 'flex', padding: 2 }}><XMark /></button>
            )}
          </div>
        )}
        <div style={{ overflowY: 'auto', padding: '8px 20px 0', WebkitOverflowScrolling: 'touch' }}>
          {shown.map(o => {
            const sel = o === value;
            return (
              <button key={o} onClick={() => { onSelect(o); onClose(); }} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                padding: '13px 14px', marginBottom: 6, borderRadius: 14, border: 'none', cursor: 'pointer',
                background: sel ? 'rgba(250,84,8,.1)' : (dark ? 'rgba(255,255,255,.05)' : '#F5F5F7'),
                fontFamily: "'DM Sans'", fontSize: 14.5, fontWeight: sel ? 800 : 600,
                color: sel ? BRAND_ORANGE : ink,
              }}>
                <span style={{ flex: 1 }}>{o}</span>
                {sel && <span style={{ display: 'flex', color: BRAND_ORANGE }}><Check /></span>}
              </button>
            );
          })}
          {shown.length === 0 && (
            <div style={{ textAlign: 'center', fontSize: 13, color: '#9E9E9E', padding: '20px 0' }}>Sin resultados</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Fila tappable con mini-etiqueta interna (autoexplicativa) ──
function PickRow({ label, valueTxt, placeholder, icon, onOpen, disabled, chip, dark, fieldBg }) {
  const ink = dark ? '#fff' : '#0D0D0D';
  return (
    <div onClick={disabled ? undefined : onOpen} style={{
      ...inputFlat, height: 'auto', padding: '9px 14px 9px 44px',
      background: fieldBg, display: 'flex', alignItems: 'center',
      cursor: disabled ? 'default' : 'pointer', position: 'relative',
      userSelect: 'none', opacity: disabled ? .5 : 1,
    }}>
      <div style={{ position: 'absolute', left: 16, color: '#9E9E9E', display: 'flex' }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: .5 }}>{label}</div>
        <div style={{ fontSize: 14.5, fontWeight: valueTxt ? 700 : 500, color: valueTxt ? ink : '#9E9E9E', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {valueTxt || placeholder}
        </div>
      </div>
      {chip}
      <span style={{ color: dark ? 'rgba(255,255,255,.4)' : '#BDBDBD', display: 'flex', marginLeft: 8 }}><Chev /></span>
    </div>
  );
}

export default function AddressPicker({ value, onChange, dark, bonusPts, fieldBg }) {
  const v = value || EMPTY_ADDRESS;
  const [sheet, setSheet] = useState(null); // 'dept' | 'muni' | 'canton' | null
  const bg = fieldBg || (dark ? 'rgba(255,255,255,.08)' : '#F5F5F7');
  const cantones = cantonesOf(v.dept, v.muni);
  // El chip de bonus acompaña al campo que COMPLETA la dirección:
  // en Chichicastenango el cantón; en el resto, el municipio elegido.
  const bonusChip = bonusPts && isAddressComplete(v) ? (
    <div style={{ fontSize: 10, fontWeight: 800, color: BRAND_ORANGE, background: 'rgba(250,84,8,.1)', padding: '2px 8px', borderRadius: 8, flexShrink: 0 }}>+{bonusPts} pts</div>
  ) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {sheet === 'dept' && (
        <PickerSheet title="Departamento" options={DEPT_NAMES} value={v.dept} dark={dark}
          onClose={() => setSheet(null)}
          onSelect={d => { if (d !== v.dept) onChange({ dept: d, muni: '', canton: '' }); }} />
      )}
      {sheet === 'muni' && (
        <PickerSheet title="Municipio" options={munisOf(v.dept)} value={v.muni} dark={dark}
          onClose={() => setSheet(null)}
          onSelect={m => { if (m !== v.muni) onChange({ ...v, muni: m, canton: '' }); }} />
      )}
      {sheet === 'canton' && cantones && (
        <PickerSheet title="Cantón" options={cantones} value={v.canton} dark={dark}
          onClose={() => setSheet(null)}
          onSelect={c => onChange({ ...v, canton: c })} />
      )}

      <PickRow label="Departamento" valueTxt={v.dept} placeholder="Seleccionar departamento"
        icon={<Pin />} onOpen={() => setSheet('dept')} dark={dark} fieldBg={bg} />
      <PickRow label="Municipio" valueTxt={v.muni} placeholder="Seleccionar municipio"
        icon={<Pin />} onOpen={() => setSheet('muni')} disabled={!v.dept}
        chip={cantones ? null : bonusChip} dark={dark} fieldBg={bg} />
      {cantones ? (
        <PickRow label="Cantón" valueTxt={v.canton} placeholder="Seleccionar cantón"
          icon={<House />} onOpen={() => setSheet('canton')} disabled={!v.muni} chip={bonusChip} dark={dark} fieldBg={bg} />
      ) : (
        <div style={{ position: 'relative', opacity: v.muni ? 1 : .5 }}>
          <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#9E9E9E', display: 'flex', zIndex: 1 }}><House /></div>
          <input placeholder="Cantón, aldea o zona (opcional)" value={v.canton || ''} disabled={!v.muni}
            onChange={e => onChange({ ...v, canton: e.target.value })}
            style={{ ...inputFlat, background: bg, color: dark ? '#fff' : inputFlat.color, paddingLeft: 44 }} />
        </div>
      )}
    </div>
  );
}
