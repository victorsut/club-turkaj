// src/components/ui/LogoSpinner.jsx
// Spinner de marca: círculo de arcos (negro + rojo de marca) girando.
// Mismo trazo que el spinner de arranque en index.html — si se ajusta
// uno, ajustar el otro.
// `dark` cambia el arco negro a blanco para fondos oscuros (tema admin).
import { BRAND_RED } from '../../constants/styles';

export default function LogoSpinner({ size = 40, dark = false, label = null }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <svg
        width={size} height={size} viewBox="0 0 48 48"
        role="img" aria-label="Cargando"
        style={{ animation: 'spin 1s linear infinite', display: 'block' }}
      >
        <path d="M9.86 38.14A20 20 0 0 1 34 6.68" fill="none" stroke={dark ? '#fff' : '#0D0D0D'} strokeWidth="4.5" strokeLinecap="round" />
        <path d="M38.14 9.86A20 20 0 0 1 18.82 43.32" fill="none" stroke={BRAND_RED} strokeWidth="4.5" strokeLinecap="round" />
      </svg>
      {label && (
        <div style={{ fontSize: 13, fontWeight: 700, color: dark ? '#9E9E9E' : '#757575' }}>{label}</div>
      )}
    </div>
  );
}
