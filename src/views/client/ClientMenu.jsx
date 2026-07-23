// src/views/client/ClientMenu.jsx
// Pestaña MENÚ al FORMATO GENERAL (R1b.4): flat/minimalista, cero
// emojis (iconos SVG), tarjeta de miembro y opciones en filas planas.
// Las secciones viven en views/client/menu/ (modularidad <500 líneas).
// El botón físico de volver cierra la sección abierta (useBackLayer).
import { useState } from 'react';
import { sMono, BRAND_ORANGE, bento } from '../../constants/styles';
import { User, StarLine, Warn, Clipboard, Info, Door, Chev, ArrowLeft } from '../../components/ui/Icons';
import LegalFooter from '../../components/ui/LegalFooter';
import useBackLayer from '../../hooks/useBackLayer';
import { menuTheme, tierAccent } from './menu/menuUi';
import MenuAccount from './menu/MenuAccount';
import { MenuLevels, MenuInactivity, MenuAbout } from './menu/MenuInfo';
import MenuTerms from './menu/MenuTerms';

const MENU_ITEMS = [
  { id: 'cuenta',      icon: <User />,      label: 'Mi Cuenta',               desc: 'Editar datos personales' },
  { id: 'niveles',     icon: <StarLine />,  label: 'Niveles y Beneficios',    desc: 'ORO, PLATINO y BLACK' },
  { id: 'inactividad', icon: <Warn />,      label: 'Reglas de Inactividad',   desc: 'Condiciones de degradación' },
  { id: 'terminos',    icon: <Clipboard />, label: 'Términos y Condiciones',  desc: 'Condiciones de uso del programa' },
  { id: 'acerca',      icon: <Info />,      label: 'Acerca de Puntos Plus',   desc: 'Aviso legal e información' },
];

export default function ClientMenu(ctx) {
  const { me, cfg, cTier, logout, setCScr } = ctx;
  const tier = cTier?.name || 'ORO';
  const TH = menuTheme(tier);

  const [section, setSection] = useState(null);
  const closeSection = () => setSection(null);
  useBackLayer(!!section, closeSection);

  const shell = { minHeight: '100vh', background: TH.bg, padding: '20px 20px 110px' };

  if (section === 'cuenta')      return <div style={shell}><MenuAccount ctx={ctx} TH={TH} onBack={closeSection} /></div>;
  if (section === 'niveles')     return <div style={shell}><MenuLevels cfg={cfg} cTier={cTier} me={me} TH={TH} onBack={closeSection} /></div>;
  if (section === 'inactividad') return <div style={shell}><MenuInactivity cfg={cfg} TH={TH} onBack={closeSection} /></div>;
  if (section === 'terminos')    return <div style={shell}><MenuTerms TH={TH} onBack={closeSection} /></div>;
  if (section === 'acerca')      return <div style={shell}><MenuAbout TH={TH} onBack={closeSection} /></div>;

  // ── MENÚ PRINCIPAL ───────────────────────────────────────
  return (
    <div style={shell}>
      {/* Header: flecha suelta + título centrado (patrón Promociones) */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
        <button onClick={() => setCScr && setCScr('home')} aria-label="Volver"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: TH.header, width: 40 }}>
          <ArrowLeft />
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: 900, color: TH.header }}>Menú</div>
        <div style={{ width: 40 }} />
      </div>

      {/* Tarjeta de miembro */}
      {me && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 20, background: TH.surface, marginBottom: 22 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: TH.iconBox, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: '#fff', flexShrink: 0, fontFamily: "'DM Sans'" }}>
            {(me.name || '?')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: TH.header, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{me.name}</div>
            <div style={{ fontSize: 11, color: TH.sub, marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ ...sMono, fontSize: 11 }}>{me.cardId || '—'}</span>
              <span style={{ color: tierAccent(tier), fontWeight: 800 }}>{tier}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: BRAND_ORANGE, fontVariantNumeric: 'tabular-nums' }}>{me.points}</div>
            <div style={{ fontSize: 9, color: TH.sub, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Puntos</div>
          </div>
        </div>
      )}

      {/* Opciones */}
      {MENU_ITEMS.map(item => (
        <button key={item.id} onClick={() => setSection(item.id)} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 16px', borderRadius: 16, border: 'none',
          background: TH.surface, marginBottom: 10, cursor: 'pointer',
          fontFamily: "'DM Sans'", textAlign: 'left',
        }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: TH.iconBox, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {item.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: TH.header }}>{item.label}</div>
            <div style={{ fontSize: 11.5, color: TH.sub, marginTop: 2 }}>{item.desc}</div>
          </div>
          <span style={{ color: TH.sub, display: 'flex' }}><Chev /></span>
        </button>
      ))}

      {/* Cerrar sesión */}
      <button onClick={logout} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 16px', borderRadius: 16, border: 'none',
        background: TH.surface, marginTop: 8, cursor: 'pointer',
        fontFamily: "'DM Sans'", textAlign: 'left',
      }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: bento.red, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Door />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: bento.red }}>Cerrar sesión</div>
          <div style={{ fontSize: 11.5, color: TH.sub, marginTop: 2 }}>Salir de Puntos Plus</div>
        </div>
      </button>

      {/* Disclaimer legal D28 */}
      <LegalFooter color={TH.sub} />
    </div>
  );
}
