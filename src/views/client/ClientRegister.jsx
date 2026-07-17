// src/views/client/ClientRegister.jsx
// Punto de entrada para registro manual (sin OTP — modo pruebas)
// Crea un usuario temporal y redirige al wizard de GoogleProfile
import { Back } from '../../components/ui/Icons';

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
    fire('📝 Vamos a crear tu cuenta');
  };

  return (
    <div style={{ padding: '40px 24px 120px', position: 'relative', zIndex: 1 }}>
      <button onClick={() => { setAuthScreen('login'); setAuthError(''); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#9E9E9E', fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600, marginBottom: 28 }}>
        <Back /> Iniciar sesión
      </button>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>⛽</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: textColor }}>Únete a Puntos Plus</div>
        <div style={{ fontSize: 14, color: '#9E9E9E', marginTop: 6 }}>Acumulá puntos en cada compra de combustible</div>
      </div>

      {/* Beneficios */}
      <div style={{ background: isDark ? 'rgba(255,255,255,.05)' : '#FFF8E1', borderRadius: 20, padding: 20, marginBottom: 28 }}>
        {[
          { icon: '⛽', title: 'Puntos por combustible',  desc: 'Cada Q10 = 1 punto acumulado' },
          { icon: '🎁', title: 'Canjeá premios',          desc: 'Café, artículos, electrónica y más' },
          { icon: '🎟️', title: 'Rifas mensuales',         desc: 'Premios exclusivos cada mes' },
          { icon: '⭐', title: 'Subí de nivel',           desc: 'ORO → PLATINO → BLACK' },
        ].map((b, i, arr) => (
          <div key={i} style={{ display: 'flex', gap: 14, padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(0,0,0,.06)' : 'none' }}>
            <div style={{ fontSize: 24, flexShrink: 0 }}>{b.icon}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: textColor }}>{b.title}</div>
              <div style={{ fontSize: 12, color: '#9E9E9E', marginTop: 2 }}>{b.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Bonus registro */}
      <div style={{ background: isDark ? 'rgba(76,175,80,.1)' : '#E8F5E9', borderRadius: 16, padding: 16, marginBottom: 28, textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#4CAF50', textTransform: 'uppercase', letterSpacing: 1 }}>Bonus al registrarte</div>
        <div style={{ fontSize: 36, fontWeight: 900, color: '#4CAF50', margin: '4px 0' }}>15+</div>
        <div style={{ fontSize: 12, color: '#9E9E9E' }}>puntos base + bonus por cada dato que completes</div>
      </div>

      <button onClick={comenzar} style={{
        width: '100%', padding: '18px', borderRadius: 16, border: 'none',
        background: '#FBBC04', color: '#0D0D0D', fontFamily: "'DM Sans'",
        fontSize: 16, fontWeight: 900, cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(251,188,4,.4)',
      }}>
        Crear mi cuenta →
      </button>
    </div>
  );
}
