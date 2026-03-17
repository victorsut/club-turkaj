// src/components/ui/TierDeco.jsx
// Holographic border, galaxy stars, and shooting stars for tier cards

export default function TierDeco({ name }) {
  if (name === 'BLACK') return <BlackDeco />;
  if (name === 'PLATINO') return <PlatinoDeco />;
  if (name === 'ORO') return <OroDeco />;
  return null;
}

/* ─── BLACK: galaxy + holographic border + 45 stars + shooting stars ─── */
function BlackDeco() {
  // Generate 45 stars
  const stars = [...Array(45)].map((_, i) => {
    const x = (i * 13.7 + Math.sin(i * 2.1) * 35 + 50) % 100;
    const y = (i * 17.3 + Math.cos(i * 1.7) * 30 + 50) % 100;
    const sz = i < 3 ? 2.5 : i < 10 ? 1.5 : i < 20 ? 1 : 0.6;
    const brightness = i < 3 ? 1 : i < 10 ? 0.5 : i < 20 ? 0.25 : 0.12;
    const dur = 4 + Math.random() * 6;
    const del = Math.random() * 8;
    const isWarm = i % 7 === 0;
    const color = isWarm ? `rgba(251,200,120,${brightness})` : `rgba(200,210,255,${brightness})`;
    const shadow = i < 3
      ? `0 0 ${sz + 3}px rgba(255,255,255,.6), 0 0 ${sz + 8}px rgba(180,170,255,.15)`
      : i < 10 ? `0 0 ${sz + 1}px rgba(255,255,255,.2)` : 'none';
    return (
      <div key={`s${i}`} style={{
        position: 'absolute', width: sz, height: sz, borderRadius: '50%',
        background: color, left: `${x}%`, top: `${y}%`, boxShadow: shadow,
        animation: `twinkle ${dur}s ${del}s ease-in-out infinite`, zIndex: 1,
      }} />
    );
  });

  // 3 bright stars with cross rays
  const brightStars = [
    { x: 12, y: 22, s: 3 }, { x: 78, y: 38, s: 3.5 }, { x: 42, y: 72, s: 2.5 },
  ].map((st, i) => (
    <div key={`bs${i}`} style={{
      position: 'absolute', left: `${st.x}%`, top: `${st.y}%`,
      width: st.s, height: st.s, borderRadius: '50%', background: '#fff',
      boxShadow: '0 0 3px #fff, 0 0 6px rgba(200,200,255,.5), 0 0 14px rgba(120,110,200,.2)',
      zIndex: 1, animation: `twinkle ${5 + i * 1.5}s ${i * 0.8}s ease-in-out infinite`,
    }}>
      <div style={{
        position: 'absolute', width: 16, height: 1,
        background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent)',
        top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
      }} />
      <div style={{
        position: 'absolute', width: 1, height: 16,
        background: 'linear-gradient(180deg,transparent,rgba(255,255,255,.35),transparent)',
        top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
      }} />
    </div>
  ));

  return (
    <>
      {/* Holographic rotating border */}
      <div style={{
        position: 'absolute', inset: -2, borderRadius: 22,
        background: 'conic-gradient(from 0deg, rgba(255,255,255,.55) 0%, rgba(255,255,255,.06) 8%, rgba(255,255,255,.4) 14%, rgba(255,255,255,.03) 22%, rgba(255,255,255,.6) 30%, rgba(255,255,255,.08) 40%, rgba(255,255,255,.35) 48%, rgba(255,255,255,.02) 55%, rgba(255,255,255,.5) 62%, rgba(255,255,255,.05) 72%, rgba(255,255,255,.45) 80%, rgba(255,255,255,.07) 88%, rgba(255,255,255,.55) 100%)',
        zIndex: 0, animation: 'bhRotate 12s linear infinite',
      }} />

      {/* Dark galaxy base */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 20,
        background: 'radial-gradient(ellipse at 20% 30%, #0d0d1a 0%, #050508 40%, #000 100%)',
        zIndex: 0,
      }} />

      {/* Edge glow lines */}
      {[
        { top: -2, left: '15%', width: '35%', height: 3, dur: 4, del: 0, opacity: 0.7 },
        { bottom: -2, left: '40%', width: '30%', height: 3, dur: 5, del: 1.5, opacity: 0.5 },
      ].map((g, i) => (
        <div key={`glow${i}`} style={{
          position: 'absolute', ...g,
          background: `radial-gradient(ellipse, rgba(255,255,255,${g.opacity}) 0%, rgba(200,210,255,.3) 40%, transparent 75%)`,
          borderRadius: '50%', filter: 'blur(1px)', zIndex: 1,
          animation: `bhFlicker ${g.dur}s ${g.del}s ease-in-out infinite`,
        }} />
      ))}

      {/* Side glow lines */}
      <div style={{
        position: 'absolute', top: '10%', left: -2, height: '35%', width: 3,
        background: 'radial-gradient(ellipse, rgba(255,255,255,.4) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(1px)', zIndex: 1,
        animation: 'bhFlicker 3.5s .8s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', top: '35%', right: -2, height: '40%', width: 3,
        background: 'radial-gradient(ellipse, rgba(255,255,255,.6) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(1px)', zIndex: 1,
        animation: 'bhFlicker 4.5s 2s ease-in-out infinite',
      }} />

      {/* Nebula layers */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 20,
        background: 'radial-gradient(ellipse at 15% 35%, rgba(20,15,40,.5) 0%, transparent 55%), radial-gradient(ellipse at 85% 65%, rgba(15,10,35,.4) 0%, transparent 50%)',
        zIndex: 1,
      }} />

      {/* Gold accent line */}
      <div style={{
        position: 'absolute', top: 1, left: 1, right: 1, height: 1,
        borderRadius: '20px 20px 0 0',
        background: 'linear-gradient(90deg,transparent 10%,rgba(251,188,4,.1) 30%,rgba(251,188,4,.2) 50%,rgba(251,188,4,.1) 70%,transparent 90%)',
        zIndex: 3,
      }} />

      {/* Milky Way drift */}
      <div style={{
        position: 'absolute', width: '200%', height: '25%', top: '35%', left: '-50%',
        background: 'linear-gradient(180deg, transparent 0%, rgba(140,130,180,.02) 25%, rgba(220,215,240,.06) 50%, rgba(140,130,180,.02) 75%, transparent 100%)',
        transform: 'rotate(-30deg)', zIndex: 1,
        animation: 'milkyDrift 25s ease-in-out infinite',
      }} />

      {/* Stars */}
      {stars}
      {brightStars}

      {/* Shooting stars */}
      <div style={{
        position: 'absolute', height: 1, top: '15%', left: '-15%',
        transform: 'rotate(-12deg)', zIndex: 2, opacity: 0,
        animation: 'shootStar1 9s 3s linear infinite',
      }}>
        <div style={{
          width: 50, height: 1,
          background: 'linear-gradient(90deg,rgba(251,200,150,.9) 0%,rgba(255,255,255,.6) 30%,transparent 100%)',
          borderRadius: 1, boxShadow: '0 0 6px rgba(251,188,4,.3)',
        }} />
      </div>
      <div style={{
        position: 'absolute', height: 1, top: '60%', left: '-15%',
        transform: 'rotate(-18deg)', zIndex: 2, opacity: 0,
        animation: 'shootStar2 14s 8s linear infinite',
      }}>
        <div style={{
          width: 35, height: 1,
          background: 'linear-gradient(90deg,rgba(200,210,255,.8) 0%,rgba(255,255,255,.4) 30%,transparent 100%)',
          borderRadius: 1, boxShadow: '0 0 4px rgba(150,160,255,.2)',
        }} />
      </div>

      {/* Subtle gold glow at bottom */}
      <div style={{
        position: 'absolute', bottom: 1, left: 1, right: 1, height: '30%',
        borderRadius: '0 0 20px 20px',
        background: 'linear-gradient(to top, rgba(251,188,4,.02) 0%, transparent 100%)',
        zIndex: 1,
      }} />
    </>
  );
}

/* ─── PLATINO: blue accent lines ─── */
function PlatinoDeco() {
  return (
    <>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,transparent,#1565C0,#42A5F5,#1565C0,transparent)', zIndex: 1 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,#1565C0,#42A5F5,#1565C0,transparent)', zIndex: 1 }} />
      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 1, background: 'linear-gradient(180deg,rgba(21,101,192,.4),rgba(21,101,192,.1),rgba(21,101,192,.4))', zIndex: 1 }} />
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 1, background: 'linear-gradient(180deg,rgba(21,101,192,.4),rgba(21,101,192,.1),rgba(21,101,192,.4))', zIndex: 1 }} />
    </>
  );
}

/* ─── ORO: subtle light orb ─── */
function OroDeco() {
  return (
    <div style={{
      position: 'absolute', top: '-30%', right: '-20%',
      width: '50%', height: '80%',
      background: 'rgba(255,255,255,.12)', borderRadius: '50%', zIndex: 0,
    }} />
  );
}
