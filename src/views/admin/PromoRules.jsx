// src/views/admin/PromoRules.jsx
// PROMO-1 (D32): gestión del motor de promociones. Las reglas se
// aplican server-side dentro de register_purchase (sin stacking);
// esta vista solo hace CRUD vía manage_promo_rule (token admin
// STRICT + reason + auditoría atómica server-side — acá NO se usa
// logAdminAction client-first) y ofrece el simulador preview_promo.
import { useEffect, useState } from 'react';
import { btnYellow, inputStyle, adminTheme as AT } from '../../constants/styles';
import { Plus, Percent } from '../../components/ui/Icons';
import ReasonModal from '../../components/ui/ReasonModal';
import { fetchPromoRules, managePromoRule, previewPromo } from '../../services';
import PromoRuleForm from './PromoRuleForm';

const DAY_LABELS = { 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb', 7: 'Dom' };
const FUEL_LABELS = { super: 'Súper', regular: 'Regular', diesel: 'Diésel' };
const darkInput = { ...inputStyle, background: '#333', border: `1px solid ${AT.border}`, color: AT.txt };

function effectLabel(r, rewards = []) {
  if (r.effect_type === 'points_multiplier') return `Puntos ×${+r.effect_value}`;
  if (r.effect_type === 'bonus_points') return `+${Math.floor(r.effect_value)} pts extra`;
  const rw = rewards.find(x => x.id === r.reward_id);
  return `Premio gratis: ${rw ? rw.name : 'Premio'}`;
}

// Resumen humano de vigencia + condiciones para la card de la lista.
function condsSummary(r, stations) {
  const parts = [];
  if (r.starts_on || r.ends_on) parts.push(`${r.starts_on || '…'} → ${r.ends_on || '…'}`);
  if (r.weekdays?.length) parts.push(r.weekdays.map(d => DAY_LABELS[d]).join('/'));
  if (r.specific_dates?.length) parts.push(`Fechas: ${r.specific_dates.join(', ')}`);
  if (r.fuel_types?.length) parts.push(r.fuel_types.map(f => FUEL_LABELS[f] || f).join('/'));
  if (r.min_amount != null) parts.push(`Mín Q${+r.min_amount}`);
  if (r.tiers?.length) parts.push(r.tiers.join('/'));
  if (r.station_ids?.length) {
    parts.push(r.station_ids.map(id => stations.find(s => s.id === id)?.name || '?').join(', '));
  }
  return parts.length ? parts.join(' · ') : 'Sin restricciones (aplica a toda compra)';
}

function usesLabel(r) {
  let s = `${r.uses} uso${r.uses === 1 ? '' : 's'}`;
  if (r.max_uses_total != null) s += ` / ${r.max_uses_total}`;
  if (r.max_uses_per_member != null) s += ` · máx ${r.max_uses_per_member} x cliente`;
  if (r.max_uses_per_member_month != null) s += ` · máx ${r.max_uses_per_member_month} x cliente/mes`;
  return s;
}

export default function PromoRules(ctx) {
  const { stations = [], rewards = [], fire, sbConnected, loggedAdmin } = ctx;

  const [rules, setRules]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);   // null | 'new' | rule
  const [saving, setSaving]   = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [pendingAction, setPendingAction]     = useState(null);
  // Simulador
  const [sim, setSim] = useState({ amount: '150', fuel: 'super', stationId: '', tier: 'ORO' });
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  const load = async () => {
    const { data } = await fetchPromoRules();
    if (data) setRules(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // Toda acción de escritura pasa por ReasonModal → manage_promo_rule.
  const queue = (action, rule, payload, labelText) => {
    if (!loggedAdmin?.id) { fire('Error: sesion admin no disponible'); return; }
    if (!sbConnected) { fire('Sin conexión a Supabase'); return; }
    setPendingAction({ action, ruleId: rule === 'new' ? null : rule?.id, payload, actionLabel: labelText });
    setShowReasonModal(true);
  };

  const onFormSubmit = (ruleData) => {
    const isNew = editing === 'new';
    setEditing(null);   // se reabre si la RPC falla
    queue(
      isNew ? 'create' : 'update',
      isNew ? 'new' : editing,
      { rule: ruleData, reopen: isNew ? 'new' : editing },
      (isNew ? 'Crear regla: ' : 'Editar regla: ') + ruleData.name,
    );
  };

  const confirmAction = async (reason) => {
    if (!pendingAction) { setShowReasonModal(false); return; }
    setSaving(true);
    const { ok, data, error, sessionExpired } = await managePromoRule(
      pendingAction.action,
      { adminId: loggedAdmin.id, adminName: loggedAdmin.name, adminEmail: loggedAdmin.email, reasonText: reason },
      { ruleId: pendingAction.ruleId, rule: pendingAction.payload?.rule || null },
    );
    setSaving(false);
    setShowReasonModal(false);

    if (!ok) {
      if (sessionExpired) return;
      // Reabrir el form con lo tipeado si falló un create/update
      if (pendingAction.payload?.reopen) setEditing(pendingAction.payload.reopen);
      setPendingAction(null);
      fire('Error: ' + (error?.message || 'desconocido'));
      return;
    }
    const doneRuleId = pendingAction.ruleId;
    setPendingAction(null);

    const rule = data?.rule ? { ...data.rule, uses: rules.find(r => r.id === data.rule.id)?.uses ?? 0 } : null;
    switch (data?.action) {
      case 'create':
        setRules(p => [{ ...rule, uses: 0 }, ...p]);
        fire('Regla creada');
        break;
      case 'update':
        setRules(p => p.map(r => r.id === rule.id ? rule : r));
        fire('Regla actualizada');
        break;
      case 'toggle':
        setRules(p => p.map(r => r.id === rule.id ? rule : r));
        fire(rule.active ? 'Regla activada' : 'Regla desactivada');
        break;
      case 'delete':
        setRules(p => p.filter(r => r.id !== doneRuleId));
        fire('Regla eliminada');
        break;
      default:
        load();
    }
  };

  const runPreview = async () => {
    const amount = parseFloat(sim.amount);
    if (!amount || amount < 10) { fire('Monto mínimo Q10'); return; }
    setSimLoading(true);
    const { data, error, sessionExpired } = await previewPromo({
      amount, fuelType: sim.fuel, stationId: sim.stationId || null, tier: sim.tier,
    });
    setSimLoading(false);
    if (error) { if (!sessionExpired) fire('Error: ' + error.message); return; }
    setSimResult(data);
  };

  const card = { background: AT.card, borderRadius: 16, padding: 16, border: `1px solid ${AT.border}`, marginBottom: 12 };
  const btnGhost = { padding: '9px 0', borderRadius: 10, border: `1px solid ${AT.border}`, background: 'none', fontFamily: "'DM Sans'", fontWeight: 700, fontSize: 12, cursor: 'pointer' };

  return (
    <div style={{ padding: '22px 22px 60px' }}>
      {/* Encabezado (FORMATO GENERAL Admin v2 — navegación en el sidebar) */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 21, fontWeight: 800, color: '#fff' }}>Motor de promos</div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#9E9E9E', marginTop: 2 }}>
            Las reglas se aplican solas al registrar compras — si varias aplican, gana la de mayor beneficio (sin acumulación)
          </div>
        </div>
        <button onClick={() => setEditing('new')}
          style={{ ...btnYellow, display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 12, fontSize: 13, padding: '11px 18px', width: 'auto' }}>
          <span style={{ display: 'flex', transform: 'scale(.8)' }}><Plus /></span> Nueva regla
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16, alignItems: 'start' }}>
        {/* ── Simulador ── */}
        <div style={{ ...card, marginBottom: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: '#777', marginBottom: 12 }}>
            Simulador — qué aplicaría hoy
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <input type="number" value={sim.amount} placeholder="Monto Q"
              onChange={e => setSim(p => ({ ...p, amount: e.target.value }))} style={darkInput} />
            <select value={sim.fuel} onChange={e => setSim(p => ({ ...p, fuel: e.target.value }))} style={darkInput}>
              <option value="super">Súper</option>
              <option value="regular">Regular</option>
              <option value="diesel">Diésel</option>
            </select>
            <select value={sim.stationId} onChange={e => setSim(p => ({ ...p, stationId: e.target.value }))} style={darkInput}>
              <option value="">Cualquier estación</option>
              {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={sim.tier} onChange={e => setSim(p => ({ ...p, tier: e.target.value }))} style={darkInput}>
              {['ORO', 'PLATINO', 'BLACK'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button onClick={runPreview} disabled={simLoading} style={{ ...btnYellow, width: '100%', padding: 11, borderRadius: 12, fontSize: 13, opacity: simLoading ? .7 : 1 }}>
            {simLoading ? 'Probando...' : 'Probar'}
          </button>
          {simResult && (
            <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,.05)', fontSize: 12, color: '#E0E0E0', lineHeight: 1.6 }}>
              {simResult.promo?.effect_type === 'grant_reward' ? (
                <>Aplicaría <b>{simResult.promo.name}</b>: <b style={{ color: '#FBBC04' }}>{simResult.promo.reward_name} gratis</b>
                  {' '}(+{simResult.base_points} pts base de la compra)</>
              ) : simResult.promo ? (
                <>Aplicaría <b>{simResult.promo.name}</b>: {simResult.base_points} pts base
                  {' '}+ <b style={{ color: '#FBBC04' }}>{simResult.promo.extra_points} extra</b> = {simResult.final_points} pts</>
              ) : (
                <>Ninguna promoción aplicaría — {simResult.base_points} pts base.</>
              )}
            </div>
          )}
        </div>

        {/* ── Lista de reglas ── */}
        <div>
          {loading && <div style={{ textAlign: 'center', padding: 30, color: '#777', fontSize: 13, fontWeight: 700 }}>Cargando reglas...</div>}
          {!loading && rules.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px 20px', color: '#777' }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, margin: '0 auto 12px', background: AT.card, border: `1px solid ${AT.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}><Percent /></div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#9E9E9E' }}>No hay reglas de promoción</div>
              <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>Creá la primera con "Nueva regla"</div>
            </div>
          )}

          {rules.map(r => (
            <div key={r.id} style={{ ...card, opacity: r.active ? 1 : .55 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#E0E0E0' }}>{r.name}</div>
                  {r.description && <div style={{ fontSize: 11, color: AT.sub, marginTop: 2 }}>{r.description}</div>}
                </div>
                <div style={{ fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 6, flexShrink: 0, letterSpacing: .5, background: r.active ? 'rgba(76,175,80,.3)' : 'rgba(158,158,158,.3)', color: r.active ? '#81C784' : AT.sub }}>
                  {r.active ? 'ACTIVA' : 'INACTIVA'}
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#FBBC04', marginBottom: 6 }}>{effectLabel(r, rewards)}</div>
              <div style={{ fontSize: 11, color: AT.sub, lineHeight: 1.6, marginBottom: 10 }}>
                {condsSummary(r, stations)}<br />
                Usos: {usesLabel(r)}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setEditing(r)} style={{ ...btnGhost, flex: 1, color: '#64B5F6' }}>
                  Editar
                </button>
                <button onClick={() => queue('toggle', r, null, (r.active ? 'Desactivar regla: ' : 'Activar regla: ') + r.name)}
                  style={{ ...btnGhost, flex: 1, color: r.active ? '#FF8F00' : '#81C784' }}>
                  {r.active ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  onClick={() => {
                    if (r.uses > 0) { fire('La regla tiene usos registrados — desactivala en su lugar'); return; }
                    queue('delete', r, null, 'Eliminar regla: ' + r.name);
                  }}
                  style={{ ...btnGhost, padding: '9px 14px', color: '#EF5350' }}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form bottom-sheet (create/edit) */}
      {editing && (
        <PromoRuleForm
          key={editing === 'new' ? 'new' : editing.id}
          rule={editing}
          stations={stations}
          rewards={rewards}
          saving={saving}
          fire={fire}
          onCancel={() => setEditing(null)}
          onSubmit={onFormSubmit}
        />
      )}

      <ReasonModal
        open={showReasonModal}
        onClose={() => {
          if (saving) return;
          setShowReasonModal(false);
          // Si canceló el reason de un create/update, reabrir el form con lo tipeado
          if (pendingAction?.payload?.reopen) setEditing(pendingAction.payload.reopen);
          setPendingAction(null);
        }}
        onConfirm={confirmAction}
        actionLabel={pendingAction?.actionLabel || 'Confirmar accion'}
        loading={saving}
      />
    </div>
  );
}
