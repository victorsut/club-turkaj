// src/views/admin/AdminManagement.jsx
// Objetivo #1 (29-jul-2026) — Gestión de ADMINISTRADORES desde el panel.
// Hasta hoy los admins solo se podían crear o cambiarles la contraseña
// con SQL manual en Supabase. La tabla `admins` quedó CERRADA a la API
// abierta: todo pasa por RPCs con la sesión de admin (bcrypt
// server-side + auditoría en admin_audit_log).
//
// Espeja el lenguaje visual de OpManagement (tema oscuro admin).
import { useState, useEffect, useCallback } from 'react';
import { adminTheme as AT, btnYellow, inputStyle } from '../../constants/styles';
import { Back, Plus, Eye, EyeOff } from '../../components/ui/Icons';
import ReasonModal from '../../components/ui/ReasonModal';
import { fetchAdmins, createAdmin, updateAdminPassword, toggleAdminActive } from '../../services/adminAuthService';

const sLbl = { fontSize: 11, fontWeight: 700, color: '#555', marginBottom: 6, display: 'block' };
const aSec = { fontSize: 11, fontWeight: 800, color: '#BDBDBD', textTransform: 'uppercase', letterSpacing: 1.5, padding: '16px 20px 10px' };
const EMPTY = { name: '', dpi: '', gafete: '', email: '', password: '', confirm: '' };

