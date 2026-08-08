// src/views/admin/AdminPremios.jsx
// FESTIVOS — Admin v2 (8-ago-2026, FORMATO GENERAL): esta vista quedó
// SOLO para días festivos (pedido del dueño) — los premios canjeables
// se gestionan en Catálogo de Canjes (AdminCatalog) y las rifas en la
// vista Rifa. Sin emojis en la UI (iconos SVG: Cake cumpleaños /
// StarLine festivo); el campo "ícono" del festivo sigue siendo dato
// del CLIENTE (emoji del saludo del home) y se edita como texto.
// F2.1: los puntos los define el NIVEL (tiers.evtPts) — no se editan
// por día. CRUD auditado (SEC.C.4 admin_write_catalog + ReasonModal).
// FIX de fondo: openNewFest seteaba campos inexistentes (label/type)
// y dejaba message undefined — guardar un festivo nuevo sin tocar la
// frase reventaba en message.trim().
import { useState, useEffect } from 'react';
import { sb } from '../../lib/supabaseClient';
import { adminTheme as AT, btnYellow, inputStyleDark } from '../../constants/styles';
import { Plus, Cake, StarLine } from '../../components/ui/Icons';
import LogoSpinner from '../../components/ui/LogoSpinner';
import ReasonModal from '../../components/ui/ReasonModal';
import { adminWriteCatalog } from '../../services/secureReads';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const EMPTY_FEST = { name: '', month: '', day: '', icon: 'F', active: true, message: '' };

