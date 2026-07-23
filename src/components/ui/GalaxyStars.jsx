// src/components/ui/GalaxyStars.jsx
// Fondo galaxia del nivel BLACK: nebulosas tenues (oscuras, poco
// púrpura — pedido 23-jul) + estrellas en DERIVA vertical continua.
// Todo CSS puro (transform/opacity — barato en cualquier dispositivo):
// dos campos de estrellas idénticos apilados dentro de un contenedor
// al 200% que se desplaza -50% en loop → movimiento sin saltos.
// Extraído del bloque inline de App.jsx al ganar animación.
export default function GalaxyStars({ n = 60 }) {
  const field = (top) => (
    <div key={top} style={{ position: 'absolute', left: 0, top: `${top}%`, width: '100%', height: '50%' }}>
      {[...Array(n)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: i % 7 === 0 ? 2 : i % 4 === 0 ? 1.3 : 0.6,
          height: i % 7 === 0 ? 2 : i % 4 === 0 ? 1.3 : 0.6,
          borderRadius: '50%',
          background: i % 11 === 0 ? 'rgba(180,200,255,.9)' : i % 7 === 0 ? 'rgba(255,230,200,.8)' : i % 4 === 0 ? 'rgba(200,210,255,.6)' : `rgba(255,255,255,${i % 3 === 0 ? .5 : .25})`,
          left: `${(i * 17.3 + 5.7) % 100}%`,
          top: `${(i * 23.7 + 3.1) % 100}%`,
          boxShadow: i % 7 === 0 ? '0 0 3px rgba(180,200,255,.5)' : i % 11 === 0 ? '0 0 2px rgba(255,230,200,.4)' : 'none',
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
      {/* Nebulosas fijas, oscuras y desaturadas */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 15% 20%, rgba(28,26,58,.30) 0%, transparent 50%), radial-gradient(ellipse at 80% 15%, rgba(16,26,56,.22) 0%, transparent 45%), radial-gradient(ellipse at 50% 70%, rgba(30,20,48,.16) 0%, transparent 55%), radial-gradient(ellipse at 85% 80%, rgba(12,20,46,.16) 0%, transparent 40%)',
      }} />
      {/* Deriva continua: dos campos idénticos en loop */}
      <div className="pp-star-scroll" style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '200%' }}>
        {field(0)}
        {field(50)}
      </div>
    </div>
  );
}
