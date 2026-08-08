// src/views/admin/AdminRaffle.jsx
// RIFA — Admin v2 (8-ago-2026, FORMATO GENERAL): flat, minimalista,
// SIN emojis (iconos SVG). La GESTIÓN de rifas se MUDÓ acá desde
// Premios y Festivos (pedido del dueño): crear rifas nuevas y editar
// las PROGRAMADAS (no sorteadas); las REALIZADAS son historial de
// solo lectura. Arriba permanece la rifa DEL MES con sus datos; la
// lista de participantes solo aparece al tocar "Ver participantes".
// El sorteo REAL es automático server-side (draw_due_raffles al
// abrir la app) — se eliminó el botón de sorteo local con
// Math.random que no persistía nada.
import { useState, useEffect } from 'react';
import { sb } from '../../lib/supabaseClient';
import { sMono, adminTheme as AT, btnYellow } from '../../constants/styles';
import { Plus, TicketStar } from '../../components/ui/Icons';
import LogoSpinner from '../../components/ui/LogoSpinner';
import ReasonModal from '../../components/ui/ReasonModal';
import AdminRaffleForm from './AdminRaffleForm';
import { adminWriteCatalog } from '../../services/secureReads';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function AdminRaffle(ctx) {
  const {
    setRaffleCal, rafData, cfg, custs = [], gT, fire, curMonth,
    sbConnected, loggedAdmin, stations = [],
  } = ctx;

  const curYear = new Date().getFullYear();

  // ── Lista COMPLETA de rifas (todos los años — el ctx.raffleCal solo
  // trae los 12 slots del año en curso) ──
  const [list, setList] = useState(null); // null = cargando
  useEffect(() => {
    if (!sb || !sbConnected) { setList([]); return; }
    sb.from('raffle_calendar').select('*').order('year').order('month')
      .then(({ data }) => setList(data || []));
  }, [sbConnected]);

  const isDrawn   = (r) => !!r.winner_id || !!r.drawn_at;
  const isCurrent = (r) => r.year === curYear && r.month === curMonth + 1;
  const isFuture  = (r) => r.year > curYear || (r.year === curYear && r.month > curMonth + 1);
  // Regla del dueño: solo se editan las NO realizadas (programadas o
  // la del mes en curso mientras no se sortee); eliminar solo futuras.
  const canEdit = (r) => !isDrawn(r) && (isFuture(r) || isCurrent(r));
  const canDel  = (r) => !isDrawn(r) && isFuture(r);

  const current   = (list || []).find(isCurrent) || null;
  const scheduled = (list || []).filter(r => !isDrawn(r))
    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
  const history   = (list || []).filter(isDrawn)
    .sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);

  // ── Participantes de la rifa DEL MES (ocultos hasta pedirlos) ──
  const [showParts, setShowParts] = useState(false);
  const parts = rafData?.[curMonth]?.participants || [];
  const totalTickets = parts.reduce((s, p) => s + p.tickets, 0);
  const ticketPts = current?.ticket_points ?? cfg?.ticketPts ?? 5;
  const totalPts = totalTickets * ticketPts;
  const ptsToQ = +(totalPts * 0.25).toFixed(2);
  const covers = ptsToQ >= (current?.prize_value || 0);

  const winnerName = (r) => custs.find(c => c.id === r.winner_id)?.name || 'Miembro';
  const stationName = (id) => stations.find(s => s.id === id)?.name || stations[0]?.name || 'Turkaj 1';
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-GT') : '';

  // ── CRUD (mismo flujo auditado de siempre: SEC.C.4 admin_write_catalog;
  // crear directo con auditoría, editar/eliminar con ReasonModal) ──
  const [formOpen, setFormOpen] = useState(false);
  const [editRaf, setEditRaf]   = useState(null);
  const [saving, setSaving]     = useState(false);
  const [showReason, setShowReason] = useState(false);
  const [pending, setPending]   = useState(null);

  const adminAudit = (reasonText = null) => ({
    adminId: loggedAdmin?.id, adminName: loggedAdmin?.name,
    adminEmail: loggedAdmin?.email, reasonText,
  });

  // Refleja el cambio en ctx.raffleCal (slots del año en curso) para
  // que el hero, el inicio y la vista del cliente no queden viejos.
  const patchCal = (id, data) => {
    if (!setRaffleCal) return;
    setRaffleCal(prev => prev.map((slot, i) => {
      if (data && data.year === curYear && i === data.month - 1) {
        return {
          ...slot, m: MONTHS[i], p: `${data.prize_icon} ${data.prize_name}`,
          name: data.prize_name, icon: data.prize_icon,
          img: data.prize_image_url || null, detail: data.prize_detail || null,
          v: `Q${data.prize_value}`, cost: data.prize_value, dbId: id,
          month: data.month, year: data.year,
          ticketPts: data.ticket_points ?? null,
          claimDays: data.claim_days ?? null,
          claimStationId: data.claim_station_id || null,
        };
      }
      if (!data && slot?.dbId === id) {
        return { m: MONTHS[i], p: '—', name: null, icon: null, img: null, detail: null, v: 'Q0', cost: 0, dbId: null, month: i + 1, year: curYear, winnerId: null, drawnAt: null, winnerSeenAt: null, ticketPts: null, claimDays: null, claimStationId: null };
      }
      return slot;
    }));
  };

  const saveRaffle = async (data) => {
    if (editRaf) {
      if (!loggedAdmin?.id) { fire('Error: sesion admin no disponible. Cerra sesion y volve a ingresar.'); return; }
      setPending({ type: 'edit', entityId: editRaf.id, data, label: 'Editar rifa: ' + data.prize_name });
      setFormOpen(false);
      setShowReason(true);
      return;
    }
    setSaving(true);
    if (sb && sbConnected) {
      const res = await adminWriteCatalog('raffle', 'create', { data, audit: adminAudit() });
      if (res.error) { fire('Error: ' + res.error); setSaving(false); return; }
      setList(p => [...(p || []), { ...data, id: res.id }].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month));
      patchCal(res.id, data);
      fire('Rifa creada');
    }
    setSaving(false); setFormOpen(false); setEditRaf(null);
  };

  const delRaf = (r) => {
    if (!loggedAdmin?.id) { fire('Error: sesion admin no disponible. Cerra sesion y volve a ingresar.'); return; }
    setPending({ type: 'delete', entityId: r.id, data: null, label: 'Eliminar rifa: ' + (r.prize_name || '') });
    setShowReason(true);
  };

  const confirmAction = async (reason) => {
    if (!pending || !loggedAdmin?.id) { setShowReason(false); return; }
    const audit = adminAudit(reason);
    const eid = pending.entityId;
    setSaving(true);
    try {
      if (pending.type === 'edit') {
        const res = sb && sbConnected
          ? await adminWriteCatalog('raffle', 'update', { id: eid, data: pending.data, audit })
          : {};
        if (res.error) {
          setShowReason(false);
          // Reabrir el form con lo EDITADO intacto (no el original)
          setEditRaf(prev => ({ ...prev, ...pending.data }));
          setFormOpen(true);
          fire('Error: ' + res.error);
          return;
        }
        setList(prev => prev.map(r => r.id === eid ? { ...r, ...pending.data } : r));
        patchCal(eid, pending.data);
        setEditRaf(null);
        fire('Rifa actualizada');
      } else {
        const res = sb && sbConnected
          ? await adminWriteCatalog('raffle', 'delete', { id: eid, audit })
          : {};
        if (res.error) { setShowReason(false); fire('Error: ' + res.error); return; }
        setList(prev => prev.filter(r => r.id !== eid));
        patchCal(eid, null);
        fire('Rifa eliminada');
      }
      setShowReason(false);
      setPending(null);
    } finally {
      setSaving(false);
    }
  };

  // ── estilos ──
  const card = { background: AT.card, border: `1px solid ${AT.border}`, borderRadius: 18, padding: 18 };
  const cardLbl = { fontSize: 10, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: '#777', marginBottom: 12 };
  const chip = (bg, color) => ({ fontSize: 9, fontWeight: 800, background: bg, color, padding: '3px 8px', borderRadius: 6, letterSpacing: .5, whiteSpace: 'nowrap' });
  const miniBtn = (color) => ({
    padding: '5px 10px', borderRadius: 8, border: `1px solid ${AT.border}`,
    background: 'transparent', color, fontSize: 11, fontWeight: 700,
    cursor: 'pointer', fontFamily: "'DM Sans'", flexShrink: 0,
  });
  const thumb = (r, size = 44) => r.prize_image_url ? (
    <img src={r.prize_image_url} alt="" style={{ width: size, height: size, objectFit: 'cover', borderRadius: 12, border: `1px solid ${AT.border}`, flexShrink: 0 }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: 12, background: 'rgba(251,188,4,.12)', color: '#FBBC04', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <TicketStar />
    </div>
  );

  const raffleRow = (r, actions) => (
    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${AT.border}` }}>
      {thumb(r)}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#E0E0E0' }}>
          {MONTHS[(r.month || 1) - 1]} {r.year}
          <span style={{ color: '#9E9E9E', fontWeight: 700 }}> · {r.prize_name}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ ...sMono, fontSize: 11, fontWeight: 800, color: '#FBBC04' }}>Q{(+r.prize_value || 0).toLocaleString('en-US')}</span>
          <span style={{ fontSize: 10, color: '#9E9E9E', fontWeight: 700 }}>{r.ticket_points ?? cfg?.ticketPts ?? 5} pts/boleto</span>
          <span style={{ fontSize: 10, color: '#777', fontWeight: 700 }}>{r.claim_days ?? 15} días · {stationName(r.claim_station_id)}</span>
          {isDrawn(r)
            ? <span style={chip('rgba(46,125,50,.25)', '#81C784')}>SORTEADA</span>
            : isCurrent(r)
              ? <span style={chip('rgba(251,188,4,.15)', '#FBBC04')}>EN CURSO</span>
              : isFuture(r)
                ? <span style={chip('rgba(100,181,246,.15)', '#64B5F6')}>PROGRAMADA</span>
                : <span style={chip('rgba(255,255,255,.08)', '#999')}>SIN SORTEAR</span>}
        </div>
        {isDrawn(r) && (
          <div style={{ fontSize: 11, color: '#81C784', fontWeight: 700, marginTop: 3 }}>
            Ganador: {winnerName(r)}{r.drawn_at ? ` · ${fmtDate(r.drawn_at)}` : ''}
          </div>
        )}
      </div>
      {actions}
    </div>
  );

  return (
    <div style={{ padding: '22px 22px 60px' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 21, fontWeight: 800, color: '#fff' }}>Rifa</div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#9E9E9E', marginTop: 2 }}>
            Rifa del mes, rifas programadas e historial — el sorteo corre automático al vencer el mes
          </div>
        </div>
        <button onClick={() => { setEditRaf(null); setFormOpen(true); }}
          style={{ ...btnYellow, width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 12, fontSize: 13, padding: '11px 18px' }}>
          <span style={{ display: 'flex', transform: 'scale(.8)' }}><Plus /></span> Nueva rifa
        </button>
      </div>

      {/* ── Rifa DEL MES (permanece arriba — pedido del dueño) ── */}
      {list === null ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><LogoSpinner size={34} dark /></div>
      ) : current ? (
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={cardLbl}>Rifa del mes — {MONTHS[curMonth]} {curYear}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
            {thumb(current, 88)}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{current.prize_name}</div>
              <div style={{ ...sMono, fontSize: 13, fontWeight: 800, color: '#FBBC04', marginTop: 3 }}>
                Q{(+current.prize_value || 0).toLocaleString('en-US')}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={chip('rgba(255,255,255,.08)', '#aaa')}>{ticketPts} PTS/BOLETO</span>
                <span style={chip('rgba(255,255,255,.08)', '#aaa')}>{current.claim_days ?? 15} DÍAS PARA RECLAMAR</span>
                <span style={chip('rgba(255,255,255,.08)', '#aaa')}>{stationName(current.claim_station_id).toUpperCase()}</span>
                {isDrawn(current) && <span style={chip('rgba(46,125,50,.25)', '#81C784')}>SORTEADA</span>}
              </div>
            </div>
            {canEdit(current) && (
              <button onClick={() => { setEditRaf(current); setFormOpen(true); }} style={miniBtn('#64B5F6')}>Editar</button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { v: parts.length.toLocaleString('en-US'), l: 'Participantes', c: '#E0E0E0' },
              { v: totalTickets.toLocaleString('en-US'), l: 'Boletos', c: '#E0E0E0' },
              { v: `Q${ptsToQ.toLocaleString('en-US')}`, l: 'Recaudado', c: covers ? '#81C784' : '#E57373' },
            ].map(s => (
              <div key={s.l} style={{ background: 'rgba(255,255,255,.05)', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ ...sMono, fontSize: 17, fontWeight: 800, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 9, color: '#777', textTransform: 'uppercase', letterSpacing: 1, marginTop: 3, fontWeight: 700 }}>{s.l}</div>
              </div>
            ))}
          </div>

          {isDrawn(current) && (
            <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 12, background: 'rgba(46,125,50,.12)', border: '1px solid rgba(46,125,50,.4)' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#81C784', textTransform: 'uppercase', letterSpacing: 1 }}>Ganador</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginTop: 3 }}>{winnerName(current)}</div>
              {current.drawn_at && <div style={{ fontSize: 11, color: '#9E9E9E', marginTop: 2 }}>Sorteo: {fmtDate(current.drawn_at)}</div>}
            </div>
          )}

          {/* Participantes SOLO al pedirlos (pedido del dueño) */}
          <button onClick={() => setShowParts(p => !p)} style={{
            width: '100%', marginTop: 12, padding: '11px 14px', borderRadius: 12, cursor: 'pointer',
            border: `1px solid ${AT.border}`, background: 'transparent', color: '#9E9E9E',
            fontFamily: "'DM Sans'", fontSize: 12.5, fontWeight: 700,
          }}>
            {showParts ? 'Ocultar participantes' : `Ver participantes (${parts.length.toLocaleString('en-US')})`}
          </button>

          {showParts && (
            <div style={{ marginTop: 6 }}>
              {parts.length === 0 && (
                <div style={{ textAlign: 'center', padding: '18px 0 8px', color: '#777', fontSize: 13 }}>Aún no hay participantes</div>
              )}
              {[...parts].sort((a, b) => b.tickets - a.tickets).map(p => {
                const c = custs.find(x => x.id === p.cid);
                const t = c ? gT(c.gallons) : gT(0);
                const prob = totalTickets > 0 ? ((p.tickets / totalTickets) * 100).toFixed(1) : 0;
                const won = current.winner_id === p.cid;
                return (
                  <div key={p.cid} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: `1px solid ${AT.border}` }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: t.bg, color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                      {(c?.name || p.name).charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#E0E0E0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: '#777', marginTop: 2 }}>
                        {p.tickets} boleto{p.tickets > 1 ? 's' : ''} · {prob}% de probabilidad
                      </div>
                    </div>
                    {won && <span style={chip('rgba(46,125,50,.25)', '#81C784')}>GANADOR</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div style={{ ...card, marginBottom: 16, textAlign: 'center', padding: '32px 18px' }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, margin: '0 auto 12px', background: 'rgba(251,188,4,.12)', color: '#FBBC04', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TicketStar /></div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#9E9E9E' }}>Sin rifa configurada para {MONTHS[curMonth]}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#777', marginTop: 4 }}>Creala con el botón "Nueva rifa"</div>
        </div>
      )}

      {/* ── Programadas (editables mientras no se sorteen) ── */}
      {list !== null && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16, alignItems: 'start' }}>
          <div style={{ ...card, paddingBottom: 8 }}>
            <div style={cardLbl}>Rifas programadas ({scheduled.length})</div>
            {scheduled.length === 0 && (
              <div style={{ textAlign: 'center', padding: '14px 0 24px', color: '#777', fontSize: 13 }}>Sin rifas programadas — creá la siguiente</div>
            )}
            {scheduled.map(r => raffleRow(r, (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                {canEdit(r) && <button onClick={() => { setEditRaf(r); setFormOpen(true); }} style={miniBtn('#64B5F6')}>Editar</button>}
                {canDel(r) && <button onClick={() => delRaf(r)} style={miniBtn('#EF5350')}>Eliminar</button>}
              </div>
            )))}
          </div>

          {/* ── Historial (sorteadas — solo lectura, regla del dueño) ── */}
          <div style={{ ...card, paddingBottom: 8 }}>
            <div style={cardLbl}>Historial ({history.length})</div>
            {history.length === 0 && (
              <div style={{ textAlign: 'center', padding: '14px 0 24px', color: '#777', fontSize: 13 }}>Aún no hay rifas sorteadas</div>
            )}
            {history.map(r => raffleRow(r, null))}
            {history.length > 0 && (
              <div style={{ fontSize: 10.5, color: '#777', fontWeight: 600, padding: '10px 0', lineHeight: 1.5 }}>
                Las rifas realizadas no pueden editarse — quedan guardadas como historial.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Form (crear / editar) ── */}
      {formOpen && (
        <AdminRaffleForm
          editRaf={editRaf} existing={list || []} stations={stations} cfg={cfg}
          saving={saving} fire={fire}
          onCancel={() => { setFormOpen(false); setEditRaf(null); }}
          onSave={saveRaffle}
        />
      )}

      {/* Motivo obligatorio para editar/eliminar (auditado) */}
      <ReasonModal
        open={showReason}
        onClose={() => {
          setShowReason(false);
          // Editar cancelado → reabrir el form con lo EDITADO intacto
          if (pending?.type === 'edit') {
            setEditRaf(prev => ({ ...prev, ...pending.data }));
            setFormOpen(true);
          }
          setPending(null);
        }}
        onConfirm={confirmAction}
        actionLabel={pending?.label || ''}
        loading={saving}
      />
    </div>
  );
}
