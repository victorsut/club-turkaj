// src/views/operator/OpHome.jsx
// Operator dashboard — daily stats + quick actions
import { sMono, adminTheme as AT } from '../../constants/styles';

export default function OpHome(ctx) {
  const { loggedOp, custs, setOScr, setOpScanMode, opRatings } = ctx;
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayPurchases = custs.filter(c => (c.lastBuy || '').startsWith(todayStr)).length;

  // Get ratings for this operator
  const myRatings = loggedOp?.id ? (opRatings[loggedOp.id] || []) : [];
  const avgRating = myRatings.length > 0
    ? (myRatings.reduce((s, r) => s + r.stars, 0) / myRatings.length).toFixed(1)
    : '—';
  const ratingColor = avgRating >= 4 ? '#2E7D32' : avgRating >= 3 ? '#FF8F00' : avgRating >= 2 ? '#C62828' : '#0D0D0D';

  return (
    <div style={{ paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ padding: '24px 20px 16px', background: '#1A1A2E', color: '#fff' }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#8C8CFF', fontWeight: 700, marginBottom: 6 }}>Panel Operador</div>
        <div style={{ fontSize: 22, fontWeight: 800 }}>Hola, {loggedOp?.name || 'Operador'} 👋</div>
        <div style={{ fontSize: 12, color: '#9E9E9E', marginTop: 4 }}>Estación: {loggedOp?.station || 'Turkaj I'} · {loggedOp?.turno || ''}</div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, padding: '16px 20px' }}>
        {[
          { label: 'Clientes', val: custs.length, ico: '👥' },
          { label: 'Hoy', val: todayPurchases, ico: '⛽' },
          { label: 'Rating', val: avgRating, ico: '⭐', color: ratingColor, sub: myRatings.length > 0 ? `${myRatings.length} calif.` : null },
        ].map(s => (
          <div key={s.label} style={{
            background: '#fff', borderRadius: 16, padding: 16, textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,.06)',
          }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{s.ico}</div>
            <div style={{ ...sMono, fontSize: 22, fontWeight: 800, color: s.color || '#0D0D0D' }}>{s.val}</div>
            <div style={{ fontSize: 10, color: '#9E9E9E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
            {s.sub && <div style={{ fontSize: 9, color: '#BDBDBD', marginTop: 2 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ padding: '8px 20px' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#BDBDBD', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>Acciones Rápidas</div>
        {[
          { label: 'Registrar Compra', desc: 'Escanea QR del cliente', ico: '⛽', action: () => { setOpScanMode(true); setOScr('oclients'); } },
          { label: 'Canjear Premio', desc: 'Escanear y entregar premio', ico: '🎁', action: () => setOScr('oredeem') },
          { label: 'Vender Boletos', desc: 'Rifa mensual', ico: '🎟️', action: () => setOScr('oraffle') },
        ].map(a => (
          <button key={a.label} onClick={a.action} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
            border: '1px solid #eee', borderRadius: 14, background: '#fff', marginBottom: 8,
            cursor: 'pointer', fontFamily: "'DM Sans'", textAlign: 'left',
          }}>
            <span style={{ fontSize: 28 }}>{a.ico}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0D0D0D' }}>{a.label}</div>
              <div style={{ fontSize: 11, color: '#9E9E9E' }}>{a.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
