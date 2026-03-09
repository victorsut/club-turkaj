// src/components/ui/TierCard.jsx
import TierDeco from './TierDeco';
import { tierProgress as tierProg, tierShadow, tierBorder, tierBackground } from '../../lib/tierSystem';
import { CFG_INIT } from '../../constants/config';

const sMono = { fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 };

export default function TierCard({ t, gal, small = false, cfg }) {
  const cc = cfg || CFG_INIT;
  const bens = [
    { i: '⛽', t: `1 pt por cada Q${cc.qPerPt}` },
    ...(t.discount > 0 ? [{ i: '💰', t: `Descuento Q${t.discount.toFixed(2)}/galón` }] : []),
    ...(t.redeemDisc > 0 ? [{ i: '🏷️', t: `-${Math.round(t.redeemDisc * 100)}% en canje de premios` }] : []),
    { i: '📶', t: 'WiFi ilimitado' },
    ...(t.bath ? [{ i: '🚻', t: 'Acceso a baños' }] : []),
    { i: '🎂', t: `${t.evtPts} pts en eventos especiales` },
    { i: '🎟️', t: `Rifa mensual (${cc.ticketPts} pts = 1 boleto)` },
    { i: '👥', t: `Invitar amigo = +${cc.referralPts} pts` },
  ];

  const pg = tierProg(gal, t);
  const bg = tierBackground(t.name) || t.grad;
  const borderLine = t.name === 'BLACK'
    ? 'rgba(255,255,255,.08)'
    : t.name === 'PLATINO' ? 'rgba(255,255,255,.15)' : 'rgba(0,0,0,.06)';

  return (
    <div style={{
      borderRadius: 20, padding: small ? 16 : 20, margin: '10px 20px',
      background: bg, color: t.color, position: 'relative', overflow: 'hidden',
      boxShadow: tierShadow(t.name), border: tierBorder(t.name),
    }}>
      <TierDeco name={t.name} />

      <div style={{ position: 'relative', zIndex: 2 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: small ? 8 : 14 }}>
          <div style={{ fontSize: small ? 15 : 18, fontWeight: 800, letterSpacing: 2 }}>
            {t.icon} {t.name}
          </div>
          {t.base > 0 && (
            <div style={{ fontSize: 11, opacity: 0.6, fontWeight: 700 }}>{t.base} gls</div>
          )}
        </div>

        {/* Benefits list */}
        {bens.map((b, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: `${small ? 6 : 9}px 0`,
            borderBottom: `1px solid ${borderLine}`,
            fontSize: small ? 12 : 13, fontWeight: 600,
          }}>
            <span style={{ width: 28, textAlign: 'center' }}>{b.i}</span>
            <span>{b.t}</span>
          </div>
        ))}

        {/* Progress bar */}
        {t.next && (
          <div style={{ marginTop: 12 }}>
            <div style={{
              display: 'flex', justifyContent: 'flex-end',
              fontSize: small ? 9 : 10, opacity: 0.5, marginBottom: 6, fontWeight: 700,
            }}>
              <span>{gal.toFixed(0)}/{t.target} gal</span>
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{
                height: 6, borderRadius: 3, overflow: 'hidden',
                background: t.name === 'BLACK' ? 'rgba(255,255,255,.15)'
                  : t.name === 'PLATINO' ? 'rgba(0,0,0,.15)' : 'rgba(0,0,0,.08)',
              }}>
                <div style={{
                  height: '100%', borderRadius: 3, width: `${pg}%`,
                  background: t.name === 'BLACK' ? '#fff' : t.name === 'PLATINO' ? '#1565C0' : '#000',
                  transition: 'width 1s ease',
                }} />
              </div>
              {pg > 0 && (
                <div style={{
                  position: 'absolute', top: -18, left: `${pg}%`, transform: 'translateX(-50%)',
                  fontSize: small ? 8 : 10, fontWeight: 800, color: t.color,
                  ...sMono, whiteSpace: 'nowrap',
                }}>
                  {gal.toFixed(0)}
                </div>
              )}
            </div>
            {gal > 0 && gal < t.target && (
              <div style={{ fontSize: 10, opacity: .5, marginTop: 6, fontWeight: 600, textAlign: 'center' }}>
                Faltan {(t.target - gal).toFixed(0)} galones para {t.next}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
