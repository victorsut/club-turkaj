// src/views/admin/AdminManagement.jsx
// ADMINISTRADORES — Admin v2 (8-ago-2026, FORMATO GENERAL): flat sin
// emojis, encabezado v2 con botón a la derecha, tarjetas en grid y
// modales OSCUROS centrados (patrón ReasonModal) con máscara de DPI.
// La LÓGICA no cambió (Objetivo #1, 29-jul): la tabla `admins` está
// CERRADA a la API abierta — todo pasa por RPCs con sesión de admin
// (bcrypt server-side + auditoría): list/create_admin,
// update_admin_password (exige la actual si es la propia),
// toggle_admin_active (nunca 0 activos ni auto-desactivarse).
import { useState, useEffect, useCallback } from 'react';
import { adminTheme as AT, btnYellow, inputStyleDark, sMono } from '../../constants/styles';
import { Plus } from '../../components/ui/Icons';
import PasswordInput from '../../components/ui/PasswordInput';
import ReasonModal from '../../components/ui/ReasonModal';
import { fetchAdmins, createAdmin, updateAdminPassword, toggleAdminActive } from '../../services/adminAuthService';
import { dpiMask } from '../../lib/inputMasks';

const EMPTY = { name: '', dpi: '', gafete: '', email: '', password: '', confirm: '' };

