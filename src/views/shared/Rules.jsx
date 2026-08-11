// src/views/shared/Rules.jsx
// REGLAS Y TÉRMINOS — Admin v2 (11-ago-2026, FORMATO GENERAL): flat
// sin emojis, encabezado v2 sin back-link (navegación en el sidebar),
// secciones en grid auto-fill 340px. Vista de SOLO CONSULTA del panel;
// el cliente ve esta información en su Menú (Niveles/Inactividad y
// Términos). Tarjetas de nivel del FORMATO GENERAL (TierBenefitsCard:
// banda por tier + iconos SVG, sin emojis ni "invitar amigo").
// Términos de Canje (cfg.termsCanje) gana tarjeta propia — el dato
// existía en config pero no se mostraba en ninguna vista.
import { adminTheme as AT, bento, BRAND_ORANGE } from '../../constants/styles';
import TierBenefitsCard from '../../components/ui/TierBenefitsCard';
import { makeTier } from '../../lib/tierSystem';
import { Warn } from '../../components/ui/Icons';

export default function Rules(ctx) {
  const { cfg, cTier, me } = ctx;
  const ptGal = cfg.tiers?.platino?.gal ?? 150;
  const bkGal = cfg.tiers?.black?.gal ?? 500;
  const tiers = [0, ptGal, bkGal].map(g => makeTier(g, cfg));

  // ── estilos (FORMATO GENERAL Admin v2) ──────────────────
  // Estructura pedida por el dueño (11-ago): UNA COLUMNA POR SECCIÓN
  // (Niveles | Inactividad | Términos) con sus tarjetas apiladas; las
  // columnas se reacomodan por ancho (monitor 3, tablet 2, celular 1).
  const secTitle = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 800, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: 1.5, margin: '0 0 4px' };
  const secHint = { fontSize: 11, color: '#777', lineHeight: 1.5, marginBottom: 10 };
  const colGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 18, alignItems: 'start', marginTop: 16 };
  const colStack = { display: 'flex', flexDirection: 'column', gap: 10 };
  const card = { background: AT.card, borderRadius: 16, border: `1px solid ${AT.border}`, padding: '14px 16px' };

  const termCard = (title, terms) => (
    <div style={card}>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#E0E0E0', marginBottom: 10 }}>{title}</div>
      {terms.map((t, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: BRAND_ORANGE, flexShrink: 0, width: 18 }}>{i + 1}.</span>
          <span style={{ fontSize: 12.5, color: AT.txt, lineHeight: 1.6 }}>{t}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ padding: '22px 22px 60px' }}>
      {/* Encabezado v2 (solo consulta — sin botón de acción) */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 21, fontWeight: 800, color: '#fff' }}>Reglas y términos</div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#9E9E9E', marginTop: 2 }}>
          Referencia del programa — niveles y beneficios, inactividad y términos · el cliente ve esta información en su Menú
        </div>
      </div>

      <div style={colGrid}>
        {/* Columna 1 — Niveles y beneficios */}
        <div>
          <div style={secTitle}>Niveles y Beneficios</div>
          <div style={colStack}>
            {tiers.map(t => (
              <TierBenefitsCard
                key={t.name} t={t} cfg={cfg}
                surface={AT.card} ink={AT.txt}
                pill={me && cTier?.name === t.name ? `Tu nivel · ${(me.gallons || 0).toFixed(0)} gal` : null}
              />
            ))}
          </div>
        </div>

        {/* Columna 2 — Reglas de inactividad */}
        <div>
          <div style={secTitle}>
            <span style={{ color: bento.amber, display: 'flex' }}><Warn /></span>
            Reglas de Inactividad
          </div>
          <div style={secHint}>
            {cfg.degradEnabled
              ? 'Motor de degradación ACTIVO — estas reglas se están aplicando.'
              : 'Motor de degradación apagado — las reglas se muestran pero NO se aplican (se enciende en Configuración).'}
          </div>
          <div style={colStack}>
            {(cfg.degrad || []).map((d, i) => (
              <div key={i} style={card}>
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
        </div>

        {/* Columna 3 — Términos (numeración naranja — patrón del menú del cliente) */}
        <div>
          <div style={secTitle}>Términos</div>
          <div style={colStack}>
            {(cfg.termsUse || []).length > 0 && termCard('Términos de Uso', cfg.termsUse)}
            {(cfg.termsCanje || []).length > 0 && termCard('Términos de Canje', cfg.termsCanje)}
            {(cfg.termsUse || []).length === 0 && (cfg.termsCanje || []).length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: '#777', fontSize: 13, fontWeight: 700 }}>
                Sin términos cargados en la configuración.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
