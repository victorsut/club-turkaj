// src/views/shared/Catalog.jsx
// R1b.4 — Pestaña CANJES (catálogo de premios) con FORMATO GENERAL:
// fondo claro de la app, título centrado + puntos disponibles, chips de
// categoría en filas con wrap (sin barra de desplazamiento), cards flat
// sin borde con el ícono SVG del premio (RewardIcon — sin emojis) sobre
// un cuadro de color sólido por categoría. BLACK conserva su galaxia.
import { useState, useEffect } from 'react';
import { bento, BRAND_ORANGE, CAT_LABELS, CAT_COLORS, homeColors } from '../../constants/styles';
import RewardIcon from '../../components/ui/RewardIcon';
import ChipScroller from '../../components/ui/ChipScroller';
import HistorySheet from '../client/HistorySheet';
import { Clock } from '../../components/ui/Icons';
import { originFromEvent } from '../../lib/motionOrigin';
import { rewardLocationNames } from '../../lib/rewardLocations';

export default function Catalog(ctx) {
  const { rewards, me, gT, cfg, cTier, catF, setCatF, redeem, setRedeemConfirm, client = true, redeemedList, activityLog, dark: modeDark, showQR, catPendingSignal, rewardQrCloseSignal, stations = [], stores = [] } = ctx;
  // El modo claro/oscuro solo aplica a la vista del cliente — en el
  // panel admin el catálogo conserva su presentación clara actual.
  const dark = client && !!modeDark;
  const t    = me ? gT(me.gallons) : gT(0);
  const visible = (rewards || []).filter(r => r.active !== false);
  // Solo categorías CON premios activos (4-ago, pedido del dueño): una
  // categoría vacía no aparece hasta que el admin le asigne un premio.
  // El orden lo sigue marcando CAT_LABELS (estable entre renders).
  const usedCats = new Set(visible.map(r => r.cat));
  const cats = ['todos', ...Object.keys(CAT_LABELS).filter(c => usedCats.has(c))];
  const filtered = catF === 'todos' ? visible : visible.filter(r => r.cat === catF);

  // Si la categoría filtrada se queda sin premios (se desactivó el
  // último desde admin), el filtro cae a Todos — su chip ya no existe.
  useEffect(() => {
    if (catF !== 'todos' && !usedCats.has(catF)) setCatF('todos');
  }, [catF, rewards]); // eslint-disable-line react-hooks/exhaustive-deps

  // Canjes PENDIENTES de usar (reloj arriba-derecha → HistorySheet ya
  // filtrado, mismo patrón del Historial de Canjes).
  const [pendSheet, setPendSheet] = useState(null); // { origin } | null

  // Deep-link de notificación de premio (type 'reward'): la señal del
  // ctx abre los pendientes sin tap (origin null → animación centrada).
  useEffect(() => {
    if (client && catPendingSignal) setPendSheet({ origin: null });
  }, [client, catPendingSignal]);
  const myRedeemed = (client && me) ? (redeemedList || []).filter(rd => rd.memberId === me.id) : [];
  const pendingCount = myRedeemed.filter(r => !r.collected).length;
  const myActs = me ? (activityLog?.[me.id] || []) : [];

  const isBlack = (cTier?.name || 'ORO') === 'BLACK';
  const headerTxt = dark ? '#fff' : '#0D0D0D';
  const subTxt = dark ? 'rgba(255,255,255,.55)' : '#6E6E73';
  const surface = dark ? 'rgba(255,255,255,.06)' : '#fff';
  const good = dark ? '#7CD98F' : bento.green;

  return (
    <div style={{ paddingBottom: 100, minHeight: '100vh', background: (dark || (client && isBlack)) ? 'transparent' : bento.pageBg }}>
      {/* Header centrado (formato de las ventanas del track) + reloj de
          canjes pendientes de usar arriba-derecha */}
      <div style={{ padding: '18px 16px 4px', textAlign: 'center', position: 'relative' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: headerTxt }}>
          Catálogo de Premios
        </div>
        {client && me && (
          <div style={{ fontSize: 11, fontWeight: 600, color: subTxt, marginTop: 1 }}>
            Tenés <span style={{ fontWeight: 800, color: good, fontVariantNumeric: 'tabular-nums' }}>{me.points} pts</span> para canjear
          </div>
        )}
        {client && me && (
          <button onClick={(e) => setPendSheet({ origin: originFromEvent(e) })} aria-label="Canjes pendientes" style={{
            position: 'absolute', right: 10, top: 12,
            width: 40, height: 40, border: 'none', cursor: 'pointer', padding: 0,
            borderRadius: 12, background: 'none', color: headerTxt,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Clock />
            {pendingCount > 0 && (
              <span style={{
                position: 'absolute', top: 3, right: 3,
                minWidth: 16, height: 16, borderRadius: 8, padding: '0 4px',
                background: bento.red, color: '#fff',
                fontSize: 9.5, fontWeight: 800, lineHeight: '16px',
                fontFamily: "'DM Sans'", boxSizing: 'border-box',
              }}>
                {pendingCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Filtros por categoría — chips desplazables sin barra visible
          (ChipScroller: desvanecido en bordes = hay más) */}
      <ChipScroller padding="10px 14px 16px">
        {cats.map(c => {
          const on = catF === c;
          return (
            <button key={c} onClick={() => setCatF(c)} style={{
              padding: '8px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: on ? BRAND_ORANGE : (dark ? 'rgba(255,255,255,.08)' : '#fff'),
              color: on ? '#fff' : (dark ? 'rgba(255,255,255,.75)' : '#3A3A3C'),
              fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
              transition: 'background .2s, color .2s',
            }}>
              {c === 'todos' ? 'Todos' : CAT_LABELS[c] || c}
            </button>
          );
        })}
      </ChipScroller>

      {/* Grid de premios — cards flat sin borde */}
      <div style={{ padding: '0 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {filtered.map((r, i) => {
          const catColor = CAT_COLORS[r.cat] || '#5E5E63';
          const cost     = client && me ? Math.round(r.pts * (1 - t.redeemDisc)) : r.pts;
          const canAfford = client && me ? me.points >= cost : false;
          return (
            <div key={r.id} className="pp-tile" onClick={() => {
              if (!client || !canAfford) return;
              if (setRedeemConfirm) setRedeemConfirm({ reward: r, cost });
              else redeem(r);
            }} style={{
              animationDelay: `${Math.min(i, 12) * 40}ms`,
              background: surface, borderRadius: 20, padding: '18px 14px 16px', textAlign: 'center',
              cursor: client && canAfford ? 'pointer' : 'default',
              opacity: client && !canAfford ? .55 : 1,
            }}>
              <div style={{
                width: 46, height: 46, borderRadius: 14, margin: '0 auto 10px',
                background: catColor, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <RewardIcon reward={r} />
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: dark ? '#E0E0E0' : '#0D0D0D', marginBottom: 6, lineHeight: 1.3 }}>
                {r.name}
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: canAfford ? good : subTxt }}>
                {cost} pts
              </div>
              {t.redeemDisc > 0 && cost < r.pts && (
                <div style={{ fontSize: 10, color: dark ? '#90CAF9' : bento.blue, fontWeight: 700, marginTop: 2 }}>
                  -{Math.round(t.redeemDisc * 100)}% ({r.pts} pts)
                </div>
              )}
              {/* D17: si el premio está restringido, dónde es válido
                  (sin restricción no se muestra nada) */}
              {(() => {
                const locNames = rewardLocationNames(r, stations, stores);
                return locNames && (
                  <div style={{ fontSize: 9.5, color: subTxt, fontWeight: 700, marginTop: 4, lineHeight: 1.4 }}>
                    Solo en: {locNames.join(' · ')}
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: subTxt, fontSize: 13, fontWeight: 700 }}>
          No hay premios en esta categoría
        </div>
      )}

      {/* Canjes pendientes de usar (HistorySheet ya filtrado) */}
      {pendSheet && (
        <HistorySheet
          type="canjes"
          initialPending
          origin={pendSheet.origin}
          tint={homeColors(cTier?.name || 'ORO').redeems}
          accent={homeColors(cTier?.name || 'ORO').redeems}
          accentInk={homeColors(cTier?.name || 'ORO').redeemsInk}
          onClose={() => setPendSheet(null)}
          acts={myActs}
          redeemed={myRedeemed}
          tierName={cTier?.name || 'ORO'}
          dark={dark}
          qrOverlayOpen={showQR}
          rewardQrCloseSignal={rewardQrCloseSignal}
        />
      )}
    </div>
  );
}
