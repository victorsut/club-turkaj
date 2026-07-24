// src/components/ui/ModeToggle.jsx
// Selector de modo claro/oscuro (sol/luna) — cápsula flat con la opción
// activa resaltada. Se usa en el login y en el Menú; escribe uiMode
// ('light'/'dark'), que persiste en localStorage vía App.jsx.
import { Sun, Moon } from './Icons';

export default function ModeToggle({ dark, setUiMode, style }) {
  const opt = (k, icon, active, label) => (
    <button
      onClick={() => setUiMode(k)}
      aria-label={label}
      style={{
        width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? (dark ? '#fff' : '#0D0D0D') : 'transparent',
        color: active ? (dark ? '#0D0D0D' : '#fff') : (dark ? 'rgba(255,255,255,.6)' : '#9E9E9E'),
        transition: 'background .2s ease, color .2s ease',
      }}
    >
      {icon}
    </button>
  );

  return (
    <div style={{
      display: 'inline-flex', gap: 2, padding: 3, borderRadius: 999,
      background: dark ? 'rgba(255,255,255,.12)' : '#F0F0F2', ...style,
    }}>
      {opt('light', <Sun size={17} />, !dark, 'Modo claro')}
      {opt('dark', <Moon size={17} />, dark, 'Modo oscuro')}
    </div>
  );
}
