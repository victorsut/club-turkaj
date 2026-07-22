// src/views/client/registerUi.jsx
// Helpers de UI del wizard de registro (extraídos de GoogleProfile.jsx —
// regla de modularidad <500 líneas). FORMATO GENERAL: paleta
// naranja/negro/blanco, flat, iconos SVG.
import { inputFlat, BRAND_ORANGE } from '../../constants/styles';
import { ArrowLeft, Cake, Chev } from '../../components/ui/Icons';

const STEP_IDX = { step1: 0, welcome: 0, step2: 1, step3: 2 };
const STEPS = 3;

// Encabezado del wizard (patrón de la referencia: flecha suelta +
// título centrado) con progreso segmentado debajo.
export function WizardHeader({ step, onBack }) {
  const idx = STEP_IDX[step] ?? 0;
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
        <button onClick={onBack} aria-label="Volver"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: '#0D0D0D', width: 40 }}>
          <ArrowLeft />
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 800, color: '#0D0D0D' }}>Crear cuenta</div>
        <div style={{ width: 40, textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#9E9E9E', fontVariantNumeric: 'tabular-nums' }}>{idx + 1}/{STEPS}</div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {Array.from({ length: STEPS }, (_, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= idx ? BRAND_ORANGE : '#ECECEE', transition: 'background .2s' }} />
        ))}
      </div>
    </div>
  );
}

// Resumen de puntos que ganará al registrarse — superficie clara flat
// (el cuadro negro resultaba muy contrastante — feedback del dueño 22-jul)
export function PtsCard({ total, base, optional, vehicles }) {
  return (
    <div style={{ background: '#F5F5F7', borderRadius: 20, padding: '14px 18px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: 1 }}>Puntos al registrarte</div>
        <div style={{ fontSize: 11, color: '#9E9E9E', marginTop: 3 }}>Base {base} + opcionales {optional} + vehículos {vehicles}</div>
      </div>
      <div style={{ fontSize: 30, fontWeight: 900, color: BRAND_ORANGE, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{total}</div>
    </div>
  );
}

// Campo de texto con icono SVG a la izquierda (relleno, sin borde)
export function Field({ icon, placeholder, fieldKey, type, inputMode, maxLen, bonus,
                        regProfile, setRegProfile, clearAuthErr, regOptional }) {
  const val    = regProfile[fieldKey] || '';
  const filled = val.trim().length > 0;
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#9E9E9E', display: 'flex', zIndex: 1 }}>{icon}</div>
      <input
        placeholder={placeholder} type={type || 'text'} inputMode={inputMode} maxLength={maxLen}
        value={val}
        onChange={e => {
          let v = inputMode === 'numeric' ? e.target.value.replace(/[^0-9]/g, '') : e.target.value;
          if (maxLen && v.length > maxLen) v = v.slice(0, maxLen);
          setRegProfile(p => ({ ...p, [fieldKey]: v }));
          clearAuthErr();
        }}
        style={{ ...inputFlat, paddingLeft: 44 }}
      />
      {bonus && filled && (
        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 10, fontWeight: 800, color: BRAND_ORANGE, background: 'rgba(250,84,8,.1)', padding: '2px 8px', borderRadius: 8 }}>+{regOptional} pts</div>
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
    <div onClick={onOpen} style={{ ...inputFlat, paddingLeft: 44, display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative', color: display ? '#0D0D0D' : '#9E9E9E', userSelect: 'none' }}>
      <div style={{ position: 'absolute', left: 16, color: '#9E9E9E', display: 'flex' }}><Cake /></div>
      <span style={{ flex: 1 }}>{display || 'Fecha de nacimiento *'}</span>
      <span style={{ color: '#BDBDBD', display: 'flex' }}><Chev /></span>
    </div>
  );
}
