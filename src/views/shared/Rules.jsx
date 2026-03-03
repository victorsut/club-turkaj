// src/views/shared/Rules.jsx
import TierCard from '../../components/ui/TierCard';
import { makeTier } from '../../lib/tierSystem';
import { sMono } from '../../constants/styles';

export default function Rules(ctx) {
  const { cfg, cTier } = ctx;
  const tiers = [0, 150, 500].map(g => makeTier(g, cfg));

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ padding: '16px 20px 8px', fontSize: 20, fontWeight: 800, color: cTier?.name === 'BLACK' ? '#fff' : '#0D0D0D' }}>📋 Reglas del Programa</div>
      {tiers.map((t, i) => <TierCard key={t.name} t={t} gal={[0, 150, 500][i]} small cfg={cfg} />)}
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
