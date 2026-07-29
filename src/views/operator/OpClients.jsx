// src/views/operator/OpClients.jsx
import { useState, useCallback, useEffect } from 'react';
import { sMono, inputStyle, btnYellow } from '../../constants/styles';
import { FUEL_LABELS } from '../../constants/config';
import Badge from '../../components/ui/Badge';
import QRScanner from '../../components/ui/QRScanner';
import { parseCardCode } from '../../lib/cardCodes';
import { fetchMemberByCardCode } from '../../services/dataService';

export default function OpClients(ctx) {
  const { custs, gT, cfg, fire, opScanMode, setOpScanMode, setPurchaseConfirm, sbConnected } = ctx;
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(null);
  const [amt, setAmt] = useState('');
  const [fuel, setFuel] = useState('regular');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState('');

  useEffect(() => {
    if (opScanMode) { setScanning(true); setOpScanMode(false); }
  }, [opScanMode, setOpScanMode]);

  const filtered = q.length >= 2
    ? custs.filter(c =>
        (c.name || '').toLowerCase().includes(q.toLowerCase()) ||
        (c.phone || '').includes(q) ||
        (c.cardId || '').toUpperCase().includes(q.toUpperCase())
      )
    : custs;

  const selClient = sel ? custs.find(c => c.id === sel) : null;
  const selTier = selClient ? gT(selClient.gallons) : null;

  const handleScan = useCallback(async (code) => {
    setScanning(false);
    setScanResult(code);

    // Defensa: el scanner ya validó, pero handleScan puede ser
    // llamado desde modo manual u otros flujos futuros.
    const parsed = parseCardCode(code);
    if (!parsed.valid) {
      fire('❌ Código no reconocido');
      return;
    }

    // 1. Búsqueda local primero (rápido, sin red)
    const localMatch = (custs || []).find(c => c.cardId === parsed.normalized);
    if (localMatch) {
      setSel(localMatch.id);
      fire(`✓ ${localMatch.name}`);
      return;
    }

    // 2. Fallback a Supabase
    if (!sbConnected) {
      fire('Sin conexión. Buscá al cliente manualmente.');
      return;
    }

    const { data, error, reason } = await fetchMemberByCardCode(parsed.normalized);

    if (error) {
      fire('Sin conexión, intentá de nuevo');
      return;
    }

    if (reason === 'card_not_found') {
      fire('❌ QR no reconocido en el sistema');
      return;
    }

    if (reason === 'card_not_assigned') {
      fire('⚠️ Tarjeta sin registrar. Pedile al cliente que pase con el admin.');
      return;
    }

    if (data) {
      // SEC.C.2b: si el miembro SÍ está en custs (el match local falló
      // solo porque cardId quedó stale — uuid de las columnas abiertas
      // del boot), seleccionarlo por ID resuelve el flujo completo.
      const inCusts = custs.find(c => c.id === data.id);
      if (inCusts) {
        setSel(data.id);
        fire(`✓ ${inCusts.name}`);
        return;
      }
      // Miembro encontrado en Supabase pero NO está en cache local
      // todavía (creado en otro dispositivo, realtime aún sin propagar).
      // No seteamos sel porque selClient = custs.find(c => c.id === sel)
      // devolvería undefined y la UI quedaría en blanco. En lugar de
      // eso, damos al operador una salida accionable: buscar por
      // nombre (funciona ya) o reintentar el QR en unos segundos
      // cuando el realtime propague.
      fire(`${data.name} encontrado. Buscalo por nombre o reintentá el QR en 5 segundos.`);
    }
  }, [custs, fire, sbConnected]);

  // Abre el modal a nivel raíz (escapa el overflow:hidden del contenedor)
  const handlePurchaseClick = () => {
    const monto = parseFloat(amt);
    if (!monto || monto < 10) { fire('Monto mínimo Q10'); return; }
    setPurchaseConfirm({
      client: selClient,
      amt: monto,
      fuel,
      onConfirm: () => {
        setSel(null); setAmt(''); setScanResult('');
      },
    });
  };

  if (scanning) return <QRScanner onScan={handleScan} onClose={() => setScanning(false)} />;

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ padding: '16px 20px 8px', fontSize: 20, fontWeight: 800, color: '#0D0D0D' }}>👥 Clientes</div>

      {!sel && (
        <div style={{ padding: '0 20px' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input value={q} onChange={e => setQ(e.target.value)}
                placeholder="Buscar nombre, teléfono, código..."
                style={{ ...inputStyle, paddingLeft: 40, width: '100%', boxSizing: 'border-box' }} />
              <span style={{ position: 'absolute', left: 14, top: 13, opacity: .3 }}>🔍</span>
            </div>
            <button onClick={() => setScanning(true)} style={{
              background: '#FBBC04', border: 'none', borderRadius: 14,
              padding: '0 18px', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
              boxShadow: '0 2px 8px rgba(251,188,4,.3)',
            }} title="Escanear QR">📷</button>
          </div>
          <div style={{ fontSize: 11, color: '#9E9E9E', marginBottom: 8 }}>
            {filtered.length} cliente{filtered.length !== 1 ? 's' : ''} registrado{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

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
                  <div style={{ fontSize: 11, color: '#9E9E9E' }}>{c.cardId || '—'} · {c.phone || '—'}</div>
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

      {selClient && selTier && (
        <div style={{ padding: '0 20px' }}>
          <button onClick={() => { setSel(null); setAmt(''); setScanResult(''); }} style={{
            background: 'none', border: 'none', color: '#FBBC04', cursor: 'pointer',
            fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700, marginBottom: 12,
          }}>← Volver a búsqueda</button>

          {scanResult && (
            <div style={{ background: '#E8F5E9', border: '1px solid #A5D6A7', borderRadius: 12,
              padding: '10px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 12, fontWeight: 700, color: '#2E7D32' }}>
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
              }}>{(selClient.name || '?')[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{selClient.name}</div>
                <div style={{ fontSize: 12, color: '#9E9E9E', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {selClient.cardId || '—'} · <Badge t={selTier} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              {[
                { v: selClient.points, l: 'PUNTOS', c: '#FBBC04' },
                { v: selClient.gallons, l: 'GALONES' },
                { v: selClient.visits || 0, l: 'VISITAS' },
              ].map(s => (
                <div key={s.l} style={{ flex: 1, textAlign: 'center', background: '#F5F5F5', borderRadius: 12, padding: 10 }}>
                  <div style={{ ...sMono, fontSize: 18, fontWeight: 800, color: s.c || '#0D0D0D' }}>{s.v}</div>
                  <div style={{ fontSize: 10, color: '#9E9E9E', fontWeight: 700 }}>{s.l}</div>
                </div>
              ))}
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
                }}>{label}</button>
              ))}
            </div>

            <input value={amt} onChange={e => setAmt(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="Monto en Quetzales (Q)" inputMode="decimal"
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', marginBottom: 8, fontSize: 18, textAlign: 'center', fontWeight: 800 }} />

            <div style={{ fontSize: 12, color: '#9E9E9E', marginBottom: 14, textAlign: 'center' }}>
              Puntos a otorgar: <strong style={{ color: '#2E7D32', ...sMono, fontSize: 16 }}>
                +{Math.floor((parseFloat(amt) || 0) / cfg.qPerPt)}
              </strong>
            </div>

            <button onClick={handlePurchaseClick} disabled={!amt || parseFloat(amt) < 10}
              style={{ ...btnYellow, width: '100%', opacity: (!amt || parseFloat(amt) < 10) ? .5 : 1 }}>
              Registrar Compra
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
