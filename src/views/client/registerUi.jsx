// src/views/client/registerUi.jsx
// Helpers de UI del wizard de registro (extraídos de GoogleProfile.jsx —
// regla de modularidad <500 líneas). FORMATO GENERAL: flat, acento rojo
// de marca, iconos SVG en vez de emojis.
import { inputStyle, BRAND_RED, bento } from '../../constants/styles';
import { Check, Cake, Chev } from '../../components/ui/Icons';

// Barra de pasos del wizard
export function StepBar({ step }) {
  const steps = ['Datos\npersonales', 'Datos\nadicionales', 'Vehículos', 'Contraseña'];
  const idx = { step1: 0, step2: 1, step3: 2, step4: 3 }[step] ?? 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
      {steps.map((label, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: i <= idx ? BRAND_RED : '#E8E8EA', color: i <= idx ? '#fff' : '#9E9E9E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, boxShadow: i === idx ? '0 0 0 4px rgba(224,32,32,.15)' : 'none' }}>
              {i < idx ? <Check /> : i + 1}
            </div>
            <div style={{ fontSize: 9, fontWeight: 700, color: i <= idx ? BRAND_RED : '#9E9E9E', textAlign: 'center', whiteSpace: 'pre-line', lineHeight: 1.2 }}>{label}</div>
          </div>
          {i < steps.length - 1 && <div style={{ flex: 1, height: 2, background: i < idx ? BRAND_RED : '#E8E8EA', margin: '0 6px', marginBottom: 18 }} />}
        </div>
      ))}
    </div>
  );
}

// Resumen de puntos que ganará al registrarse
export function PtsCard({ total, base, optional, vehicles }) {
  return (
    <div style={{ background: bento.pageBg, borderRadius: 16, padding: '12px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontSize: 11, color: '#9E9E9E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5 }}>Puntos al registrarte</div>
        <div style={{ fontSize: 11, color: '#9E9E9E', marginTop: 2 }}>Base {base} + opcionales {optional} + vehículos {vehicles}</div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color: bento.green, fontVariantNumeric: 'tabular-nums' }}>{total}</div>
    </div>
  );
}

// Campo de texto con icono SVG a la izquierda
export function Field({ icon, placeholder, fieldKey, type, inputMode, maxLen, bonus,
                        regProfile, setRegProfile, clearAuthErr, regOptional }) {
  const val    = regProfile[fieldKey] || '';
  const filled = val.trim().length > 0;
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9E9E9E', display: 'flex', zIndex: 1 }}>{icon}</div>
      <input
        placeholder={placeholder} type={type || 'text'} inputMode={inputMode} maxLength={maxLen}
        value={val}
        onChange={e => {
          let v = inputMode === 'numeric' ? e.target.value.replace(/[^0-9]/g, '') : e.target.value;
          if (maxLen && v.length > maxLen) v = v.slice(0, maxLen);
          setRegProfile(p => ({ ...p, [fieldKey]: v }));
          clearAuthErr();
        }}
        style={{ ...inputStyle, paddingLeft: 42 }}
      />
      {bonus && filled && (
        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 10, fontWeight: 800, color: bento.green, background: '#E8F5E9', padding: '2px 8px', borderRadius: 8 }}>+{regOptional} pts</div>
      )}
    </div>
  );
}

// Campo fecha: texto plano, abre el drum picker en bottom sheet
export function DateField({ value, onOpen }) {
  const formatDisplay = v => {
    if (!v || !v.includes('-')) return null;
    const [y, m, d] = v.split('-').map(Number);
    if (!y || !m || !d) return null;
    const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return `${String(d).padStart(2,'0')} / ${months[m-1]} / ${y}`;
  };
  const display = formatDisplay(value);
  return (
    <div onClick={onOpen} style={{ ...inputStyle, paddingLeft: 42, display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative', color: display ? '#0D0D0D' : '#9E9E9E', userSelect: 'none' }}>
      <div style={{ position: 'absolute', left: 14, color: '#9E9E9E', display: 'flex' }}><Cake /></div>
      <span style={{ flex: 1 }}>{display || 'Fecha de nacimiento *'}</span>
      <span style={{ color: '#BDBDBD', display: 'flex' }}><Chev /></span>
    </div>
  );
}
