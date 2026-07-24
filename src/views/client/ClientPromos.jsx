// src/views/client/ClientPromos.jsx
// R1b.4 — Ventana PROMOCIONES con el FORMATO GENERAL (referencia
// maestra, pantalla 2): flat/minimalista, colores sólidos sin sombras.
//   · Volver = flecha suelta sin recuadro (feedback 21-jul).
//   · Chips Todas/Combustible/Tienda/Servicios en UNA fila fija que se
//     reparte el ancho (sin overflow → sin barra de desplazamiento).
//   · Cards 3:4 compuestas por código (PromoCard) en grid de 2 columnas.
//   · Banner inferior al catálogo: cuadro rojo con ícono de regalo SVG
//     + botón circular negro con chevron (sin emojis).
// Se llega tocando el cuadro de Promociones del home; no es pestaña
// del bottom nav.
import { useState } from 'react';
import { bento, BRAND_RED } from '../../constants/styles';
import PromoCard from '../../components/ui/PromoCard';
import { GiftIcon } from '../../components/ui/BentoIcons';
import { ArrowLeft, Chev } from '../../components/ui/Icons';
import { originFromEvent } from '../../lib/motionOrigin';

const CHIPS = [
  { v: 'todas',       label: 'Todas' },
  { v: 'combustible', label: 'Combustible' },
  { v: 'tienda',      label: 'Tienda' },
  { v: 'servicios',   label: 'Servicios' },
];

export default function ClientPromos(ctx) {
  const { cTier, activePromos, setCScr, setNavOrigin, dark } = ctx;
  const isBlack = cTier.name === 'BLACK';
  const headerTxt = dark ? '#fff' : '#0D0D0D';
  const subTxt = dark ? 'rgba(255,255,255,.55)' : '#6E6E73';

  const [chip, setChip] = useState('todas');
  // Sin categoría → solo en "Todas" (promos anteriores a R1b.2).
  const visible = chip === 'todas'
    ? activePromos
    : activePromos.filter(p => p.category === chip);

  return (
    <div style={{ minHeight: '100vh', background: (dark || isBlack) ? 'transparent' : bento.pageBg, paddingBottom: 100 }}>
      {/* Header: flecha suelta + título centrado (FORMATO GENERAL) */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '18px 16px 10px' }}>
        <button onClick={() => setCScr('home')} aria-label="Volver" style={{
          width: 40, height: 40, border: 'none', cursor: 'pointer',
          background: 'none', color: headerTxt, padding: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <ArrowLeft />
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 800, color: headerTxt, marginRight: 40 }}>
          Promociones
        </div>
      </div>

      {/* Chips de categorías: una sola fila que se reparte el ancho —
          nunca desborda, nunca muestra barra de desplazamiento */}
      <div style={{ display: 'flex', gap: 7, padding: '6px 14px 16px' }}>
        {CHIPS.map(c => {
          const on = chip === c.v;
          return (
            <button key={c.v} onClick={() => setChip(c.v)} style={{
              flex: '1 1 0', minWidth: 0, padding: '10px 2px', borderRadius: 12,
              border: 'none', cursor: 'pointer', textAlign: 'center',
              background: on ? BRAND_RED : (dark ? 'rgba(255,255,255,.08)' : '#fff'),
              color: on ? '#fff' : (dark ? 'rgba(255,255,255,.75)' : '#3A3A3C'),
              fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
              transition: 'background .2s, color .2s',
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
          <div style={{ marginBottom: 12, lineHeight: 0, display: 'flex', justifyContent: 'center' }}>
            <GiftIcon size={44} color={subTxt} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            {chip === 'todas' ? 'Pronto habrá promociones para vos' : 'Sin promociones en esta categoría por ahora'}
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '0 14px' }}>
        {visible.map((p, i) => (
          <div key={p.id} className="pp-tile" style={{ animationDelay: `${i * 60}ms`, borderRadius: 20 }}>
            <PromoCard promo={p} ratio="3:4" />
          </div>
        ))}
      </div>

      {/* Banner inferior: canje de premios (referencia — flat, sin emojis) */}
      <div style={{ padding: '12px 14px 0' }}>
        <div
          className="pp-tile"
          onClick={(e) => { if (setNavOrigin) setNavOrigin(originFromEvent(e)); setCScr('cat'); }}
          style={{
            animationDelay: `${visible.length * 60}ms`,
            display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
            background: dark ? 'rgba(255,255,255,.06)' : '#fff', borderRadius: 20,
            padding: '16px 16px', marginTop: 4,
          }}
        >
          <div style={{
            width: 46, height: 46, borderRadius: 14, flexShrink: 0,
            background: bento.red, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <GiftIcon size={26} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: headerTxt, lineHeight: 1.25 }}>
              Canjea tus puntos por increíbles premios
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: subTxt, marginTop: 3 }}>
              Ver catálogo
            </div>
          </div>
          <div style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
            background: dark ? '#fff' : '#0D0D0D', color: dark ? '#0D0D0D' : '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Chev />
          </div>
        </div>
      </div>
    </div>
  );
}
