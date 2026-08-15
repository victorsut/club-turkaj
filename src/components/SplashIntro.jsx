// src/components/SplashIntro.jsx
// Animación de ENTRADA de la app (dueño 15-ago-2026, v3 fiel al LOGO):
// monedas con el estilo PLANO del logo oficial — disco naranja liso y
// el monograma de DOS P itálicas (blanca arriba-izquierda, negra al
// frente abajo-derecha, mismas ubicaciones del logo) con extrusión 3D
// y RESPLANDOR naranja. Coreografía v3: las monedas CAEN desde la
// parte superior IZQUIERDA, REBOTAN en el piso (gravedad por tramos:
// cada segmento del keyframe lleva su propio easing) y salen hacia la
// parte inferior DERECHA. Sin contador (retirado a pedido). La moneda
// héroe central entra con volteo 3D y un anillo de progreso naranja
// se dibuja a su alrededor; remata el wordmark PUNTOS PLUS.
// Todo CSS puro transform/opacity — barato en cualquier teléfono.
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

const ORANGE_DEEP = '#C43D02'; // aro del canto de la moneda (plano)
const SPLASH_TOTAL = 2400;     // ms hasta iniciar la salida
const SPLASH_FADE = 380;       // ms del fundido de salida
const RING_R = 56;             // radio del anillo de progreso
const RING_C = 2 * Math.PI * RING_R;

// Moneda PP fiel al logo oficial: disco naranja PLANO (sin degradados
// ni brillos de metal) con aro del canto apenas más oscuro, y el
// monograma del logo — P blanca arriba-izquierda, P NEGRA AL FRENTE
// abajo-derecha, itálicas — con extrusión 3D hacia abajo-derecha
// (copias apiladas, luz desde arriba-izquierda como en el resto de la
// interfaz). El resplandor lo pone el wrapper (box-shadow).
function CoinPP({ size = 96 }) {
  // Extrusión: copias desplazadas detrás de la cara de cada letra.
  const extrude = (x, y, fill, steps, color) => (
    <>
      {[...Array(steps)].map((_, i) => (
        <text key={i} x={x + (steps - i) * 1.1} y={y + (steps - i) * 1.1}
          textAnchor="middle" dominantBaseline="central"
          fontFamily="'DM Sans', sans-serif" fontWeight="900" fontStyle="italic"
          fontSize="44" fill={color}>P</text>
      ))}
      <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
        fontFamily="'DM Sans', sans-serif" fontWeight="900" fontStyle="italic"
        fontSize="44" fill={fill}>P</text>
    </>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden style={{ display: 'block' }}>
      <circle cx="48" cy="48" r="46" fill={ORANGE_DEEP} />
      <circle cx="48" cy="48" r="42.5" fill={BRAND_ORANGE} />
      {/* P blanca del logo (arriba-izquierda), extrusión gris fría */}
      {extrude(40, 39, '#FFFFFF', 3, 'rgba(0,0,0,.32)')}
      {/* P negra del logo (al frente, abajo-derecha), extrusión cálida */}
      {extrude(58, 57, '#0D0D0D', 3, '#7A2A00')}
    </svg>
  );
}

