// src/views/client/ClientRegister.jsx
// Punto de entrada para registro manual (sin OTP — modo pruebas)
// Crea un usuario temporal y redirige al wizard de GoogleProfile.
// FORMATO GENERAL: flat, iconos SVG, acción en rojo de marca.
import { ArrowLeft, Fuel, Gift, Ticket, StarLine } from '../../components/ui/Icons';
import { BRAND_RED, bento } from '../../constants/styles';

const BENEFITS = [
  { Icon: Fuel,     color: bento.orange, title: 'Puntos por combustible', desc: 'Cada Q10 = 1 punto acumulado' },
  { Icon: Gift,     color: bento.red,    title: 'Canjeá premios',         desc: 'Café, artículos, electrónica y más' },
  { Icon: Ticket,   color: bento.purple, title: 'Rifas mensuales',        desc: 'Premios exclusivos cada mes' },
  { Icon: StarLine, color: bento.gold,   title: 'Subí de nivel',          desc: 'ORO → PLATINO → BLACK' },
];

export default function ClientRegister(ctx) {
  const { setAuthScreen, setAuthError, setMe, setRegProfile,
    setGoogleStep, fire, cTier } = ctx;

  const isDark = cTier?.name === 'BLACK';
  const textColor = isDark ? '#fff' : '#0D0D0D';

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
    <div style={{ padding: '28px 24px 120px', position: 'relative', zIndex: 1 }}>
      <button onClick={() => { setAuthScreen('login'); setAuthError(''); }} aria-label="Iniciar sesión"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: isDark ? '#fff' : '#0D0D0D', marginBottom: 20 }}>
        <ArrowLeft />
      </button>

      {/* Header — héroe SVG blanco en cuadro de marca */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: BRAND_RED, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <Fuel size={32} />
        </div>
        <div style={{ fontSize: 26, fontWeight: 900, color: textColor }}>Únete a Puntos Plus</div>
        <div style={{ fontSize: 14, color: '#9E9E9E', marginTop: 6 }}>Acumulá puntos en cada compra de combustible</div>
      </div>

      {/* Beneficios — iconos SVG blancos en cuadros de color */}
      <div style={{ background: isDark ? 'rgba(255,255,255,.05)' : bento.pageBg, borderRadius: 20, padding: '8px 16px', marginBottom: 24 }}>
        {BENEFITS.map((b, i, arr) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: i < arr.length - 1 ? (isDark ? '1px solid rgba(255,255,255,.06)' : '1px solid rgba(0,0,0,.05)') : 'none' }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: b.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <b.Icon />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: textColor }}>{b.title}</div>
              <div style={{ fontSize: 12, color: '#9E9E9E', marginTop: 2 }}>{b.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Bonus registro */}
      <div style={{ background: isDark ? 'rgba(76,175,80,.1)' : '#E8F5E9', borderRadius: 20, padding: 16, marginBottom: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: bento.green, textTransform: 'uppercase', letterSpacing: 1 }}>Bonus al registrarte</div>
        <div style={{ fontSize: 36, fontWeight: 900, color: bento.green, margin: '4px 0', fontVariantNumeric: 'tabular-nums' }}>15+</div>
        <div style={{ fontSize: 12, color: '#9E9E9E' }}>puntos base + bonus por cada dato que completes</div>
      </div>

      <button onClick={comenzar} style={{
        width: '100%', padding: '18px', borderRadius: 16, border: 'none',
        background: BRAND_RED, color: '#fff', fontFamily: "'DM Sans'",
        fontSize: 16, fontWeight: 900, cursor: 'pointer',
      }}>
        Crear mi cuenta
      </button>
    </div>
  );
}
