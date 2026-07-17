// src/views/client/VehiclesSoon.jsx
// R1b (D34) — Placeholder de la pestaña Vehículos hasta F6.
export default function VehiclesSoon(ctx) {
  const { cTier, setCScr, me } = ctx;
  const isBlack = cTier.name === 'BLACK';
  const header = isBlack ? '#fff' : '#0D0D0D';
  const sub = isBlack ? 'rgba(255,255,255,.5)' : '#9E9E9E';

  const vehicles = Array.isArray(me?.vehicles) ? me.vehicles : [];

  return (
    <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 32px 120px', textAlign: 'center' }}>
      <div className="pp-tile" style={{
        width: 96, height: 96, borderRadius: 28, background: '#2E7D32',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 46,
        boxShadow: '0 8px 24px rgba(46,125,50,.35)', marginBottom: 24,
      }}>
        🚗
      </div>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2, color: '#E02020', textTransform: 'uppercase', marginBottom: 8 }}>
        Próximamente
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: header, lineHeight: 1.25, marginBottom: 10 }}>
        Tus vehículos, con superpoderes
      </div>
      <div style={{ fontSize: 13, color: sub, lineHeight: 1.6, maxWidth: 300 }}>
        Estamos construyendo la gestión de tus vehículos: servicios, kilometraje y alertas de mantenimiento.
        {vehicles.length > 0 && ` Ya tenés ${vehicles.length} vehículo${vehicles.length > 1 ? 's' : ''} registrado${vehicles.length > 1 ? 's' : ''} esperándolo.`}
      </div>
      <button onClick={() => setCScr('home')} style={{
        marginTop: 28, padding: '12px 28px', borderRadius: 14, border: 'none',
        background: isBlack ? 'rgba(255,255,255,.1)' : '#0D0D0D', color: '#fff',
        fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 800, cursor: 'pointer',
      }}>
        Volver al inicio
      </button>
    </div>
  );
}