// Lluvia con física: cada moneda cae desde ARRIBA-IZQUIERDA, rebota
// en el piso y sale hacia ABAJO-DERECHA. X avanza lineal; Y lleva la
// gravedad por tramos; el giro es continuo (rueda). Variedad en
// tamaño, carril de piso y altura de rebote para que no parezcan
// clones. Delays cortos = cascada.
const COINS = [
  { x0: '-46vw', x1: '54vw', y0: '-58vh', floor: '30vh', b1: '17vh', b2: '7vh', delay: 150, size: 46, spin: 620 },
  { x0: '-52vw', x1: '48vw', y0: '-52vh', floor: '34vh', b1: '14vh', b2: '6vh', delay: 330, size: 38, spin: 540 },
  { x0: '-40vw', x1: '58vw', y0: '-62vh', floor: '26vh', b1: '19vh', b2: '8vh', delay: 510, size: 52, spin: 700 },
  { x0: '-55vw', x1: '50vw', y0: '-48vh', floor: '36vh', b1: '12vh', b2: '5vh', delay: 690, size: 34, spin: 500 },
  { x0: '-44vw', x1: '56vw', y0: '-60vh', floor: '31vh', b1: '16vh', b2: '7vh', delay: 870, size: 44, spin: 640 },
  { x0: '-50vw', x1: '46vw', y0: '-54vh', floor: '35vh', b1: '13vh', b2: '6vh', delay: 1050, size: 40, spin: 560 },
  { x0: '-38vw', x1: '60vw', y0: '-64vh', floor: '28vh', b1: '18vh', b2: '8vh', delay: 1230, size: 48, spin: 680 },
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
    // (p. ej. deep-link) tampoco se repite en esta sesión con login.
    try { sessionStorage.setItem('pp_splash_seen', '1'); } catch { /* noop */ }
    leaveTimer.current = setTimeout(dismiss, reduced ? 1300 : SPLASH_TOTAL);
    return () => {
      clearTimeout(leaveTimer.current);
      clearTimeout(goneTimer.current);
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
        /* Lluvia con rebote: X avanza LINEAL de izquierda a derecha */
        @keyframes ppCoinX {
          0% { transform: translateX(var(--x0)); opacity: 0; }
          7% { opacity: 1; }
          88% { opacity: 1; }
          100% { transform: translateX(var(--x1)); opacity: 0; }
        }
        /* ...e Y lleva la GRAVEDAD: cada tramo con su easing — caída
           acelerando, rebote desacelerando, dos rebotes decrecientes */
        @keyframes ppCoinY {
          0% { transform: translateY(var(--y0)); animation-timing-function: cubic-bezier(.4,0,.85,.45); }
          40% { transform: translateY(var(--floor)); animation-timing-function: cubic-bezier(.15,.55,.45,1); }
          62% { transform: translateY(calc(var(--floor) - var(--b1))); animation-timing-function: cubic-bezier(.55,0,.85,.45); }
          79% { transform: translateY(var(--floor)); animation-timing-function: cubic-bezier(.15,.55,.45,1); }
          90% { transform: translateY(calc(var(--floor) - var(--b2))); animation-timing-function: cubic-bezier(.55,0,.85,.45); }
          100% { transform: translateY(calc(var(--floor) + 6vh)); }
        }
        @keyframes ppCoinSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(var(--spin)); }
        }
        @keyframes ppSplashRing {
          0% { stroke-dashoffset: ${RING_C.toFixed(1)}; }
          100% { stroke-dashoffset: 0; }
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

      {/* lluvia de monedas: caen de ARRIBA-IZQUIERDA, rebotan en el
          piso y salen por ABAJO-DERECHA (anclas al centro del lienzo;
          X lineal en el padre, gravedad Y en el hijo, giro adentro) */}
      {COINS.map((c, i) => (
        <div key={i} className="pp-splash-sat" aria-hidden style={{
          position: 'absolute', left: '50%', top: '50%',
          marginLeft: -c.size / 2, marginTop: -c.size / 2,
          '--x0': c.x0, '--x1': c.x1, '--y0': c.y0,
          '--floor': c.floor, '--b1': c.b1, '--b2': c.b2,
          '--spin': `${c.spin}deg`,
          animation: `ppCoinX 1.55s ${c.delay}ms linear both`,
          willChange: 'transform, opacity',
        }}>
          <div style={{ animation: `ppCoinY 1.55s ${c.delay}ms linear both` }}>
            <div style={{
              width: c.size, height: c.size, borderRadius: '50%',
              boxShadow: '0 0 16px rgba(250,84,8,.4)',
              animation: `ppCoinSpin 1.55s ${c.delay}ms linear both`,
            }}>
              <CoinPP size={c.size} />
            </div>
          </div>
        </div>
      ))}

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* resplandor naranja tras la moneda */}
        <div className="pp-splash-anim" aria-hidden style={{
          position: 'absolute', top: -30, left: '50%',
          width: 240, height: 240, marginLeft: -120, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(250,84,8,.24) 0%, rgba(250,84,8,0) 65%)',
          animation: 'ppSplashGlow .8s .15s ease-out both',
        }} />

        {/* bloque héroe 128×128: anillo de progreso + moneda con volteo 3D */}
        <div style={{ position: 'relative', width: 128, height: 128, perspective: 700 }}>
          {/* anillo de progreso naranja */}
          <svg className="pp-splash-anim pp-splash-fadeonly" width="128" height="128" viewBox="0 0 128 128" aria-hidden
            style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)', animation: 'ppSplashRise .4s .3s ease-out both' }}>
            <circle cx="64" cy="64" r={RING_R} fill="none" stroke="rgba(255,255,255,.09)" strokeWidth="4" />
            <circle className="pp-splash-anim" cx="64" cy="64" r={RING_R} fill="none"
              stroke={BRAND_ORANGE} strokeWidth="4" strokeLinecap="round"
              strokeDasharray={RING_C.toFixed(1)}
              style={{ animation: `ppSplashRing 1.45s .42s cubic-bezier(.3,.1,.3,1) both` }} />
          </svg>

          {/* moneda héroe: volteo 3D + flotación + RESPLANDOR; destello */}
          <div className="pp-splash-anim pp-splash-fadeonly"
            style={{ position: 'absolute', top: 16, left: 16, animation: 'ppSplashFlip .7s cubic-bezier(.2,.8,.3,1.1) both', transformStyle: 'preserve-3d' }}>
            <div className="pp-splash-anim"
              style={{ animation: 'ppSplashFloat 2.6s .8s ease-in-out infinite' }}>
              <div style={{
                position: 'relative', width: 96, height: 96, borderRadius: '50%', overflow: 'hidden',
                boxShadow: '0 0 26px 4px rgba(250,84,8,.45), 0 0 60px 14px rgba(250,84,8,.18)',
              }}>
                <CoinPP size={96} />
                <div className="pp-splash-sheen" aria-hidden style={{
                  position: 'absolute', top: -20, left: 0, width: 46, height: 140,
                  background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.45) 50%, rgba(255,255,255,0) 100%)',
                  animation: 'ppSplashSheen .7s 1.55s ease-in-out both',
                }} />
              </div>
            </div>
          </div>
        </div>

        {/* wordmark PUNTOS PLUS (D30: blanco + naranja), tracking-in */}
        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
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
