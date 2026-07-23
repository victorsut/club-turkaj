// src/views/client/menu/menuUi.jsx
// Tema y piezas compartidas de la pestaña Menú (FORMATO GENERAL):
// superficies flat sin bordes ni sombras, claro para ORO/PLATINO y
// oscuro para BLACK.
import { bento } from '../../../constants/styles';
import { ArrowLeft } from '../../../components/ui/Icons';

export const menuTheme = (tier) => {
  const isDark = tier === 'BLACK';
  return {
    isDark,
    bg:      isDark ? '#06060C' : bento.pageBg,
    surface: isDark ? 'rgba(255,255,255,.07)' : '#fff',
    inset:   isDark ? 'rgba(255,255,255,.05)' : '#F5F5F7',
    iconBox: isDark ? 'rgba(255,255,255,.12)' : '#0D0D0D',
    header:  isDark ? '#fff' : '#0D0D0D',
    text:    isDark ? '#E0E0E0' : '#424242',
    sub:     isDark ? 'rgba(255,255,255,.5)' : '#9E9E9E',
    divider: isDark ? 'rgba(255,255,255,.08)' : '#F2F2F4',
  };
};

// Acento por identidad de nivel (mismos valores que el modal del home)
export const tierAccent = (tier) =>
  tier === 'BLACK' ? '#FBBC04' : tier === 'PLATINO' ? '#6B767D' : bento.gold;

// Fondo con la identidad del tier (banda de Niveles y header del menú)
export const tierBand = (tier) =>
  tier === 'BLACK' ? 'radial-gradient(ellipse at 20% 30%, #0d0d1a 0%, #050508 40%, #000 100%)'
    : tier === 'PLATINO' ? '#9EA7AD' : bento.gold;

// Encabezado de sección: flecha suelta + título centrado (patrón Promociones)
export function SectionHeader({ title, sub, onBack, TH }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button onClick={onBack} aria-label="Volver"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: TH.header, width: 40 }}>
          <ArrowLeft />
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: 900, color: TH.header }}>{title}</div>
        <div style={{ width: 40 }} />
      </div>
      {sub && <div style={{ textAlign: 'center', fontSize: 12, color: TH.sub, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
