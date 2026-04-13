// src/views/operator/OpRedeem.jsx
import { useState, useCallback } from 'react';
import { sb } from '../../lib/supabaseClient';
import { sMono, inputStyle, btnYellow } from '../../constants/styles';
import Badge from '../../components/ui/Badge';
import QRScanner from '../../components/ui/QRScanner';
import { Back } from '../../components/ui/Icons';

// Guatemala UTC-6: convierte timestamp UTC de Supabase a fecha local
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
    redeemedList, setRedeemedList, setCusts, syncMember, logActivity } = ctx;

  const [client, setClient]         = useState(null);
  const [scanning, setScanning]     = useState(false);
  const [q, setQ]                   = useState('');
  const [pendingList, setPending]   = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [confirmItem, setConfirmItem]       = useState(null);
  const [waitingConfirm, setWaitingConfirm] = useState(null); // id del canje esperando confirmación del miembro
  const [confirmResult, setConfirmResult]   = useState(null); // 'confirmed' | 'cancelled'

  // ── Cargar canjes pendientes de un cliente ─────────────
  const loadPending = useCallback(async (cust) => {
    setClient(cust);
    setQ('');
    if (!sb || !sbConnected) {
      // Fallback: usar redeemedList local
      const local = (redeemedList || []).filter(r => r.memberId === cust.id && !r.collected);
      setPending(local);
      return;
    }
    setLoadingPending(true);
    const { data, error } = await sb.from('redemptions')
      .select('*, rewards(name, icon, category)')
      .eq('member_id', cust.id)
      .eq('collected', false)
      .order('created_at', { ascending: false });
    setLoadingPending(false);
    if (error) { fire('❌ Error cargando canjes: ' + error.message); return; }
    setPending((data || []).map(rd => ({
      id: rd.id,
      memberId: rd.member_id,
      reward: { name: rd.rewards?.name || 'Premio', icon: rd.rewards?.icon || '🎁', cat: rd.rewards?.category || '' },
      cost: rd.points_spent,
      date: utcToLocal(rd.created_at) || '',
      code: rd.redemption_code,
      collected: false,
    })));
  }, [sbConnected, redeemedList, fire]);

  // ── Escaneo QR ─────────────────────────────────────────
  const handleScan = useCallback((code) => {
    setScanning(false);
    const match = code.match(/^CT[OPB]D-(\d+)$/);
    if (!match) { fire('❌ Código no reconocido: ' + code); return; }
    const correlative = match[1];
    const found = custs.find(c => {
      if (!c.cardId) return false;
      const cm = c.cardId.match(/^CT[OPB]D-(\d+)$/);
      return cm && cm[1] === correlative;
    });
    if (found) { fire('✅ ' + found.name); loadPending(found); }
    else fire('❌ Miembro no encontrado para: ' + code);
  }, [custs, fire, loadPending]);

  // ── Iniciar confirmación: escribe pending y espera respuesta del miembro ──
  const requestConfirm = useCallback(async (item) => {
    setConfirmItem(null);
    if (!sb || !sbConnected) { fire('❌ Sin conexión'); return; }

    // Escribir confirm_status = pending
    console.log('[OpRedeem] Enviando confirm_status=pending para redemption:', item.id, 'member:', item.memberId);
    const { error, data: updData } = await sb.from('redemptions')
      .update({ confirm_status: 'pending' })
      .eq('id', item.id)
      .select();
    console.log('[OpRedeem] Update result:', error ? '❌ ' + error.message : '✅', updData);
    if (error) { fire('❌ Error: ' + error.message); return; }

    setWaitingConfirm(item);
    setConfirmResult(null);
    fire('⏳ Esperando confirmación del cliente...');

    // Escuchar respuesta via polling (cada 2 seg, max 60 seg)
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      const { data } = await sb.from('redemptions')
        .select('confirm_status')
        .eq('id', item.id)
        .single();

      if (data?.confirm_status === 'confirmed') {
        clearInterval(interval);
        // Marcar como entregado
        await sb.from('redemptions').update({ collected: true, confirm_status: 'none' }).eq('id', item.id);
        setPending(p => p.filter(x => x.id !== item.id));
        setRedeemedList(p => p.map(x => x.id === item.id ? { ...x, collected: true } : x));
        setWaitingConfirm(null);
        setConfirmResult('confirmed');
        fire(`✅ Confirmado por el cliente · ${item.reward.name} entregado`);
        logActivity(item.memberId, 'entrega', `Premio entregado: ${item.reward.name} ${item.reward.icon}`, 0);
        setTimeout(() => setConfirmResult(null), 3000);
      } else if (data?.confirm_status === 'cancelled') {
        clearInterval(interval);
        await sb.from('redemptions').update({ confirm_status: 'none' }).eq('id', item.id);
        setWaitingConfirm(null);
        setConfirmResult('cancelled');
        fire('❌ El cliente canceló el canje');
        setTimeout(() => setConfirmResult(null), 3000);
      } else if (attempts >= 30) {
        clearInterval(interval);
        await sb.from('redemptions').update({ confirm_status: 'none' }).eq('id', item.id);
        setWaitingConfirm(null);
        fire('⏱ Tiempo de espera agotado');
      }
    }, 2000);
  }, [sbConnected, fire, logActivity, setRedeemedList]);

  const filteredCusts = q.length >= 2
    ? custs.filter(c =>
        (c.name || '').toLowerCase().includes(q.toLowerCase()) ||
        (c.phone || '').includes(q) ||
        (c.cardId || '').toUpperCase().includes(q.toUpperCase())
      ).slice(0, 8)
    : [];

  const tier = client ? gT(client.gallons) : null;

  // ── Scanner ────────────────────────────────────────────
  if (scanning) return <QRScanner onScan={handleScan} onClose={() => setScanning(false)} />;

  // ── Sin cliente seleccionado ───────────────────────────
  if (!client) {
    return (
      <div style={{ paddingBottom: 90 }}>
        <div style={{ padding: '16px 20px 8px', fontSize: 20, fontWeight: 800, color: '#0D0D0D' }}>🎁 Canjear Premios</div>

        <div style={{ padding: '0 20px' }}>
          {/* Escanear QR */}
          <button onClick={() => setScanning(true)} style={{
            ...btnYellow, marginBottom: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 15,
          }}>
            📷 Escanear código QR del cliente
          </button>

          {/* Buscar por nombre/teléfono/código */}
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <input
              placeholder="Buscar por nombre, teléfono o código..."
              value={q}
              onChange={e => setQ(e.target.value)}
              style={{ ...inputStyle, paddingLeft: 40 }}
              autoComplete="off"
            />
            <span style={{ position: 'absolute', left: 14, top: 14, opacity: .4, fontSize: 16 }}>🔍</span>
          </div>

          {/* Resultados de búsqueda */}
          {filteredCusts.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #eee', overflow: 'hidden', marginTop: 4 }}>
              {filteredCusts.map((c, i) => {
                const ct = gT(c.gallons);
                const pendingCount = (redeemedList || []).filter(r => r.memberId === c.id && !r.collected).length;
                return (
                  <div key={c.id} onClick={() => loadPending(c)} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                    borderBottom: i < filteredCusts.length - 1 ? '1px solid #F5F5F5' : 'none',
                    cursor: 'pointer',
                  }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: '#FFF8E1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, flexShrink: 0 }}>
                      {(c.name || '?')[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0D0D0D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: '#9E9E9E', marginTop: 2 }}>{c.cardId || '—'} · {c.points} pts</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <Badge t={ct} />
                      {pendingCount > 0 && (
                        <div style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: '#C62828', padding: '2px 7px', borderRadius: 8 }}>
                          {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {q.length >= 2 && filteredCusts.length === 0 && (
            <div style={{ textAlign: 'center', padding: 24, color: '#9E9E9E', fontSize: 13 }}>
              No se encontraron clientes
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Cliente seleccionado: canjes pendientes ────────────
  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ padding: '16px 20px 8px', fontSize: 20, fontWeight: 800, color: '#0D0D0D' }}>🎁 Canjear Premios</div>

      <div style={{ padding: '0 20px' }}>
        {/* Volver */}
        <button onClick={() => { setClient(null); setPending([]); }}
          style={{ background: 'none', border: 'none', color: '#FBBC04', cursor: 'pointer', fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Back /> Buscar otro cliente
        </button>

        {/* Info cliente */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 16, border: '1px solid #eee', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: tier.name === 'BLACK' ? '#0D0D0D' : tier.name === 'PLATINO' ? '#E0E0E0' : '#FFF8E1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, flexShrink: 0, color: tier.name === 'BLACK' ? '#FFD54F' : '#0D0D0D' }}>
            {(client.name || '?')[0]}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0D0D0D' }}>{client.name}</div>
            <div style={{ fontSize: 12, color: '#9E9E9E', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span style={{ fontFamily: 'monospace' }}>{client.cardId || '—'}</span>
              <span>·</span>
              <Badge t={tier} />
              <span>·</span>
              <span style={{ fontWeight: 700, color: '#2E7D32' }}>{client.points} pts</span>
            </div>
          </div>
        </div>

        {/* Lista de canjes pendientes */}
        <div style={{ fontSize: 11, fontWeight: 800, color: '#BDBDBD', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>
          Canjes pendientes de entrega
        </div>

        {loadingPending && (
          <div style={{ textAlign: 'center', padding: 32, color: '#9E9E9E' }}>⏳ Cargando...</div>
        )}

        {!loadingPending && pendingList.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 20px', background: '#F9F9F9', borderRadius: 16, border: '1px solid #eee' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
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
                {item.date} · <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{item.code}</span>
              </div>
              <div style={{ ...sMono, fontSize: 12, color: '#C62828', marginTop: 2 }}>-{item.cost} pts</div>
            </div>
            <button onClick={() => { if (waitingConfirm) return; setConfirmItem(item); }} style={{
              padding: '10px 16px', borderRadius: 12, border: 'none',
              background: '#E8F5E9', color: '#2E7D32', fontFamily: "'DM Sans'",
              fontWeight: 800, fontSize: 12, cursor: 'pointer', flexShrink: 0,
            }}>
              Entregar
            </button>
          </div>
        ))}
      </div>

      {/* Modal: pedir confirmación al operador antes de enviar al miembro */}
      {confirmItem && !waitingConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, padding: '12px 24px 40px', boxShadow: '0 -8px 40px rgba(0,0,0,.15)', animation: 'slideUp .3s ease' }}>
            <div style={{ width: 40, height: 4, background: '#E0E0E0', borderRadius: 4, margin: '0 auto 20px' }} />
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>{confirmItem.reward.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#0D0D0D' }}>Solicitar confirmación</div>
              <div style={{ fontSize: 13, color: '#9E9E9E', marginTop: 4 }}>Se enviará una solicitud al dispositivo del cliente para que confirme el canje</div>
            </div>
            <div style={{ background: '#F9F9F9', borderRadius: 14, padding: '14px 18px', marginBottom: 20 }}>
              {[
                { l: 'Premio',   v: confirmItem.reward.name, bold: true },
                { l: 'Cliente',  v: client.name },
                { l: 'Código',   v: confirmItem.code, mono: true },
                { l: 'Fecha',    v: confirmItem.date },
              ].map((row, i, arr) => (
                <div key={row.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: i < arr.length - 1 ? 10 : 0, borderBottom: i < arr.length - 1 ? '1px solid #eee' : 'none', marginBottom: i < arr.length - 1 ? 10 : 0 }}>
                  <span style={{ fontSize: 12, color: '#9E9E9E', fontWeight: 600 }}>{row.l}</span>
                  <span style={{ fontSize: 13, fontWeight: row.bold ? 900 : 700, color: '#0D0D0D', fontFamily: row.mono ? 'monospace' : "'DM Sans'" }}>{row.v}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setConfirmItem(null)} style={{ flex: 1, padding: 16, borderRadius: 14, border: '2px solid #eee', background: '#fff', color: '#424242', fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={() => requestConfirm(confirmItem)} style={{ flex: 2, padding: 16, borderRadius: 14, border: 'none', background: '#FBBC04', color: '#0D0D0D', fontFamily: "'DM Sans'", fontSize: 15, fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 16px rgba(251,188,4,.35)' }}>
                📲 Enviar al cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pantalla de espera: aguardando respuesta del miembro */}
      {waitingConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
          <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 400, padding: '40px 28px', textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,.3)' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>{waitingConfirm.reward.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#0D0D0D', marginBottom: 8 }}>Esperando al cliente</div>
            <div style={{ fontSize: 13, color: '#9E9E9E', marginBottom: 28 }}>
              Se envió la solicitud a <strong style={{ color: '#0D0D0D' }}>{client?.name}</strong>.<br/>Pedile que confirme en su dispositivo.
            </div>
            {/* Animación de espera */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: '#FBBC04', animation: `bounce .9s ${i * 0.2}s infinite` }} />
              ))}
            </div>
            <div style={{ fontSize: 12, color: '#BDBDBD', marginBottom: 20 }}>Premio: {waitingConfirm.reward.name} · Código: {waitingConfirm.code}</div>
            <button onClick={async () => {
              await sb.from('redemptions').update({ confirm_status: 'none' }).eq('id', waitingConfirm.id);
              setWaitingConfirm(null);
              fire('⚠️ Solicitud cancelada');
            }} style={{ padding: '10px 24px', borderRadius: 12, border: '1px solid #eee', background: 'none', color: '#9E9E9E', fontFamily: "'DM Sans'", fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              Cancelar solicitud
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
