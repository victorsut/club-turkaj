// src/views/operator/OpRedeem.jsx
// Operator view — scan client card and redeem rewards
import { sMono, inputStyle } from '../../constants/styles';
import Badge from '../../components/ui/Badge';
import TierDeco from '../../components/ui/TierDeco';
import { Back } from '../../components/ui/Icons';

export default function OpRedeem(ctx) {
  const {
    custs, setCusts, rewards, gT, fire, me, setMe,
    opRedeemClient, setOpRedeemClient,
    opCardScan, setOpCardScan,
    opSearch, setOpSearch,
    cards, syncMember, logActivity,
    setRedeemedList, tierBg, tierShadow, tierBorder,
  } = ctx;

  // Scan card simulation (TODO: replace with real QR/NFC)
  const scanCard = () => {
    setOpCardScan('scanning');
    setTimeout(() => {
      const activeCards = (cards || []).filter(c => c.status === 'active');
      if (activeCards.length === 0) { setOpCardScan('nocard'); return; }
      const pick = activeCards[Math.floor(Math.random() * activeCards.length)];
      const cust = custs.find(c => c.cardId === pick.id);
      if (cust) {
        setOpCardScan({ id: pick.id, tier: pick.tier });
        setOpRedeemClient(cust);
      } else {
        setOpCardScan('nocard');
      }
    }, 1500);
  };

  const cl = opRedeemClient;
  const t = cl ? gT(cl.gallons) : null;

  // Execute redemption
  const doRedeem = (r) => {
    if (!cl) return;
    const tier = gT(cl.gallons);
    const cost = Math.round(r.pts * (1 - tier.redeemDisc));
    if (cl.points >= cost) {
      setCusts(p => p.map(c => c.id === cl.id
        ? { ...c, points: c.points - cost, redeemed: (c.redeemed || 0) + 1 }
        : c
      ));
      if (me?.id === cl.id) setMe(p => ({ ...p, points: p.points - cost, redeemed: (p.redeemed || 0) + 1 }));
      const code = `TK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setRedeemedList(p => [{
        id: `RD-${Date.now()}`,
        reward: { name: r.name, icon: r.icon, cat: r.cat },
        cost, date: new Date().toISOString().split('T')[0],
        code, collected: false,
      }, ...p]);
      setOpRedeemClient({ ...cl, points: cl.points - cost, redeemed: (cl.redeemed || 0) + 1 });
      fire(`🎉 ${cl.name} canjeó ${r.name} · -${cost} pts`);
      syncMember(cl.id, { points: cl.points - cost, redeemed_count: (cl.redeemed || 0) + 1, updated_at: new Date().toISOString() });
      logActivity(cl.id, 'canje', `Canjeó: ${r.name} ${r.icon} (operador)`, -cost);
    } else {
      fire('❌ Puntos insuficientes');
    }
  };

  const hdr = { padding: '14px 20px', borderBottom: '1px solid #E0E0E0', background: 'linear-gradient(135deg,#FBBC04 0%,#FFF8E1 60%,#FAFAFA 100%)' };
  const secLbl = { fontSize: 11, fontWeight: 800, color: '#BDBDBD', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 };

  // ── No client selected: scan or search ──
  if (!cl) {
    return (
      <div style={{ paddingBottom: 90 }}>
        <div style={hdr}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0D0D0D' }}>Canjear Premios</div>
        </div>

        {/* Scan card */}
        <div style={{ padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #E0E0E0', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💳</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#424242', marginBottom: 4 }}>Escanear tarjeta del cliente</div>
            <div style={{ fontSize: 13, color: '#9E9E9E', marginBottom: 20 }}>El cliente presenta su tarjeta física para canjear premios</div>

            {!opCardScan && (
              <button onClick={scanCard} style={{
                width: '100%', padding: 16, borderRadius: 16, border: '2px dashed #FBBC04',
                background: '#FFF8E1', fontFamily: "'DM Sans'", fontSize: 15, fontWeight: 800,
                cursor: 'pointer', color: '#F0A500', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>📷 Escanear Tarjeta</button>
            )}

            {opCardScan === 'scanning' && (
              <div style={{ padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8, animation: 'pulse 1s infinite' }}>📷</div>
                <div style={{ height: 4, borderRadius: 2, overflow: 'hidden', background: '#eee', margin: '12px 0' }}>
                  <div style={{ height: '100%', borderRadius: 2, background: '#FBBC04', animation: 'scanBar 1.5s ease forwards' }} />
                </div>
                <div style={{ fontSize: 13, color: '#9E9E9E' }}>Leyendo tarjeta...</div>
              </div>
            )}

            {opCardScan === 'nocard' && (
              <div style={{ padding: 16, background: '#FFF3E0', borderRadius: 14, border: '1px solid #FFCC80' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#E65100' }}>⚠️ Tarjeta no encontrada</div>
                <button onClick={() => setOpCardScan(null)} style={{
                  marginTop: 10, padding: '8px 20px', borderRadius: 10, border: 'none',
                  background: '#FBBC04', fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}>Reintentar</button>
              </div>
            )}
          </div>

          {/* Search by name */}
          <div style={{ margin: '20px 0', background: '#fff', borderRadius: 18, padding: 20, border: '1px solid #E0E0E0' }}>
            <div style={secLbl}>O buscar por nombre</div>
            <input
              placeholder="Buscar cliente..."
              value={opSearch || ''}
              onChange={e => setOpSearch(e.target.value)}
              style={{ ...inputStyle, background: '#fff', border: '1px solid #E0E0E0', color: '#0D0D0D' }}
            />
            {opSearch && opSearch.length > 1 && custs
              .filter(c => c.name.toLowerCase().includes(opSearch.toLowerCase()))
              .slice(0, 5)
              .map(c2 => {
                const ct = gT(c2.gallons);
                return (
                  <div key={c2.id} onClick={() => { setOpRedeemClient(c2); setOpCardScan({ id: c2.cardId, tier: ct.name }); setOpSearch(''); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #F0F0F0', cursor: 'pointer' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: ct.bg, color: ct.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800 }}>
                      {c2.name.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#424242' }}>{c2.name}</div>
                      <div style={{ fontSize: 11, color: '#9E9E9E' }}>{c2.points} pts · <Badge t={ct} /></div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    );
  }

  // ── Client selected: show profile + rewards ──
  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={hdr}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#0D0D0D' }}>Canjear Premios</div>
      </div>

      <div style={{ padding: 20 }}>
        {/* Back + card ID */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button onClick={() => { setOpRedeemClient(null); setOpCardScan(null); }}
            style={{ background: 'none', border: 'none', color: '#757575', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600 }}>
            <Back /> Escanear otra
          </button>
          <div style={{ fontSize: 12, color: '#9E9E9E' }}>💳 {opCardScan?.id || ''}</div>
        </div>

        {/* Client tier card */}
        <div style={{
          background: tierBg?.(t.name) || t.grad, borderRadius: 18, padding: 20,
          color: t.color, position: 'relative', overflow: 'hidden', textAlign: 'center',
          marginBottom: 16, boxShadow: tierShadow?.(t.name), border: tierBorder?.(t.name),
        }}>
          <TierDeco name={t.name} />
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{cl.name}</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 6 }}>
              <Badge t={t} />
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, marginTop: 10, ...sMono }}>{cl.points}</div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 3, fontWeight: 700, opacity: .5 }}>
              Puntos disponibles
            </div>
            {t.redeemDisc > 0 && (
              <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, background: 'rgba(0,0,0,.1)', display: 'inline-block', padding: '4px 12px', borderRadius: 8 }}>
                -{Math.round(t.redeemDisc * 100)}% descuento en canjes
              </div>
            )}
          </div>
        </div>

        {/* Rewards list */}
        <div style={secLbl}>Premios disponibles</div>
        {rewards.map(r => {
          const dp = Math.round(r.pts * (1 - t.redeemDisc));
          const can = cl.points >= dp;
          return (
            <div key={r.id} onClick={() => { if (can) doRedeem(r); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', marginBottom: 8,
                background: '#fff', borderRadius: 16, border: '1px solid #E0E0E0',
                opacity: can ? 1 : .4, cursor: can ? 'pointer' : 'default',
              }}>
              <div style={{ fontSize: 28, flexShrink: 0 }}>{r.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#424242' }}>{r.name}</div>
                <div style={{ fontSize: 11, color: '#9E9E9E', marginTop: 2 }}>{r.cat}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {t.redeemDisc > 0 && (
                  <div style={{ fontSize: 10, color: '#BDBDBD', textDecoration: 'line-through' }}>{r.pts} pts</div>
                )}
                <div style={{ fontSize: 14, fontWeight: 800, color: can ? '#2E7D32' : '#C62828', ...sMono }}>{dp} pts</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
