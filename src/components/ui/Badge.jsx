// src/components/ui/Badge.jsx
import { Star } from './Icons';

export default function Badge({ t }) {
  if (t.name === 'BLACK') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 3,
        padding: '3px 10px', borderRadius: 20, fontSize: 10,
        fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase',
        color: '#fff', position: 'relative', overflow: 'hidden',
        border: '1px solid rgba(255,255,255,.15)',
      }}>
        <span style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 20% 30%, #0d0d1a 0%, #050508 40%, #000 100%)',
          zIndex: 0,
        }} />
        {[...Array(10)].map((_, i) => (
          <span key={i} style={{
            position: 'absolute',
            width: i % 3 === 0 ? 1.2 : 0.6,
            height: i % 3 === 0 ? 1.2 : 0.6,
            borderRadius: '50%',
            background: `rgba(255,255,255,${i % 3 === 0 ? .8 : .3})`,
            left: `${(i * 23 + 8) % 100}%`,
            top: `${(i * 31 + 12) % 100}%`,
            zIndex: 0,
          }} />
        ))}
        <span style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          <Star /> {t.name}
        </span>
      </span>
    );
  }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '3px 10px', borderRadius: 20, fontSize: 10,
      fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase',
      background: t.bg, color: t.color,
    }}>
      <Star /> {t.name}
    </span>
  );
}