export default function AdminPremios(ctx) {
  const { fire, sbConnected, loggedAdmin, cfg } = ctx;

  const adminAudit = (reasonText = null) => ({
    adminId: loggedAdmin?.id, adminName: loggedAdmin?.name,
    adminEmail: loggedAdmin?.email, reasonText,
  });

  const [festList, setFestList]     = useState(null); // null = cargando
  const [showForm, setShowForm]     = useState(false);
  const [editFest, setEditFest]     = useState(null);
  const [form, setForm]             = useState(EMPTY_FEST);
  const [saving, setSaving]         = useState(false);
  const [showReason, setShowReason] = useState(false);
  const [pending, setPending]       = useState(null);

  useEffect(() => {
    if (!sb || !sbConnected) { setFestList([]); return; }
    sb.from('special_days').select('id, name, month, day, points, icon, active, system, message').order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) { fire('Error: ' + error.message); setFestList([]); return; }
        // Primero los del sistema, luego por mes/día
        setFestList((data || []).sort((a, b) => {
          if (a.system && !b.system) return -1;
          if (!a.system && b.system) return 1;
          if (a.month !== b.month) return a.month - b.month;
          return a.day - b.day;
        }));
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sbConnected]);

  const openNew = () => { setEditFest(null); setForm({ ...EMPTY_FEST }); setShowForm(true); };
  const openEdit = (f) => {
    setEditFest(f);
    setForm({ name: f.name || '', month: String(f.month ?? ''), day: String(f.day ?? ''), icon: f.icon || 'F', active: f.active !== false, message: f.message || '' });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.month) { fire('Nombre y mes son obligatorios'); return; }
    const messageTrimmed = (form.message || '').trim();
    if (!messageTrimmed) { fire('Frase motivacional es obligatoria'); return; }
    if (messageTrimmed.length > 300) { fire('Frase motivacional excede 300 caracteres'); return; }
    const data = {
      name: form.name.trim(),
      month: parseInt(form.month),
      day: form.day ? parseInt(form.day) : 0,
      // F2.1: fallback de BD — el motor otorga por nivel (tiers.evtPts)
      points: cfg?.tiers?.oro?.evtPts ?? 25,
      icon: form.icon || 'F',
      active: form.active,
      message: messageTrimmed,
    };

    if (editFest) {
      if (!loggedAdmin?.id) { fire('Error: sesion admin no disponible. Cerra sesion y volve a ingresar.'); return; }
      setPending({ type: 'edit', entityId: editFest.id, data, label: 'Editar festivo: ' + data.name });
      setShowForm(false);
      setShowReason(true);
      return;
    }

    setSaving(true);
    if (sb && sbConnected) {
      const res = await adminWriteCatalog('special_day', 'create', { data, audit: adminAudit() });
      if (res.error) { fire('Error: ' + res.error); setSaving(false); return; }
      setFestList(p => [...(p || []), { ...data, id: res.id }].sort((a, b) => a.month !== b.month ? a.month - b.month : a.day - b.day));
      fire('Festivo creado');
    }
    setSaving(false); setShowForm(false); setEditFest(null);
  };

  // Los festivos con system=true no se pueden eliminar
  const del = (f) => {
    if (!loggedAdmin?.id) { fire('Error: sesion admin no disponible. Cerra sesion y volve a ingresar.'); return; }
    setPending({ type: 'delete', entityId: f.id, data: null, label: 'Eliminar festivo: ' + f.name });
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
          ? await adminWriteCatalog('special_day', 'update', { id: eid, data: pending.data, audit })
          : {};
        if (res.error) { setShowReason(false); setShowForm(true); fire('Error: ' + res.error); return; }
        setFestList(prev => prev.map(x => x.id === eid ? { ...x, ...pending.data } : x));
        setEditFest(null);
        fire('Festivo actualizado');
      } else {
        const res = sb && sbConnected
          ? await adminWriteCatalog('special_day', 'delete', { id: eid, audit })
          : {};
        if (res.error) { setShowReason(false); fire('Error: ' + res.error); return; }
        setFestList(prev => prev.filter(x => x.id !== eid));
        fire('Festivo eliminado');
      }
      setShowReason(false);
      setPending(null);
    } finally {
      setSaving(false);
    }
  };

  // ── estilos (FORMATO GENERAL Admin v2) ──
  const lbl = { display: 'block', fontSize: 11, fontWeight: 800, color: '#9E9E9E', marginBottom: 5, textTransform: 'uppercase', letterSpacing: .8 };
  const miniBtn = (color) => ({
    padding: '5px 10px', borderRadius: 8, border: `1px solid ${AT.border}`,
    background: 'transparent', color, fontSize: 11, fontWeight: 700,
    cursor: 'pointer', fontFamily: "'DM Sans'", flexShrink: 0,
  });
  const evtPts = `${cfg?.tiers?.oro?.evtPts ?? 25} / ${cfg?.tiers?.platino?.evtPts ?? 35} / ${cfg?.tiers?.black?.evtPts ?? 50}`;

  return (
    <div style={{ padding: '22px 22px 60px' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 21, fontWeight: 800, color: '#fff' }}>Festivos</div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#9E9E9E', marginTop: 2 }}>
            Días especiales que regalan puntos por nivel ({evtPts} pts ORO / PLATINO / BLACK)
          </div>
        </div>
        <button onClick={openNew}
          style={{ ...btnYellow, display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 12, fontSize: 13, padding: '11px 18px' }}>
          <span style={{ display: 'flex', transform: 'scale(.8)' }}><Plus /></span> Nuevo festivo
        </button>
      </div>

      {festList === null && <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><LogoSpinner size={34} dark /></div>}

      {festList !== null && festList.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#777', fontSize: 13, fontWeight: 700 }}>Sin días festivos configurados</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 10 }}>
        {(festList || []).map(f => {
          const isBirthday = f.month === 0;
          const isFixed    = f.system === true;
          const isActive   = f.active !== false;
          const monthStr   = isBirthday ? null : (MONTHS[(f.month || 1) - 1] + (f.day > 0 ? ' ' + f.day : ' (todo el mes)'));
          return (
            <div key={f.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: AT.card, border: `1px solid ${AT.border}`,
              borderRadius: 16, padding: '12px 14px', opacity: isActive ? 1 : .55,
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: isBirthday ? 'rgba(123,31,162,.15)' : 'rgba(251,188,4,.12)', color: isBirthday ? '#CE93D8' : '#FBBC04', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {isBirthday ? <Cake /> : <StarLine />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: isActive ? '#E0E0E0' : '#777', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.name}
                  {!isActive && <span style={{ fontSize: 9, color: '#EF5350', marginLeft: 6, fontWeight: 800, letterSpacing: .5 }}>INACTIVO</span>}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                  {isBirthday ? (
                    <span style={{ fontSize: 9, background: 'rgba(123,31,162,.2)', color: '#CE93D8', padding: '2px 7px', borderRadius: 6, fontWeight: 800 }}>
                      CUMPLEAÑOS DE CADA MIEMBRO
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: '#9E9E9E', fontWeight: 700 }}>{monthStr}</span>
                  )}
                  {isFixed && !isBirthday && <span style={{ fontSize: 9, background: 'rgba(255,143,0,.15)', color: '#FF8F00', padding: '2px 7px', borderRadius: 6, fontWeight: 800 }}>SISTEMA</span>}
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: '#FBBC04' }}>{evtPts} pts</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                <button onClick={() => openEdit(f)} style={miniBtn('#64B5F6')}>Editar</button>
                {!isFixed && <button onClick={() => del(f)} style={miniBtn('#EF5350')}>Eliminar</button>}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Form (modal oscuro centrado, patrón ReasonModal) ── */}
      {showForm && (
        <div onClick={() => !saving && setShowForm(false)} style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: AT.bg, border: `1px solid ${AT.border}`,
            borderRadius: 20, padding: 24, width: '100%', maxWidth: 460,
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 16 }}>{editFest ? 'Editar festivo' : 'Nuevo festivo'}</div>

            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Nombre del día festivo *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Ej: Día del Trabajador" style={{ ...inputStyleDark, fontSize: 13, padding: '10px 12px' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={lbl}>Mes *</label>
                <select value={form.month} onChange={e => setForm(p => ({ ...p, month: e.target.value }))}
                  style={{ ...inputStyleDark, appearance: 'none', fontSize: 13, padding: '10px 12px' }}>
                  <option value="">Seleccionar</option>
                  {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Día (vacío = todo el mes)</label>
                <input value={form.day} onChange={e => setForm(p => ({ ...p, day: e.target.value.replace(/[^0-9]/g, '') }))}
                  placeholder="Ej: 15" inputMode="numeric" maxLength={2} style={{ ...inputStyleDark, fontSize: 13, padding: '10px 12px' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={lbl}>Puntos bonus</label>
                <div style={{ ...inputStyleDark, padding: '10px 12px', color: '#9E9E9E', border: `1px dashed ${AT.border}`, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                  Por nivel: {evtPts}
                </div>
              </div>
              <div>
                <label style={lbl}>Ícono del saludo</label>
                <input value={form.icon} onChange={e => setForm(p => ({ ...p, icon: e.target.value }))}
                  style={{ ...inputStyleDark, fontSize: 18, padding: '8px 12px', textAlign: 'center' }} />
              </div>
            </div>
            <div style={{ fontSize: 10.5, color: '#777', marginTop: -6, marginBottom: 12, lineHeight: 1.5 }}>
              Los puntos por nivel se editan en Configuración → Puntos por Nivel. El ícono solo aparece en el saludo del cliente.
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Frase motivacional *</label>
              <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                placeholder="Ej: ¡Gracias por ser parte del Club!" maxLength={300} rows={3}
                style={{ ...inputStyleDark, fontSize: 13, padding: '10px 12px', resize: 'vertical', minHeight: 72, lineHeight: 1.5 }} />
              <div style={{ fontSize: 11, color: form.message.length > 280 ? '#FF8F00' : '#777', textAlign: 'right', marginTop: 4 }}>
                {form.message.length}/300
              </div>
            </div>

            <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,.05)', borderRadius: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#E0E0E0' }}>Día activo</span>
              <button onClick={() => setForm(p => ({ ...p, active: !p.active }))} style={{
                padding: '6px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: form.active ? '#2E7D32' : '#616161', color: '#fff',
                fontFamily: "'DM Sans'", fontWeight: 800, fontSize: 12,
              }}>
                {form.active ? 'Activo' : 'Inactivo'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowForm(false)} disabled={saving} style={{
                flex: 1, padding: 13, borderRadius: 12, cursor: 'pointer',
                border: `1px solid ${AT.border}`, background: 'transparent', color: '#9E9E9E',
                fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700,
              }}>Cancelar</button>
              <button onClick={save} disabled={saving} style={{
                flex: 2, padding: 13, borderRadius: 12, cursor: 'pointer', border: 'none',
                background: '#FBBC04', color: '#0D0D0D', opacity: saving ? .7 : 1,
                fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 800,
              }}>
                {saving ? 'Guardando...' : editFest ? 'Guardar cambios' : 'Crear festivo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Motivo obligatorio para editar/eliminar (auditado) */}
      <ReasonModal
        open={showReason}
        onClose={() => {
          setShowReason(false);
          // Editar cancelado → reabrir el form con lo editado intacto
          if (pending?.type === 'edit') setShowForm(true);
          setPending(null);
        }}
        onConfirm={confirmAction}
        actionLabel={pending?.label || ''}
        loading={saving}
      />
    </div>
  );
}
