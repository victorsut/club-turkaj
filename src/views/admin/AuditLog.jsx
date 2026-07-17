// src/views/admin/AuditLog.jsx
// B0/F0.4 — Consulta del log de auditoría admin (admin_audit_log).
// Lectura vía RPC get_admin_audit_log (sesión admin STRICT, 28000
// interceptado centralmente por callRpc). Filtros: acción, entidad,
// rango de fechas (día calendario de Guatemala). Paginado 20/pág.
import { useState, useEffect, useCallback } from 'react';
import { adminTheme as AT, inputStyleDark } from '../../constants/styles';
import { Back } from '../../components/ui/Icons';
import { getAdminAuditLog } from '../../services/rpcServices';

const PAGE_SIZE = 20;

// Vocabulario controlado de acciones (F0.2 + RPCs con auditoría).
const ACTIONS = [
  'update_fuel_prices',
  'create_operator', 'update_operator', 'update_operator_password', 'toggle_operator_active',
  'create_reward', 'update_reward', 'delete_reward',
  'create_special_day', 'update_special_day', 'delete_special_day',
  'create_promotion', 'update_promotion', 'delete_promotion',
  'update_raffle',
  'update_member_profile', 'update_member_points', 'update_member_gallons', 'update_member_balances',
];

const ENTITY_TYPES = ['fuel_prices', 'operator', 'reward', 'special_day', 'promotion', 'raffle', 'member'];

// Color del badge según familia de acción.
const actionColor = (a) => {
  if (a?.startsWith('delete')) return { bg: 'rgba(229,57,53,.15)', txt: '#EF9A9A' };
  if (a?.includes('password') || a?.startsWith('toggle')) return { bg: 'rgba(230,81,0,.15)', txt: '#FFB74D' };
  if (a?.startsWith('create')) return { bg: 'rgba(46,125,50,.15)', txt: '#66BB6A' };
  return { bg: 'rgba(251,188,4,.12)', txt: '#FBBC04' };
};