export default function AdminManagement(ctx) {
  const { fire, loggedAdmin } = ctx;

  const [admins, setAdmins]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);
  // Cambio de contraseña: { admin, pass, confirm, current } — `current`
  // solo se pide (y el server solo lo exige) para la cuenta propia.
  const [pwModal, setPwModal] = useState(null);
  const [showReason, setShowReason] = useState(false);
  const [pending, setPending] = useState(null); // { type, ... }

  const load = useCallback(() => {
    setLoading(true);
    fetchAdmins().then(rows => { setAdmins(rows); setLoading(false); });
  }, []);
  useEffect(load, [load]);

  const audit = (reason) => ({
    adminId: loggedAdmin?.id, adminName: loggedAdmin?.name,
    adminEmail: loggedAdmin?.email, reasonText: reason,
  });

  // ── Alta ────────────────────────────────────────────────
  const submitNew = () => {
    if (!form.name.trim() || !form.dpi.trim() || !form.gafete.trim() || !form.email.trim()) {
      fire('Completá todos los campos obligatorios', 'error'); return;
    }
    if (form.password.length < 8) { fire('La contraseña debe tener al menos 8 caracteres', 'error'); return; }
    if (form.password !== form.confirm) { fire('Las contraseñas no coinciden', 'error'); return; }
    setPending({ type: 'create' });
    setShowForm(false);
    setShowReason(true);
  };

  // ── Contraseña ──────────────────────────────────────────
  const submitPassword = () => {
    if (!pwModal) return;
    if (pwModal.pass.length < 8) { fire('La contraseña debe tener al menos 8 caracteres', 'error'); return; }
    if (pwModal.pass !== pwModal.confirm) { fire('Las contraseñas no coinciden', 'error'); return; }
    const isSelf = pwModal.admin.id === loggedAdmin?.id;
    if (isSelf && !pwModal.current) { fire('Ingresá tu contraseña actual', 'error'); return; }
    setPending({ type: 'password', admin: pwModal.admin, pass: pwModal.pass, current: pwModal.current, isSelf });
    setPwModal(null);
    setShowReason(true);
  };

  const askToggle = (a) => {
    if (a.id === loggedAdmin?.id) { fire('No podés desactivar tu propia cuenta', 'warn'); return; }
    setPending({ type: 'toggle', admin: a, newActive: !a.active });
    setShowReason(true);
  };

  // ── Ejecutor con razón (auditoría) ──────────────────────
  const confirmAction = async (reason) => {
    if (!pending) { setShowReason(false); return; }
    if (!loggedAdmin?.id) {
      setShowReason(false);
      fire('Sesión de admin no disponible. Cerrá sesión y volvé a ingresar.', 'error');
      return;
    }
    setSaving(true);
    let res;
    if (pending.type === 'create') {
      res = await createAdmin({
        name: form.name, dpi: form.dpi, gafete: form.gafete,
        email: form.email, password: form.password,
      }, audit(reason));
    } else if (pending.type === 'password') {
      res = await updateAdminPassword(pending.admin.id, pending.pass, {
        currentPassword: pending.isSelf ? pending.current : null, ...audit(reason),
      });
    } else {
      res = await toggleAdminActive(pending.admin.id, pending.newActive, audit(reason));
    }
    setSaving(false);
    setShowReason(false);
    setPending(null);

    if (res?.error) {
      fire(res.error, 'error');
      if (pending.type === 'create') setShowForm(true); // conservar lo escrito
      return;
    }
    if (pending.type === 'create') { setForm(EMPTY); fire('Administrador creado', 'success'); }
    else if (pending.type === 'password') fire('Contraseña actualizada', 'success');
    else fire(pending.newActive ? 'Administrador activado' : 'Administrador desactivado', 'success');
    load();
  };

  const actionLabel = pending?.type === 'create' ? 'crear este administrador'
    : pending?.type === 'password' ? (pending.isSelf ? 'cambiar tu contraseña' : 'restablecer esta contraseña')
    : pending?.newActive ? 'activar este administrador' : 'desactivar este administrador';

  // ── estilos (FORMATO GENERAL Admin v2) ──────────────────
  const lbl = { display: 'block', fontSize: 11, fontWeight: 800, color: '#9E9E9E', marginBottom: 5, textTransform: 'uppercase', letterSpacing: .8 };
  const miniBtn = (color) => ({
    padding: '6px 10px', borderRadius: 8, border: `1px solid ${AT.border}`,
    background: 'transparent', color, fontSize: 11, fontWeight: 700,
    cursor: 'pointer', fontFamily: "'DM Sans'", flexShrink: 0,
  });
  const overlay = {
    position: 'fixed', inset: 0, zIndex: 200,
    background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  };
  const sheet = {
    background: AT.bg, border: `1px solid ${AT.border}`,
    borderRadius: 20, padding: 24, width: '100%', maxWidth: 440,
    maxHeight: '90vh', overflowY: 'auto',
  };
  const ghostBtn = {
    flex: 1, padding: 13, borderRadius: 12, cursor: 'pointer',
    border: `1px solid ${AT.border}`, background: 'transparent', color: '#9E9E9E',
    fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700,
  };
  const mainBtn = {
    flex: 2, padding: 13, borderRadius: 12, cursor: 'pointer', border: 'none',
    background: '#FBBC04', color: '#0D0D0D',
    fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 800,
  };

  const activeCount = admins.filter(a => a.active).length;

  return (
    <div style={{ padding: '22px 22px 60px' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 21, fontWeight: 800, color: '#fff' }}>Administradores</div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#9E9E9E', marginTop: 2 }}>
            {admins.length.toLocaleString('en-US')} cuentas — {activeCount.toLocaleString('en-US')} activas · credenciales con bcrypt y toda acción auditada
          </div>
        </div>
        <button onClick={() => { setForm(EMPTY); setShowForm(true); }}
          style={{ ...btnYellow, width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 12, fontSize: 13, padding: '11px 18px' }}>
          <span style={{ display: 'flex', transform: 'scale(.8)' }}><Plus /></span> Nuevo administrador
        </button>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 32, color: '#777', fontSize: 13, fontWeight: 700 }}>Cargando...</div>}
      {!loading && admins.length === 0 && (
        <div style={{ textAlign: 'center', padding: 32, color: '#777', fontSize: 13, fontWeight: 700 }}>No hay administradores registrados</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 10 }}>
        {admins.map(a => {
          const isSelf = a.id === loggedAdmin?.id;
          return (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: AT.card, border: `1px solid ${AT.border}`,
              borderRadius: 16, padding: '12px 14px', opacity: a.active ? 1 : .55,
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 13, background: a.active ? 'rgba(21,101,192,.3)' : 'rgba(255,255,255,.08)', color: a.active ? '#64B5F6' : '#999', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>{(a.name || '?').charAt(0)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 13.5, color: '#E0E0E0' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                  {isSelf && <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 800, letterSpacing: .5, padding: '2px 7px', borderRadius: 7, background: 'rgba(251,188,4,.15)', color: '#FBBC04' }}>VOS</span>}
                  {!a.active && <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 800, letterSpacing: .5, padding: '2px 7px', borderRadius: 7, background: 'rgba(255,255,255,.08)', color: '#999' }}>INACTIVO</span>}
                </div>
                <div style={{ fontSize: 11, color: '#777', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.email}</div>
                <div style={{ fontSize: 10.5, color: '#555', marginTop: 2, ...sMono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  DPI {a.dpi ? dpiMask.format(a.dpi) : '—'} · Gafete {a.gafete}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                <button onClick={() => setPwModal({ admin: a, pass: '', confirm: '', current: '' })} style={miniBtn('#64B5F6')}>
                  {isSelf ? 'Mi contraseña' : 'Contraseña'}
                </button>
                {!isSelf && (
                  <button onClick={() => askToggle(a)} style={miniBtn(a.active ? '#FF8F00' : '#81C784')}>
                    {a.active ? 'Desactivar' : 'Activar'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Alta (modal oscuro centrado) ── */}
      {showForm && (
        <div style={overlay} onClick={() => { if (!saving) setShowForm(false); }}>
          <div onClick={e => e.stopPropagation()} style={sheet}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 16 }}>Nuevo administrador</div>
            {[
              { k: 'name',    l: 'Nombre completo *', p: 'Juan Perez' },
              { k: 'dpi',     l: 'DPI *',             p: '1234 56789 0123', mask: dpiMask, inputMode: 'numeric' },
              { k: 'gafete',  l: 'No. Gafete *',      p: 'ADM-001' },
              { k: 'email',   l: 'Correo *',          p: 'admin@turkaj.com', t: 'email' },
              { k: 'password',l: 'Contraseña * (mín. 8)', p: 'Mínimo 8 caracteres' },
              { k: 'confirm', l: 'Repetir contraseña *',  p: 'Mínimo 8 caracteres' },
            ].map(f => (
              <div key={f.k} style={{ marginBottom: 12 }}>
                <label style={lbl}>{f.l}</label>
                <input
                  type={f.t || 'text'} placeholder={f.p} inputMode={f.inputMode}
                  value={f.mask ? f.mask.format(form[f.k] || '') : (form[f.k] || '')}
                  onChange={e => {
                    const val = f.mask ? f.mask.clean(e.target.value) : e.target.value;
                    setForm(p => ({ ...p, [f.k]: val }));
                  }}
                  style={{ ...inputStyleDark, fontSize: 13, padding: '10px 12px', ...(f.mask ? { fontVariantNumeric: 'tabular-nums', letterSpacing: .5 } : {}) }}
                />
              </div>
            ))}
            <div style={{ fontSize: 10.5, color: '#777', marginBottom: 16, lineHeight: 1.5 }}>
              La contraseña se muestra en pantalla para poder dictarla — nunca queda escrita en la auditoría.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowForm(false)} disabled={saving} style={ghostBtn}>Cancelar</button>
              <button onClick={submitNew} disabled={saving} style={mainBtn}>Continuar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Contraseña (modal oscuro centrado) ── */}
      {pwModal && (
        <div style={overlay} onClick={() => { if (!saving) setPwModal(null); }}>
          <div onClick={e => e.stopPropagation()} style={sheet}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 6 }}>
              {pwModal.admin.id === loggedAdmin?.id ? 'Cambiar mi contraseña' : 'Restablecer contraseña'}
            </div>
            <div style={{ fontSize: 12, color: '#9E9E9E', marginBottom: 16 }}>{pwModal.admin.name} · {pwModal.admin.email}</div>

            {pwModal.admin.id === loggedAdmin?.id && (
              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>Contraseña actual *</label>
                <PasswordInput placeholder="Tu contraseña de hoy" value={pwModal.current}
                  onChange={e => setPwModal(p => ({ ...p, current: e.target.value }))}
                  style={{ ...inputStyleDark, fontSize: 13, padding: '10px 50px 10px 12px' }} />
              </div>
            )}
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Nueva contraseña * (mín. 8)</label>
              <input type="text" placeholder="Mínimo 8 caracteres" value={pwModal.pass}
                onChange={e => setPwModal(p => ({ ...p, pass: e.target.value }))} style={{ ...inputStyleDark, fontSize: 13, padding: '10px 12px' }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Repetir contraseña *</label>
              <input type="text" placeholder="Mínimo 8 caracteres" value={pwModal.confirm}
                onChange={e => setPwModal(p => ({ ...p, confirm: e.target.value }))} style={{ ...inputStyleDark, fontSize: 13, padding: '10px 12px' }} />
            </div>
            <div style={{ fontSize: 10.5, color: '#777', marginBottom: 16, lineHeight: 1.5 }}>
              La contraseña se muestra en pantalla para que puedas dictarla. Nunca
              queda escrita en la auditoría: solo se registra el hecho del cambio.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setPwModal(null)} disabled={saving} style={ghostBtn}>Cancelar</button>
              <button onClick={submitPassword} disabled={saving} style={mainBtn}>Continuar</button>
            </div>
          </div>
        </div>
      )}

      <ReasonModal
        open={showReason}
        actionLabel={actionLabel}
        loading={saving}
        onClose={() => { setShowReason(false); setPending(null); }}
        onConfirm={confirmAction}
      />
    </div>
  );
}
