// src/views/client/ClientMenu.jsx
// Pestaña MENÚ al FORMATO GENERAL (R1b.4): flat/minimalista, cero
// emojis (iconos SVG), tarjeta de miembro y opciones en filas planas.
// Las secciones viven en views/client/menu/ (modularidad <500 líneas).
// El botón físico de volver cierra la sección abierta (useBackLayer).
import { useState } from 'react';
import { sMono, bento } from '../../constants/styles';
import { User, StarLine, Warn, Clipboard, Info, Door, Chev, ArrowLeft, Sun, Moon } from '../../components/ui/Icons';
import ModeToggle from '../../components/ui/ModeToggle';
import GalaxyDust from '../../components/ui/GalaxyDust';
import LegalFooter from '../../components/ui/LegalFooter';
import useBackLayer from '../../hooks/useBackLayer';
import { menuTheme, tierBand } from './menu/menuUi';
import MenuAccount from './menu/MenuAccount';
import { MenuLevels, MenuInactivity, MenuAbout } from './menu/MenuInfo';
import MenuTerms from './menu/MenuTerms';

const MENU_ITEMS = [
  { id: 'cuenta',      icon: <User />,      label: 'Mi Cuenta' },
  { id: 'niveles',     icon: <StarLine />,  label: 'Niveles y Beneficios' },
  { id: 'inactividad', icon: <Warn />,      label: 'Reglas de Inactividad' },
  { id: 'terminos',    icon: <Clipboard />, label: 'Términos y Condiciones' },
  { id: 'acerca',      icon: <Info />,      label: 'Acerca de Puntos Plus' },
];

export default function ClientMenu(ctx) {
  const { me, cfg, cTier, logout, setCScr, dark, setUiMode } = ctx;
  const tier = cTier?.name || 'ORO';
  const TH = menuTheme(tier, dark);

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

      {/* Encabezado de usuario con la identidad del nivel (estructura de
          menú.png): círculo grande — foto de la cuenta de Google si
          existe, si no la inicial — con la información del usuario a la
          derecha, y debajo los datos del nivel (pill NIVEL X + puntos).
          Predomina el color del tier; BLACK conserva su galaxia. */}
      {me && (
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 20, background: tierBand(tier), color: '#fff', padding: '18px', marginBottom: 16 }}>
          {tier === 'BLACK' && <GalaxyDust n={10} />}
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {me.avatar ? (
                <img src={me.avatar} alt="" referrerPolicy="no-referrer"
                  style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2.5px solid rgba(255,255,255,.45)' }} />
              ) : (
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, flexShrink: 0 }}>
                  {(me.name || '?')[0].toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{me.name}</div>
                <div style={{ ...sMono, fontSize: 11, opacity: .85, marginTop: 3 }}>{me.cardId || '—'}</div>
                {me.email && (
                  <div style={{ fontSize: 11.5, opacity: .8, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{me.email}</div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.25)' }}>
              <div style={{ background: 'rgba(255,255,255,.25)', borderRadius: 8, padding: '4px 12px', fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>
                Nivel {tier}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 26, fontWeight: 900, letterSpacing: -.5, fontVariantNumeric: 'tabular-nums' }}>{me.points}</span>
                <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, opacity: .9 }}>Puntos</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Opciones — un solo bloque con divisores finos e iconos inline
          (estructura de la referencia) */}
      <div style={{ background: TH.surface, borderRadius: 20, overflow: 'hidden', marginBottom: 12 }}>
        {MENU_ITEMS.map((item, i) => (
          <button key={item.id} onClick={() => setSection(item.id)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
            padding: '15px 16px', border: 'none', background: 'none',
            borderTop: i > 0 ? `1px solid ${TH.divider}` : 'none',
            cursor: 'pointer', fontFamily: "'DM Sans'", textAlign: 'left',
          }}>
            <span style={{ display: 'flex', color: TH.header, flexShrink: 0 }}>{item.icon}</span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: TH.header }}>{item.label}</span>
            <span style={{ color: TH.sub, display: 'flex' }}><Chev /></span>
          </button>
        ))}

        {/* Apariencia: elegir modo claro/oscuro (sol/luna) — misma
            elección que ofrece el login; persiste en el dispositivo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderTop: `1px solid ${TH.divider}` }}>
          <span style={{ display: 'flex', color: TH.header, flexShrink: 0 }}>{dark ? <Moon /> : <Sun />}</span>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: TH.header }}>Apariencia</span>
          <ModeToggle dark={dark} setUiMode={setUiMode} />
        </div>
      </div>

      {/* Cerrar sesión — tarjeta aparte en rojo, sin chevron (referencia) */}
      <button onClick={logout} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '15px 16px', borderRadius: 20, border: 'none',
        background: TH.surface, cursor: 'pointer',
        fontFamily: "'DM Sans'", textAlign: 'left',
      }}>
        <span style={{ display: 'flex', color: bento.red, flexShrink: 0 }}><Door /></span>
        <span style={{ fontSize: 14, fontWeight: 800, color: bento.red }}>Cerrar sesión</span>
      </button>

      {/* Disclaimer legal D28 */}
      <LegalFooter color={TH.sub} />
    </div>
  );
}
