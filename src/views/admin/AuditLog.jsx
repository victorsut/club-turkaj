// src/views/admin/AuditLog.jsx
// AUDITORÍA — Admin v2 (11-ago-2026, FORMATO GENERAL): flat sin
// emojis, encabezado v2 sin back-link (navegación en el sidebar),
// filtros en tarjeta, registros en grid auto-fill 340px. La LÓGICA
// no cambió (B0/F0.4): lectura vía RPC get_admin_audit_log (sesión
// admin STRICT, 28000 interceptado centralmente por callRpc), filtros
// por acción/entidad/rango en día calendario GT, paginado 20/pág.
// El vocabulario de filtros se actualizó al REAL (11-ago): acciones
// observadas en admin_audit_log + las que generan los RPCs actuales
// (admin_write_catalog arma `{create|update|delete}_{entidad}`).
import { useState, useEffect, useCallback } from 'react';
import { adminTheme as AT, inputStyleDark } from '../../constants/styles';
import { getAdminAuditLog } from '../../services/rpcServices';

const PAGE_SIZE = 20;

// Vocabulario controlado de acciones, agrupado por área del panel.
const ACTION_GROUPS = [
  { label: 'Configuración', actions: [
    'update_fuel_prices', 'update_loyalty_config', 'update_company_info',
    'update_support_phone', 'enable_degradation', 'disable_degradation',
  ]},
  { label: 'Administradores', actions: [
    'create_admin', 'update_admin_password', 'change_own_admin_password',
    'reset_admin_password', 'toggle_admin_active',
  ]},
  { label: 'Operadores', actions: [
    'create_operator', 'update_operator', 'update_operator_password', 'toggle_operator_active',
  ]},
  { label: 'Miembros', actions: [
    'update_member_profile', 'modify_member_points', 'update_member_points',
    'update_member_gallons', 'update_member_balances', 'reset_member_password', 'delete_member',
  ]},
  { label: 'Catálogo de Canjes', actions: [
    'create_reward', 'update_reward', 'toggle_reward_active', 'delete_reward',
  ]},
  { label: 'Festivos', actions: [
    'create_special_day', 'update_special_day', 'delete_special_day',
  ]},
  { label: 'Promociones y Motor', actions: [
    'create_promotion', 'update_promotion', 'toggle_promotion_active', 'delete_promotion',
    'create_promo_rule', 'update_promo_rule', 'toggle_promo_rule_active', 'delete_promo_rule',
  ]},
  { label: 'Rifa', actions: [
    'create_raffle', 'update_raffle', 'delete_raffle',
  ]},
  { label: 'Estaciones y Tiendas', actions: [
    'update_station', 'create_store', 'update_store', 'delete_store',
  ]},
  { label: 'Análisis', actions: [
    'consulta_integridad',
  ]},
];

const ENTITY_TYPES = [
  'config', 'fuel_prices', 'admin', 'operator', 'member', 'reward',
  'special_day', 'promotion', 'promo_rule', 'raffle', 'station', 'store', 'report',
];

