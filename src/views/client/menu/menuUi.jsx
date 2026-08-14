// src/views/client/menu/menuUi.jsx
// Tema y piezas compartidas de la pestaña Menú (FORMATO GENERAL):
// superficies flat sin bordes ni sombras, claro para ORO/PLATINO y
// oscuro para BLACK.
import { bento, clientMainBg } from '../../../constants/styles';
import { ArrowLeft } from '../../../components/ui/Icons';

// `dark` = modo claro/oscuro elegido por el usuario (24-jul); sin él,
// el histórico: BLACK oscuro, ORO/PLATINO claro. BLACK claro usa fondo
// gris perla para conservar la identidad del nivel.
export const menuTheme = (tier, dark = tier === 'BLACK') => {
  const isDark = dark;
  return {
    isDark,
    // BLACK: transparente en ambos modos — el shell de App pinta el
    // fondo (galaxia o perla) y las estrellas en deriva se ven detrás.
    // El resto hereda clientMainBg para que el menú refleje el fondo
    // del nivel (PLATINO oscuro azulado, 14-ago).
    bg:      tier === 'BLACK' ? 'transparent' : isDark ? clientMainBg(tier, true) : bento.pageBg,
    surface: isDark ? 'rgba(255,255,255,.07)' : '#fff',
    inset:   isDark ? 'rgba(255,255,255,.05)' : '#F5F5F7',
    iconBox: isDark ? 'rgba(255,255,255,.12)' : '#0D0D0D',
    header:  isDark ? '#fff' : '#0D0D0D',
    text:    isDark ? '#E0E0E0' : '#424242',
    sub:     isDark ? 'rgba(255,255,255,.5)' : '#9E9E9E',
    divider: isDark ? 'rgba(255,255,255,.08)' : '#F2F2F4',
  };
};

// Acento y banda por identidad de nivel: ahora viven en styles.js (los
// comparten Rules/MemberDetail del admin) — re-export para los usos del menú.
export { tierAccent, tierBand } from '../../../constants/styles';

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
