// src/components/SplashIntro.jsx
// Animación de ENTRADA de la app (pedido del dueño 15-ago-2026):
// monedas con el monograma PP que vuelan hacia una moneda central y
// "acumulan" puntos en un contador, sobre la identidad del logo
// (naranja #FA5408, negro #0D0D0D, blanco). Todo CSS puro sobre
// transform/opacity (barato en cualquier teléfono) + un contador rAF.
//
// Reglas de comportamiento:
// - UNA vez por sesión del navegador (sessionStorage pp_splash_seen):
//   la recarga de la PWA al volver de la encuesta Shell NO la repite
//   (no puede retrasar el SurveyResultModal), y en la TWA cada
//   apertura en frío es sesión nueva → sí se muestra.
// - Solo en la vista CLIENTE (App la monta con isC); operador/admin
//   entran directo a trabajar.
// - Un tap la salta de inmediato (el usuario manda).
// - prefers-reduced-motion: sin vuelo de monedas ni rebotes — logo y
//   wordmark en fundido corto.
import { useEffect, useRef, useState } from 'react';
import { BRAND_ORANGE } from '../constants/styles';

const ORANGE_DEEP = '#C43D02'; // canto/borde de la moneda
const SPLASH_TOTAL = 2600;     // ms hasta iniciar la salida
const SPLASH_FADE = 420;       // ms del fundido de salida
const COUNT_FROM_MS = 520;     // el contador arranca con la 1ª moneda
const COUNT_UNTIL_MS = 2050;   // y cierra cuando llega la última
const COUNT_TARGET = 100;      // cifra simbólica de acumulación

// Moneda PP en SVG: disco naranja con canto profundo, estrías del
// borde (círculo punteado), monograma PP blanco y brillo especular.
function CoinPP({ size = 96 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden style={{ display: 'block' }}>
      <circle cx="48" cy="48" r="46" fill={ORANGE_DEEP} />
      <circle cx="48" cy="48" r="42.5" fill={BRAND_ORANGE} />
      {/* estrías del canto */}
      <circle cx="48" cy="48" r="38" fill="none" stroke="rgba(255,255,255,.4)"
        strokeWidth="1.6" strokeDasharray="2.4 3.4" />
      {/* relieve interior */}
      <circle cx="48" cy="48" r="33" fill="none" stroke="rgba(13,13,13,.18)" strokeWidth="2" />
      <text x="48" y="48" textAnchor="middle" dominantBaseline="central"
        fontFamily="'DM Sans', sans-serif" fontWeight="900" fontSize="34"
        letterSpacing="-2" fill="#fff">PP</text>
      {/* brillo especular arriba-izquierda */}
      <ellipse cx="34" cy="26" rx="16" ry="8" fill="rgba(255,255,255,.28)"
        transform="rotate(-28 34 26)" />
    </svg>
  );
}

// Trayectorias de las monedas satélite: desde fuera del lienzo hacia
// el centro, repartidas en abanico. delay escalonado = lluvia de
// puntos; el giro y el encogimiento venden la "absorción".
const SATELLITES = [
  { dx: -150, dy: -210, delay: 380, size: 46, spin: -300 },
  { dx: 165, dy: -160, delay: 560, size: 40, spin: 340 },
  { dx: -185, dy: 40, delay: 740, size: 52, spin: -260 },
  { dx: 175, dy: 120, delay: 920, size: 44, spin: 300 },
  { dx: -110, dy: 235, delay: 1100, size: 40, spin: -340 },
  { dx: 130, dy: 250, delay: 1280, size: 50, spin: 280 },
  { dx: -30, dy: -265, delay: 1460, size: 42, spin: 320 },
];