// Color del badge según familia de acción.
const actionColor = (a) => {
  if (a?.startsWith('delete')) return { bg: 'rgba(229,57,53,.15)', txt: '#EF9A9A' };
  if (a?.includes('password') || a?.startsWith('toggle')) return { bg: 'rgba(230,81,0,.15)', txt: '#FFB74D' };
  if (a?.startsWith('create')) return { bg: 'rgba(46,125,50,.15)', txt: '#81C784' };
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
  const { fire, sbConnected } = ctx;

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
    if (!sbConnected) { fire('Sin conexión a Supabase', 'error'); return; }
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
    if (res.error) { fire('Error al cargar auditoría: ' + res.error.message, 'error'); return; }
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

  // ── estilos (FORMATO GENERAL Admin v2) ──────────────────
  const selStyle = { ...inputStyleDark, fontSize: 13, padding: '10px 12px' };
  const lbl = { fontSize: 10, fontWeight: 800, color: AT.sub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 };
  const pageBtn = (off) => ({
    flex: 1, padding: 12, borderRadius: 12, background: AT.card,
    border: `1px solid ${AT.border}`, fontFamily: "'DM Sans'", fontSize: 13,
    fontWeight: 700, cursor: off ? 'default' : 'pointer', color: off ? '#555' : AT.txt,
  });

  return (
    <div style={{ padding: '22px 22px 60px' }}>
      {/* Encabezado v2 (solo consulta — sin botón de acción) */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 21, fontWeight: 800, color: '#fff' }}>Auditoría</div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#9E9E9E', marginTop: 2 }}>
          Registro de las acciones sensibles del panel — solo lectura, con motivo y valores antes/después
        </div>
      </div>

      {/* Filtros */}
      <div style={{ padding: 16, background: AT.card, borderRadius: 16, border: `1px solid ${AT.border}`, marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          <div>
            <div style={lbl}>Acción</div>
            <select value={draft.action} onChange={e => setDraft(p => ({ ...p, action: e.target.value }))} style={selStyle}>
              <option value="">Todas</option>
              {ACTION_GROUPS.map(g => (
                <optgroup key={g.label} label={g.label}>
                  {g.actions.map(a => <option key={a} value={a}>{a}</option>)}
                </optgroup>
              ))}
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
        <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
          <button onClick={applyFilters} disabled={loading} style={{ padding: '11px 22px', borderRadius: 12, background: '#FBBC04', border: 'none', color: '#0D0D0D', fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 800, cursor: 'pointer', opacity: loading ? .6 : 1 }}>Aplicar filtros</button>
          <button onClick={clearFilters} disabled={loading} style={{ padding: '11px 22px', borderRadius: 12, background: 'none', border: `1px solid ${AT.border}`, fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700, cursor: 'pointer', color: AT.sub }}>Limpiar</button>
        </div>
      </div>

      {/* Contador + página */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 12, color: AT.sub, fontWeight: 700 }}>
          {loading ? 'Cargando...' : `${from.toLocaleString('en-US')}–${to.toLocaleString('en-US')} de ${total.toLocaleString('en-US')} registros`}
        </div>
        <div style={{ fontSize: 12, color: AT.sub, fontWeight: 700 }}>Pág. {page + 1}/{totalPages}</div>
      </div>

      {/* Lista */}
      {!loading && rows.length === 0 && (
        <div style={{ padding: 32, textAlign: 'center', color: AT.sub, fontSize: 13, fontWeight: 700 }}>
          Sin registros de auditoría para estos filtros.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 10, alignItems: 'start' }}>
        {rows.map(r => {
          const c = actionColor(r.action);
          const isOpen = expanded === r.id;
          const diff = changedKeys(r.old_value, r.new_value);
          return (
            <div key={r.id} style={{ background: AT.card, borderRadius: 16, border: `1px solid ${AT.border}`, overflow: 'hidden' }}>
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
                      {name}
                      {r.entity_detail && <span style={{ color: AT.sub, fontWeight: 600 }}> · {r.entity_detail}</span>}
                    </div>
                  );
                })()}
                {r.reason_text && (
                  <div style={{ fontSize: 12, color: AT.sub, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: isOpen ? 'normal' : 'nowrap' }}>
                    Motivo: {r.reason_text}
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
                          <span style={{ color: '#81C784', wordBreak: 'break-word' }}>{fmtVal(r.new_value?.[k])}</span>
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
      </div>

      {/* Paginación inferior */}
      {total > PAGE_SIZE && (
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0 || loading}
            style={pageBtn(page === 0)}
          >Anterior</button>
          <button
            onClick={() => setPage(p => (p + 1 < totalPages ? p + 1 : p))}
            disabled={page + 1 >= totalPages || loading}
            style={pageBtn(page + 1 >= totalPages)}
          >Siguiente</button>
        </div>
      )}
    </div>
  );
}
