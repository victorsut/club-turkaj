// src/views/operator/OpClients.jsx
// Operator client search/scan, register purchase
import { useState } from 'react';
import { sMono, inputStyle, btnYellow } from '../../constants/styles';
import { FUEL_LABELS } from '../../constants/config';
import Badge from '../../components/ui/Badge';

export default function OpClients(ctx) {
  const { custs, gT, cfg, addPurchase, fire } = ctx;
  console.log('[OpClients] custs:', custs?.length, 'items');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(null);
  const [amt, setAmt] = useState('');
  const [fuel, setFuel] = useState('regular');

  // Show all clients when no search, filter when typing
  const filtered = q.length >= 2
    ? custs.filter(c =>
        (c.name || '').toLowerCase().includes(q.toLowerCase()) ||
        (c.phone || '').includes(q) ||
        (c.cardId || '').toUpperCase().includes(q.toUpperCase())
      )
    : custs;

  const selClient = sel ? custs.find(c => c.id === sel) : null;
  const selTier = selClient ? gT(selClient.gallons) : null;

  const handlePurchase = () => {
    const monto = parseFloat(amt);
    if (!monto || monto < 10) { fire('Monto mínimo Q10'); return; }
    addPurchase(selClient.id, monto, fuel);
    setAmt('');
    setSel(null);
  };

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ padding: '16px 20px 8px', fontSize: 20, fontWeight: 800, color: '#0D0D0D' }}>👥 Clientes</div>

      {/* Search bar */}
      {!sel && (
        <div style={{ padding: '0 20px' }}>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <input
              value={q} onChange={e => setQ(e.target.value)}
              placeholder="Buscar por nombre, teléfono o código..."
              style={{ ...inputStyle, paddingLeft: 40, width: '100%', boxSizing: 'border-box' }}
            />
            <span style={{ position: 'absolute', left: 14, top: 13, opacity: .3 }}>🔍</span>
          </div>
          <div style={{ fontSize: 11, color: '#9E9E9E', marginBottom: 8 }}>
            {filtered.length} cliente{filtered.length !== 1 ? 's' : ''} registrado{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Results list */}
      {!sel && (
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {filtered.map(c => {
            const t = gT(c.gallons);
            return (
              <div key={c.id} onClick={() => setSel(c.id)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 20px', borderBottom: '1px solid #F5F5F5', cursor: 'pointer',
              }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0D0D0D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.name || c.phone || 'Sin nombre'}
                  </div>
                  <div style={{ fontSize: 11, color: '#9E9E9E' }}>
                    {c.cardId || '—'} · {c.phone || '—'}
                  </div>
                </div>
                <Badge t={t} />
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 32, color: '#9E9E9E', fontSize: 13 }}>
              {q.length >= 2 ? 'No se encontraron clientes' : 'No hay clientes registrados'}
            </div>
          )}
        </div>
      )}

      {/* Selected client — purchase form */}
      {selClient && selTier && (
        <div style={{ padding: '0 20px' }}>
          <button onClick={() => { setSel(null); setAmt(''); }} style={{
            background: 'none', border: 'none', color: '#FBBC04', cursor: 'pointer',
            fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700, marginBottom: 12,
          }}>
            ← Volver a búsqueda
          </button>

          <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #eee', marginBottom: 16 }}>
            {/* Client info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: selTier.name === 'BLACK' ? '#0D0D0D' : selTier.name === 'PLATINO' ? '#E0E0E0' : '#FFF8E1',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800,
                color: selTier.name === 'BLACK' ? '#FFD54F' : '#0D0D0D',
              }}>
                {(selClient.name || '?')[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{selClient.name}</div>
                <div style={{ fontSize: 12, color: '#9E9E9E', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {selClient.cardId || '—'} · <Badge t={selTier} />
                </div>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, textAlign: 'center', background: '#F5F5F5', borderRadius: 12, padding: 10 }}>
                <div style={{ ...sMono, fontSize: 18, fontWeight: 800, color: '#FBBC04' }}>{selClient.points}</div>
                <div style={{ fontSize: 10, color: '#9E9E9E', fontWeight: 700 }}>PUNTOS</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center', background: '#F5F5F5', borderRadius: 12, padding: 10 }}>
                <div style={{ ...sMono, fontSize: 18, fontWeight: 800 }}>{selClient.gallons}</div>
                <div style={{ fontSize: 10, color: '#9E9E9E', fontWeight: 700 }}>GALONES</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center', background: '#F5F5F5', borderRadius: 12, padding: 10 }}>
                <div style={{ ...sMono, fontSize: 18, fontWeight: 800 }}>{selClient.visits || 0}</div>
                <div style={{ fontSize: 10, color: '#9E9E9E', fontWeight: 700 }}>VISITAS</div>
              </div>
            </div>

            {/* Purchase form */}
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#424242' }}>⛽ Registrar Compra</div>

            {/* Fuel type selector */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {Object.entries(FUEL_LABELS).map(([k, label]) => (
                <button key={k} onClick={() => setFuel(k)} style={{
                  flex: 1, padding: '10px 8px', borderRadius: 12,
                  border: fuel === k ? '2px solid #FBBC04' : '2px solid #eee',
                  background: fuel === k ? '#FFF8E1' : '#fff',
                  color: fuel === k ? '#F0A500' : '#9E9E9E',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans'",
                }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Amount input */}
            <input value={amt} onChange={e => setAmt(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="Monto en Quetzales (Q)"
              inputMode="decimal"
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', marginBottom: 8, fontSize: 18, textAlign: 'center', fontWeight: 800 }}
            />

            <div style={{ fontSize: 12, color: '#9E9E9E', marginBottom: 14, textAlign: 'center' }}>
              Puntos a otorgar: <strong style={{ color: '#2E7D32', ...sMono, fontSize: 16 }}>
                +{Math.floor((parseFloat(amt) || 0) / cfg.qPerPt)}
              </strong>
            </div>

            <button onClick={handlePurchase}
              disabled={!amt || parseFloat(amt) < 10}
              style={{
                ...btnYellow, width: '100%',
                opacity: (!amt || parseFloat(amt) < 10) ? .5 : 1,
              }}>
              Registrar Compra
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
