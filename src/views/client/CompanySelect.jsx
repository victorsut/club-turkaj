// src/views/client/CompanySelect.jsx
// Selector de EMPRESA tras iniciar sesión, antes del inicio (pedido del
// dueño 1-ago-2026, por posibles requerimientos futuros — sin funcionalidad
// compleja por ahora: una sola empresa, tocarla da ingreso al inicio).
// FORMATO GENERAL: flat, colores sólidos, sin sombras ni emojis; soporta
// modo claro/oscuro (superficies bifurcan por `dark`).
import { Chev } from '../../components/ui/Icons';
import { BRAND_ORANGE } from '../../constants/styles';

export default function CompanySelect({ dark, onPick }) {
  const ink = dark ? '#fff' : '#0D0D0D';
  const sub = dark ? 'rgba(255,255,255,.55)' : '#9E9E9E';
  const card = dark ? 'rgba(255,255,255,.07)' : '#F5F5F7';
  // Halo sutil: separa los contornos negros del arte del fondo oscuro
  const halo = dark
    ? 'drop-shadow(0 0 5px rgba(255,255,255,.4)) drop-shadow(0 0 16px rgba(255,255,255,.18))'
    : 'none';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '48px 24px 40px' }}>
      {/* Header tipográfico del formato general (patrón del login) */}
      <div>
        <img src="/logo.png" alt="Puntos Plus" style={{ width: 64, height: 64, borderRadius: 16, display: 'block', marginBottom: 20 }} />
        <div style={{ fontSize: 24, fontWeight: 900, color: ink, lineHeight: 1.15 }}>Selecciona tu</div>
        <div style={{ fontSize: 38, fontWeight: 900, color: ink, lineHeight: 1.15 }}>
          Empresa<span style={{ color: BRAND_ORANGE }}>.</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: sub, marginTop: 8 }}>
          Elige la empresa para continuar
        </div>
      </div>

      {/* Única empresa disponible — la tarjeta completa es el botón */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        <button onClick={onPick} className="pp-tile" style={{
          width: '100%', border: 'none', cursor: 'pointer', borderRadius: 20,
          background: card, padding: '30px 20px 26px', fontFamily: 'inherit',
        }}>
          <img src="/logo-turkaj.png" alt="Turkaj" style={{ width: 150, display: 'block', margin: '0 auto 16px', filter: halo }} />
          <div style={{ fontSize: 20, fontWeight: 800, color: ink }}>Gasolineras Turkaj</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: sub, marginTop: 2 }}>Chichicastenango</div>
          <div style={{
            width: 40, height: 40, borderRadius: 20, margin: '18px auto 0',
            background: dark ? '#fff' : '#0D0D0D', color: dark ? '#0D0D0D' : '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Chev />
          </div>
        </button>
      </div>
    </div>
  );
}
