// src/components/SplashIntro.jsx
// Animación de ENTRADA de la app (pedido del dueño 15-ago-2026, v2
// "más moderna y dinámica"): una moneda PP entra con volteo 3D, un
// anillo de progreso naranja se dibuja a su alrededor mientras 9
// monedas satélite entran en ARCO (easings distintos por eje = curva)
// y se absorben; contador de puntos sincronizado, destello que barre
// la moneda y wordmark PUNTOS PLUS. Identidad del logo: naranja
// #FA5408, negro #0D0D0D, blanco. Todo CSS puro transform/opacity +
// un contador rAF (barato en cualquier teléfono).
//
// CUÁNDO se muestra (regla del dueño 15-ago):
// - Cliente SIN sesión (pantalla de login): en CADA carga/recarga
//   manual de la página.
// - Cliente logueado: solo el arranque en frío (una vez por sesión,
//   sessionStorage pp_splash_seen) — la recarga de la PWA al volver
//   de la encuesta Shell NO la repite ni retrasa el SurveyResultModal;
//   cada apertura en frío de la TWA sí la muestra.
// - Solo vista CLIENTE (App la monta con isC); operador/admin no.
// - Un tap la salta. prefers-reduced-motion = versión estática corta.
import { useEffect, useRef, useState } from 'react';
import { BRAND_ORANGE } from '../constants/styles';

const ORANGE_DEEP = '#C43D02'; // canto/borde de la moneda
const SPLASH_TOTAL = 2400;     // ms hasta iniciar la salida
const SPLASH_FADE = 380;       // ms del fundido de salida
const COUNT_FROM_MS = 420;     // el contador arranca con la 1ª moneda
const COUNT_UNTIL_MS = 1850;   // y cierra cuando llega la última
const COUNT_TARGET = 100;      // cifra simbólica de acumulación
const RING_R = 56;             // radio del anillo de progreso
const RING_C = 2 * Math.PI * RING_R;

