// src/components/SplashIntro.jsx
// Animación de ENTRADA de la app (dueño 15-ago-2026, v4 = recrear la
// referencia "REFERENCIAS INTERFAZ/idea intro.png"): fondo PERLA
// cálido claro, monedas PP TRIDIMENSIONALES (canto con grosor, cara
// con degradado radial y brillo, monograma del logo: P blanca
// arriba-izquierda + P negra al frente abajo-derecha con extrusión),
// cada moneda que cae deja una ESTELA DE LUZ cálida y su rebote
// dispara un DESTELLO en el piso (como en la referencia). Coreografía
// intacta: caen desde ARRIBA-IZQUIERDA en cascada escalonada, rebotan
// en el piso con gravedad por tramos y salen hacia ABAJO-DERECHA.
// Sin contador. Todo CSS puro transform/opacity + filtros blur
// estáticos (baratos: no se animan las propiedades del filtro).
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

const SPLASH_TOTAL = 2400;     // ms hasta iniciar la salida
const SPLASH_FADE = 380;       // ms del fundido de salida
const COIN_DUR = 1550;         // ms del recorrido de cada moneda
const RING_R = 56;             // radio del anillo de progreso
const RING_C = 2 * Math.PI * RING_R;

// Moneda PP TRIDIMENSIONAL fiel a la referencia: canto inferior con
// grosor (disco desplazado en cobre oscuro), cara con degradado
// radial (luz arriba-izquierda), aro biselado, brillo superior y el
// monograma del logo — P blanca arriba-izquierda, P NEGRA AL FRENTE
// abajo-derecha, itálicas, con extrusión 3D. El resplandor/sombra lo
// pone el wrapper (box-shadow).
function CoinPP({ size = 96, id = 'c' }) {
  const extrude = (x, y, fill, steps, color) => (
    <>
      {[...Array(steps)].map((_, i) => (
        <text key={i} x={x + (steps - i) * 1.1} y={y + (steps - i) * 1.1}
          textAnchor="middle" dominantBaseline="central"
          fontFamily="'DM Sans', sans-serif" fontWeight="900" fontStyle="italic"
          fontSize="42" fill={color}>P</text>
      ))}
      <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
        fontFamily="'DM Sans', sans-serif" fontWeight="900" fontStyle="italic"
        fontSize="42" fill={fill}>P</text>
    </>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden style={{ display: 'block' }}>
      <defs>
        <radialGradient id={`ppface-${id}`} cx="35%" cy="28%" r="85%">
          <stop offset="0%" stopColor="#FF9E52" />
          <stop offset="52%" stopColor={BRAND_ORANGE} />
          <stop offset="100%" stopColor="#D84202" />
        </radialGradient>
        <linearGradient id={`ppedge-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D24A05" />
          <stop offset="100%" stopColor="#7E2900" />
        </linearGradient>
      </defs>
      {/* canto (grosor de la moneda, visible abajo) */}
      <circle cx="48" cy="52" r="44" fill={`url(#ppedge-${id})`} />
      {/* cara con degradado radial + aro biselado */}
      <circle cx="48" cy="46" r="44" fill={`url(#ppface-${id})`} />
      <circle cx="48" cy="46" r="44" fill="none" stroke="#C24102" strokeWidth="1.5" />
      <circle cx="48" cy="46" r="37" fill="none" stroke="rgba(126,41,0,.28)" strokeWidth="1.5" />
      {/* brillo superior de la cara */}
      <ellipse cx="40" cy="22" rx="26" ry="10" fill="rgba(255,255,255,.4)"
        transform="rotate(-16 40 22)" />
      {/* P blanca del logo (arriba-izquierda), extrusión gris fría */}
      {extrude(40, 38, '#FFFFFF', 3, 'rgba(60,25,0,.38)')}
      {/* P negra del logo (al frente, abajo-derecha), extrusión cálida */}
      {extrude(57, 55, '#0D0D0D', 3, '#7A2A00')}
    </svg>
  );
}

// Lluvia con física (numérico para poder ubicar el DESTELLO del
// rebote): cada moneda cae desde ARRIBA-IZQUIERDA, rebota en el piso
// (40% del recorrido) y sale hacia ABAJO-DERECHA. X avanza lineal; Y
// lleva la gravedad por tramos; el giro es continuo. Variedad en
// tamaño, carril de piso y altura de rebote.
const COINS = [
  { x0: -46, x1: 54, y0: -58, floor: 30, b1: 17, b2: 7, delay: 150, size: 46, spin: 620 },
  { x0: -52, x1: 48, y0: -52, floor: 34, b1: 14, b2: 6, delay: 330, size: 38, spin: 540 },
  { x0: -40, x1: 58, y0: -62, floor: 26, b1: 19, b2: 8, delay: 510, size: 52, spin: 700 },
  { x0: -55, x1: 50, y0: -48, floor: 36, b1: 12, b2: 5, delay: 690, size: 34, spin: 500 },
  { x0: -44, x1: 56, y0: -60, floor: 31, b1: 16, b2: 7, delay: 870, size: 44, spin: 640 },
  { x0: -50, x1: 46, y0: -54, floor: 35, b1: 13, b2: 6, delay: 1050, size: 40, spin: 560 },
  { x0: -38, x1: 60, y0: -64, floor: 28, b1: 18, b2: 8, delay: 1230, size: 48, spin: 680 },
];

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
      goneTimer.current = setTimeout(() => {
        setPhase('done');
        // El arranque de index.html pinta el fondo perla para que no
        // haya destello blanco antes de la intro — al terminar se
        // limpia para no asomar en el overscroll de la app.
        try { document.documentElement.style.background = ''; } catch { /* noop */ }
      }, SPLASH_FADE);
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
        // Fondo perla cálido de la referencia "idea intro"
        background: 'radial-gradient(circle at 50% 28%, #F6F2EE 0%, #E9E3DD 55%, #DCD5CE 100%)',
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
        /* Estela de luz de la caída (referencia): visible mientras la
           moneda CAE, se apaga al subir en el rebote y reaparece suave
           en la segunda caída — mismos cortes que la gravedad de Y */
        @keyframes ppTrail {
          0% { opacity: 0; }
          10% { opacity: .85; }
          38% { opacity: .9; }
          46% { opacity: .15; }
          62% { opacity: .1; }
          76% { opacity: .5; }
          82% { opacity: .15; }
          100% { opacity: 0; }
        }
        /* Destello del impacto en el piso (referencia): ráfaga cálida
           que se expande y desvanece justo cuando la moneda toca */
        @keyframes ppFlash {
          0% { opacity: 0; transform: translate(var(--fx), var(--fy)) scale(.25); }
          30% { opacity: .95; transform: translate(var(--fx), var(--fy)) scale(1); }
          100% { opacity: 0; transform: translate(var(--fx), var(--fy)) scale(1.7); }
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
        @media (prefers-reduced-motion: reduce) {
          .pp-splash-anim { animation: none !important; }
          .pp-splash-sat, .pp-splash-flash, .pp-splash-sheen { display: none !important; }
          .pp-splash-fadeonly { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>

      {/* destellos de impacto: uno por moneda, en el punto del piso
          donde cae (40% del recorrido), sincronizado con su delay */}
      {COINS.map((c, i) => (
        <div key={`f${i}`} className="pp-splash-flash" aria-hidden style={{
          position: 'absolute', left: '50%', top: '50%',
          width: 120, height: 34, marginLeft: -60, marginTop: 8,
          '--fx': `${(c.x0 + (c.x1 - c.x0) * 0.4).toFixed(1)}vw`,
          '--fy': `${c.floor}vh`,
          background: 'radial-gradient(ellipse, rgba(255,244,230,.95) 0%, rgba(255,178,102,.75) 35%, rgba(250,84,8,.28) 60%, rgba(250,84,8,0) 80%)',
          filter: 'blur(1.5px)', borderRadius: '50%',
          animation: `ppFlash .5s ${c.delay + COIN_DUR * 0.4 - 60}ms ease-out both`,
          willChange: 'transform, opacity',
        }} />
      ))}

      {/* lluvia de monedas 3D con ESTELA: caen de ARRIBA-IZQUIERDA,
          rebotan y salen por ABAJO-DERECHA (X lineal en el padre,
          gravedad Y en el hijo; adentro, estela fija + giro de rueda) */}
      {COINS.map((c, i) => (
        <div key={i} className="pp-splash-sat" aria-hidden style={{
          position: 'absolute', left: '50%', top: '50%',
          marginLeft: -c.size / 2, marginTop: -c.size / 2,
          '--x0': `${c.x0}vw`, '--x1': `${c.x1}vw`, '--y0': `${c.y0}vh`,
          '--floor': `${c.floor}vh`, '--b1': `${c.b1}vh`, '--b2': `${c.b2}vh`,
          '--spin': `${c.spin}deg`,
          animation: `ppCoinX ${COIN_DUR}ms ${c.delay}ms linear both`,
          willChange: 'transform, opacity',
        }}>
          <div style={{ animation: `ppCoinY ${COIN_DUR}ms ${c.delay}ms linear both` }}>
            {/* estela de luz: cuelga hacia ARRIBA-IZQUIERDA (de donde
                viene la moneda), no gira con ella */}
            <div style={{
              position: 'absolute', left: '50%', bottom: c.size * 0.4,
              width: Math.max(12, c.size * 0.34), height: c.size * 4.4,
              marginLeft: -Math.max(12, c.size * 0.34) / 2,
              transformOrigin: '50% 100%', transform: 'rotate(-17deg)',
              background: 'linear-gradient(to top, rgba(255,182,112,.95) 0%, rgba(255,205,160,.5) 45%, rgba(255,230,200,0) 100%)',
              filter: 'blur(4px)', borderRadius: '50%',
              animation: `ppTrail ${COIN_DUR}ms ${c.delay}ms linear both`,
            }} />
            <div style={{
              width: c.size, height: c.size, borderRadius: '50%',
              boxShadow: '0 8px 16px rgba(90,40,0,.28), 0 0 18px rgba(250,84,8,.35)',
              animation: `ppCoinSpin ${COIN_DUR}ms ${c.delay}ms linear both`,
            }}>
              <CoinPP size={c.size} id={`s${i}`} />
            </div>
          </div>
        </div>
      ))}

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* resplandor naranja tras la moneda héroe */}
        <div className="pp-splash-anim" aria-hidden style={{
          position: 'absolute', top: -30, left: '50%',
          width: 240, height: 240, marginLeft: -120, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(250,84,8,.20) 0%, rgba(250,84,8,0) 65%)',
          animation: 'ppSplashGlow .8s .15s ease-out both',
        }} />

        {/* bloque héroe 128×128: anillo de progreso + moneda con volteo 3D */}
        <div style={{ position: 'relative', width: 128, height: 128, perspective: 700 }}>
          {/* anillo de progreso naranja */}
          <svg className="pp-splash-anim pp-splash-fadeonly" width="128" height="128" viewBox="0 0 128 128" aria-hidden
            style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)', animation: 'ppSplashRise .4s .3s ease-out both' }}>
            <circle cx="64" cy="64" r={RING_R} fill="none" stroke="rgba(0,0,0,.08)" strokeWidth="4" />
            <circle className="pp-splash-anim" cx="64" cy="64" r={RING_R} fill="none"
              stroke={BRAND_ORANGE} strokeWidth="4" strokeLinecap="round"
              strokeDasharray={RING_C.toFixed(1)}
              style={{ animation: `ppSplashRing 1.45s .42s cubic-bezier(.3,.1,.3,1) both` }} />
          </svg>

          {/* moneda héroe: volteo 3D + flotación + resplandor; destello */}
          <div className="pp-splash-anim pp-splash-fadeonly"
            style={{ position: 'absolute', top: 16, left: 16, animation: 'ppSplashFlip .7s cubic-bezier(.2,.8,.3,1.1) both', transformStyle: 'preserve-3d' }}>
            <div className="pp-splash-anim"
              style={{ animation: 'ppSplashFloat 2.6s .8s ease-in-out infinite' }}>
              <div style={{
                position: 'relative', width: 96, height: 96, borderRadius: '50%', overflow: 'hidden',
                boxShadow: '0 10px 22px rgba(90,40,0,.30), 0 0 26px 4px rgba(250,84,8,.35), 0 0 60px 14px rgba(250,84,8,.14)',
              }}>
                <CoinPP size={96} id="hero" />
                <div className="pp-splash-sheen" aria-hidden style={{
                  position: 'absolute', top: -20, left: 0, width: 46, height: 140,
                  background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.5) 50%, rgba(255,255,255,0) 100%)',
                  animation: 'ppSplashSheen .7s 1.55s ease-in-out both',
                }} />
              </div>
            </div>
          </div>
        </div>

        {/* wordmark PUNTOS PLUS (D30) en tinta oscura sobre el perla */}
        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
          <span className="pp-splash-anim pp-splash-fadeonly" style={{
            fontSize: 15, fontWeight: 900, color: '#1A1A1A', letterSpacing: 5,
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
