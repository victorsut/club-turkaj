// src/components/ui/RoleSwitcher.jsx
import { adminTheme, GAL, clientTheme } from '../../constants/styles';

const roles = [
  { k: 'admin', l: '🔧 Admin' },
  { k: 'operator', l: '⛽ Operador' },
  { k: 'client', l: '📱 Miembro' },
];

export default function RoleSwitcher({ view, onSwitch, tierName, authScreen }) {
  const isA = view === 'admin';
  const isO = view === 'operator';
  const TH = clientTheme(tierName);

  return (
    <div style={{
      display: 'flex',
      background: isA ? '#2A2A2A'
        : isO ? '#FFF8E1'
        : tierName === 'BLACK' ? 'rgba(255,255,255,.06)'
        : tierName === 'PLATINO' ? '#D6D6D6' : '#F5F5F5',
      borderRadius: 14, padding: 4, margin: '12px 20px',
      border: isA ? '1px solid #3A3A3A'
        : isO ? '1px solid #FBBC04'
        : tierName === 'BLACK' ? '1px solid rgba(255,255,255,.08)'
        : tierName === 'PLATINO' ? '1px solid #BDBDBD' : '1px solid #eee',
    }}>
      {roles.map(v => (
        <button key={v.k} onClick={() => onSwitch(v.k)} style={{
          flex: 1, padding: 10, border: 'none', borderRadius: 11,
          background: view === v.k
            ? (v.k === 'admin' || v.k === 'operator' ? '#FBBC04' : TH.btnBg)
            : 'none',
          color: view === v.k
            ? (v.k === 'admin' || v.k === 'operator' ? '#0D0D0D' : TH.btnTxt)
            : (isA ? '#777' : isO ? '#9E9E9E' : tierName === 'BLACK' ? '#aaa' : '#9E9E9E'),
          fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 700,
          cursor: 'pointer', position: 'relative', overflow: 'hidden',
        }}>
          {view === v.k && v.k === 'client' && tierName === 'BLACK' && authScreen === 'logged' && (
            <span style={{ position: 'absolute', inset: 0, background: GAL, borderRadius: 11, zIndex: 0 }} />
          )}
          <span style={{ position: 'relative', zIndex: 1 }}>{v.l}</span>
        </button>
      ))}
    </div>
  );
}
