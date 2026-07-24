// src/views/client/VehiclesSoon.jsx
// R1b.4 (D34 + FORMATO GENERAL) — Pestaña Vehículos hasta F6: flat sin
// sombras ni emojis, héroe verde (mismo color que su cuadro del home)
// con CarIcon SVG, kicker naranja PRÓXIMAMENTE y lista de los vehículos
// que el miembro ya registró (iconos de VehicleIcons + placa formateada).
import { BRAND_ORANGE, homeColors } from '../../constants/styles';
import { CarIcon } from '../../components/ui/BentoIcons';
import { VEHICLE_TYPES } from '../../components/ui/VehicleIcons';
import { plateMask } from '../../lib/inputMasks';

export default function VehiclesSoon(ctx) {
  const { cTier, setCScr, me, dark } = ctx;
  const header = dark ? '#fff' : '#0D0D0D';
  const sub = dark ? 'rgba(255,255,255,.5)' : '#9E9E9E';

  const vehicles = Array.isArray(me?.vehicles) ? me.vehicles : [];
  const typeInfo = k => VEHICLE_TYPES.find(t => t.k === k) || VEHICLE_TYPES[0];
  // Placas antiguas pueden traer separadores propios — solo se formatea
  // la que encaja completa en el patrón L 123 ABC
  const fmtPlate = p => {
    const raw = plateMask.clean(p || '');
    return raw.length === 7 ? plateMask.format(raw) : (p || '');
  };

  return (
    <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px 120px', textAlign: 'center' }}>
      <div className="pp-tile" style={{
        width: 96, height: 96, borderRadius: 24, background: homeColors(cTier.name).vehicle,
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
      }}>
        <CarIcon size={52} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2, color: BRAND_ORANGE, textTransform: 'uppercase', marginBottom: 8 }}>
        Próximamente
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: header, lineHeight: 1.25, marginBottom: 10 }}>
        Tus vehículos, con superpoderes
      </div>
      <div style={{ fontSize: 13, color: sub, lineHeight: 1.6, maxWidth: 300 }}>
        Estamos construyendo la gestión de tus vehículos: servicios, kilometraje y alertas de mantenimiento.
      </div>

      {/* Vehículos ya registrados (mismas filas flat del wizard) */}
      {vehicles.length > 0 && (
        <div style={{ width: '100%', maxWidth: 340, marginTop: 26, textAlign: 'left' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: sub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            Registrados ({vehicles.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {vehicles.map((v, i) => {
              const t = typeInfo(v.type);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: dark ? 'rgba(255,255,255,.08)' : '#F5F5F7', borderRadius: 16, padding: '12px 14px' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: dark ? 'rgba(255,255,255,.12)' : '#0D0D0D', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <t.Icon size={22} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: header }}>{t.label}</div>
                    <div style={{ fontSize: 12, color: sub, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{fmtPlate(v.plate)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button onClick={() => setCScr('home')} style={{
        marginTop: 28, padding: '12px 28px', borderRadius: 14, border: 'none',
        background: dark ? 'rgba(255,255,255,.1)' : '#0D0D0D', color: '#fff',
        fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 800, cursor: 'pointer',
      }}>
        Volver al inicio
      </button>
    </div>
  );
}