export default function AdminManagement(ctx) {
  const { setScr, fire, loggedAdmin } = ctx;

  const [admins, setAdmins]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);
  // Cambio de contraseña: { admin, pass, confirm, current } — `current`
  // solo se pide (y el server solo lo exige) para la cuenta propia.
  const [pwModal, setPwModal] = useState(null);
  const [showCurPass, setShowCurPass] = useState(false); // ojito de "contraseña actual"
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

  return (
    <div style={{ paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${AT.border}`, background: '#252525', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setScr('cfg')} style={{ background: 'none', border: 'none', color: '#9E9E9E', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600 }}><Back /> Ajustes</button>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Administradores</div>
        <button onClick={() => { setForm(EMPTY); setShowForm(true); }} style={{ ...btnYellow, padding: '8px 16px', fontSize: 12, width: 'auto', borderRadius: 12 }}><Plus /> Nuevo</button>
      </div>

      <div style={{ padding: '14px 20px 0', fontSize: 12, color: '#777', lineHeight: 1.6 }}>
        Las credenciales viven en la base de datos con cifrado bcrypt. Cada
        alta, cambio de contraseña o baja queda registrada en la auditoría.
      </div>

      <div style={aSec}>Lista de Administradores ({admins.length})</div>

      {loading && <div style={{ textAlign: 'center', padding: 32, color: '#777', fontSize: 13 }}>Cargando...</div>}
      {!loading && admins.length === 0 && (
        <div style={{ textAlign: 'center', padding: 32, color: '#777', fontSize: 13 }}>No hay administradores registrados</div>
      )}

      <div className="pp-adm-grid">
      {admins.map(a => {
        const isSelf = a.id === loggedAdmin?.id;
        return (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: `1px solid ${AT.border}`, opacity: a.active ? 1 : .5 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: a.active ? '#1565C0' : '#616161', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>{(a.name || '?').charAt(0)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#E0E0E0' }}>
                {a.name}{isSelf && <span style={{ fontSize: 10, fontWeight: 800, color: '#FBBC04', marginLeft: 8 }}>VOS</span>}
              </div>
              <div style={{ fontSize: 11, color: '#777', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.email}</div>
              <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>DPI {a.dpi} · Gafete {a.gafete}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={() => setPwModal({ admin: a, pass: '', confirm: '', current: '' })} style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${AT.border}`, background: AT.card, fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 700, cursor: 'pointer', color: '#64B5F6' }}>
                {a.id === loggedAdmin?.id ? 'Mi contraseña' : 'Contraseña'}
              </button>
              {!isSelf && (
                <button onClick={() => askToggle(a)} style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${AT.border}`, background: AT.card, fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 700, cursor: 'pointer', color: a.active ? '#EF5350' : '#2E7D32' }}>
                  {a.active ? 'Desact.' : 'Activar'}
                </button>
              )}
            </div>
          </div>
        );
      })}
      </div>

      {/* ── Alta ── */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(6px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => { if (!saving) setShowForm(false); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '28px 28px 0 0', padding: '28px 24px 32px', maxWidth: 480, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ width: 40, height: 4, background: '#E0E0E0', borderRadius: 2, margin: '0 auto 20px' }} />
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>Nuevo Administrador</div>
            {[
              { k: 'name',    l: 'Nombre completo *', p: 'Juan Perez' },
              { k: 'dpi',     l: 'DPI *',             p: '1234567890101', num: true, max: 13 },
              { k: 'gafete',  l: 'No. Gafete *',      p: 'ADM-001' },
              { k: 'email',   l: 'Correo *',          p: 'admin@turkaj.com', t: 'email' },
              { k: 'password',l: 'Contraseña * (mín. 8)', p: '********', t: 'password' },
              { k: 'confirm', l: 'Repetir contraseña *',  p: '********', t: 'password' },
            ].map(f => (
              <div key={f.k} style={{ marginBottom: 12 }}>
                <label style={sLbl}>{f.l}</label>
                <input
                  type={f.t || 'text'} placeholder={f.p}
                  inputMode={f.num ? 'numeric' : undefined} maxLength={f.max}
                  value={form[f.k] || ''}
                  onChange={e => {
                    const val = f.num ? e.target.value.replace(/[^0-9]/g, '') : e.target.value;
                    setForm(p => ({ ...p, [f.k]: val }));
                  }}
                  style={inputStyle}
                />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button onClick={() => setShowForm(false)} disabled={saving} style={{ flex: 1, padding: 14, borderRadius: 14, border: '1px solid #eee', background: '#fff', color: '#424242', fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={submitNew} disabled={saving} style={{ ...btnYellow, flex: 2, width: 'auto' }}>Continuar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Contraseña ── */}
      {pwModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(6px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => { if (!saving) setPwModal(null); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '28px 28px 0 0', padding: '28px 24px 32px', maxWidth: 480, width: '100%' }}>
            <div style={{ width: 40, height: 4, background: '#E0E0E0', borderRadius: 2, margin: '0 auto 20px' }} />
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
              {pwModal.admin.id === loggedAdmin?.id ? 'Cambiar mi contraseña' : 'Restablecer contraseña'}
            </div>
            <div style={{ fontSize: 12, color: '#777', marginBottom: 16 }}>{pwModal.admin.name} · {pwModal.admin.email}</div>

            {pwModal.admin.id === loggedAdmin?.id && (
              <div style={{ marginBottom: 12 }}>
                <label style={sLbl}>Contraseña actual *</label>
                <div style={{ position: 'relative' }}>
                  <input type={showCurPass ? 'text' : 'password'} placeholder="********" value={pwModal.current}
                    onChange={e => setPwModal(p => ({ ...p, current: e.target.value }))} style={{ ...inputStyle, paddingRight: 50 }} />
                  <button type="button" onClick={() => setShowCurPass(p => !p)} aria-label={showCurPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9E9E9E', display: 'flex', padding: 2 }}>
                    {showCurPass ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </div>
            )}
            <div style={{ marginBottom: 12 }}>
              <label style={sLbl}>Nueva contraseña * (mín. 8)</label>
              <input type="text" placeholder="********" value={pwModal.pass}
                onChange={e => setPwModal(p => ({ ...p, pass: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={sLbl}>Repetir contraseña *</label>
              <input type="text" placeholder="********" value={pwModal.confirm}
                onChange={e => setPwModal(p => ({ ...p, confirm: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 16, lineHeight: 1.5 }}>
              La contraseña se muestra en pantalla para que puedas dictarla. Nunca
              queda escrita en la auditoría: solo se registra el hecho del cambio.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setPwModal(null)} disabled={saving} style={{ flex: 1, padding: 14, borderRadius: 14, border: '1px solid #eee', background: '#fff', color: '#424242', fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={submitPassword} disabled={saving} style={{ ...btnYellow, flex: 2, width: 'auto' }}>Continuar</button>
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
