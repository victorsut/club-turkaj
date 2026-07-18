// src/views/client/ClientPromos.jsx
// R1b.2 (D33) — Ventana PROMOCIONES según referencia visual: header
// con volver, chips Todas/Combustible/Tienda/Servicios, cards 4:3
// compuestas por código (PromoCard, toda la info) y banner inferior
// hacia el catálogo de canjes. Se llega tocando el cuadro de
// Promociones del home; no es pestaña del bottom nav.
import { useState } from 'react';
import { bento, BRAND_RED } from '../../constants/styles';
import PromoCard from '../../components/ui/PromoCard';
import { originFromEvent } from '../../lib/motionOrigin';

const CHIPS = [
  { v: 'todas',       label: 'Todas' },
  { v: 'combustible', label: 'Combustible' },
  { v: 'tienda',      label: 'Tienda' },
  { v: 'servicios',   label: 'Servicios' },
];

export default function ClientPromos(ctx) {
  const { cTier, activePromos, setCScr, setNavOrigin } = ctx;
  const isBlack = cTier.name === 'BLACK';
  const headerTxt = isBlack ? '#fff' : '#0D0D0D';
  const subTxt = isBlack ? 'rgba(255,255,255,.55)' : '#6E6E73';

  const [chip, setChip] = useState('todas');
  // Sin categoría → solo en "Todas" (promos anteriores a R1b.2).
  const visible = chip === 'todas'
    ? activePromos
    : activePromos.filter(p => p.category === chip);

  return (
    <div style={{ minHeight: '100vh', background: isBlack ? 'transparent' : bento.pageBg, paddingBottom: 100 }}>
      {/* Header: volver + título centrado (referencia) */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 14px 8px' }}>
        <button onClick={() => setCScr('home')} aria-label="Volver" style={{
          width: 42, height: 42, borderRadius: 12, border: 'none', cursor: 'pointer',
          background: isBlack ? 'rgba(255,255,255,.08)' : '#fff', color: headerTxt,
          fontSize: 20, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isBlack ? 'none' : '0 2px 8px rgba(0,0,0,.08)', flexShrink: 0,
        }}>
          ←
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 900, color: headerTxt, marginRight: 42 }}>
          Promociones
        </div>
      </div>

      {/* Chips de categorías */}
      <div style={{ display: 'flex', gap: 8, padding: '8px 14px 14px', overflowX: 'auto' }}>
        {CHIPS.map(c => {
          const on = chip === c.v;
          return (
            <button key={c.v} onClick={() => setChip(c.v)} style={{
              padding: '9px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
              background: on ? BRAND_RED : (isBlack ? 'rgba(255,255,255,.08)' : '#fff'),
              color: on ? '#fff' : (isBlack ? 'rgba(255,255,255,.75)' : '#424242'),
              fontFamily: "'DM Sans'", fontSize: 12.5, fontWeight: 800, whiteSpace: 'nowrap',
              boxShadow: isBlack ? 'none' : '0 2px 8px rgba(0,0,0,.06)',
              transition: 'background .2s, color .2s', flexShrink: 0,
            }}>
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Cards verticales agrupadas en cuadrícula de 2 columnas
          (orientación de la referencia) — toda la información */}
      {visible.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: subTxt }}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>🎁</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            {chip === 'todas' ? 'Pronto habrá promociones para vos' : 'Sin promociones en esta categoría por ahora'}
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '0 14px' }}>
        {visible.map((p, i) => (
          <div key={p.id} className="pp-tile" style={{ animationDelay: `${i * 60}ms`, boxShadow: bento.shadow, borderRadius: 20 }}>
            <PromoCard promo={p} ratio="3:4" />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 14px 0' }}>
        {/* Banner inferior: canje de premios (referencia) */}
        <div
          className="pp-tile"
          onClick={(e) => { if (setNavOrigin) setNavOrigin(originFromEvent(e)); setCScr('cat'); }}
          style={{
            animationDelay: `${visible.length * 60}ms`,
            display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
            background: isBlack ? 'rgba(255,255,255,.06)' : '#fff', borderRadius: 20,
            padding: '18px 18px', boxShadow: bento.shadow, marginTop: 4,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: headerTxt, lineHeight: 1.3 }}>
              Canjea tus puntos por increíbles premios
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: subTxt, marginTop: 4 }}>
              Ver catálogo ›
            </div>
          </div>
          <div style={{ fontSize: 36, flexShrink: 0 }}>🎁</div>
        </div>
      </div>
    </div>
  );
}
