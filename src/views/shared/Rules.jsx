// src/views/shared/Rules.jsx
import TierCard from '../../components/ui/TierCard';
import { makeTier } from '../../lib/tierSystem';
import { sMono } from '../../constants/styles';

export default function Rules(ctx) {
  const { cfg, cTier, me } = ctx;
  const memberGal = me?.gallons || 0;
  const tiers = [0, 150, 500].map(g => makeTier(g, cfg));

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ padding: '16px 20px 8px', fontSize: 20, fontWeight: 800, color: cTier?.name === 'BLACK' ? '#fff' : '#0D0D0D' }}>📋 Reglas del Programa</div>
      {tiers.map((t, i) => {
        const isCurrentTier = me && cTier?.name === t.name;
        const galForCard = isCurrentTier ? memberGal : [0, 150, 500][i];
        return (
          <div key={t.name} style={{ position: 'relative' }}>
            {isCurrentTier && (
              <div style={{
                position: 'absolute', top: 6, right: 26, zIndex: 10,
                background: t.name === 'BLACK' ? 'rgba(255,215,79,.9)' : t.name === 'PLATINO' ? '#1565C0' : 'rgba(0,0,0,.75)',
                color: t.name === 'BLACK' ? '#000' : '#fff',
                fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 8,
                letterSpacing: .5,
              }}>
                📍 TU NIVEL · {memberGal.toFixed(0)} gal
              </div>
            )}
            <TierCard t={t} gal={galForCard} small cfg={cfg} />
          </div>
        );
      })}
      <div style={{ padding: '16px 20px' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: cTier?.name === 'BLACK' ? '#EF5350' : '#C62828', marginBottom: 12 }}>⚠️ Reglas de Inactividad</div>
        {(cfg.degrad || []).map((d, i) => (
          <div key={i} style={{ marginBottom: 12, background: cTier?.name === 'BLACK' ? 'rgba(255,255,255,.05)' : '#FFF3E0', borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 6, color: cTier?.name === 'BLACK' ? '#FFB74D' : '#E65100' }}>{d.tier}</div>
            {d.rules.map((r, j) => (
              <div key={j} style={{ fontSize: 12, color: cTier?.name === 'BLACK' ? '#aaa' : '#616161', marginBottom: 4 }}>• {r.days} días → {r.effect}</div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ padding: '0 20px 16px' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: cTier?.name === 'BLACK' ? '#fff' : '#0D0D0D', marginBottom: 10 }}>📜 Términos de Uso</div>
        {(cfg.termsUse || []).map((t, i) => (
          <div key={i} style={{ fontSize: 12, color: cTier?.name === 'BLACK' ? '#aaa' : '#616161', marginBottom: 6, paddingLeft: 12, borderLeft: '2px solid #FBBC04' }}>{t}</div>
        ))}
      </div>
    </div>
  );
}
