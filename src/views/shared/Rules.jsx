// src/views/shared/Rules.jsx
import TierCard from '../../components/ui/TierCard';
import { makeTier } from '../../lib/tierSystem';
import { sMono } from '../../constants/styles';

export default function Rules(ctx) {
  const { cfg, cTier, me } = ctx;
  const memberGal = me?.gallons || 0;
  const tiers = [0, 150, 500].map(g => makeTier(g, cfg));

  const tier      = cTier?.name || 'ORO';
  const isDark    = tier === 'BLACK';
  const isPlatino = tier === 'PLATINO';

  const TH = {
    bg:      isDark ? '#06060C' : isPlatino ? '#E8E8E8' : '#fff',
    header:  isDark ? '#fff' : '#0D0D0D',
    text:    isDark ? '#E0E0E0' : '#424242',
    sub:     isDark ? '#aaa' : '#616161',
    accent:  isDark ? '#FFD54F' : isPlatino ? '#1565C0' : '#FBBC04',
    warnTxt: isDark ? '#EF5350' : '#C62828',
    warnHdr: isDark ? '#FFB74D' : '#E65100',
    warnBg:  isDark ? 'rgba(255,255,255,.05)' : isPlatino ? 'rgba(21,101,192,.08)' : '#FFF3E0',
    border:  isDark ? 'rgba(255,255,255,.08)' : isPlatino ? '#BDBDBD' : '#eee',
  };

  return (
    <div style={{ paddingBottom: 90, minHeight: '100vh', background: TH.bg }}>
      <div style={{ padding: '16px 20px 8px', fontSize: 20, fontWeight: 800, color: TH.header }}>
        📋 Reglas del Programa
      </div>

      {/* Tarjetas de nivel */}
      {tiers.map((t, i) => {
        const isCurrentTier = me && cTier?.name === t.name;
        const galForCard    = isCurrentTier ? memberGal : [0, 150, 500][i];
        return (
          <div key={t.name} style={{ position: 'relative' }}>
            {isCurrentTier && (
              <div style={{
                position: 'absolute', top: 6, right: 26, zIndex: 10,
                background: t.name === 'BLACK' ? 'rgba(255,215,79,.9)'
                  : t.name === 'PLATINO' ? '#1565C0' : 'rgba(0,0,0,.75)',
                color: t.name === 'BLACK' ? '#000' : '#fff',
                fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 8, letterSpacing: .5,
              }}>
                📍 TU NIVEL · {memberGal.toFixed(0)} gal
              </div>
            )}
            <TierCard t={t} gal={galForCard} small cfg={cfg} />
          </div>
        );
      })}

      {/* Reglas de inactividad */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: TH.warnTxt, marginBottom: 12 }}>
          ⚠️ Reglas de Inactividad
        </div>
        {(cfg.degrad || []).map((d, i) => (
          <div key={i} style={{ marginBottom: 12, background: TH.warnBg, borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 6, color: TH.warnHdr }}>{d.tier}</div>
            {d.rules.map((r, j) => (
              <div key={j} style={{ fontSize: 12, color: TH.sub, marginBottom: 4 }}>
                • {r.days} días → {r.effect}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Términos de uso */}
      <div style={{ padding: '0 20px 16px' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: TH.header, marginBottom: 10 }}>
          📜 Términos de Uso
        </div>
        {(cfg.termsUse || []).map((t, i) => (
          <div key={i} style={{
            fontSize: 12, color: TH.sub, marginBottom: 6,
            paddingLeft: 12, borderLeft: `2px solid ${TH.accent}`,
          }}>{t}</div>
        ))}
      </div>
    </div>
  );
}
