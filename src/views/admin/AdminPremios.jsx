// src/views/admin/AdminPremios.jsx
import { useState, useEffect } from 'react';
import { sb } from '../../lib/supabaseClient';
import { adminTheme as AT, btnYellow, btnDark, inputStyle, sMono } from '../../constants/styles';
import { Back, Plus } from '../../components/ui/Icons';
import ReasonModal from '../../components/ui/ReasonModal';
import { logAdminAction } from '../../services/rpcServices';

const CAT_LABELS = {
  combustible: 'Combustible', servicio: 'Servicio', merch: 'Club Turkaj',
  cultural: 'Chichi', shell: 'Shell', premium: 'Premium', apple: 'Apple',
};
const CAT_COLORS = {
  combustible: { bg: '#FFF3E0', c: '#E65100' },
  servicio:    { bg: '#E8F5E9', c: '#2E7D32' },
  merch:       { bg: '#E3F2FD', c: '#1565C0' },
  cultural:    { bg: '#F3E5F5', c: '#7B1FA2' },
  shell:       { bg: '#FFEBEE', c: '#C62828' },
  premium:     { bg: '#FFF8E1', c: '#F57F17' },
  apple:       { bg: '#F5F5F5', c: '#333'    },
};
const CATS  = Object.keys(CAT_LABELS);
const TIERS = ['todos', 'ORO', 'PLATINO', 'BLACK'];
const ICONS = ['🎁','⛽','🧴','🍪','🎟️','🏆','📱','🧽','🎨','🎵','🌮','🎮','👕','🏍️','🚗','🔑','🧳','⌚','💳','🛠️'];

const EMPTY = { name: '', pts: '', icon: '🎁', cat: 'merch', tier: 'todos', active: true, description: '' };

const TABS = [
  { id: 'canjear', label: 'Canjear'  },
  { id: 'rifa',    label: 'Rifa'     },
  { id: 'festivos',label: 'Festivos' },
];

