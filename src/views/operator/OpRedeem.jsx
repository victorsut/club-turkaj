// src/views/operator/OpRedeem.jsx
import { useState, useCallback, useEffect } from 'react';
import { sb } from '../../lib/supabaseClient';
import { sMono, btnYellow } from '../../constants/styles';
import Badge from '../../components/ui/Badge';
import LogoSpinner from '../../components/ui/LogoSpinner';
import QRScanner from '../../components/ui/QRScanner';
import { Back } from '../../components/ui/Icons';
import { buildRedemptionReceipt } from '../../lib/receiptModel';
import { printReceipt } from '../../lib/receiptPrinter';
import { logPrint } from '../../services/rpcServices';

function utcToLocal(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function OpRedeem(ctx) {
  const { custs, rewards, gT, fire, sbConnected,
    redeemedList, setRedeemedList, logActivity, loggedOp, opRedeemScan, setOpRedeemScan } = ctx;

  const [client, setClient]             = useState(null);
  const [scanning, setScanning]         = useState(false);

  // Si viene desde el boton de OpHome, abrir camara directamente
  useEffect(() => {
    if (opRedeemScan) { setScanning(true); setOpRedeemScan(false); }
  }, []);
  const [pendingList, setPending]       = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [confirmItem, setConfirmItem]   = useState(null);
  // Escaneo DIRECTO del QR del premio (25-jul): el cliente del canje
  // vive acá — NO se abre la lista de pendientes (client queda null) y
  // el modal de confirmación se muestra solo, sobre la vista principal.
  // Cancelar limpia ambos → se vuelve de una vez a la pestaña.
  const [confirmClient, setConfirmClient] = useState(null);
  const [readyToPrint, setReadyToPrint] = useState(null);
  const [waitingConfirm, setWaitingConfirm] = useState(null);
  const [confirmResult, setConfirmResult]   = useState(null);
  const [todayHistory, setTodayHistory] = useState([]);
  const [loadingToday, setLoadingToday] = useState(false);

  // FA-lite: auto-print por dispositivo (el POS es fijo por estación,
  // así que el toggle local equivale a configuración por estación).
  const [autoPrint, setAutoPrint] = useState(() => {
    try { return localStorage.getItem('pp_auto_print') !== '0'; } catch { return true; }
  });
  const toggleAutoPrint = () => setAutoPrint(prev => {
    const next = !prev;
    try { localStorage.setItem('pp_auto_print', next ? '1' : '0'); } catch { /* sin storage */ }
    return next;
  });

  // FA-lite: construye el modelo neutro, imprime (iframe, sin pestaña)
  // y registra en print_logs (fire-and-forget: nunca bloquea el papel).
  const doPrint = useCallback((item, clientName, copyType) => {
    const receipt = buildRedemptionReceipt({
      rewardName: item.reward.name, cost: item.cost, code: item.code,
      clientName, operatorName: loggedOp?.name, stationName: loggedOp?.station,
    });
    const ok = printReceipt(receipt, { allowTabFallback: copyType !== 'auto' });
    logPrint({ redemptionId: item.id, copyType, printerHint: (navigator.userAgent || '').slice(0, 180) });
    if (!ok) fire('No se pudo abrir la impresión — usá Reimprimir');
    return ok;
  }, [loggedOp, fire]);

  // Cargar historial de canjes del dia actual
  useEffect(() => {
    if (!sb || !sbConnected || !loggedOp?.id) return;
    setLoadingToday(true);
    // Inicio del dia en Guatemala (UTC-6) = medianoche local = 06:00 UTC
    const today = new Date();
    const gtOffset = 6 * 60 * 60 * 1000; // UTC-6 en ms
    const todayGT = new Date(today.getTime() - gtOffset);
    todayGT.setUTCHours(0, 0, 0, 0);
    const todayUTC = new Date(todayGT.getTime() + gtOffset); // medianoche Guatemala en UTC
    // FA-lite fix: filtrar por collected_at (fecha de ENTREGA), no por
    // created_at (fecha en que el cliente creó el canje — puede ser de
    // días antes y dejaba la entrega de hoy fuera del historial).
    sb.from('redemptions')
      .select('*, rewards(name, icon), members(name), collected_at')
      .eq('collected', true)
      .eq('operator_id', loggedOp.id)
      .gte('collected_at', todayUTC.toISOString())
      .order('collected_at', { ascending: false, nullsFirst: false })
      .then(({ data }) => {
        setLoadingToday(false);
        if (data?.length) setTodayHistory(data.map(r => ({
          id: r.id,
          memberName: r.members?.name || '-',
          reward: { name: r.rewards?.name || 'Premio', icon: r.rewards?.icon || '' },
          cost: r.points_spent,
          code: r.redemption_code,
          date: r.collected_at || r.created_at, // fecha de entrega
        })));
      });
  }, [sbConnected, loggedOp?.id]);

  const loadPending = useCallback(async (cust) => {
    setClient(cust);
    if (!sb || !sbConnected) {
      const local = (redeemedList || []).filter(r => r.memberId === cust.id && !r.collected);
      setPending(local); return;
    }
    setLoadingPending(true);
    const { data, error } = await sb.from('redemptions')
      .select('*, rewards(name, icon, category)')
      .eq('member_id', cust.id)
      .eq('collected', false)
      .order('created_at', { ascending: false });
    setLoadingPending(false);
    if (error) { fire('Error cargando canjes: ' + error.message); return; }
    setPending((data || []).map(rd => ({
      id: rd.id, memberId: rd.member_id,
      reward: { name: rd.rewards?.name || 'Premio', icon: rd.rewards?.icon || '', cat: rd.rewards?.category || '' },
      cost: rd.points_spent, date: utcToLocal(rd.created_at) || '',
      code: rd.redemption_code, collected: false,
    })));
  }, [sbConnected, redeemedList, fire]);

  // Escaneo del QR de un CANJE (25-jul): el codigo TK-XXXXXX del
  // premio abre SOLO el detalle de ese canje (datos de cliente y
  // premio) — sin pasar por la lista de pendientes del cliente. El
  // flujo de confirmacion en tiempo real (el cliente confirma en su
  // dispositivo) no cambia.
  const loadFromRedemption = useCallback(async (code) => {
    if (!sb || !sbConnected) { fire('Sin conexion'); return; }
    const { data, error } = await sb.from('redemptions')
      .select('*, rewards(name, icon, category)')
      .eq('redemption_code', code)
      .maybeSingle();
    if (error) { fire('Error: ' + error.message); return; }
    if (!data) { fire('Canje no encontrado: ' + code); return; }
    if (data.collected) { fire('Este canje ya fue entregado'); return; }
    const cust = custs.find(c => c.id === data.member_id);
    if (!cust) { fire('No se encontro al cliente de este canje'); return; }
    setConfirmClient(cust);
    setConfirmItem({
      id: data.id, memberId: data.member_id,
      reward: { name: data.rewards?.name || 'Premio', icon: data.rewards?.icon || '', cat: data.rewards?.category || '' },
      cost: data.points_spent, date: utcToLocal(data.created_at) || '',
      code: data.redemption_code, collected: false,
    });
  }, [sbConnected, custs, fire]);

  const handleScan = useCallback((code) => {
    setScanning(false);
    const raw = String(code || '').trim();
    // QR del premio (canje pendiente)
    if (/^TK-[A-Z0-9]+$/i.test(raw)) { loadFromRedemption(raw.toUpperCase()); return; }
    // QR de la tarjeta del cliente
    const match = raw.match(/^CT[OPB]D-(\d+)$/);
    if (!match) { fire('Codigo no reconocido: ' + raw); return; }
    const correlative = match[1];
    const found = custs.find(c => {
      if (!c.cardId) return false;
      const cm = c.cardId.match(/^CT[OPB]D-(\d+)$/);
      return cm && cm[1] === correlative;
    });
    if (found) { fire('OK ' + found.name); loadPending(found); }
    else fire('Miembro no encontrado para: ' + raw);
  }, [custs, fire, loadPending, loadFromRedemption]);

  const requestConfirm = useCallback(async (item) => {
    setConfirmItem(null);
    if (!sb || !sbConnected) { fire('Sin conexion'); return; }
    // Cliente del flujo activo: la lista (client) o el escaneo directo
    // del premio (confirmClient).
    const clName = (client || confirmClient)?.name;
    const { error } = await sb.from('redemptions')
      .update({ confirm_status: 'pending' }).eq('id', item.id);
    if (error) { fire('Error: ' + error.message); return; }
    setWaitingConfirm(item);
    setConfirmResult(null);
    fire('Esperando confirmacion del cliente...');
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      const { data } = await sb.from('redemptions')
        .select('confirm_status').eq('id', item.id).single();
      if (data?.confirm_status === 'confirmed') {
        clearInterval(interval);
        await sb.from('redemptions').update({ collected: true, confirm_status: 'none', operator_id: loggedOp?.id || null, collected_at: new Date().toISOString() }).eq('id', item.id);
        setPending(p => p.filter(x => x.id !== item.id));
        setRedeemedList(p => p.map(x => x.id === item.id ? { ...x, collected: true } : x));
        setWaitingConfirm(null);
        setConfirmClient(null);
        setConfirmResult('confirmed');
        fire('Confirmado: ' + item.reward.name + ' entregado');
        logActivity(item.memberId, 'entrega', 'Premio entregado: ' + item.reward.name, 0);
        setReadyToPrint({ item, clientName: clName, opName: loggedOp?.name, auto: autoPrint });
        // FA-lite: auto-print al confirmar (iframe, sin gesto del operador).
        if (autoPrint) doPrint(item, clName, 'auto');
        // Agregar al historial del dia
        setTodayHistory(p => [{
          id: item.id, memberName: clName || '-',
          reward: item.reward, cost: item.cost,
          code: item.code, date: new Date().toISOString(),
        }, ...p]);
        setTimeout(() => setConfirmResult(null), 3000);
      } else if (data?.confirm_status === 'cancelled') {
        clearInterval(interval);
        await sb.from('redemptions').update({ confirm_status: 'none' }).eq('id', item.id);
        setWaitingConfirm(null);
        setConfirmClient(null);
        setConfirmResult('cancelled');
        fire('El cliente cancelo el canje');
        setTimeout(() => setConfirmResult(null), 3000);
      } else if (attempts >= 30) {
        clearInterval(interval);
        await sb.from('redemptions').update({ confirm_status: 'none' }).eq('id', item.id);
        setWaitingConfirm(null);
        setConfirmClient(null);
        fire('Tiempo de espera agotado');
      }
    }, 2000);
  }, [sbConnected, fire, logActivity, setRedeemedList, client, confirmClient, loggedOp, setReadyToPrint, autoPrint, doPrint]);

  const tier = client ? gT(client.gallons) : null;

  // Cliente del flujo de confirmación en curso (lista o escaneo directo).
  const activeClient = client || confirmClient;

  // Modales del flujo de confirmación — compartidos entre la vista de
  // lista (client) y la vista principal (escaneo directo del premio,
  // donde NO se abre la lista de pendientes).
  const overlays = (
    <>
      {/* Modal confirmacion */}
      {confirmItem && !waitingConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, padding: '12px 24px 40px', animation: 'slideUp .3s ease' }}>
            <div style={{ width: 40, height: 4, background: '#E0E0E0', borderRadius: 4, margin: '0 auto 20px' }} />
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>{confirmItem.reward.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#0D0D0D' }}>Solicitar confirmacion</div>
              <div style={{ fontSize: 13, color: '#9E9E9E', marginTop: 4 }}>Se enviara una solicitud al dispositivo del cliente</div>
            </div>
            <div style={{ background: '#F9F9F9', borderRadius: 14, padding: '14px 18px', marginBottom: 20 }}>
              {[
                { l: 'Premio',  v: confirmItem.reward.name, bold: true },
                { l: 'Cliente', v: activeClient?.name || '-' },
                { l: 'Codigo',  v: confirmItem.code, mono: true },
                { l: 'Fecha',   v: confirmItem.date },
              ].map((row, i, arr) => (
                <div key={row.l} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: i < arr.length - 1 ? 10 : 0, borderBottom: i < arr.length - 1 ? '1px solid #eee' : 'none', marginBottom: i < arr.length - 1 ? 10 : 0 }}>
                  <span style={{ fontSize: 12, color: '#9E9E9E', fontWeight: 600 }}>{row.l}</span>
                  <span style={{ fontSize: 13, fontWeight: row.bold ? 900 : 700, color: '#0D0D0D', fontFamily: row.mono ? 'monospace' : "'DM Sans'" }}>{row.v}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => { setConfirmItem(null); setConfirmClient(null); }} style={{ flex: 1, padding: 16, borderRadius: 14, border: '2px solid #eee', background: '#fff', color: '#424242', fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => requestConfirm(confirmItem)} style={{ flex: 2, padding: 16, borderRadius: 14, border: 'none', background: '#FBBC04', color: '#0D0D0D', fontFamily: "'DM Sans'", fontSize: 15, fontWeight: 900, cursor: 'pointer' }}>Enviar al cliente</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: canje confirmado - imprimir */}
      {readyToPrint && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 28, maxWidth: 340, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>OK</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#1B5E20', marginBottom: 6 }}>Canje confirmado</div>
            <div style={{ fontSize: 14, color: '#555', marginBottom: 4 }}>{readyToPrint.item.reward.name}</div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>
              {readyToPrint.auto ? 'Comprobante enviado a impresión automáticamente' : 'Cliente confirmo desde su dispositivo'}
            </div>
            <button onClick={() => doPrint(readyToPrint.item, readyToPrint.clientName, readyToPrint.auto ? 'reprint' : 'manual')} style={{ width: '100%', padding: 16, borderRadius: 14, border: 'none', background: '#1976D2', color: '#fff', fontFamily: "'DM Sans'", fontSize: 16, fontWeight: 900, cursor: 'pointer', marginBottom: 10 }}>
              {readyToPrint.auto ? 'Reimprimir comprobante' : 'Imprimir comprobante'}
            </button>
            <button onClick={() => setReadyToPrint(null)} style={{ width: '100%', padding: 12, borderRadius: 14, border: '1px solid #ddd', background: '#f5f5f5', fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 700, cursor: 'pointer', color: '#555' }}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Pantalla de espera */}
      {waitingConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
          <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 400, padding: '40px 28px', textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>{waitingConfirm.reward.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#0D0D0D', marginBottom: 8 }}>Esperando al cliente</div>
            <div style={{ fontSize: 13, color: '#9E9E9E', marginBottom: 28 }}>
              Se envio la solicitud a <strong style={{ color: '#0D0D0D' }}>{activeClient?.name}</strong>. Pedile que confirme en su dispositivo.
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: '#FBBC04', animation: 'bounce .9s ' + (i * 0.2) + 's infinite' }} />)}
            </div>
            <div style={{ fontSize: 12, color: '#BDBDBD', marginBottom: 20 }}>Premio: {waitingConfirm.reward.name} | Codigo: {waitingConfirm.code}</div>
            <button onClick={async () => { await sb.from('redemptions').update({ confirm_status: 'none' }).eq('id', waitingConfirm.id); setWaitingConfirm(null); setConfirmClient(null); fire('Solicitud cancelada'); }} style={{ padding: '10px 24px', borderRadius: 12, border: '1px solid #eee', background: 'none', color: '#9E9E9E', fontFamily: "'DM Sans'", fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              Cancelar solicitud
            </button>
          </div>
        </div>
      )}
    </>
  );

  // -- QR Scanner ---------------------------------------
  if (scanning) return <QRScanner onScan={handleScan} onClose={() => setScanning(false)} acceptRedemptions />;

  // -- Vista con cliente seleccionado -------------------
  if (client) {
    return (
      <div style={{ paddingBottom: 90 }}>
        <div style={{ padding: '16px 20px 8px', fontSize: 20, fontWeight: 800, color: '#0D0D0D' }}>Canjear Premios</div>
        <div style={{ padding: '0 20px' }}>
          <button onClick={() => { setClient(null); setPending([]); }}
            style={{ background: 'none', border: 'none', color: '#FBBC04', cursor: 'pointer', fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Back /> Escanear otro QR
          </button>
          <div style={{ background: '#fff', borderRadius: 16, padding: 16, border: '1px solid #eee', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: tier.name === 'BLACK' ? '#0D0D0D' : tier.name === 'PLATINO' ? '#E0E0E0' : '#FFF8E1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, flexShrink: 0, color: tier.name === 'BLACK' ? '#FFD54F' : '#0D0D0D' }}>
              {(client.name || '?')[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0D0D0D' }}>{client.name}</div>
              <div style={{ fontSize: 12, color: '#9E9E9E', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span style={{ fontFamily: 'monospace' }}>{client.cardId || '-'}</span>
                <Badge t={tier} />
                <span style={{ fontWeight: 700, color: '#2E7D32' }}>{client.points} pts</span>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#BDBDBD', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>
            Canjes pendientes de entrega
          </div>
          {loadingPending && <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><LogoSpinner size={34} /></div>}
          {!loadingPending && pendingList.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 20px', background: '#F9F9F9', borderRadius: 16, border: '1px solid #eee' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>OK</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#424242' }}>Sin canjes pendientes</div>
              <div style={{ fontSize: 12, color: '#9E9E9E', marginTop: 4 }}>Este cliente no tiene premios por entregar</div>
            </div>
          )}
          {!loadingPending && pendingList.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: '#fff', borderRadius: 16, border: '1px solid #eee', marginBottom: 10 }}>
              <div style={{ fontSize: 32, flexShrink: 0 }}>{item.reward.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0D0D0D' }}>{item.reward.name}</div>
                <div style={{ fontSize: 11, color: '#9E9E9E', marginTop: 2 }}>
                  {item.date} | <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{item.code}</span>
                </div>
                <div style={{ ...sMono, fontSize: 12, color: '#C62828', marginTop: 2 }}>-{item.cost} pts</div>
              </div>
              <button onClick={() => { if (!waitingConfirm) setConfirmItem(item); }} style={{ padding: '10px 16px', borderRadius: 12, border: 'none', background: '#E8F5E9', color: '#2E7D32', fontFamily: "'DM Sans'", fontWeight: 800, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>
                Entregar
              </button>
            </div>
          ))}
        </div>

        {overlays}
      </div>
    );
  }

  // -- Vista principal: boton QR + historial del dia ----
  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ padding: '16px 20px 8px', fontSize: 20, fontWeight: 800, color: '#0D0D0D' }}>Canjear Premios</div>
      <div style={{ padding: '0 20px' }}>

        {/* Boton escanear QR */}
        <button onClick={() => setScanning(true)} style={{ ...btnYellow, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 16 }}>
          Escanear QR del cliente o del premio
        </button>

        {/* FA-lite: toggle de impresión automática (por dispositivo) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#fff', borderRadius: 14, border: '1px solid #eee', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0D0D0D' }}>🖨️ Impresión automática</div>
            <div style={{ fontSize: 11, color: '#9E9E9E', marginTop: 1 }}>Imprime al confirmar el canje</div>
          </div>
          <button onClick={toggleAutoPrint} style={{ padding: '8px 16px', borderRadius: 20, border: 'none', background: autoPrint ? '#E8F5E9' : '#EEE', color: autoPrint ? '#2E7D32' : '#9E9E9E', fontFamily: "'DM Sans'", fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
            {autoPrint ? 'ACTIVADA' : 'APAGADA'}
          </button>
        </div>

        {/* Historial de canjes del dia */}
        <div style={{ fontSize: 11, fontWeight: 800, color: '#BDBDBD', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>
          Canjes entregados hoy ({todayHistory.length})
        </div>

        {loadingToday && <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><LogoSpinner size={30} label="Cargando historial..." /></div>}

        {!loadingToday && todayHistory.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 20px', background: '#F9F9F9', borderRadius: 16, border: '1px solid #eee' }}>
            <div style={{ fontSize: 13, color: '#9E9E9E' }}>No hay canjes entregados hoy</div>
          </div>
        )}

        {!loadingToday && todayHistory.map(h => {
          const d = h.date ? new Date(h.date) : null;
          const timeStr = d ? d.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }) : '';
          return (
            <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#fff', borderRadius: 14, border: '1px solid #eee', marginBottom: 8 }}>
              <div style={{ fontSize: 28, flexShrink: 0 }}>{h.reward.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0D0D0D' }}>{h.reward.name}</div>
                <div style={{ fontSize: 11, color: '#9E9E9E', marginTop: 2 }}>{h.memberName} | {timeStr}</div>
                <div style={{ fontSize: 10, color: '#BDBDBD', fontFamily: 'monospace', marginTop: 1 }}>{h.code}</div>
              </div>
              <button
                onClick={() => doPrint(
                  { id: h.id, reward: h.reward, cost: h.cost, code: h.code },
                  h.memberName,
                  'reprint'
                )}
                style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #1976D2', background: '#E3F2FD', color: '#1976D2', fontFamily: "'DM Sans'", fontWeight: 800, fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>
                Reimprimir
              </button>
            </div>
          );
        })}
      </div>

      {overlays}
    </div>
  );
}
