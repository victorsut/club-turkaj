// src/views/shared/Rules.jsx
// Reglas del Programa — hoy solo se llega desde el panel admin
// (Ajustes → "Ver Reglas"); el cliente ve esta información en el Menú
// (Niveles/Inactividad). Tema oscuro del admin y tarjetas de nivel del
// FORMATO GENERAL (TierBenefitsCard: banda por tier + iconos SVG, sin
// emojis ni "invitar amigo").
import { adminTheme as AT, bento, BRAND_ORANGE } from '../../constants/styles';
import TierBenefitsCard from '../../components/ui/TierBenefitsCard';
import { makeTier } from '../../lib/tierSystem';
import { Back, Warn } from '../../components/ui/Icons';

export default function Rules(ctx) {
  const { cfg, cTier, me, setScr } = ctx;
  const ptGal = cfg.tiers?.platino?.gal ?? 150;
  const bkGal = cfg.tiers?.black?.gal ?? 500;
  const tiers = [0, ptGal, bkGal].map(g => makeTier(g, cfg));

  const secHdr = { display: 'flex', alignItems: 'center', gap: 8, padding: '18px 20px 12px', fontSize: 13, fontWeight: 800, color: '#E0E0E0', textTransform: 'uppercase', letterSpacing: 1.5 };

  return (
    <div style={{ paddingBottom: 90, minHeight: '100vh', background: AT.bg }}>
      {/* Header (mismo patrón de MemberDetail) */}
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${AT.border}`, background: '#252525', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setScr('cfg')} style={{ background: 'none', border: 'none', color: '#9E9E9E', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600 }}><Back /> Ajustes</button>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Reglas del Programa</div>
        <div style={{ width: 80 }} />
      </div>

      {/* Niveles y beneficios */}
      <div style={{ padding: '16px 20px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {tiers.map(t => (
          <TierBenefitsCard
            key={t.name} t={t} cfg={cfg}
            surface={AT.card} ink={AT.txt}
            pill={me && cTier?.name === t.name ? `Tu nivel · ${(me.gallons || 0).toFixed(0)} gal` : null}
          />
        ))}
      </div>

      {/* Reglas de inactividad */}
      <div style={secHdr}>
        <span style={{ color: bento.amber, display: 'flex' }}><Warn /></span>
        Reglas de Inactividad
      </div>
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {(cfg.degrad || []).map((d, i) => (
          <div key={i} style={{ background: AT.card, borderRadius: 16, padding: '14px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8, color: bento.amber }}>{d.tier}</div>
            {d.rules.map((r, j) => (
              <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: bento.amber, color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{j + 1}</div>
                <div style={{ fontSize: 12.5, color: AT.txt, lineHeight: 1.5 }}><strong>{r.days} días</strong> sin actividad → {r.effect}</div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Términos de uso (numeración naranja — patrón del menú) */}
      <div style={secHdr}>Términos de Uso</div>
      <div style={{ margin: '0 20px', background: AT.card, borderRadius: 16, padding: '14px 16px' }}>
        {(cfg.termsUse || []).map((t, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: BRAND_ORANGE, flexShrink: 0, width: 18 }}>{i + 1}.</span>
            <span style={{ fontSize: 12.5, color: AT.txt, lineHeight: 1.6 }}>{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
