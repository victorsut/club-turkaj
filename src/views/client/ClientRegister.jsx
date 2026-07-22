// src/views/client/ClientRegister.jsx
// Punto de entrada para registro manual (sin OTP — modo pruebas)
// Crea un usuario temporal y redirige al wizard de GoogleProfile.
// FORMATO GENERAL (referencia maestra): beneficios como bento grid de
// cuadros sólidos, paleta naranja/negro/blanco, tipografía grande.
import { ArrowLeft, Fuel, StarRate } from '../../components/ui/Icons';
import { GiftIcon, TicketStarIcon } from '../../components/ui/BentoIcons';
import { BRAND_ORANGE } from '../../constants/styles';
import Wordmark from '../../components/ui/Wordmark';

const BENEFITS = [
  { icon: <Fuel size={28} />,          bg: BRAND_ORANGE, title: 'PUNTOS',    desc: 'Cada Q10 en combustible = 1 punto' },
  { icon: <GiftIcon size={28} />,      bg: '#0D0D0D',    title: 'PREMIOS',   desc: 'Canjeá café, artículos y más' },
  { icon: <TicketStarIcon size={28} />, bg: '#0D0D0D',   title: 'RIFAS',     desc: 'Premios exclusivos cada mes' },
  { icon: <StarRate size={26} />,      bg: BRAND_ORANGE, title: 'NIVELES',   desc: 'ORO → PLATINO → BLACK' },
];

export default function ClientRegister(ctx) {
  const { setAuthScreen, setAuthError, setMe, setRegProfile,
    setGoogleStep, fire, cTier } = ctx;

  const isDark = cTier?.name === 'BLACK';
  const ink = isDark ? '#fff' : '#0D0D0D';

  const comenzar = () => {
    // Crear usuario temporal — se sobreescribe al guardar en Supabase
    setMe({
      id: 'temp-' + Date.now(),
      name: '', email: '', phone: '', avatar: '',
      dpi: '', plate: '', nit: '', bday: '',
      points: 0, gallons: 0, spent: 0, visits: 0,
      tickets: 0, redeemed: 0, referrals: 0,
      registered: new Date().toISOString().split('T')[0],
      lastBuy: '', station: '', cardId: '',
      supabaseUser: false, authProvider: 'manual',
    });
    setRegProfile({ name: '', dpi: '', plate: '', email: '', bday: '', nit: '', phone: '' });
    setGoogleStep('step1');
    setAuthError('');
    setAuthScreen('googleProfile');
    fire('Vamos a crear tu cuenta', 'info');
  };

  return (
    <div style={{ padding: '24px 24px 120px', position: 'relative', zIndex: 1 }}>
      <button onClick={() => { setAuthScreen('login'); setAuthError(''); }} aria-label="Iniciar sesión"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: ink, marginBottom: 24 }}>
        <ArrowLeft />
      </button>

      {/* Header tipográfico a la izquierda */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 24, fontWeight: 900, color: ink, lineHeight: 1.15 }}>Únete a</div>
        <div style={{ lineHeight: 1.1, marginBottom: 10 }}>
          <Wordmark size={38} color={ink} accent={BRAND_ORANGE} />
        </div>
        <div style={{ fontSize: 14, color: '#9E9E9E' }}>Acumulá puntos en cada compra de combustible</div>
      </div>

      {/* Beneficios — bento grid de cuadros sólidos (referencia del home) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        {BENEFITS.map((b, i) => (
          <div key={i} style={{ background: b.bg, borderRadius: 20, padding: '16px 14px', color: '#fff' }}>
            <div style={{ marginBottom: 10, display: 'flex' }}>{b.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: .5, marginBottom: 4 }}>{b.title}</div>
            <div style={{ fontSize: 11, lineHeight: 1.35, color: 'rgba(255,255,255,.8)' }}>{b.desc}</div>
          </div>
        ))}
      </div>

      {/* Bonus de registro — cuadro negro ancho con la cifra en naranja */}
      <div style={{ background: '#0D0D0D', borderRadius: 20, padding: '16px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: 1 }}>Bonus al registrarte</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', marginTop: 3, lineHeight: 1.35 }}>Puntos base + bonus por cada dato que completes</div>
        </div>
        <div style={{ fontSize: 32, fontWeight: 900, color: BRAND_ORANGE, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
          15+<span style={{ fontSize: 13, marginLeft: 3 }}>pts</span>
        </div>
      </div>

      <button onClick={comenzar} style={{
        width: '100%', padding: '18px', borderRadius: 16, border: 'none',
        background: BRAND_ORANGE, color: '#fff', fontFamily: "'DM Sans'",
        fontSize: 16, fontWeight: 900, cursor: 'pointer',
      }}>
        Crear mi cuenta
      </button>
    </div>
  );
}