// Moneda PP en SVG: disco naranja con degradado metálico, canto
// profundo, estrías del borde, monograma PP blanco y brillo especular.
function CoinPP({ size = 96, id = 'c' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`ppg-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF7A33" />
          <stop offset="55%" stopColor={BRAND_ORANGE} />
          <stop offset="100%" stopColor="#E04303" />
        </linearGradient>
      </defs>
      <circle cx="48" cy="48" r="46" fill={ORANGE_DEEP} />
      <circle cx="48" cy="48" r="42.5" fill={`url(#ppg-${id})`} />
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
// el centro, en abanico y con delay escalonado corto (lluvia ágil).
// El ARCO sale de animar X e Y en elementos anidados con easings
// distintos — misma técnica barata de partículas.
const SATELLITES = [
  { dx: -150, dy: -215, delay: 300, size: 46, spin: -300 },
  { dx: 170, dy: -165, delay: 420, size: 40, spin: 340 },
  { dx: -190, dy: 45, delay: 540, size: 52, spin: -260 },
  { dx: 180, dy: 125, delay: 660, size: 44, spin: 300 },
  { dx: -115, dy: 240, delay: 780, size: 40, spin: -340 },
  { dx: 135, dy: 255, delay: 900, size: 50, spin: 280 },
  { dx: -35, dy: -270, delay: 1020, size: 42, spin: 320 },
  { dx: 200, dy: -30, delay: 1140, size: 38, spin: -290 },
  { dx: -70, dy: 275, delay: 1260, size: 44, spin: 310 },
];

// Chispas de fondo: puntos naranjas/blancos en deriva lenta (dan
// profundidad sin robar atención; posiciones deterministas).
const SPARKS = [...Array(10)].map((_, i) => ({
  left: (i * 31.7 + 8.3) % 100,
  top: (i * 43.1 + 6.9) % 100,
  size: i % 3 === 0 ? 3 : 2,
  orange: i % 2 === 0,
  dur: 2.4 + (i % 4) * 0.5,
  delay: (i % 5) * 0.3,
}));

export default function SplashIntro({ loggedAtMount = false }) {
  const [phase, setPhase] = useState(() => {
    // Regla del dueño: en el LOGIN se muestra en cada recarga; con
    // sesión de miembro solo una vez por sesión del navegador.
    if (!loggedAtMount) return 'play';
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

  // Salida: fundido con leve zoom y desmontaje (también la dispara el tap).
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
    // (p. ej. deep-link) tampoco se repite en esta sesión con login.
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
        background: 'radial-gradient(circle at 50% 38%, #1A120C 0%, #0D0D0D 55%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: phase === 'leaving' ? 0 : 1,
        transition: `opacity ${SPLASH_FADE}ms ease`,
        cursor: 'pointer', overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes ppSplashFlip {
          0% { transform: rotateY(230deg) scale(.35) translateY(-30px); opacity: 0; }
          45% { opacity: 1; }
          80% { transform: rotateY(-12deg) scale(1.05) translateY(0); }
          100% { transform: rotateY(0deg) scale(1) translateY(0); }
        }
        @keyframes ppSplashFloat {
          0%, 100% { transform: translateY(0) rotate(-2.5deg); }
          50% { transform: translateY(-5px) rotate(2.5deg); }
        }
        @keyframes ppSplashFlyX {
          0% { transform: translateX(var(--dx)); opacity: 0; }
          10% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateX(0); opacity: 0; }
        }
        @keyframes ppSplashFlyY {
          0% { transform: translateY(var(--dy)) rotate(0deg) scale(1); }
          70% { transform: translateY(calc(var(--dy) * .18)) rotate(calc(var(--spin) * .7)) scale(.85); }
          100% { transform: translateY(0) rotate(var(--spin)) scale(.15); }
        }
        @keyframes ppSplashRing {
          0% { stroke-dashoffset: ${RING_C.toFixed(1)}; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes ppSplashPulse {
          0% { box-shadow: 0 0 0 0 rgba(250,84,8,.4); }
          100% { box-shadow: 0 0 0 30px rgba(250,84,8,0); }
        }
        @keyframes ppSplashGlow {
          0% { opacity: 0; transform: scale(.6); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes ppSplashSheen {
          0% { transform: translateX(-130%) rotate(18deg); }
          100% { transform: translateX(130%) rotate(18deg); }
        }
        @keyframes ppSplashRise {
          0% { transform: translateY(16px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes ppSplashTrackIn {
          0% { letter-spacing: 12px; opacity: 0; }
          100% { letter-spacing: 5px; opacity: 1; }
        }
        @keyframes ppSplashPop {
          0%, 100% { transform: scale(1); }
          40% { transform: scale(1.14); }
        }
        @keyframes ppSplashDrift {
          0%, 100% { transform: translateY(0); opacity: .25; }
          50% { transform: translateY(-16px); opacity: .8; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pp-splash-anim { animation: none !important; }
          .pp-splash-sat, .pp-splash-spark, .pp-splash-sheen { display: none !important; }
          .pp-splash-fadeonly { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>

      {/* chispas de fondo en deriva */}
      {SPARKS.map((s, i) => (
        <div key={i} className="pp-splash-spark" aria-hidden style={{
          position: 'absolute', left: `${s.left}%`, top: `${s.top}%`,
          width: s.size, height: s.size, borderRadius: '50%',
          background: s.orange ? 'rgba(250,84,8,.8)' : 'rgba(255,255,255,.6)',
          animation: `ppSplashDrift ${s.dur}s ${s.delay}s ease-in-out infinite`,
        }} />
      ))}

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* resplandor naranja tras la moneda */}
        <div className="pp-splash-anim" aria-hidden style={{
          position: 'absolute', top: -30, left: '50%',
          width: 240, height: 240, marginLeft: -120, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(250,84,8,.22) 0%, rgba(250,84,8,0) 65%)',
          animation: 'ppSplashGlow .8s .15s ease-out both',
        }} />

        {/* bloque héroe 128×128: anillo de progreso + moneda con volteo 3D */}
        <div style={{ position: 'relative', width: 128, height: 128, perspective: 700 }}>
          {/* anillo de progreso: se dibuja mientras llegan las monedas */}
          <svg className="pp-splash-anim pp-splash-fadeonly" width="128" height="128" viewBox="0 0 128 128" aria-hidden
            style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)', animation: 'ppSplashRise .4s .3s ease-out both' }}>
            <circle cx="64" cy="64" r={RING_R} fill="none" stroke="rgba(255,255,255,.09)" strokeWidth="4" />
            <circle className="pp-splash-anim" cx="64" cy="64" r={RING_R} fill="none"
              stroke={BRAND_ORANGE} strokeWidth="4" strokeLinecap="round"
              strokeDasharray={RING_C.toFixed(1)}
              style={{ animation: `ppSplashRing 1.45s .42s cubic-bezier(.3,.1,.3,1) both` }} />
          </svg>

          {/* pulsos de absorción */}
          <div className="pp-splash-anim" aria-hidden style={{
            position: 'absolute', top: 16, left: 16, width: 96, height: 96, borderRadius: '50%',
            animation: 'ppSplashPulse .6s .55s ease-out 3',
          }} />

          {/* moneda héroe: volteo 3D + flotación; destello que la barre */}
          <div className="pp-splash-anim pp-splash-fadeonly"
            style={{ position: 'absolute', top: 16, left: 16, animation: 'ppSplashFlip .7s cubic-bezier(.2,.8,.3,1.1) both', transformStyle: 'preserve-3d' }}>
            <div className="pp-splash-anim"
              style={{ animation: 'ppSplashFloat 2.6s .8s ease-in-out infinite' }}>
              <div style={{ position: 'relative', width: 96, height: 96, borderRadius: '50%', overflow: 'hidden' }}>
                <CoinPP size={96} id="hero" />
                <div className="pp-splash-sheen" aria-hidden style={{
                  position: 'absolute', top: -20, left: 0, width: 46, height: 140,
                  background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.45) 50%, rgba(255,255,255,0) 100%)',
                  animation: 'ppSplashSheen .7s 1.55s ease-in-out both',
                }} />
              </div>
            </div>
          </div>

          {/* monedas satélite: arco (X e Y con easings distintos) + giro */}
          {SATELLITES.map((s, i) => (
            <div key={i} className="pp-splash-sat" aria-hidden style={{
              position: 'absolute', top: 64 - s.size / 2, left: 64 - s.size / 2,
              '--dx': `${s.dx}px`, '--dy': `${s.dy}px`, '--spin': `${s.spin}deg`,
              animation: `ppSplashFlyX .68s ${s.delay}ms cubic-bezier(.5,.05,.45,1) both`,
              willChange: 'transform, opacity',
            }}>
              <div style={{ animation: `ppSplashFlyY .68s ${s.delay}ms cubic-bezier(.7,0,.25,1) both` }}>
                <CoinPP size={s.size} id={`s${i}`} />
              </div>
            </div>
          ))}
        </div>

        {/* contador de puntos acumulados (pop al cerrar la cifra) */}
        <div className="pp-splash-anim pp-splash-fadeonly" style={{
          marginTop: 18, minHeight: 36,
          animation: 'ppSplashRise .4s .38s ease-out both',
        }}>
          <div className="pp-splash-anim" style={{
            fontFamily: "'Space Mono', monospace", fontSize: 30, fontWeight: 700,
            color: BRAND_ORANGE, letterSpacing: -1,
            animation: 'ppSplashPop .32s 1.86s ease-out both',
          }}>
            +{count} <span style={{ fontSize: 15, color: 'rgba(255,255,255,.6)', letterSpacing: 0 }}>pts</span>
          </div>
        </div>

        {/* wordmark PUNTOS PLUS (D30: blanco + naranja), tracking-in */}
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
          <span className="pp-splash-anim pp-splash-fadeonly" style={{
            fontSize: 15, fontWeight: 900, color: '#fff', letterSpacing: 5,
            animation: 'ppSplashTrackIn .55s 1.35s cubic-bezier(.2,.7,.3,1) both',
          }}>PUNTOS</span>
          <span className="pp-splash-anim pp-splash-fadeonly" style={{
            fontSize: 32, fontWeight: 900, color: BRAND_ORANGE, letterSpacing: 3.5, marginTop: 3,
            animation: 'ppSplashRise .5s 1.5s cubic-bezier(.2,.7,.3,1) both',
          }}>PLUS</span>
        </div>
      </div>
    </div>
  );
}
