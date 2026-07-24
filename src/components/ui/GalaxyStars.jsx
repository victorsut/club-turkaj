// src/components/ui/GalaxyStars.jsx
// Fondo galaxia del nivel BLACK: nebulosas tenues + estrellas en DERIVA
// vertical continua. Todo CSS puro (transform/opacity — barato en
// cualquier dispositivo): dos campos de estrellas idénticos apilados
// dentro de un contenedor al 200% que se desplaza -50% en loop →
// movimiento sin saltos. Extraído del bloque inline de App.jsx.
//
// `light` (24-jul): variante para BLACK en modo CLARO — la misma deriva
// sobre el fondo perla, con estrellas en dorado champán y gris (la
// identidad BLACK sin oscurecer la pantalla) y nebulosas cálidas muy
// suaves. El overlay va SIEMPRE debajo del contenido (App apila la
// vista activa con position:relative).
const DARK_NEBULAS = 'radial-gradient(ellipse at 15% 20%, rgba(28,26,58,.30) 0%, transparent 50%), radial-gradient(ellipse at 80% 15%, rgba(16,26,56,.22) 0%, transparent 45%), radial-gradient(ellipse at 50% 70%, rgba(30,20,48,.16) 0%, transparent 55%), radial-gradient(ellipse at 85% 80%, rgba(12,20,46,.16) 0%, transparent 40%)';
const LIGHT_NEBULAS = 'radial-gradient(ellipse at 15% 20%, rgba(216,169,78,.10) 0%, transparent 50%), radial-gradient(ellipse at 80% 15%, rgba(160,160,175,.10) 0%, transparent 45%), radial-gradient(ellipse at 50% 70%, rgba(216,169,78,.07) 0%, transparent 55%), radial-gradient(ellipse at 85% 80%, rgba(140,140,160,.08) 0%, transparent 40%)';

export default function GalaxyStars({ n = 60, light = false }) {
  // Color/brillo por estrella según el modo: oscuro = blancos/azulados
  // sobre la galaxia; claro = dorado champán + grises sobre perla.
  const starBg = (i) => light
    ? (i % 11 === 0 ? 'rgba(216,169,78,.9)'
      : i % 7 === 0 ? 'rgba(176,138,46,.75)'
      : i % 4 === 0 ? 'rgba(120,120,134,.55)'
      : `rgba(96,96,110,${i % 3 === 0 ? .42 : .24})`)
    : (i % 11 === 0 ? 'rgba(180,200,255,.9)'
      : i % 7 === 0 ? 'rgba(255,230,200,.8)'
      : i % 4 === 0 ? 'rgba(200,210,255,.6)'
      : `rgba(255,255,255,${i % 3 === 0 ? .5 : .25})`);
  const starGlow = (i) => light
    ? (i % 7 === 0 ? '0 0 3px rgba(216,169,78,.5)' : i % 11 === 0 ? '0 0 2px rgba(176,138,46,.4)' : 'none')
    : (i % 7 === 0 ? '0 0 3px rgba(180,200,255,.5)' : i % 11 === 0 ? '0 0 2px rgba(255,230,200,.4)' : 'none');

  const field = (top) => (
    <div key={top} style={{ position: 'absolute', left: 0, top: `${top}%`, width: '100%', height: '50%' }}>
      {[...Array(n)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: i % 7 === 0 ? 2 : i % 4 === 0 ? 1.3 : 0.6,
          height: i % 7 === 0 ? 2 : i % 4 === 0 ? 1.3 : 0.6,
          borderRadius: '50%',
          background: starBg(i),
          left: `${(i * 17.3 + 5.7) % 100}%`,
          top: `${(i * 23.7 + 3.1) % 100}%`,
          boxShadow: starGlow(i),
          animation: i % 5 === 0 ? `twinkle ${3 + (i % 4)}s ${(i % 8) * 0.4}s ease-in-out infinite` : 'none',
        }} />
      ))}
    </div>
  );

  return (
    <div aria-hidden style={{
      position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480, height: '100vh',
      pointerEvents: 'none', zIndex: 0, overflow: 'hidden',
    }}>
      {/* Nebulosas fijas — oscuras y desaturadas / cálidas muy suaves */}
      <div style={{ position: 'absolute', inset: 0, background: light ? LIGHT_NEBULAS : DARK_NEBULAS }} />
      {/* Deriva continua: dos campos idénticos en loop */}
      <div className="pp-star-scroll" style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '200%' }}>
        {field(0)}
        {field(50)}
      </div>
    </div>
  );
}
