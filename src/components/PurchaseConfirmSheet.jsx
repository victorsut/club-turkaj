// src/components/PurchaseConfirmSheet.jsx
// Bottom-sheet de confirmación de compra (vista del OPERADOR): revisa
// cliente, tarjeta, combustible, monto y los puntos a otorgar (con el
// divisor qPerPt del tier PREVIO a la compra — F2.1). Vive a nivel raíz
// para escapar del overflow:hidden del lienzo. Extraído de App.jsx
// (división etapa 1, 12-ago-2026) sin cambios de lógica: addPurchase
// retorna boolean y solo en éxito corre el onConfirm del solicitante.
import { FUEL_LABELS } from '../constants/config';

export default function PurchaseConfirmSheet({ data, gT, cfg, onClose, addPurchase }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)',
      zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: '24px 24px 0 0',
        width: '100%', maxWidth: 480, padding: '12px 24px 36px',
        boxShadow: '0 -8px 40px rgba(0,0,0,.15)',
        animation: 'fadeUp .25s ease',
      }}>
        <div style={{ width: 40, height: 4, background: '#E0E0E0', borderRadius: 4, margin: '0 auto 20px' }} />

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>⛽</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#0D0D0D' }}>Confirmar Compra</div>
          <div style={{ fontSize: 13, color: '#9E9E9E', marginTop: 4 }}>Revisá los datos antes de registrar</div>
        </div>

        <div style={{ background: '#F9F9F9', borderRadius: 16, padding: '16px 20px', marginBottom: 20 }}>
          {[
            { l: 'Cliente',          v: data.client.name,                          bold: true },
            { l: 'Tarjeta',          v: data.client.cardId || '—',                  mono: true },
            { l: 'Combustible',      v: FUEL_LABELS[data.fuel] },
            { l: 'Monto',            v: `Q${data.amt.toFixed(2)}`,                  large: true },
            { l: 'Puntos a otorgar', v: `+${Math.floor(data.amt / (gT(data.client.gallons || 0).qPerPt ?? cfg.qPerPt))}`, green: true, large: true },
          ].map((row, i, arr) => (
            <div key={row.l} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              paddingBottom: i < arr.length - 1 ? 12 : 0,
              borderBottom: i < arr.length - 1 ? '1px solid #eee' : 'none',
              marginBottom: i < arr.length - 1 ? 12 : 0,
            }}>
              <span style={{ fontSize: 13, color: '#9E9E9E', fontWeight: 600 }}>{row.l}</span>
              <span style={{
                fontSize: row.large ? 20 : 13,
                fontWeight: row.bold || row.large ? 900 : 700,
                color: row.green ? '#2E7D32' : '#0D0D0D',
                fontFamily: row.mono ? 'monospace' : "'DM Sans'",
              }}>{row.v}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: 16, borderRadius: 14, border: '2px solid #eee',
            background: '#fff', color: '#424242', fontFamily: "'DM Sans'",
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>Cancelar</button>
          <button onClick={async () => {
            const { client, amt, fuel, onConfirm } = data;
            onClose();
            // addPurchase ya muestra su propio toast (puntos ganados
            // en éxito, o el error). Solo limpiamos la selección si
            // de verdad se registró — antes el éxito salía siempre.
            const ok = await addPurchase(client.id, amt, fuel);
            if (ok) onConfirm?.();
          }} style={{
            flex: 2, padding: 16, borderRadius: 14, border: 'none',
            background: '#FBBC04', color: '#0D0D0D', fontFamily: "'DM Sans'",
            fontSize: 15, fontWeight: 900, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(251,188,4,.35)',
          }}>✓ Confirmar Compra</button>
        </div>
      </div>
    </div>
  );
}
