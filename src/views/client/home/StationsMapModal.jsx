// src/views/client/home/StationsMapModal.jsx
// Modal Ubicación: lista de estaciones con dirección, horario y chips
// de navegación (Google Maps / Waze). Extraído VERBATIM de ClientHome
// (división 14-ago).
import GrowModal from '../../../components/ui/GrowModal';
import { bento } from '../../../constants/styles';
import { Clock } from '../../../components/ui/Icons';
import { PinIcon } from '../../../components/ui/BentoIcons';

export default function StationsMapModal({
  onClose, origin, tint, dark, hp, cfg, stations,
}) {
  return (
    <GrowModal onClose={onClose} origin={origin} tint={tint}
      background={dark ? '#16161A' : '#fff'} maxHeight="86vh"
      arrowColor={hp.locationInk || '#fff'}>
      {() => (<>
        {/* Banda de identidad (patrón banda+cuerpo — color sólido
            del cuadro Ubicación con su tinta, centrada) */}
        <div style={{ background: hp.location, color: hp.locationInk || '#fff', padding: '22px 20px 18px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.85 }}>
            Encuéntranos
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2, letterSpacing: 0.3 }}>
            Nuestras Estaciones
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.9, marginTop: 2 }}>
            {cfg.companyName || 'Gasolineras Turkaj'} · {cfg.companyLocation || 'Chichicastenango'}
          </div>
        </div>

        <div style={{ padding: '14px 20px 20px' }}>
        {(stations.length > 0 ? stations : [
          { name: 'Turkaj I', address: '' },
          { name: 'Turkaj II', address: '' },
          { name: 'Turkaj III', address: '' },
        ]).filter(s => s.active !== false).map((s) => (
          <div key={s.id || s.name} style={{
            display: 'flex', alignItems: 'flex-start', gap: 14,
            padding: '13px 12px', marginBottom: 8, borderRadius: 16,
            background: dark ? 'rgba(255,255,255,.05)' : '#F5F5F7',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14, flexShrink: 0,
              background: hp.location,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <PinIcon size={24} color={hp.locationInk || '#fff'} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: dark ? '#E0E0E0' : '#0D0D0D' }}>
                {s.name}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: dark ? 'rgba(255,255,255,.5)' : '#6E6E73', marginTop: 3, lineHeight: 1.4 }}>
                {s.address || 'Dirección no disponible'}
              </div>
              {/* Horario de atención (stations.schedule — dato de empresa).
                  En BLACK claro hp.location es gris perla (invisible
                  sobre la fila clara) → el acento pasa a la tinta,
                  patrón del fix de contraste del WiFi. */}
              {s.schedule && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5, marginTop: 5,
                  fontSize: 11.5, fontWeight: 700,
                  color: dark ? 'rgba(255,255,255,.75)' : (hp.locationInk || hp.location),
                }}>
                  <Clock /> {s.schedule}
                </div>
              )}
              {/* Navegación: chips sólidos flat (sin emojis) */}
              {(s.lat && s.lng) && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{
                      padding: '7px 14px', borderRadius: 10, textDecoration: 'none',
                      background: bento.blue, color: '#fff',
                      fontSize: 11, fontWeight: 700, fontFamily: "'DM Sans'",
                    }}>
                    Google Maps
                  </a>
                  <a href={`https://waze.com/ul?ll=${s.lat},${s.lng}&navigate=yes`}
                    target="_blank" rel="noopener noreferrer"
                    style={{
                      padding: '7px 14px', borderRadius: 10, textDecoration: 'none',
                      background: bento.teal, color: '#fff',
                      fontSize: 11, fontWeight: 700, fontFamily: "'DM Sans'",
                    }}>
                    Waze
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
        </div>
      </>)}
    </GrowModal>
  );
}
