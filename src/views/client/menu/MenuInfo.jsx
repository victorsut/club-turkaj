// src/views/client/menu/MenuInfo.jsx
// Secciones informativas del menú (FORMATO GENERAL): Niveles y
// Beneficios (tarjetas con banda por tier, mismas reglas del modal de
// nivel del home: WiFi solo PLATINO/BLACK, sin "invitar amigos"),
// Reglas de Inactividad y Acerca de Puntos Plus.
import { bento } from '../../../constants/styles';
import { Warn, Info } from '../../../components/ui/Icons';
import { makeTier } from '../../../lib/tierSystem';
import { SectionHeader } from './menuUi';
import TierBenefitsCard from '../../../components/ui/TierBenefitsCard';

// ── NIVELES Y BENEFICIOS ───────────────────────────────────
export function MenuLevels({ cfg, cTier, me, TH, onBack }) {
  const ptGal = cfg.tiers?.platino?.gal ?? 150;
  const bkGal = cfg.tiers?.black?.gal ?? 500;
  const tiers = [0, ptGal, bkGal].map(g => makeTier(g, cfg));

  return (
    <>
      <SectionHeader title="Niveles y Beneficios" sub="ORO, PLATINO y BLACK" onBack={onBack} TH={TH} />
      {tiers.map(t => (
        <TierBenefitsCard
          key={t.name} t={t} cfg={cfg}
          surface={TH.surface} ink={TH.text}
          pill={cTier?.name === t.name ? `Tu nivel · ${(me?.gallons || 0).toFixed(0)} gal` : null}
          style={{ marginBottom: 14 }}
        />
      ))}
    </>
  );
}

// ── REGLAS DE INACTIVIDAD ──────────────────────────────────
export function MenuInactivity({ cfg, TH, onBack }) {
  return (
    <>
      <SectionHeader title="Reglas de Inactividad" sub="El nivel se ajusta según los días sin actividad" onBack={onBack} TH={TH} />
      {(cfg.degrad || []).map((d, i) => (
        <div key={i} style={{ marginBottom: 14, background: TH.surface, borderRadius: 20, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ color: bento.amber, display: 'flex' }}><Warn /></span>
            <span style={{ fontSize: 14, fontWeight: 800, color: TH.header }}>{d.tier}</span>
          </div>
          {d.rules.map((r, j) => (
            <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: bento.amber, color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{j + 1}</div>
              <div style={{ fontSize: 13, color: TH.text, lineHeight: 1.5 }}><strong>{r.days} días</strong> sin actividad → {r.effect}</div>
            </div>
          ))}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 10, padding: '14px 16px', borderRadius: 16, background: TH.surface, marginTop: 4 }}>
        <span style={{ color: TH.sub, display: 'flex', flexShrink: 0 }}><Info /></span>
        <div style={{ fontSize: 12, color: TH.sub, lineHeight: 1.6 }}>
          Cualquier compra, canje, encuesta o compra de boletos de rifa cuenta como actividad y reinicia el contador de inactividad.
        </div>
      </div>
    </>
  );
}

// ── ACERCA DE PUNTOS PLUS (R1a / D28) ─────────────────────
export function MenuAbout({ TH, onBack }) {
  return (
    <>
      <SectionHeader title="Acerca de Puntos Plus" sub="Información de la plataforma" onBack={onBack} TH={TH} />
      <div style={{ padding: '16px 18px', borderRadius: 20, background: TH.surface, marginBottom: 12 }}>
        <div style={{ fontSize: 14, color: TH.text, lineHeight: 1.7 }}>
          <strong style={{ color: TH.header }}>Puntos Plus</strong> es una plataforma digital de fidelización independiente. Permite acumular puntos por consumo, canjear premios, participar en rifas mensuales y acceder a beneficios según tu nivel.
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, padding: '16px 18px', borderRadius: 20, background: TH.surface, marginBottom: 12 }}>
        <span style={{ color: bento.amber, display: 'flex', flexShrink: 0 }}><Warn /></span>
        <div style={{ fontSize: 13, color: TH.text, lineHeight: 1.7 }}>
          <strong style={{ color: TH.header }}>Aviso legal:</strong> Puntos Plus es una app ajena a Shell Guatemala y aplica únicamente a gasolineras Turkaj en Chichicastenango.
        </div>
      </div>
      <div style={{ padding: '16px 18px', borderRadius: 20, background: TH.surface }}>
        <div style={{ fontSize: 12, color: TH.sub, lineHeight: 1.8 }}>
          Comercio afiliado: Gasolineras Turkaj I, II y III · Chichicastenango, El Quiché, Guatemala.<br />
          Contacto: gasolineraturkaj2@hotmail.com o en cualquier estación afiliada.
        </div>
      </div>
    </>
  );
}
