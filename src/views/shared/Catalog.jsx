// src/views/shared/Catalog.jsx
import { sMono, CAT_STYLES, CAT_LABELS } from '../../constants/styles';

export default function Catalog(ctx) {
  const { rewards, me, gT, cfg, cTier, catF, setCatF, redeem, setRedeemConfirm, client = true } = ctx;
  const t    = me ? gT(me.gallons) : gT(0);
  const cats = ['todos', ...Object.keys(CAT_LABELS)];
  const visible = (rewards || []).filter(r => r.active !== false);
  const filtered = catF === 'todos' ? visible : visible.filter(r => r.cat === catF);

  // ── Tema por tier ──────────────────────────────────────
  const tier = cTier?.name || 'ORO';
  const isDark   = tier === 'BLACK';
  const isPlatino = tier === 'PLATINO';

  const TH = {
    bg:       isDark ? '#06060C' : isPlatino ? '#E8E8E8' : '#fff',
    text:     isDark ? '#E0E0E0' : '#424242',
    subText:  isDark ? '#9E9E9E' : '#9E9E9E',
    cardBg:   isDark ? 'rgba(255,255,255,.05)' : isPlatino ? 'rgba(255,255,255,.6)' : '#fff',
    cardBorder: isDark ? '1px solid rgba(255,255,255,.08)' : isPlatino ? '1px solid #BDBDBD' : '1px solid #eee',
    accent:   isDark ? '#FFD54F' : isPlatino ? '#1565C0' : '#FBBC04',
    accentText: isDark ? '#0D0D0D' : '#0D0D0D',
    filterActive: isDark ? '#FFD54F' : isPlatino ? '#1565C0' : '#FBBC04',
    filterActiveTxt: isDark ? '#0D0D0D' : isPlatino ? '#fff' : '#0D0D0D',
    filterBg: isDark ? 'rgba(255,255,255,.06)' : isPlatino ? 'rgba(0,0,0,.06)' : '#F5F5F5',
    priceCan: isDark ? '#69F0AE' : isPlatino ? '#1565C0' : '#2E7D32',
    header:   isDark ? '#fff' : '#0D0D0D',
    discountColor: isDark ? '#90CAF9' : isPlatino ? '#1565C0' : '#1565C0',
  };

  return (
    <div style={{ paddingBottom: 90, minHeight: '100vh', background: TH.bg }}>
      <div style={{ padding: '16px 20px 8px', fontSize: 20, fontWeight: 800, color: TH.header }}>
        {client ? '🎁 Catálogo de Premios' : '🎁 Premios'}
      </div>

      {/* Filtros por categoría */}
      <div style={{ display: 'flex', gap: 6, padding: '0 20px', overflowX: 'auto', marginBottom: 16 }}>
        {cats.map(c => (
          <button key={c} onClick={() => setCatF(c)} style={{
            padding: '8px 14px', borderRadius: 20, border: 'none',
            background: catF === c ? TH.filterActive : TH.filterBg,
            color: catF === c ? TH.filterActiveTxt : TH.subText,
            fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans'",
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {c === 'todos' ? 'Todos' : CAT_LABELS[c] || c}
          </button>
        ))}
      </div>

      {/* Grid de premios */}
      <div style={{ padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {filtered.map(r => {
          const cs       = CAT_STYLES[r.cat] || { bg: '#F5F5F5', c: '#616161' };
          const cost     = client && me ? Math.round(r.pts * (1 - t.redeemDisc)) : r.pts;
          const canAfford = client && me ? me.points >= cost : false;
          return (
            <div key={r.id} onClick={() => {
              if (!client || !canAfford) return;
              if (setRedeemConfirm) setRedeemConfirm({ reward: r, cost });
              else redeem(r);
            }} style={{
              background: TH.cardBg, borderRadius: 16, padding: 16, textAlign: 'center',
              border: TH.cardBorder,
              cursor: client && canAfford ? 'pointer' : 'default',
              opacity: client && !canAfford ? .5 : 1,
              transition: 'transform .1s',
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{r.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: TH.text, marginBottom: 6, lineHeight: 1.3 }}>
                {r.name}
              </div>
              <div style={{ ...sMono, fontSize: 14, fontWeight: 800, color: canAfford ? TH.priceCan : TH.subText }}>
                {cost} pts
              </div>
              {t.redeemDisc > 0 && cost < r.pts && (
                <div style={{ fontSize: 10, color: TH.discountColor, fontWeight: 700, marginTop: 2 }}>
                  -{Math.round(t.redeemDisc * 100)}% ({r.pts} pts)
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: TH.subText }}>
          No hay premios en esta categoría
        </div>
      )}
    </div>
  );
}
