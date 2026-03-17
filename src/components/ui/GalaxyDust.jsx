// src/components/ui/GalaxyDust.jsx
// Floating particle effect for BLACK tier backgrounds

export default function GalaxyDust({ n = 15 }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {[...Array(n)].map((_, i) => {
        const x = (i * 23.7 + 11.3) % 100;
        const y = (i * 31.1 + 7.9) % 100;
        const sz = i % 4 === 0 ? 1.5 : 0.8;
        const opacity = i % 4 === 0 ? 0.6 : 0.25;
        const dur = 3 + (i % 5) * 1.2;
        return (
          <div key={i} style={{
            position: 'absolute',
            width: sz, height: sz,
            borderRadius: '50%',
            background: `rgba(255,255,255,${opacity})`,
            left: `${x}%`, top: `${y}%`,
            animation: i % 3 === 0 ? `twinkle ${dur}s ${i * 0.4}s ease-in-out infinite` : 'none',
          }} />
        );
      })}
    </div>
  );
}