const fmtDate = (iso) => {
  try {
    return new Date(iso).toLocaleString('es-GT', {
      timeZone: 'America/Guatemala',
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
};

const fmtVal = (v) => {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

// Claves cuyo valor difiere entre old_value y new_value.
const changedKeys = (oldV, newV) => {
  const keys = new Set([...Object.keys(oldV || {}), ...Object.keys(newV || {})]);
  return [...keys].filter(k => JSON.stringify(oldV?.[k]) !== JSON.stringify(newV?.[k]));
};

export default function AuditLog(ctx) {
  const { setScr, fire, sbConnected } = ctx;

  // Filtros: draft (lo que el admin edita) vs applied (lo que se consulta).
  const EMPTY_FILTERS = { action: '', entityType: '', dateFrom: '', dateTo: '' };
  const [draft, setDraft]     = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);
  const [page, setPage]       = useState(0);

  const [rows, setRows]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null); // id de la fila abierta

  const load = useCallback(async () => {
    if (!sbConnected) { fire('❌ Sin conexión a Supabase'); return; }
    setLoading(true);
    const res = await getAdminAuditLog({
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      action: applied.action || null,
      entityType: applied.entityType || null,
      dateFrom: applied.dateFrom || null,
      dateTo: applied.dateTo || null,
    });
    setLoading(false);
    if (res.sessionExpired) return; // el handler global ya redirige a login
    if (res.error) { fire('❌ Error al cargar auditoría: ' + res.error.message); return; }
    setRows(res.data?.rows || []);
    setTotal(res.data?.total || 0);
    setExpanded(null);
  }, [page, applied, sbConnected, fire]);

  useEffect(() => { load(); }, [load]);

  const applyFilters = () => { setPage(0); setApplied(draft); };
  const clearFilters = () => { setPage(0); setDraft(EMPTY_FILTERS); setApplied(EMPTY_FILTERS); };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);

  const selStyle = { ...inputStyleDark, fontSize: 13, padding: '10px 12px' };
  const lbl = { fontSize: 10, fontWeight: 800, color: AT.sub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 };

  return (
    <div style={{ paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${AT.border}`, background: '#252525', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setScr('cfg')} style={{ background: 'none', border: 'none', color: '#9E9E9E', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600 }}><Back /> Config</button>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>📜 Auditoría</div>
        <div style={{ width: 80 }} />
      </div>

      {/* Filtros */}
      <div style={{ margin: '14px 20px', padding: 16, background: AT.card, borderRadius: 16, border: `1px solid ${AT.border}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={lbl}>Acción</div>
            <select value={draft.action} onChange={e => setDraft(p => ({ ...p, action: e.target.value }))} style={selStyle}>
              <option value="">Todas</option>
              {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <div style={lbl}>Entidad</div>
            <select value={draft.entityType} onChange={e => setDraft(p => ({ ...p, entityType: e.target.value }))} style={selStyle}>
              <option value="">Todas</option>
              {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <div style={lbl}>Desde</div>
            <input type="date" value={draft.dateFrom} onChange={e => setDraft(p => ({ ...p, dateFrom: e.target.value }))} style={selStyle} />
          </div>
          <div>
            <div style={lbl}>Hasta</div>
            <input type="date" value={draft.dateTo} onChange={e => setDraft(p => ({ ...p, dateTo: e.target.value }))} style={selStyle} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button onClick={applyFilters} disabled={loading} style={{ flex: 1, padding: 11, borderRadius: 12, background: '#FBBC04', border: 'none', fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 800, cursor: 'pointer', opacity: loading ? .6 : 1 }}>Aplicar filtros</button>
          <button onClick={clearFilters} disabled={loading} style={{ flex: 1, padding: 11, borderRadius: 12, background: 'none', border: `1px solid ${AT.border}`, fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700, cursor: 'pointer', color: AT.sub }}>Limpiar</button>
        </div>
      </div>

      {/* Contador + paginación superior */}
      <div style={{ padding: '0 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: AT.sub, fontWeight: 700 }}>
          {loading ? 'Cargando…' : `${from}–${to} de ${total} registros`}
        </div>
        <div style={{ fontSize: 12, color: AT.sub, fontWeight: 700 }}>Pág. {page + 1}/{totalPages}</div>
      </div>

      {/* Lista */}
      {!loading && rows.length === 0 && (
        <div style={{ margin: '30px 20px', textAlign: 'center', color: AT.sub, fontSize: 14 }}>
          Sin registros de auditoría para estos filtros.
        </div>
      )}

      {rows.map(r => {
        const c = actionColor(r.action);
        const isOpen = expanded === r.id;
        const diff = changedKeys(r.old_value, r.new_value);
        return (
          <div key={r.id} style={{ margin: '0 20px 10px', background: AT.card, borderRadius: 14, border: `1px solid ${AT.border}`, overflow: 'hidden' }}>
            {/* Fila resumen */}
            <div onClick={() => setExpanded(isOpen ? null : r.id)} style={{ padding: 14, cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 8, background: c.bg, color: c.txt, letterSpacing: .5 }}>{r.action}</span>
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 11, color: AT.sub, fontWeight: 600 }}>{fmtDate(r.created_at)}</span>
              </div>
              <div style={{ fontSize: 12, color: AT.txt, fontWeight: 700 }}>
                {r.admin_name || '—'}
                {r.entity_type && <span style={{ color: AT.sub, fontWeight: 600 }}> · {r.entity_type}</span>}
              </div>
              {(() => {
                // Nombre de la entidad afectada: resuelto server-side; si la
                // fila ya no existe (deletes), cae al snapshot del log; último
                // recurso: id truncado.
                const name = r.entity_name
                  || r.old_value?.name || r.new_value?.name
                  || r.old_value?.title || r.new_value?.title
                  || (r.entity_id ? `#${String(r.entity_id).slice(0, 8)}` : null);
                if (!name) return null;
                return (
                  <div style={{ fontSize: 12, color: '#64B5F6', fontWeight: 700, marginTop: 3 }}>
                    {r.entity_type === 'member' ? '👤 ' : ''}{name}
                    {r.entity_detail && <span style={{ color: AT.sub, fontWeight: 600 }}> · {r.entity_detail}</span>}
                  </div>
                );
              })()}
              {r.reason_text && (
                <div style={{ fontSize: 12, color: AT.sub, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: isOpen ? 'normal' : 'nowrap' }}>
                  💬 {r.reason_text}
                </div>
              )}
            </div>

            {/* Detalle expandido: diff before/after */}
            {isOpen && (
              <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${AT.border}` }}>
                {diff.length > 0 ? (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ ...lbl, marginBottom: 8 }}>Cambios ({diff.length})</div>
                    {diff.map(k => (
                      <div key={k} style={{ display: 'flex', gap: 8, alignItems: 'baseline', padding: '5px 0', borderBottom: `1px solid ${AT.border}`, fontSize: 12 }}>
                        <span style={{ color: '#64B5F6', fontWeight: 700, flexShrink: 0 }}>{k}</span>
                        <span style={{ color: '#EF9A9A', wordBreak: 'break-word' }}>{fmtVal(r.old_value?.[k])}</span>
                        <span style={{ color: AT.sub, flexShrink: 0 }}>→</span>
                        <span style={{ color: '#66BB6A', wordBreak: 'break-word' }}>{fmtVal(r.new_value?.[k])}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ marginTop: 10, fontSize: 12, color: AT.sub }}>
                    {r.old_value || r.new_value ? 'Sin diferencias campo a campo.' : 'Sin valores registrados (acción sin snapshot).'}
                  </div>
                )}
                <div style={{ marginTop: 10, fontSize: 10, color: '#666', fontFamily: 'monospace' }}>
                  {r.admin_email || ''} · log {String(r.id).slice(0, 8)}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Paginación inferior */}
      {total > PAGE_SIZE && (
        <div style={{ display: 'flex', gap: 10, padding: '10px 20px 20px' }}>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0 || loading}
            style={{ flex: 1, padding: 12, borderRadius: 12, background: AT.card, border: `1px solid ${AT.border}`, fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700, cursor: page === 0 ? 'default' : 'pointer', color: page === 0 ? '#555' : AT.txt }}
          >← Anterior</button>
          <button
            onClick={() => setPage(p => (p + 1 < totalPages ? p + 1 : p))}
            disabled={page + 1 >= totalPages || loading}
            style={{ flex: 1, padding: 12, borderRadius: 12, background: AT.card, border: `1px solid ${AT.border}`, fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700, cursor: page + 1 >= totalPages ? 'default' : 'pointer', color: page + 1 >= totalPages ? '#555' : AT.txt }}
          >Siguiente →</button>
        </div>
      )}
    </div>
  );
}
