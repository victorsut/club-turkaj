// src/views/client/registerUi.jsx
// Helpers de UI del wizard de registro (extraídos de GoogleProfile.jsx —
// regla de modularidad <500 líneas). FORMATO GENERAL: paleta
// naranja/negro/blanco, flat, iconos SVG.
import { useState } from 'react';
import { inputFlat, BRAND_ORANGE } from '../../constants/styles';
import { ArrowLeft, Cake, Chev } from '../../components/ui/Icons';

const STEP_IDX = { step1: 0, welcome: 0, step2: 1, step3: 2 };
const STEPS = 3;

// Superficie de campo/tarjeta según modo (versión oscura del inputFlat)
const flatBg = dark => dark ? 'rgba(255,255,255,.08)' : '#F5F5F7';

// Encabezado del wizard (patrón de la referencia: flecha suelta +
// título centrado) con progreso segmentado debajo.
export function WizardHeader({ step, onBack, dark }) {
  const idx = STEP_IDX[step] ?? 0;
  const ink = dark ? '#fff' : '#0D0D0D';
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
        <button onClick={onBack} aria-label="Volver"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: ink, width: 40 }}>
          <ArrowLeft />
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 800, color: ink }}>Crear cuenta</div>
        <div style={{ width: 40, textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#9E9E9E', fontVariantNumeric: 'tabular-nums' }}>{idx + 1}/{STEPS}</div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {Array.from({ length: STEPS }, (_, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= idx ? BRAND_ORANGE : (dark ? 'rgba(255,255,255,.14)' : '#ECECEE'), transition: 'background .2s' }} />
        ))}
      </div>
    </div>
  );
}

// Resumen de puntos que ganará al registrarse — superficie clara flat
// (el cuadro negro resultaba muy contrastante — feedback del dueño 22-jul)
export function PtsCard({ total, base, optional, vehicles, dark }) {
  return (
    <div style={{ background: flatBg(dark), borderRadius: 20, padding: '14px 18px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: 1 }}>Puntos al registrarte</div>
        <div style={{ fontSize: 11, color: '#9E9E9E', marginTop: 3 }}>Base {base} + opcionales {optional} + vehículos {vehicles}</div>
      </div>
      <div style={{ fontSize: 30, fontWeight: 900, color: BRAND_ORANGE, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{total}</div>
    </div>
  );
}

// Globo informativo anclado sobre un campo (lenguaje visual del Toast:
// píldora oscura flat con disco de color e icono SVG) con cola apuntando
// al campo. Se muestra mientras el campo está enfocado — énfasis del
// dueño (4-ago): datos que se verifican después del llenado.
export function InfoBubble({ icon, color, text, dark }) {
  const bg = dark ? '#2A2A30' : '#0D0D0D';
  return (
    <div className="pp-bubble" style={{ position: 'absolute', bottom: 'calc(100% + 9px)', left: 0, right: 0, background: bg, border: dark ? '1px solid rgba(255,255,255,.12)' : 'none', borderRadius: 14, padding: '9px 14px 9px 9px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', lineHeight: 1.4 }}>{text}</div>
      <div style={{ position: 'absolute', top: '100%', left: 24, width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: `7px solid ${bg}` }} />
    </div>
  );
}

// Campo de texto con icono SVG a la izquierda (relleno, sin borde).
// `mask` ({clean, format} de lib/inputMasks): el estado guarda el valor
// crudo y el input muestra el formateado con separadores automáticos.
// `transform` post-procesa el crudo (ej. capWords); `autoCap` pasa
// autoCapitalize al teclado del celular. `bubble` ({icon, color, text})
// muestra un InfoBubble sobre el campo mientras está enfocado.
export function Field({ icon, placeholder, fieldKey, type, inputMode, maxLen, bonus, mask, autoCap, transform, bubble,
                        regProfile, setRegProfile, clearAuthErr, regOptional, dark }) {
  const [focused, setFocused] = useState(false);
  const val    = regProfile[fieldKey] || '';
  const filled = val.trim().length > 0;
  return (
    <div style={{ position: 'relative', zIndex: bubble && focused ? 6 : undefined }}>
      {bubble && focused && <InfoBubble {...bubble} dark={dark} />}
      <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#9E9E9E', display: 'flex', zIndex: 1 }}>{icon}</div>
      <input
        placeholder={placeholder} type={type || 'text'} inputMode={inputMode}
        maxLength={mask ? undefined : maxLen} autoCapitalize={autoCap}
        value={mask ? mask.format(val) : val}
        onFocus={bubble ? () => setFocused(true) : undefined}
        onBlur={bubble ? () => setFocused(false) : undefined}
        onChange={e => {
          let v = mask ? mask.clean(e.target.value)
            : inputMode === 'numeric' ? e.target.value.replace(/[^0-9]/g, '') : e.target.value;
          if (transform) v = transform(v);
          if (maxLen && v.length > maxLen) v = v.slice(0, maxLen);
          setRegProfile(p => ({ ...p, [fieldKey]: v }));
          clearAuthErr();
        }}
        style={{ ...inputFlat, background: flatBg(dark), color: dark ? '#fff' : inputFlat.color, paddingLeft: 44 }}
      />
      {bonus && filled && (
        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 10, fontWeight: 800, color: BRAND_ORANGE, background: 'rgba(250,84,8,.1)', padding: '2px 8px', borderRadius: 8 }}>+{regOptional} pts</div>
      )}
    </div>
  );
}

// Campo fecha: texto plano, abre el drum picker en bottom sheet
export function DateField({ value, onOpen, dark }) {
  const formatDisplay = v => {
    if (!v || !v.includes('-')) return null;
    const [y, m, d] = v.split('-').map(Number);
    if (!y || !m || !d) return null;
    const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return `${String(d).padStart(2,'0')} / ${months[m-1]} / ${y}`;
  };
  const display = formatDisplay(value);
  return (
    <div onClick={onOpen} style={{ ...inputFlat, background: flatBg(dark), paddingLeft: 44, display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative', color: display ? (dark ? '#fff' : '#0D0D0D') : '#9E9E9E', userSelect: 'none' }}>
      <div style={{ position: 'absolute', left: 16, color: '#9E9E9E', display: 'flex' }}><Cake /></div>
      <span style={{ flex: 1 }}>{display || 'Fecha de nacimiento *'}</span>
      <span style={{ color: dark ? 'rgba(255,255,255,.4)' : '#BDBDBD', display: 'flex' }}><Chev /></span>
    </div>
  );
}