export default function AdminPremios(ctx) {
  const { rewards, setRewards, fire, setScr, sbConnected, loggedAdmin } = ctx;

  const [sub, setSub]             = useState('canjear');
  const [showForm, setShowForm]   = useState(false);
  const [editR, setEditR]         = useState(null);
  const [form, setForm]           = useState(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [filterCat, setFilterCat] = useState('todos');
  // F0.3.6: ReasonModal unificado para acciones sensibles (edit/delete/toggle).
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [pendingAction, setPendingAction]     = useState(null);

  // Estados Festivos
  const [festList, setFestList]       = useState([]);
  const [loadingFest, setLoadingFest] = useState(false);
  const [showFestForm, setShowFestForm] = useState(false);
  const [editFest, setEditFest]       = useState(null);
  const [festForm, setFestForm]       = useState({ name: '', month: '', day: '', points: '70', icon: 'F', active: true });
  const [savingFest, setSavingFest]   = useState(false);

  // Cargar festivos al abrir esa pestana
  useEffect(() => {
    console.log('[Festivos] sub:', sub, 'sb:', !!sb, 'sbConnected:', sbConnected, 'festList:', festList.length);
    if (sub !== 'festivos') return;
    if (!sb) { fire('Sin conexion a base de datos'); return; }
    setLoadingFest(true);
    setFestList([]); // resetear para forzar recarga
    sb.from('special_days').select('id, name, month, day, points, icon, active, system').order('created_at', { ascending: true })
      .then(({ data, error }) => {
        setLoadingFest(false);
        console.log('[Festivos] resultado:', error?.message || (data?.length + ' registros'), data);
        if (error) { fire('Error: ' + error.message); return; }
        // Ordenar localmente: primero los del sistema, luego por mes/dia
        const sorted = (data || []).sort((a, b) => {
          if (a.system && !b.system) return -1;
          if (!a.system && b.system) return 1;
          if (a.month !== b.month) return a.month - b.month;
          return a.day - b.day;
        });
        setFestList(sorted);
      });
  }, [sub]);

  // Estados Rifa
  const [raffleList, setRaffleList]   = useState([]);
  const [loadingRaf, setLoadingRaf]   = useState(false);
  const [showRafForm, setShowRafForm] = useState(false);
  const [editRaf, setEditRaf]         = useState(null);
  const [rafForm, setRafForm]         = useState({ month: '', year: new Date().getFullYear(), prize_name: '', prize_icon: '🎁', prize_value: '' });
  const [savingRaf, setSavingRaf]     = useState(false);

  // Cargar rifas al abrir esa pestana
  useEffect(() => {
    if (sub !== 'rifa' || !sb || !sbConnected || raffleList.length > 0) return;
    setLoadingRaf(true);
    sb.from('raffle_calendar').select('*').order('year').order('month')
      .then(({ data }) => { setLoadingRaf(false); if (data) setRaffleList(data); });
  }, [sub, sbConnected]);

  const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  const filtered = (rewards || []).filter(r => filterCat === 'todos' || (r.category || r.cat) === filterCat);

  const openNew = () => { setEditR(null); setForm({ ...EMPTY }); setShowForm(true); };
  const openEdit = (r) => {
    setEditR(r);
    setForm({ name: r.name || '', pts: String(r.points_cost || r.pts || ''), icon: r.icon || '🎁', cat: r.category || r.cat || 'merch', tier: r.tier_exclusive || r.tier || r.tier || 'todos', active: r.active !== false, description: r.description || '' });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.pts) { fire('Nombre y puntos son obligatorios'); return; }
    const data = { name: form.name.trim(), points_cost: parseInt(form.pts), icon: form.icon, category: form.cat, tier_exclusive: form.tier !== 'todos' ? form.tier : null, active: form.active, description: form.description || null };

    // EDITAR: auditar via ReasonModal (el UPDATE real ocurre en confirmAction).
    if (editR) {
      if (!loggedAdmin?.id) { fire('Error: sesion admin no disponible. Cerra sesion y volve a ingresar.'); return; }
      setPendingAction({
        type: 'edit_reward',
        entityId: editR.id,
        payload: { updates: data },
        actionLabel: 'Editar premio: ' + data.name,
        oldSnapshot: {
          name: editR.name,
          points_cost: editR.points_cost ?? editR.pts,
          icon: editR.icon,
          category: editR.category ?? editR.cat,
          tier_exclusive: editR.tier_exclusive ?? editR.tier ?? null,
          active: editR.active,
          description: editR.description ?? null,
        },
      });
      setShowForm(false);
      setShowReasonModal(true);
      return;
    }

    // CREAR: directo al insert, sin auditoria.
    setSaving(true);
    if (sb && sbConnected) {
      const { data: nd, error } = await sb.from('rewards').insert(data).select().single();
      if (error) { fire('Error: ' + error.message); setSaving(false); return; }
      setRewards(p => [...p, { ...data, id: nd.id, pts: data.points_cost, cat: data.category, tier: data.tier_exclusive }]);
      fire('Premio creado');
    }
    setSaving(false); setShowForm(false); setEditR(null);
  };

  // F0.3.6: toggle ahora es accion auditada. Encola y abre ReasonModal.
  const toggle = (r) => {
    if (!loggedAdmin?.id) { fire('Error: sesion admin no disponible. Cerra sesion y volve a ingresar.'); return; }
    const isActive = r.active !== false;   // misma semantica que el render (active null/undefined = activo)
    const newActive = !isActive;
    setPendingAction({
      type: 'toggle_reward_active',
      entityId: r.id,
      payload: { newActive },
      actionLabel: (isActive ? 'Desactivar premio: ' : 'Activar premio: ') + r.name,
      oldSnapshot: { active: isActive },
    });
    setShowReasonModal(true);
  };

  // F0.3.6: eliminar ahora pasa por ReasonModal (sin modal de confirmacion intermedio).
  const del = (r) => {
    if (!loggedAdmin?.id) { fire('Error: sesion admin no disponible. Cerra sesion y volve a ingresar.'); return; }
    setPendingAction({
      type: 'delete_reward',
      entityId: r.id,
      payload: { entity: r },
      actionLabel: 'Eliminar premio: ' + r.name,
      oldSnapshot: r,
    });
    setShowReasonModal(true);
  };

  // Los festivos con system=true no se pueden eliminar

  const openNewFest = () => {
    setEditFest(null);
    setFestForm({ label: '', month: '', day: '', points: '70', type: 'custom', active: true });
    setShowFestForm(true);
  };
  const openEditFest = (f) => {
    setEditFest(f);
    setFestForm({ name: f.name || '', month: String(f.month || ''), day: String(f.day || ''), points: String(f.points || '70'), icon: f.icon || 'F', active: f.active !== false });
    setShowFestForm(true);
  };

  const saveFest = async () => {
    if (!festForm.name.trim() || !festForm.month) { fire('Nombre y mes son obligatorios'); return; }
    const data = {
      name: festForm.name.trim(),
      month: parseInt(festForm.month),
      day: festForm.day ? parseInt(festForm.day) : 0,
      points: parseInt(festForm.points) || 70,
      icon: festForm.icon || 'F',
      active: festForm.active,
    };

    // EDITAR: auditar via ReasonModal.
    if (editFest) {
      if (!loggedAdmin?.id) { fire('Error: sesion admin no disponible. Cerra sesion y volve a ingresar.'); return; }
      setPendingAction({
        type: 'edit_special_day',
        entityId: editFest.id,
        payload: { updates: data },
        actionLabel: 'Editar festivo: ' + data.name,
        oldSnapshot: {
          name: editFest.name,
          month: editFest.month,
          day: editFest.day,
          points: editFest.points,
          icon: editFest.icon,
          active: editFest.active,
        },
      });
      setShowFestForm(false);
      setShowReasonModal(true);
      return;
    }

    // CREAR: directo.
    setSavingFest(true);
    if (sb && sbConnected) {
      const { data: nd, error } = await sb.from('special_days').insert(data).select().single();
      if (error) { fire('Error: ' + error.message); setSavingFest(false); return; }
      setFestList(p => [...p, { ...data, id: nd.id }].sort((a,b) => a.month !== b.month ? a.month-b.month : a.day-b.day));
      fire('Festivo creado');
    }
    setSavingFest(false); setShowFestForm(false); setEditFest(null);
  };

  // F0.3.6: eliminar festivo pasa por ReasonModal.
  const delFest = (f) => {
    if (!loggedAdmin?.id) { fire('Error: sesion admin no disponible. Cerra sesion y volve a ingresar.'); return; }
    setPendingAction({
      type: 'delete_special_day',
      entityId: f.id,
      payload: { entity: f },
      actionLabel: 'Eliminar festivo: ' + f.name,
      oldSnapshot: f,
    });
    setShowReasonModal(true);
  };

  const openNewRaf = () => { setEditRaf(null); setRafForm({ month: '', year: new Date().getFullYear(), prize_name: '', prize_icon: '🎁', prize_value: '' }); setShowRafForm(true); };
  const openEditRaf = (r) => { setEditRaf(r); setRafForm({ month: r.month, year: r.year, prize_name: r.prize_name, prize_icon: r.prize_icon || '🎁', prize_value: String(r.prize_value) }); setShowRafForm(true); };

  const saveRaf = async () => {
    if (!rafForm.month || !rafForm.prize_name || !rafForm.prize_value) { fire('Mes, premio y valor son obligatorios'); return; }
    const data = { month: parseInt(rafForm.month), year: parseInt(rafForm.year), prize_name: rafForm.prize_name.trim(), prize_icon: rafForm.prize_icon, prize_value: parseFloat(rafForm.prize_value) };

    // EDITAR: auditar via ReasonModal.
    if (editRaf) {
      if (!loggedAdmin?.id) { fire('Error: sesion admin no disponible. Cerra sesion y volve a ingresar.'); return; }
      setPendingAction({
        type: 'edit_raffle',
        entityId: editRaf.id,
        payload: { updates: data },
        actionLabel: 'Editar rifa: ' + data.prize_name,
        oldSnapshot: {
          month: editRaf.month,
          year: editRaf.year,
          prize_name: editRaf.prize_name,
          prize_icon: editRaf.prize_icon,
          prize_value: editRaf.prize_value,
        },
      });
      setShowRafForm(false);
      setShowReasonModal(true);
      return;
    }

    // CREAR: directo.
    setSavingRaf(true);
    if (sb && sbConnected) {
      const { data: nd, error } = await sb.from('raffle_calendar').insert(data).select().single();
      if (error) { fire('Error: ' + error.message); setSavingRaf(false); return; }
      setRaffleList(p => [...p, { ...data, id: nd.id }].sort((a,b) => a.year !== b.year ? a.year-b.year : a.month-b.month));
      fire('Rifa creada');
    }
    setSavingRaf(false); setShowRafForm(false); setEditRaf(null);
  };

  // F0.3.6: eliminar rifa pasa por ReasonModal.
  const delRaf = (r) => {
    if (!loggedAdmin?.id) { fire('Error: sesion admin no disponible. Cerra sesion y volve a ingresar.'); return; }
    setPendingAction({
      type: 'delete_raffle_entry',
      entityId: r.id,
      payload: { entity: r },
      actionLabel: 'Eliminar rifa: ' + (r.prize_name || ''),
      oldSnapshot: r,
    });
    setShowReasonModal(true);
  };

  // F0.3.6: ejecutor unificado de acciones sensibles (edit/delete/toggle de las
  // 3 entidades). Patron client-first: muta primero, audita despues; si el log
  // falla NO se revierte (warning + console.error). Espeja OpManagement F0.3.5.4.
  const confirmAction = async (reason) => {
    if (!loggedAdmin?.id) {
      setShowReasonModal(false);
      fire('Error: sesion admin no disponible. Cerra sesion y volve a ingresar.');
      return;
    }
    if (!pendingAction) { setShowReasonModal(false); return; }

    const audit = {
      adminId: loggedAdmin.id,
      adminName: loggedAdmin.name,
      adminEmail: loggedAdmin.email,
      reasonText: reason,
    };
    const eid = pendingAction.entityId;
    setSaving(true);
    try {
      switch (pendingAction.type) {
        case 'edit_reward':
        case 'edit_special_day':
        case 'edit_raffle': {
          const tableMap  = { edit_reward: 'rewards', edit_special_day: 'special_days', edit_raffle: 'raffle_calendar' };
          const actionMap = { edit_reward: 'update_reward', edit_special_day: 'update_special_day', edit_raffle: 'update_raffle' };
          const entityMap = { edit_reward: 'reward', edit_special_day: 'special_day', edit_raffle: 'raffle' };
          const updates = pendingAction.payload.updates;

          if (sb && sbConnected) {
            const { error: upErr } = await sb.from(tableMap[pendingAction.type]).update(updates).eq('id', eid);
            if (upErr) {
              setShowReasonModal(false);
              // Reabrir el modal de edicion correspondiente (form intacto).
              if (pendingAction.type === 'edit_reward') setShowForm(true);
              else if (pendingAction.type === 'edit_special_day') setShowFestForm(true);
              else setShowRafForm(true);
              fire('Error: ' + upErr.message);
              return;
            }
            const { error: logErr } = await logAdminAction({
              ...audit,
              action: actionMap[pendingAction.type],
              entityType: entityMap[pendingAction.type],
              entityId: eid,
              oldValue: pendingAction.oldSnapshot,
              newValue: updates,
            });
            if (logErr) { console.error('[AdminPremios] log ' + actionMap[pendingAction.type] + ' fallo:', logErr); fire('⚠️ Actualizado, pero la auditoria fallo'); }
          }

          if (pendingAction.type === 'edit_reward') {
            setRewards(prev => prev.map(r => r.id === eid ? { ...r, ...updates, pts: updates.points_cost, cat: updates.category, tier: updates.tier_exclusive } : r));
            setShowForm(false); setEditR(null); setForm({ ...EMPTY });
            fire('Premio actualizado');
          } else if (pendingAction.type === 'edit_special_day') {
            setFestList(prev => prev.map(x => x.id === eid ? { ...x, ...updates } : x));
            setShowFestForm(false); setEditFest(null);
            fire('Festivo actualizado');
          } else {
            setRaffleList(prev => prev.map(r => r.id === eid ? { ...r, ...updates } : r));
            setShowRafForm(false); setEditRaf(null);
            fire('Rifa actualizada');
          }
          break;
        }

        case 'delete_reward':
        case 'delete_special_day':
        case 'delete_raffle_entry': {
          const tableMap  = { delete_reward: 'rewards', delete_special_day: 'special_days', delete_raffle_entry: 'raffle_calendar' };
          const entityMap = { delete_reward: 'reward', delete_special_day: 'special_day', delete_raffle_entry: 'raffle' };

          if (sb && sbConnected) {
            const { error: delErr } = await sb.from(tableMap[pendingAction.type]).delete().eq('id', eid);
            if (delErr) { setShowReasonModal(false); fire('Error: ' + delErr.message); return; }
            const { error: logErr } = await logAdminAction({
              ...audit,
              action: pendingAction.type,
              entityType: entityMap[pendingAction.type],
              entityId: eid,
              oldValue: pendingAction.oldSnapshot,
              newValue: null,
            });
            if (logErr) { console.error('[AdminPremios] log ' + pendingAction.type + ' fallo:', logErr); fire('⚠️ Eliminado, pero la auditoria fallo'); }
          }

          if (pendingAction.type === 'delete_reward') { setRewards(prev => prev.filter(r => r.id !== eid)); fire('Premio eliminado'); }
          else if (pendingAction.type === 'delete_special_day') { setFestList(prev => prev.filter(x => x.id !== eid)); fire('Festivo eliminado'); }
          else { setRaffleList(prev => prev.filter(x => x.id !== eid)); fire('Rifa eliminada'); }
          break;
        }

        case 'toggle_reward_active': {
          if (sb && sbConnected) {
            const { error: upErr } = await sb.from('rewards').update({ active: pendingAction.payload.newActive }).eq('id', eid);
            if (upErr) { setShowReasonModal(false); fire('Error: ' + upErr.message); return; }
            const { error: logErr } = await logAdminAction({
              ...audit,
              action: 'toggle_reward_active',
              entityType: 'reward',
              entityId: eid,
              oldValue: pendingAction.oldSnapshot,
              newValue: { active: pendingAction.payload.newActive },
            });
            if (logErr) { console.error('[AdminPremios] log toggle_reward_active fallo:', logErr); fire('⚠️ Toggle aplicado, pero la auditoria fallo'); }
          }
          setRewards(prev => prev.map(r => r.id === eid ? { ...r, active: pendingAction.payload.newActive } : r));
          fire(pendingAction.payload.newActive ? 'Premio activado' : 'Premio desactivado');
          break;
        }

        default:
          break;
      }
    } finally {
      setSaving(false);
      setPendingAction(null);
      setShowReasonModal(false);
    }
  };

  const sLbl = { display: 'block', fontSize: 11, fontWeight: 700, color: '#757575', marginBottom: 4, textTransform: 'uppercase', letterSpacing: .8 };

  return (
    <div style={{ paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${AT.border}`, background: '#252525', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setScr('dash')} style={{ background: 'none', border: 'none', color: '#9E9E9E', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600 }}><Back /> Inicio</button>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Premios</div>
        <div style={{ width: 60 }} />
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 20px' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setSub(t.id)} style={{ flex: 1, padding: '10px 6px', borderRadius: 12, background: sub === t.id ? '#FBBC04' : AT.card, color: sub === t.id ? '#0D0D0D' : AT.sub, border: sub === t.id ? 'none' : `1px solid ${AT.border}`, fontFamily: "'DM Sans'", fontWeight: 800, fontSize: 11, cursor: 'pointer' }}>{t.label}</button>
        ))}
      </div>

      {/* CANJEAR */}
      {sub === 'canjear' && (
        <div>
          <div style={{ padding: '0 20px 12px' }}>
            <button onClick={openNew} style={{ ...btnYellow, borderRadius: 14, fontSize: 14 }}><Plus /> Nuevo Premio</button>
          </div>

          {/* Filtro categorias */}
          <div style={{ display: 'flex', gap: 6, padding: '0 20px', overflowX: 'auto', marginBottom: 12 }}>
            {['todos', ...CATS].map(c => (
              <button key={c} onClick={() => setFilterCat(c)} style={{ padding: '6px 12px', borderRadius: 20, border: 'none', background: filterCat === c ? '#FBBC04' : 'rgba(255,255,255,.07)', color: filterCat === c ? '#0D0D0D' : '#9E9E9E', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans'", whiteSpace: 'nowrap', flexShrink: 0 }}>
                {c === 'todos' ? 'Todos' : (CAT_LABELS[c] || c)}
              </button>
            ))}
          </div>

          <div style={{ padding: '0 20px 8px', fontSize: 12, color: '#777' }}>
            {filtered.length} premios — {filtered.filter(r => r.active !== false).length} activos
          </div>

          {filtered.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#555', fontSize: 13 }}>Sin premios</div>}

          {filtered.map(r => {
            const cs = CAT_COLORS[r.category || r.cat] || { bg: '#F5F5F5', c: '#616161' };
            const isActive = r.active !== false;
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: `1px solid ${AT.border}`, opacity: isActive ? 1 : .5 }}>
                <div style={{ fontSize: 28, flexShrink: 0 }}>{r.icon || '🎁'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: isActive ? '#E0E0E0' : '#777', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.name}
                    {!isActive && <span style={{ fontSize: 10, color: '#EF5350', marginLeft: 6, fontWeight: 700 }}>INACTIVO</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, background: cs.bg, color: cs.c, padding: '2px 7px', borderRadius: 8, fontWeight: 700 }}>{CAT_LABELS[r.category || r.cat] || r.category || r.cat}</span>
                    {r.tier_exclusive || r.tier && <span style={{ fontSize: 10, background: 'rgba(251,188,4,.15)', color: '#FBBC04', padding: '2px 7px', borderRadius: 8, fontWeight: 700 }}>{r.tier_exclusive || r.tier}</span>}
                    <span style={{ ...sMono, fontSize: 11, color: '#FBBC04', fontWeight: 800 }}>{r.points_cost || r.pts || '-'} pts</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                  <button onClick={() => openEdit(r)} style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${AT.border}`, background: AT.card, color: '#64B5F6', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans'" }}>Editar</button>
                  <button onClick={() => toggle(r)} style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${AT.border}`, background: AT.card, color: isActive ? '#FF8F00' : '#2E7D32', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans'" }}>{isActive ? 'Desact.' : 'Activar'}</button>
                  <button onClick={() => del(r)} style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${AT.border}`, background: AT.card, color: '#EF5350', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans'" }}>Borrar</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RIFA */}
      {sub === 'rifa' && (
        <div>
          <div style={{ padding: '0 20px 12px' }}>
            <button onClick={openNewRaf} style={{ ...btnYellow, borderRadius: 14, fontSize: 14 }}><Plus /> Nueva Rifa</button>
          </div>

          {loadingRaf && <div style={{ textAlign: 'center', padding: 32, color: '#777' }}>Cargando...</div>}

          {!loadingRaf && raffleList.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#555', fontSize: 13 }}>Sin rifas configuradas</div>
          )}

          {!loadingRaf && raffleList.map(r => {
            const hasWinner = !!r.winner_id;
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: `1px solid ${AT.border}` }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: hasWinner ? 'rgba(46,125,50,.2)' : 'rgba(251,188,4,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18 }}>{r.prize_icon || '🎁'}</div>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#E0E0E0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {MONTHS[(r.month || 1) - 1]} {r.year}
                  </div>
                  <div style={{ fontSize: 12, color: '#9E9E9E', marginTop: 2 }}>{r.prize_name}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 3, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#FBBC04' }}>Q{r.prize_value}</span>
                    {hasWinner && <span style={{ fontSize: 10, background: 'rgba(46,125,50,.3)', color: '#69F0AE', padding: '2px 7px', borderRadius: 8, fontWeight: 700 }}>Sorteada</span>}
                    {!hasWinner && <span style={{ fontSize: 10, background: 'rgba(251,188,4,.15)', color: '#FBBC04', padding: '2px 7px', borderRadius: 8, fontWeight: 700 }}>Pendiente</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                  <button onClick={() => openEditRaf(r)} style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${AT.border}`, background: AT.card, color: '#64B5F6', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans'" }}>Editar</button>
                  <button onClick={() => delRaf(r)} style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${AT.border}`, background: AT.card, color: '#EF5350', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans'" }}>Borrar</button>
                </div>
              </div>
            );
          })}

          {/* MODAL FORM RIFA */}
          {showRafForm && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => !savingRaf && setShowRafForm(false)}>
              <div onClick={e => e.stopPropagation()} style={{ background: '#1E1E1E', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', padding: '20px 20px 40px' }}>
                <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,.2)', borderRadius: 4, margin: '0 auto 20px' }} />
                <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 18 }}>{editRaf ? 'Editar Rifa' : 'Nueva Rifa'}</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <div>
                    <label style={sLbl}>Mes *</label>
                    <select value={rafForm.month} onChange={e => setRafForm(p => ({ ...p, month: e.target.value }))} style={{ ...inputStyle, background: '#2A2A2A', color: '#fff', border: '1px solid #3A3A3A', appearance: 'none' }}>
                      <option value="">Seleccionar</option>
                      {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={sLbl}>Ano *</label>
                    <input value={rafForm.year} onChange={e => setRafForm(p => ({ ...p, year: e.target.value.replace(/[^0-9]/g,'') }))} placeholder="2026" inputMode="numeric" maxLength={4} style={{ ...inputStyle, background: '#2A2A2A', color: '#fff', border: '1px solid #3A3A3A' }} />
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={sLbl}>Premio *</label>
                  <input value={rafForm.prize_name} onChange={e => setRafForm(p => ({ ...p, prize_name: e.target.value }))} placeholder="Ej: iPhone 17 Pro" style={{ ...inputStyle, background: '#2A2A2A', color: '#fff', border: '1px solid #3A3A3A' }} />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={sLbl}>Valor estimado (Q) *</label>
                  <input value={rafForm.prize_value} onChange={e => setRafForm(p => ({ ...p, prize_value: e.target.value.replace(/[^0-9.]/g,'') }))} placeholder="Ej: 15000" inputMode="decimal" style={{ ...inputStyle, background: '#2A2A2A', color: '#fff', border: '1px solid #3A3A3A' }} />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={sLbl}>Icono</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {ICONS.map(ico => (
                      <button key={ico} onClick={() => setRafForm(p => ({ ...p, prize_icon: ico }))} style={{ fontSize: 22, padding: '6px 8px', borderRadius: 10, border: rafForm.prize_icon === ico ? '2px solid #FBBC04' : '2px solid transparent', background: rafForm.prize_icon === ico ? 'rgba(251,188,4,.15)' : 'rgba(255,255,255,.05)', cursor: 'pointer' }}>{ico}</button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowRafForm(false)} disabled={savingRaf} style={{ ...btnDark, flex: 1 }}>Cancelar</button>
                  <button onClick={saveRaf} disabled={savingRaf} style={{ ...btnYellow, flex: 2, opacity: savingRaf ? .7 : 1 }}>
                    {savingRaf ? 'Guardando...' : editRaf ? 'Guardar cambios' : 'Crear rifa'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* FESTIVOS */}
      {sub === 'festivos' && (
        <div>
          <div style={{ padding: '0 20px 12px' }}>
            <button onClick={openNewFest} style={{ ...btnYellow, borderRadius: 14, fontSize: 14 }}><Plus /> Nuevo Festivo</button>
          </div>

          {loadingFest && <div style={{ textAlign: 'center', padding: 32, color: '#777' }}>Cargando...</div>}

          {!loadingFest && festList.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#555', fontSize: 13 }}>Sin dias festivos configurados</div>
          )}

          {!loadingFest && festList.map(f => {
            const isBirthday = f.month === 0;
            const isFixed    = f.system === true;
            const isActive   = f.active !== false;
            const monthStr   = isBirthday ? null : (MONTHS[(f.month || 1) - 1] + (f.day > 0 ? ' ' + f.day : ''));
            return (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: `1px solid ${AT.border}`, opacity: isActive ? 1 : .5 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: isBirthday ? 'rgba(123,31,162,.15)' : 'rgba(251,188,4,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22 }}>
                  {f.icon || (isBirthday ? 'B' : 'F')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: isActive ? '#E0E0E0' : '#777', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.name}
                    {!isActive && <span style={{ fontSize: 10, color: '#EF5350', marginLeft: 6, fontWeight: 700 }}>INACTIVO</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                    {isBirthday ? (
                      <span style={{ fontSize: 10, background: 'rgba(123,31,162,.2)', color: '#CE93D8', padding: '2px 8px', borderRadius: 8, fontWeight: 700 }}>
                        Fecha de nacimiento de cada miembro
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: '#9E9E9E' }}>{monthStr}</span>
                    )}
                    {isFixed && !isBirthday && <span style={{ fontSize: 10, background: 'rgba(255,143,0,.15)', color: '#FF8F00', padding: '2px 7px', borderRadius: 8, fontWeight: 700 }}>Sistema</span>}
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#FBBC04' }}>{f.points} pts</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                  <button onClick={() => openEditFest(f)} style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${AT.border}`, background: AT.card, color: '#64B5F6', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans'" }}>Editar</button>
                  {!isFixed && <button onClick={() => delFest(f)} style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${AT.border}`, background: AT.card, color: '#EF5350', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans'" }}>Borrar</button>}
                </div>
              </div>
            );
          })}

          {/* MODAL FORM FESTIVO */}
          {showFestForm && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => !savingFest && setShowFestForm(false)}>
              <div onClick={e => e.stopPropagation()} style={{ background: '#1E1E1E', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', padding: '20px 20px 40px' }}>
                <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,.2)', borderRadius: 4, margin: '0 auto 20px' }} />
                <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 18 }}>{editFest ? 'Editar Festivo' : 'Nuevo Festivo'}</div>

                <div style={{ marginBottom: 14 }}>
                  <label style={sLbl}>Nombre del dia festivo *</label>
                  <input value={festForm.name} onChange={e => setFestForm(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Día del Trabajador" style={{ ...inputStyle, background: '#2A2A2A', color: '#fff', border: '1px solid #3A3A3A' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <div>
                    <label style={sLbl}>Mes *</label>
                    <select value={festForm.month} onChange={e => setFestForm(p => ({ ...p, month: e.target.value }))} style={{ ...inputStyle, background: '#2A2A2A', color: '#fff', border: '1px solid #3A3A3A', appearance: 'none' }}>
                      <option value="">Seleccionar</option>
                      {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={sLbl}>Dia (0 = cumpleanos)</label>
                    <input value={festForm.day} onChange={e => setFestForm(p => ({ ...p, day: e.target.value.replace(/[^0-9]/g,'') }))} placeholder="Ej: 15" inputMode="numeric" maxLength={2} style={{ ...inputStyle, background: '#2A2A2A', color: '#fff', border: '1px solid #3A3A3A' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <div>
                    <label style={sLbl}>Puntos bonus</label>
                    <input value={festForm.points} onChange={e => setFestForm(p => ({ ...p, points: e.target.value.replace(/[^0-9]/g,'') }))} placeholder="70" inputMode="numeric" style={{ ...inputStyle, background: '#2A2A2A', color: '#fff', border: '1px solid #3A3A3A' }} />
                  </div>
                  <div>
                    <label style={sLbl}>Icono (emoji)</label>
                    <input value={festForm.icon} onChange={e => setFestForm(p => ({ ...p, icon: e.target.value }))} placeholder="Emoji" style={{ ...inputStyle, background: '#2A2A2A', color: '#fff', border: '1px solid #3A3A3A', fontSize: 20, textAlign: 'center' }} />
                  </div>
                </div>

                <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,.05)', borderRadius: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#E0E0E0' }}>Dia activo</span>
                  <button onClick={() => setFestForm(p => ({ ...p, active: !p.active }))} style={{ padding: '6px 16px', borderRadius: 10, border: 'none', background: festForm.active ? '#2E7D32' : '#616161', color: '#fff', fontFamily: "'DM Sans'", fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                    {festForm.active ? 'Activo' : 'Inactivo'}
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowFestForm(false)} disabled={savingFest} style={{ ...btnDark, flex: 1 }}>Cancelar</button>
                  <button onClick={saveFest} disabled={savingFest} style={{ ...btnYellow, flex: 2, opacity: savingFest ? .7 : 1 }}>
                    {savingFest ? 'Guardando...' : editFest ? 'Guardar cambios' : 'Crear festivo'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* MODAL FORM */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => !saving && setShowForm(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1E1E1E', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', padding: '20px 20px 40px' }}>
            <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,.2)', borderRadius: 4, margin: '0 auto 20px' }} />
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 18 }}>{editR ? 'Editar Premio' : 'Nuevo Premio'}</div>

            <div style={{ marginBottom: 14 }}>
              <label style={sLbl}>Nombre *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Lavado de auto" style={{ ...inputStyle, background: '#2A2A2A', color: '#fff', border: '1px solid #3A3A3A' }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={sLbl}>Puntos *</label>
              <input value={form.pts} onChange={e => setForm(p => ({ ...p, pts: e.target.value.replace(/[^0-9]/g, '') }))} placeholder="Ej: 150" inputMode="numeric" style={{ ...inputStyle, background: '#2A2A2A', color: '#fff', border: '1px solid #3A3A3A' }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={sLbl}>Descripcion</label>
              <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Breve descripcion" style={{ ...inputStyle, background: '#2A2A2A', color: '#fff', border: '1px solid #3A3A3A' }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={sLbl}>Icono</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {ICONS.map(ico => (
                  <button key={ico} onClick={() => setForm(p => ({ ...p, icon: ico }))} style={{ fontSize: 22, padding: '6px 8px', borderRadius: 10, border: form.icon === ico ? '2px solid #FBBC04' : '2px solid transparent', background: form.icon === ico ? 'rgba(251,188,4,.15)' : 'rgba(255,255,255,.05)', cursor: 'pointer' }}>{ico}</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={sLbl}>Categoria</label>
                <select value={form.cat} onChange={e => setForm(p => ({ ...p, cat: e.target.value }))} style={{ ...inputStyle, background: '#2A2A2A', color: '#fff', border: '1px solid #3A3A3A', appearance: 'none' }}>
                  {CATS.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
                </select>
              </div>
              <div>
                <label style={sLbl}>Nivel exclusivo</label>
                <select value={form.tier} onChange={e => setForm(p => ({ ...p, tier: e.target.value }))} style={{ ...inputStyle, background: '#2A2A2A', color: '#fff', border: '1px solid #3A3A3A', appearance: 'none' }}>
                  {TIERS.map(t => <option key={t} value={t}>{t === 'todos' ? 'Todos' : t}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,.05)', borderRadius: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#E0E0E0' }}>Premio activo</span>
              <button onClick={() => setForm(p => ({ ...p, active: !p.active }))} style={{ padding: '6px 16px', borderRadius: 10, border: 'none', background: form.active ? '#2E7D32' : '#616161', color: '#fff', fontFamily: "'DM Sans'", fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                {form.active ? 'Activo' : 'Inactivo'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowForm(false)} disabled={saving} style={{ ...btnDark, flex: 1 }}>Cancelar</button>
              <button onClick={save} disabled={saving} style={{ ...btnYellow, flex: 2, opacity: saving ? .7 : 1 }}>
                {saving ? 'Guardando...' : editR ? 'Guardar cambios' : 'Crear premio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* F0.3.6: ReasonModal unificado para edit/delete/toggle de las 3 entidades */}
      <ReasonModal
        open={showReasonModal}
        onClose={() => { if (!saving) { setShowReasonModal(false); setPendingAction(null); } }}
        onConfirm={confirmAction}
        actionLabel={pendingAction?.actionLabel || 'Confirmar accion'}
        loading={saving}
      />
    </div>
  );
}
