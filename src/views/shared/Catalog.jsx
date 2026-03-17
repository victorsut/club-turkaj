// src/views/shared/Catalog.jsx
import { sMono, CAT_STYLES, CAT_LABELS } from '../../constants/styles';

export default function Catalog(ctx) {
  const { rewards, me, gT, cfg, cTier, catF, setCatF, redeem, client = true } = ctx;
  const t = me ? gT(me.gallons) : gT(0);
  const cats = ['todos', ...Object.keys(CAT_LABELS)];
  const filtered = catF === 'todos' ? rewards : rewards.filter(r => r.cat === catF);

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ padding: '16px 20px 8px', fontSize: 20, fontWeight: 800, color: cTier?.name === 'BLACK' ? '#fff' : '#0D0D0D' }}>
        {client ? '🎁 Catálogo de Premios' : '🎁 Premios'}
      </div>
      <div style={{ display: 'flex', gap: 6, padding: '0 20px', overflowX: 'auto', marginBottom: 16 }}>
        {cats.map(c => (
          <button key={c} onClick={() => setCatF(c)} style={{
            padding: '8px 14px', borderRadius: 20, border: 'none',
            background: catF === c ? '#FBBC04' : (cTier?.name === 'BLACK' ? 'rgba(255,255,255,.06)' : '#F5F5F5'),
            color: catF === c ? '#0D0D0D' : (cTier?.name === 'BLACK' ? '#aaa' : '#757575'),
            fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans'",
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {c === 'todos' ? 'Todos' : CAT_LABELS[c] || c}
          </button>
        ))}
      </div>
      <div style={{ padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {filtered.map(r => {
          const cs = CAT_STYLES[r.cat] || { bg: '#F5F5F5', c: '#616161' };
          const cost = client && me ? Math.round(r.pts * (1 - t.redeemDisc)) : r.pts;
          const canAfford = client && me ? me.points >= cost : false;
          return (
            <div key={r.id} onClick={() => client && canAfford && redeem(r)} style={{
              background: cTier?.name === 'BLACK' ? 'rgba(255,255,255,.05)' : '#fff',
              borderRadius: 16, padding: 16, textAlign: 'center',
              border: `1px solid ${cTier?.name === 'BLACK' ? 'rgba(255,255,255,.08)' : '#eee'}`,
              cursor: client && canAfford ? 'pointer' : 'default',
              opacity: client && !canAfford ? .5 : 1,
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{r.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: cTier?.name === 'BLACK' ? '#E0E0E0' : '#424242', marginBottom: 4, lineHeight: 1.3 }}>{r.name}</div>
              <div style={{ ...sMono, fontSize: 14, fontWeight: 800, color: canAfford ? '#2E7D32' : (cTier?.name === 'BLACK' ? '#aaa' : '#9E9E9E') }}>{cost} pts</div>
              {t.redeemDisc > 0 && cost < r.pts && (
                <div style={{ fontSize: 10, color: '#1565C0', fontWeight: 700, marginTop: 2 }}>-{Math.round(t.redeemDisc * 100)}% ({r.pts})</div>
              )}
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#9E9E9E' }}>No hay premios en esta categoría</div>}
    </div>
  );
}
