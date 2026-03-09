// src/views/operator/OpClients.jsx
// Operator client search/scan, register purchase + operator rating
import { useState, useCallback, useEffect } from 'react';
import { sb } from '../../lib/supabaseClient';
import { sMono, inputStyle, btnYellow } from '../../constants/styles';
import { FUEL_LABELS, ALL_CARD_PREFIXES } from '../../constants/config';
import Badge from '../../components/ui/Badge';
import QRScanner from '../../components/ui/QRScanner';

export default function OpClients(ctx) {
  const { custs, gT, cfg, addPurchase, fire, opScanMode, setOpScanMode, loggedOp, sbConnected } = ctx;
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(null);
  const [amt, setAmt] = useState('');
  const [fuel, setFuel] = useState('regular');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState('');

  // Rating step after purchase
  const [ratingStep, setRatingStep] = useState(null); // { clientId, clientName }
  const [stars, setStars] = useState(0);
  const [savingRating, setSavingRating] = useState(false);

  // Auto-open scanner if coming from OpHome "Registrar Compra"
  useEffect(() => {
    if (opScanMode) {
      setScanning(true);
      setOpScanMode(false);
    }
  }, [opScanMode, setOpScanMode]);

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

  // Handle QR scan result
  const handleScan = useCallback((code) => {
    setScanning(false);
    setScanResult(code);
    const match = code.match(/^CT[OPB]D-(\d+)$/);
    if (!match) { fire('❌ Código no reconocido: ' + code); return; }
    const correlative = match[1];
    const found = custs.find(c => {
      if (!c.cardId) return false;
      const cm = c.cardId.match(/^CT[OPB]D-(\d+)$/);
      return cm && cm[1] === correlative;
    });
    if (found) { setSel(found.id); fire('✅ ' + found.name + ' · ' + code); }
    else {
      const exact = custs.find(c => c.cardId === code);
      if (exact) { setSel(exact.id); fire('✅ ' + exact.name); }
      else fire('❌ Miembro no encontrado para código: ' + code);
    }
  }, [custs, fire]);

  const handlePurchase = () => {
    const monto = parseFloat(amt);
    if (!monto || monto < 10) { fire('Monto mínimo Q10'); return; }
    addPurchase(selClient.id, monto, fuel);
    // Show rating step instead of going back to list
    setRatingStep({ clientId: selClient.id, clientName: selClient.name });
    setStars(0);
    setAmt('');
    setScanResult('');
  };

  const submitRating = async () => {
    if (stars < 1) { fire('Seleccioná al menos 1 estrella'); return; }
    setSavingRating(true);
    if (sb && sbConnected && loggedOp?.id) {
      const { error } = await sb.from('operator_ratings').insert({
        operator_id: loggedOp.id,
        member_id: ratingStep.clientId,
        stars,
      });
      if (error) console.error('[Rating]', error);
      else fire(`⭐ Calificación registrada: ${stars}/5`);
    }
    setSavingRating(false);
    setRatingStep(null);
    setSel(null);
  };

  const skipRating = () => {
    setRatingStep(null);
    setSel(null);
  };

  // Full-screen QR scanner
  if (scanning) {
    return <QRScanner onScan={handleScan} onClose={() => setScanning(false)} />;
  }

  // Rating screen after purchase
  if (ratingStep) {
    return (
      <div style={{ paddingBottom: 90 }}>
        <div style={{
          padding: '40px 20px', textAlign: 'center',
          animation: 'fadeUp .3s ease',
        }}>
          {/* Success check */}
          <div style={{
            width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
            background: '#E8F5E9', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 36,
          }}>
            ✅
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0D0D0D', marginBottom: 6 }}>
            ¡Compra registrada!
          </div>
          <div style={{ fontSize: 14, color: '#9E9E9E', marginBottom: 28 }}>
            {ratingStep.clientName}
          </div>

          {/* Rating card */}
          <div style={{
            background: '#fff', borderRadius: 20, padding: '24px 20px',
            border: '1px solid #eee', boxShadow: '0 4px 16px rgba(0,0,0,.06)',
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#424242', marginBottom: 6 }}>
              ¿Cómo fue la atención?
            </div>
            <div style={{ fontSize: 12, color: '#9E9E9E', marginBottom: 20 }}>
              Pedile al cliente que califique tu servicio
            </div>

            {/* Stars */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setStars(s)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 40, padding: 4, transition: 'transform .15s',
                  transform: stars >= s ? 'scale(1.15)' : 'scale(1)',
                  filter: stars >= s ? 'none' : 'grayscale(1) opacity(0.25)',
                }}>
                  ⭐
                </button>
              ))}
            </div>

            {/* Rating label */}
            {stars > 0 && (
              <div style={{
                fontSize: 14, fontWeight: 800, marginBottom: 4,
                color: stars >= 4 ? '#2E7D32' : stars >= 3 ? '#FF8F00' : '#C62828',
              }}>
                {stars === 5 ? '¡Excelente!' : stars === 4 ? 'Muy bien' : stars === 3 ? 'Regular' : stars === 2 ? 'Podría mejorar' : 'Mala experiencia'}
              </div>
            )}
          </div>

          {/* Actions */}
          <button onClick={submitRating} disabled={stars < 1 || savingRating}
            style={{
              ...btnYellow, width: '100%', marginBottom: 12,
              opacity: stars < 1 ? .5 : 1,
            }}>
            {savingRating ? '⏳ Guardando...' : `Enviar calificación (${stars}/5)`}
          </button>

          <button onClick={skipRating} style={{
            width: '100%', padding: 14, borderRadius: 14,
            background: '#F5F5F5', border: '1px solid #eee',
            fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 700,
            color: '#9E9E9E', cursor: 'pointer',
          }}>
            Omitir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ padding: '16px 20px 8px', fontSize: 20, fontWeight: 800, color: '#0D0D0D' }}>👥 Clientes</div>

      {/* Search + Scan bar */}
      {!sel && (
        <div style={{ padding: '0 20px' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                value={q} onChange={e => setQ(e.target.value)}
                placeholder="Buscar nombre, teléfono, código..."
                style={{ ...inputStyle, paddingLeft: 40, width: '100%', boxSizing: 'border-box' }}
              />
              <span style={{ position: 'absolute', left: 14, top: 13, opacity: .3 }}>🔍</span>
            </div>
            <button onClick={() => setScanning(true)} style={{
              background: '#FBBC04', border: 'none', borderRadius: 14,
              padding: '0 18px', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: 6,
              fontSize: 20, flexShrink: 0,
              boxShadow: '0 2px 8px rgba(251,188,4,.3)',
            }} title="Escanear QR">
              📷
            </button>
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
          <button onClick={() => { setSel(null); setAmt(''); setScanResult(''); }} style={{
            background: 'none', border: 'none', color: '#FBBC04', cursor: 'pointer',
            fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700, marginBottom: 12,
          }}>
            ← Volver a búsqueda
          </button>

          {scanResult && (
            <div style={{
              background: '#E8F5E9', border: '1px solid #A5D6A7', borderRadius: 12,
              padding: '10px 16px', marginBottom: 12, display: 'flex',
              alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: '#2E7D32',
            }}>
              📷 Escaneado: <span style={{ ...sMono }}>{scanResult}</span>
            </div>
          )}

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
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{selClient.name}</div>
                <div style={{ fontSize: 12, color: '#9E9E9E', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {selClient.cardId || '—'} · <Badge t={selTier} />
                </div>
              </div>
            </div>

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

            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#424242' }}>⛽ Registrar Compra</div>

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
