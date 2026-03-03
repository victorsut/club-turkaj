// src/views/operator/OpClients.jsx
// Operator client search/scan, register purchase
import { useState } from 'react';
import { sMono, inputStyle, btnYellow } from '../../constants/styles';
import Badge from '../../components/ui/Badge';
import { SearchIcon, QRIcon } from '../../components/ui/Icons';

export default function OpClients(ctx) {
  const { custs, gT, cfg, addPurchase, sel, setSel, amt, setAmt, fuel, setFuel } = ctx;
  const [q, setQ] = useState('');

  const filtered = q.length >= 2
    ? custs.filter(c =>
        (c.name || '').toLowerCase().includes(q.toLowerCase()) ||
        (c.phone || '').includes(q) ||
        (c.cardCode || '').includes(q.toUpperCase())
      )
    : [];

  const selClient = sel ? custs.find(c => c.id === sel) : null;
  const selTier = selClient ? gT(selClient.gallons) : null;

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ padding: '16px 20px 8px', fontSize: 20, fontWeight: 800, color: '#0D0D0D' }}>👥 Clientes</div>

      {/* Search bar */}
      {!sel && (
        <div style={{ padding: '0 20px', position: 'relative' }}>
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Buscar por nombre, teléfono o código..."
            style={{ ...inputStyle, paddingLeft: 40, marginBottom: 12, width: '100%', boxSizing: 'border-box' }}
          />
          <span style={{ position: 'absolute', left: 32, top: 13, opacity: .3 }}>🔍</span>
        </div>
      )}

      {/* Results */}
      {!sel && filtered.map(c => {
        const t = gT(c.gallons);
        return (
          <div key={c.id} onClick={() => setSel(c.id)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 20px', borderBottom: '1px solid #F5F5F5', cursor: 'pointer',
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0D0D0D' }}>{c.name || c.phone}</div>
              <div style={{ fontSize: 11, color: '#9E9E9E' }}>{c.cardCode || '—'} · {c.phone}</div>
            </div>
            <Badge tier={t.name} small />
          </div>
        );
      })}

      {!sel && q.length >= 2 && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 20, color: '#9E9E9E', fontSize: 13 }}>No se encontraron clientes</div>
      )}

      {/* Selected client — purchase form */}
      {selClient && (
        <div style={{ padding: '0 20px' }}>
          <button onClick={() => setSel(null)} style={{ background: 'none', border: 'none', color: '#8C8CFF', cursor: 'pointer', fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
            ← Volver a búsqueda
          </button>
          <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #eee', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: selTier.name === 'BLACK' ? '#0D0D0D' : selTier.name === 'PLATINO' ? '#E0E0E0' : '#FFF8E1',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800,
                color: selTier.name === 'BLACK' ? '#FFD54F' : '#0D0D0D',
              }}>
                {(selClient.name || '?')[0]}
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{selClient.name}</div>
                <div style={{ fontSize: 12, color: '#9E9E9E' }}>{selClient.cardCode} · <Badge tier={selTier.name} small /></div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, textAlign: 'center', background: '#F5F5F5', borderRadius: 12, padding: 10 }}>
                <div style={{ ...sMono, fontSize: 18, fontWeight: 800 }}>{selClient.points}</div>
                <div style={{ fontSize: 10, color: '#9E9E9E', fontWeight: 700 }}>PUNTOS</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center', background: '#F5F5F5', borderRadius: 12, padding: 10 }}>
                <div style={{ ...sMono, fontSize: 18, fontWeight: 800 }}>{selClient.gallons}</div>
                <div style={{ fontSize: 10, color: '#9E9E9E', fontWeight: 700 }}>GALONES</div>
              </div>
            </div>

            {/* Purchase form */}
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#424242' }}>⛽ Registrar Compra</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input value={amt} onChange={e => setAmt(e.target.value)} placeholder="Monto Q" type="number" style={{ ...inputStyle, flex: 1 }} />
              <input value={fuel} onChange={e => setFuel(e.target.value)} placeholder="Galones" type="number" step="0.01" style={{ ...inputStyle, flex: 1 }} />
            </div>
            <div style={{ fontSize: 11, color: '#9E9E9E', marginBottom: 12 }}>
              Puntos a otorgar: <strong style={{ color: '#2E7D32', ...sMono }}>{Math.floor((parseFloat(amt) || 0) / 10)}</strong>
            </div>
            <button onClick={() => addPurchase(selClient.id)} disabled={!amt || parseFloat(amt) <= 0}
              style={{ ...btnYellow, width: '100%', opacity: (!amt || parseFloat(amt) <= 0) ? .5 : 1 }}>
              Registrar Compra
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