export default function SplashIntro() {
  const [phase, setPhase] = useState(() => {
    try { return sessionStorage.getItem('pp_splash_seen') ? 'done' : 'play'; }
    catch { return 'play'; }
  });
  const [count, setCount] = useState(0);
  const reduced = useRef(
    typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ).current;
  const leaveTimer = useRef(null);
  const goneTimer = useRef(null);

  // Salida: fundido y desmontaje (también la dispara el tap).
  const dismiss = () => {
    setPhase(p => {
      if (p !== 'play') return p;
      goneTimer.current = setTimeout(() => setPhase('done'), SPLASH_FADE);
      return 'leaving';
    });
  };

  useEffect(() => {
    if (phase !== 'play') return;
    // Marcar de una vez: si la app se recarga a media animación
    // (p. ej. deep-link) tampoco se repite en esta sesión.
    try { sessionStorage.setItem('pp_splash_seen', '1'); } catch { /* noop */ }

    const total = reduced ? 1300 : SPLASH_TOTAL;
    leaveTimer.current = setTimeout(dismiss, total);

    // Contador de acumulación sincronizado con la lluvia de monedas.
    let raf;
    if (reduced) {
      setCount(COUNT_TARGET);
    } else {
      const t0 = performance.now();
      const tick = (now) => {
        const t = now - t0;
        if (t < COUNT_FROM_MS) { raf = requestAnimationFrame(tick); return; }
        const p = Math.min((t - COUNT_FROM_MS) / (COUNT_UNTIL_MS - COUNT_FROM_MS), 1);
        const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic: cierra suave
        setCount(Math.round(eased * COUNT_TARGET));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }
    return () => {
      clearTimeout(leaveTimer.current);
      clearTimeout(goneTimer.current);
      if (raf) cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === 'done') return null;

  return (
    <div
      onClick={dismiss}
      role="presentation"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: '#0D0D0D',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: phase === 'leaving' ? 0 : 1,
        transition: `opacity ${SPLASH_FADE}ms ease`,
        cursor: 'pointer',
      }}
    >
      <style>{`
        @keyframes ppSplashHero {
          0% { transform: translateY(-46vh) scale(.5); opacity: 0; }
          55% { transform: translateY(0) scale(1.06); opacity: 1; }
          75% { transform: translateY(0) scale(.97); }
          100% { transform: translateY(0) scale(1); }
        }
        @keyframes ppSplashWobble {
          0%, 100% { transform: rotate(-4deg); }
          50% { transform: rotate(4deg); }
        }
        @keyframes ppSplashFly {
          0% { transform: translate(var(--dx), var(--dy)) rotate(0deg) scale(1); opacity: 0; }
          14% { opacity: 1; }
          70% { transform: translate(calc(var(--dx) * .22), calc(var(--dy) * .22)) rotate(calc(var(--spin) * .7)) scale(.85); opacity: 1; }
          100% { transform: translate(0, 0) rotate(var(--spin)) scale(.18); opacity: 0; }
        }
        @keyframes ppSplashPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(250,84,8,.35); }
          50% { box-shadow: 0 0 0 26px rgba(250,84,8,0); }
        }
        @keyframes ppSplashRise {
          0% { transform: translateY(14px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pp-splash-anim { animation: none !important; }
          .pp-splash-sat { display: none !important; }
          .pp-splash-fadeonly { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* halo de acumulación tras la moneda central */}
        <div className="pp-splash-anim" aria-hidden style={{
          position: 'absolute', top: 0, left: '50%',
          width: 96, height: 96, marginLeft: -48, borderRadius: '50%',
          animation: 'ppSplashPulse 1.1s .6s ease-out 2',
        }} />

        {/* moneda héroe: cae con rebote y queda oscilando suave */}
        <div className="pp-splash-anim pp-splash-fadeonly"
          style={{ animation: 'ppSplashHero .62s cubic-bezier(.2,.9,.3,1.15) both' }}>
          <div className="pp-splash-anim"
            style={{ animation: 'ppSplashWobble 2.4s .7s ease-in-out infinite' }}>
            <CoinPP size={96} />
          </div>
        </div>

        {/* monedas satélite: vuelan desde los bordes y se absorben */}
        {SATELLITES.map((s, i) => (
          <div key={i} className="pp-splash-sat" aria-hidden style={{
            position: 'absolute', top: 48 - s.size / 2, left: '50%',
            marginLeft: -s.size / 2,
            '--dx': `${s.dx}px`, '--dy': `${s.dy}px`, '--spin': `${s.spin}deg`,
            animation: `ppSplashFly .82s ${s.delay}ms cubic-bezier(.45,.05,.55,1) both`,
            willChange: 'transform, opacity',
          }}>
            <CoinPP size={s.size} />
          </div>
        ))}

        {/* contador de puntos acumulados */}
        <div className="pp-splash-anim pp-splash-fadeonly" style={{
          marginTop: 22, minHeight: 30,
          fontFamily: "'Space Mono', monospace", fontSize: 24, fontWeight: 700,
          color: BRAND_ORANGE, letterSpacing: -0.5,
          animation: 'ppSplashRise .4s .45s ease-out both',
        }}>
          +{count} <span style={{ fontSize: 14, color: 'rgba(255,255,255,.55)' }}>pts</span>
        </div>

        {/* wordmark PUNTOS PLUS (D30: blanco + naranja) */}
        <div className="pp-splash-anim pp-splash-fadeonly" style={{
          marginTop: 12, display: 'flex', flexDirection: 'column',
          alignItems: 'center', lineHeight: 1,
          animation: 'ppSplashRise .5s 1.5s ease-out both',
        }}>
          <span style={{ fontSize: 15, fontWeight: 900, letterSpacing: 5, color: '#fff' }}>PUNTOS</span>
          <span style={{ fontSize: 30, fontWeight: 900, letterSpacing: 3.5, color: BRAND_ORANGE, marginTop: 2 }}>PLUS</span>
        </div>
      </div>
    </div>
  );
}
