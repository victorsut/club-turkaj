// src/views/client/menu/MenuAccount.jsx
// Sección Mi Cuenta (FORMATO GENERAL): datos editables con las máscaras
// de inputMasks, datos bloqueados (DPI/nacimiento), vehículos con
// iconos SVG (alta Y baja persisten en members) y cambio de contraseña.
import { useState, useEffect } from 'react';
import { sb } from '../../../lib/supabaseClient';
import { inputFlat, btnStyle, bento, BRAND_ORANGE } from '../../../constants/styles';
import { User, Phone, Mail, Receipt, IdCard, Cake, Lock, Key, Eye, EyeOff, Plus, XMark, Chev, Fingerprint, Check } from '../../../components/ui/Icons';
import { biometricsAvailable, registerBiometric, isUserCancel } from '../../../lib/webauthnClient';
import { getMemberToken } from '../../../services/sessionTokens';
import { VEHICLE_TYPES } from '../../../components/ui/VehicleIcons';
import { DatePickerSheet } from '../../../components/ui/DrumDatePicker';
import { phoneMask, dpiMask, plateMask, capWords } from '../../../lib/inputMasks';
import AddressPicker, { EMPTY_ADDRESS } from '../../../components/ui/AddressPicker';
import { packAddress } from '../../../constants/geoGt';
import { SectionHeader } from './menuUi';
import AvatarEditor from './AvatarEditor';
import useBackLayer from '../../../hooks/useBackLayer';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
// Fecha legible desde 'YYYY-MM-DD' (completa) o 'MM-DD' (registros viejos)
const fmtBday = v => {
  if (!v) return null;
  const p = v.split('-');
  if (p.length === 3) return `${p[2]} / ${MONTHS[+p[1] - 1] || p[1]} / ${p[0]}`;
  if (p.length === 2) return `${p[1]} / ${MONTHS[+p[0] - 1] || p[0]}`;
  return v;
};

const parseVehicles = (v) => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === 'object') return Object.values(v);
  try { return JSON.parse(v); } catch { return []; }
};
const typeInfo = k => VEHICLE_TYPES.find(t => t.k === k) || VEHICLE_TYPES[0];

export default function MenuAccount({ ctx, TH, onBack }) {
  const { me, setMe, fire, sbConnected } = ctx;

  const [form, setForm] = useState({
    nickname: me?.nickname || '', phone: me?.phone || '', email: me?.email || '', nit: me?.nit || '', bday: '',
  });
  // Dirección en cascada (dep → muni → cantón); sin dato guardado
  // arranca con Quiché/Chichicastenango preseleccionados
  const [addr, setAddr] = useState(me?.address || EMPTY_ADDRESS);
  const [saving, setSaving] = useState(false);

  // Fecha de nacimiento: los registros viejos solo guardan 'MM-DD' —
  // se permite COMPLETARLA una única vez; con fecha completa se bloquea.
  const bdayFull = /^\d{4}-\d{2}-\d{2}$/.test(me?.bday || '');
  const [showBdayPicker, setShowBdayPicker] = useState(false);
  const [tempDate, setTempDate] = useState('2000-01-01');

  const [vehicles, setVehicles] = useState(() => parseVehicles(me?.vehicles));
  useEffect(() => {
    const parsed = parseVehicles(me?.vehicles);
    if (parsed.length > 0) setVehicles(parsed);
  }, [me?.vehicles]);
  const [addingV, setAddingV]     = useState(false);
  const [newVType, setNewVType]   = useState('liviano');
  const [newVPlate, setNewVPlate] = useState('');

  const [showPassSec, setShowPassSec] = useState(false);
  const [passForm, setPassForm]       = useState({ current: '', newPass: '', confirm: '' });
  const [showP, setShowP]             = useState({ n: false, cf: false });
  const [savingPass, setSavingPass]   = useState(false);

  // Sesión de Supabase Auth (solo cuentas Google): prueba de identidad
  // alternativa a la contraseña — para establecer contraseña sin
  // conocer la actual y para activar la huella sin contraseña.
  const [gSession, setGSession] = useState(null);
  useEffect(() => {
    if (sb && me?.authProvider === 'google') {
      sb.auth.getSession().then(({ data }) => setGSession(data?.session || null));
    }
  }, [me?.authProvider]);
  const googleAuth = me?.authProvider === 'google' && !!gSession;
  // Modo "establecer sin contraseña actual" (RPC set_member_password_oauth)
  const [oauthPassMode, setOauthPassMode] = useState(false);

  // ── Biometría (passkey en ESTE dispositivo) ──
  const [bioAvail, setBioAvail]   = useState(false);
  const [showBioSec, setShowBioSec] = useState(false);
  const [bioPass, setBioPass]     = useState('');
  const [showBioPass, setShowBioPass] = useState(false);
  const [bioBusy, setBioBusy]     = useState(false);
  const [bioDone, setBioDone]     = useState(() => {
    try { return localStorage.getItem(`pp_bio_${me?.id}`) === '1'; } catch { return false; }
  });
  useEffect(() => { biometricsAvailable().then(setBioAvail); }, []);

  const activateBio = async () => {
    if (bioBusy) return;
    if (!googleAuth && !bioPass) { fire('Ingresa tu contraseña para activar', 'error'); return; }
    setBioBusy(true);
    try {
      // Google con sesión activa → el token prueba la identidad;
      // cuentas de teléfono → contraseña actual.
      await registerBiometric(me.id, googleAuth
        ? { oauthToken: gSession.access_token }
        : { password: bioPass });
      try { localStorage.setItem(`pp_bio_${me.id}`, '1'); } catch { /* sin storage */ }
      setBioDone(true); setBioPass(''); setShowBioSec(false);
      fire('Huella activada — ya podés usarla al iniciar sesión', 'success');
    } catch (err) {
      if (!isUserCancel(err)) fire(err.message || 'No se pudo activar la biometría', 'error');
    } finally {
      setBioBusy(false);
    }
  };

  const field = { ...inputFlat, background: TH.isDark ? 'rgba(255,255,255,.08)' : '#fff', color: TH.header, paddingLeft: 44 };
  const label = { fontSize: 11, fontWeight: 800, color: TH.sub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 };
  const iconL = { position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: TH.sub, display: 'flex', zIndex: 1 };
  const btnPrimary = { ...btnStyle, background: BRAND_ORANGE, color: '#fff' };

  // ── Guardar datos de cuenta ──────────────────────────────
  const saveAccount = async () => {
    // 1-ago: el nombre REAL ya no es editable por el cliente — el
    // sobrenombre visible es el APODO (nickname, máx 20).
    if (form.nickname && form.nickname.trim().length > 20) { fire('El apodo no puede superar 20 caracteres', 'error'); return; }
    if (form.phone && !/^\d{8}$/.test(form.phone.trim())) { fire('El teléfono debe tener 8 dígitos', 'error'); return; }
    setSaving(true);
    // Completa = dep+muni (cantón solo exigible en Chichicastenango);
    // incompleta → null (no se inventan datos con los preseleccionados)
    const addressStored = packAddress(addr);
    const updates = {
      nickname: form.nickname?.trim() || null, phone: form.phone?.trim() || me.phone, email: form.email?.trim() || null, nit: form.nit?.trim() || null,
      address: addressStored,
      ...(form.bday ? { birthday: form.bday } : {}),
    };
    if (sbConnected && sb) {
      // SEC.C.1: el UPDATE directo quedó revocado — la edición del propio
      // perfil pasa por update_my_profile con la sesión de miembro.
      const { data, error } = await sb.rpc('update_my_profile', {
        p_session_token: getMemberToken()?.token ?? null,
        p_changes: updates,
      });
      const errMsg = error?.message || data?.error;
      if (errMsg) {
        fire(errMsg === 'invalid_session'
          ? 'Tu sesión expiró — cerrá sesión y volvé a entrar'
          : 'Error al guardar: ' + errMsg, 'error');
        setSaving(false); return;
      }
    }
    const { birthday, ...local } = updates;
    setMe(p => ({ ...p, ...local, ...(birthday ? { bday: birthday } : {}) }));
    setSaving(false);
    fire('Datos actualizados', 'success');
    onBack();
  };

  // ── Vehículos (alta y baja persisten en members) ─────────
  // persistVehicles DEVUELVE el error de la BD (antes se tragaba el
  // fallo y el cliente celebraba éxito con la lista sin guardar —
  // bug reportado por el dueño 27-jul); solo refleja en `me` si guardó.
  const persistVehicles = async (updated) => {
    if (sb && sbConnected) {
      // SEC.C.1: vía update_my_profile (plate se deriva server-side)
      const { data, error } = await sb.rpc('update_my_profile', {
        p_session_token: getMemberToken()?.token ?? null,
        p_changes: { vehicles: updated },
      });
      const err = error || (data?.error ? { message: data.error } : null);
      if (err) { console.error('[Vehicles]', err); return err; }
    }
    setMe(p => ({ ...p, vehicles: updated, plate: updated[0]?.plate || '' }));
    return null;
  };
  // Alta/baja de vehículos NO se registran en activity_log (decisión
  // del dueño 27-jul: no mueven puntos — el historial de vehículos
  // vivirá en la pestaña VEHÍCULOS, F6). Solo el bonus del wizard de
  // registro persiste ahí porque sí suma puntos.
  const addVehicle = async () => {
    if (!newVPlate.trim()) { fire('Ingresa la placa del vehículo', 'error'); return; }
    if (!plateMask.complete(newVPlate)) { fire('Placa incompleta — formato: P 123 ABC', 'error'); return; }
    const prev = vehicles;
    const added = { type: newVType, plate: newVPlate };
    const updated = [...prev, added];
    setVehicles(updated); setAddingV(false); setNewVPlate(''); setNewVType('liviano');
    const err = await persistVehicles(updated);
    if (err) { setVehicles(prev); fire('No se pudo guardar el vehículo: ' + err.message, 'error'); return; }
    fire('Vehículo agregado', 'success');
  };
  // Eliminar vehículo pide CONFIRMACIÓN (pedido del dueño 27-jul):
  // borra el dato guardado y todo lo relacionado a ese vehículo.
  const [delVehicle, setDelVehicle] = useState(null); // { v, i } | null
  const [delClosing, setDelClosing] = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const closeDelSheet = () => {
    setDelClosing(true);
    setTimeout(() => { setDelVehicle(null); setDelClosing(false); }, 200);
  };
  useBackLayer(!!delVehicle, closeDelSheet);

  const confirmRemoveVehicle = async () => {
    if (!delVehicle || deleting) return;
    setDeleting(true);
    const { i } = delVehicle;
    const prev = vehicles;
    const updated = prev.filter((_, j) => j !== i);
    setVehicles(updated);
    const err = await persistVehicles(updated);
    setDeleting(false);
    closeDelSheet();
    if (err) { setVehicles(prev); fire('No se pudo eliminar el vehículo: ' + err.message, 'error'); return; }
    fire('Vehículo eliminado', 'success');
  };

  // ── Contraseña (SEC-lite 25-jul): RPC con bcrypt server-side,
  // verificando la contraseña ACTUAL — ya no se escribe password_hash
  // desde el cliente ni se usa el formato reversible 'pw:'+btoa. ──
  const savePassword = async () => {
    if (!oauthPassMode && !passForm.current) { fire('Ingresa tu contraseña actual', 'error'); return; }
    if (!passForm.newPass || passForm.newPass.length < 6) { fire('La contraseña debe tener al menos 6 caracteres', 'error'); return; }
    if (passForm.newPass !== passForm.confirm) { fire('Las contraseñas no coinciden', 'error'); return; }
    if (!sb || !sbConnected) { fire('Sin conexión', 'error'); return; }
    setSavingPass(true);
    // Con sesión de Google: establecer sin conocer la actual (el RPC
    // verifica auth.uid contra auth_provider_id — SEC oauth 27-jul)
    const { data, error } = oauthPassMode
      ? await sb.rpc('set_member_password_oauth', { p_new_password: passForm.newPass })
      : await sb.rpc('update_member_password', {
          p_member_id: me.id,
          p_current_password: passForm.current,
          p_new_password: passForm.newPass,
        });
    setSavingPass(false);
    if (error) { fire('Error: ' + error.message, 'error'); return; }
    if (data?.error) { fire(data.error, 'error'); return; }
    setPassForm({ current: '', newPass: '', confirm: '' });
    setShowPassSec(false); setOauthPassMode(false);
    fire(oauthPassMode ? 'Contraseña establecida' : 'Contraseña actualizada', 'success');
  };

  const editFields = [
    { k: 'nickname', l: 'Apodo', icon: <User />, autoCap: 'words', transform: capWords,
      hint: 'Así te verán los demás participantes en la rifa' },
    { k: 'phone', l: 'Teléfono',           icon: <Phone />,   mask: phoneMask, inputMode: 'numeric' },
    { k: 'email', l: 'Correo electrónico', icon: <Mail />,    type: 'email' },
    { k: 'nit',   l: 'NIT',               icon: <Receipt /> },
  ];
  const readonlyFields = [
    { l: 'DPI', icon: <IdCard />, val: me?.dpi ? dpiMask.format(me.dpi) : '—' },
  ];

  return (
    <>
      {showBdayPicker && (
        <DatePickerSheet
          tempDate={tempDate}
          setTempDate={setTempDate}
          setShowDatePicker={setShowBdayPicker}
          setRegProfile={(up) => { const r = up({}); if (r.bday) setForm(p => ({ ...p, bday: r.bday })); }}
          dark={TH.isDark}
        />
      )}
      <SectionHeader title="Mi Cuenta" sub="Edita tus datos personales" onBack={onBack} TH={TH} />

      {/* Foto de perfil editable (1-ago) — componente aparte */}
      <AvatarEditor ctx={{ me, setMe, fire, sbConnected }} TH={TH} />

      {/* Nombre REAL: bloqueado como el DPI (1-ago) — solo el admin
          puede corregirlo; el cliente personaliza su Apodo */}
      <div style={{ marginBottom: 14 }}>
        <div style={label}>Nombre completo</div>
        <div style={{ ...field, display: 'flex', alignItems: 'center', color: TH.sub, position: 'relative' }}>
          <div style={iconL}><User /></div>
          <span style={{ flex: 1 }}>{me?.name || '—'}</span>
          <span style={{ display: 'flex', color: TH.sub, opacity: .6 }}><Lock /></span>
        </div>
      </div>

      {editFields.map(f => (
        <div key={f.k} style={{ marginBottom: 14 }}>
          <div style={label}>{f.l}</div>
          <div style={{ position: 'relative' }}>
            <div style={iconL}>{f.icon}</div>
            <input
              type={f.type || 'text'} inputMode={f.inputMode} autoCapitalize={f.autoCap}
              value={f.mask ? f.mask.format(form[f.k] || '') : (form[f.k] || '')}
              onChange={e => {
                let v = f.mask ? f.mask.clean(e.target.value) : e.target.value;
                if (f.transform) v = f.transform(v);
                setForm(p => ({ ...p, [f.k]: v }));
              }}
              style={field}
            />
          </div>
          {f.hint && <div style={{ fontSize: 11, color: TH.sub, marginTop: 5 }}>{f.hint}</div>}
        </div>
      ))}

      {/* ── Dirección (cascada dep → muni → cantón) ── */}
      <div style={{ marginBottom: 14 }}>
        <div style={label}>Dirección</div>
        <AddressPicker
          value={addr}
          onChange={setAddr}
          dark={TH.isDark}
          fieldBg={TH.isDark ? 'rgba(255,255,255,.08)' : '#fff'}
        />
      </div>

      {readonlyFields.map(f => (
        <div key={f.l} style={{ marginBottom: 14 }}>
          <div style={label}>{f.l}</div>
          <div style={{ ...field, display: 'flex', alignItems: 'center', color: TH.sub, position: 'relative' }}>
            <div style={{ ...iconL, position: 'absolute' }}>{f.icon}</div>
            <span style={{ flex: 1, fontVariantNumeric: 'tabular-nums' }}>{f.val}</span>
            <span style={{ display: 'flex', color: TH.sub, opacity: .6 }}><Lock /></span>
          </div>
        </div>
      ))}

      {/* Fecha de nacimiento: completa → bloqueada como el DPI; si el
          registro viejo solo guardó mes-día, se puede completar UNA vez */}
      <div style={{ marginBottom: 14 }}>
        <div style={label}>Fecha de nacimiento</div>
        {bdayFull ? (
          <div style={{ ...field, display: 'flex', alignItems: 'center', color: TH.sub, position: 'relative' }}>
            <div style={iconL}><Cake /></div>
            <span style={{ flex: 1 }}>{fmtBday(me.bday)}</span>
            <span style={{ display: 'flex', color: TH.sub, opacity: .6 }}><Lock /></span>
          </div>
        ) : (
          <>
            <div
              onClick={() => { setTempDate(me?.bday?.length === 5 ? '2000-' + me.bday : '2000-01-01'); setShowBdayPicker(true); }}
              style={{ ...field, display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative', color: form.bday ? TH.header : TH.sub, userSelect: 'none' }}>
              <div style={iconL}><Cake /></div>
              <span style={{ flex: 1 }}>{fmtBday(form.bday) || fmtBday(me?.bday) || 'Completar fecha de nacimiento'}</span>
              <span style={{ color: TH.sub, display: 'flex' }}><Chev /></span>
            </div>
            <div style={{ fontSize: 11, color: TH.sub, marginTop: 5 }}>
              {form.bday
                ? 'Toca "Guardar cambios" para confirmar — luego queda bloqueada.'
                : 'Tu registro solo guarda día y mes. Completá tu fecha una única vez.'}
            </div>
          </>
        )}
      </div>

      <button onClick={saveAccount} disabled={saving} style={{ ...btnPrimary, marginBottom: 28, opacity: saving ? .7 : 1 }}>
        {saving ? 'Guardando...' : 'Guardar cambios'}
      </button>

      {/* ── Vehículos ── */}
      <div style={{ fontSize: 13, fontWeight: 800, color: TH.header, marginBottom: 10 }}>Tus vehículos</div>
      {vehicles.map((v, i) => {
        const t = typeInfo(v.type);
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: TH.surface, borderRadius: 16, padding: '12px 14px', marginBottom: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: TH.iconBox, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <t.Icon size={22} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: TH.header }}>{t.label}</div>
              <div style={{ fontSize: 12, color: TH.sub, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{plateMask.format(plateMask.clean(v.plate || '')) || v.plate}</div>
            </div>
            <button onClick={() => setDelVehicle({ v, i })} aria-label="Quitar vehículo"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: TH.sub, padding: 4, display: 'flex' }}><XMark /></button>
          </div>
        );
      })}

      {addingV ? (
        <div style={{ background: TH.surface, borderRadius: 20, padding: 16, marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: TH.header, marginBottom: 12 }}>Tipo de vehículo</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            {VEHICLE_TYPES.map(t => {
              const on = newVType === t.k;
              return (
                <button key={t.k} onClick={() => setNewVType(t.k)} style={{
                  padding: '10px 8px', borderRadius: 12, border: 'none',
                  background: on ? (TH.isDark ? '#fff' : '#0D0D0D') : TH.inset,
                  color: on ? (TH.isDark ? '#0D0D0D' : '#fff') : TH.sub,
                  cursor: 'pointer', fontFamily: "'DM Sans'", fontWeight: 700, fontSize: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <t.Icon size={18} />{t.label}
                </button>
              );
            })}
          </div>
          <input placeholder="Placa (ej: P 123 ABC)" value={plateMask.format(newVPlate)} autoCapitalize="characters"
            onChange={e => setNewVPlate(plateMask.clean(e.target.value))}
            style={{ ...field, paddingLeft: 16, marginBottom: 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, letterSpacing: 2 }} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setAddingV(false); setNewVPlate(''); }}
              style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: TH.inset, color: TH.sub, fontFamily: "'DM Sans'", fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
            <button onClick={addVehicle}
              style={{ flex: 2, padding: 12, borderRadius: 12, border: 'none', background: BRAND_ORANGE, color: '#fff', fontFamily: "'DM Sans'", fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>Agregar</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAddingV(true)} style={{ width: '100%', padding: 14, borderRadius: 16, border: 'none', background: TH.surface, color: TH.header, fontFamily: "'DM Sans'", fontWeight: 800, fontSize: 14, cursor: 'pointer', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ color: BRAND_ORANGE, display: 'flex' }}><Plus /></span>
          Agregar vehículo
        </button>
      )}

      {/* ── Contraseña ── */}
      <button onClick={() => setShowPassSec(p => !p)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 16, border: 'none', background: TH.surface, fontFamily: "'DM Sans'", cursor: 'pointer', marginBottom: showPassSec ? 12 : 0, textAlign: 'left' }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: TH.iconBox, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Key /></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: TH.header }}>Cambiar contraseña</div>
          <div style={{ fontSize: 11, color: TH.sub, marginTop: 2 }}>Actualizar tu contraseña de acceso</div>
        </div>
        <span style={{ color: TH.sub, display: 'flex', transform: showPassSec ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}><Chev /></span>
      </button>

      {showPassSec && (
        <div style={{ background: TH.surface, borderRadius: 20, padding: 16 }}>
          {oauthPassMode && (
            <div style={{ fontSize: 12, color: TH.sub, lineHeight: 1.55, marginBottom: 12 }}>
              Tu sesión de Google confirma tu identidad — solo elegí tu contraseña nueva.
            </div>
          )}
          {[
            ...(oauthPassMode ? [] : [{ k: 'current', l: 'Contraseña actual', pk: 'cu', ph: 'Tu contraseña de hoy' }]),
            { k: 'newPass', l: 'Nueva contraseña',     pk: 'n',  ph: 'Mínimo 6 caracteres' },
            { k: 'confirm', l: 'Confirmar contraseña', pk: 'cf', ph: 'Mínimo 6 caracteres' },
          ].map(f => (
            <div key={f.k} style={{ marginBottom: 12 }}>
              <div style={label}>{f.l}</div>
              <div style={{ position: 'relative' }}>
                <input type={showP[f.pk] ? 'text' : 'password'} placeholder={f.ph} value={passForm[f.k]}
                  onChange={e => setPassForm(p => ({ ...p, [f.k]: e.target.value }))}
                  style={{ ...field, paddingLeft: 16, paddingRight: 50, background: TH.isDark ? 'rgba(255,255,255,.08)' : '#F5F5F7',
                    borderColor: f.k === 'confirm' && passForm.confirm
                      ? (passForm.confirm === passForm.newPass ? bento.green : '#EF5350') : 'transparent' }} />
                <button type="button" onClick={() => setShowP(p => ({ ...p, [f.pk]: !p[f.pk] }))} aria-label={showP[f.pk] ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: TH.sub, display: 'flex', padding: 2 }}>
                  {showP[f.pk] ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>
          ))}
          {passForm.confirm && passForm.confirm === passForm.newPass && (
            <div style={{ fontSize: 11, color: bento.green, fontWeight: 700, marginBottom: 10 }}>Las contraseñas coinciden</div>
          )}
          <button onClick={savePassword} disabled={savingPass} style={{ ...btnPrimary, padding: 14, borderRadius: 12, fontSize: 14, opacity: savingPass ? .7 : 1 }}>
            {savingPass ? 'Guardando...' : oauthPassMode ? 'Establecer contraseña' : 'Actualizar contraseña'}
          </button>
          {/* Cuentas Google: pueden establecer contraseña SIN conocer la
              actual (su sesión de Google es la prueba de identidad) */}
          {googleAuth && (
            <button onClick={() => { setOauthPassMode(p => !p); setPassForm({ current: '', newPass: '', confirm: '' }); }}
              style={{ width: '100%', marginTop: 10, padding: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 700, color: BRAND_ORANGE }}>
              {oauthPassMode ? 'Prefiero usar mi contraseña actual' : '¿No sabés tu contraseña? Establecela con tu cuenta de Google'}
            </button>
          )}
        </div>
      )}

      {/* ── Biometría: activar huella/rostro en este dispositivo.
          Solo si el navegador soporta autenticador de plataforma
          (in-app browsers de WhatsApp/Instagram no lo muestran). ── */}
      {bioAvail && (
        <>
          <button onClick={() => setShowBioSec(p => !p)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 16, border: 'none', background: TH.surface, fontFamily: "'DM Sans'", cursor: 'pointer', marginTop: 12, marginBottom: showBioSec ? 12 : 0, textAlign: 'left' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: TH.iconBox, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Fingerprint /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: TH.header }}>Huella o rostro</div>
              <div style={{ fontSize: 11, color: TH.sub, marginTop: 2 }}>
                {bioDone ? 'Activada en este dispositivo' : 'Inicia sesión con la seguridad de tu celular'}
              </div>
            </div>
            {bioDone && <span style={{ display: 'flex', color: bento.green }}><Check /></span>}
            <span style={{ color: TH.sub, display: 'flex', transform: showBioSec ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}><Chev /></span>
          </button>

          {showBioSec && (
            <div style={{ background: TH.surface, borderRadius: 20, padding: 16 }}>
              <div style={{ fontSize: 12, color: TH.sub, lineHeight: 1.55, marginBottom: 12 }}>
                Tu celular usará su propio desbloqueo (huella, rostro, PIN o patrón).
                Tu información biométrica nunca sale del dispositivo.
                {googleAuth ? ' Tu sesión de Google confirma tu identidad.' : ''}
                {bioDone ? ' Podés volver a configurarla cuando quieras.' : ''}
              </div>
              {/* Cuentas de teléfono: la contraseña actual confirma la
                  identidad; Google con sesión activa no la necesita. */}
              {!googleAuth && (<>
                <div style={label}>Contraseña actual</div>
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <input type={showBioPass ? 'text' : 'password'} placeholder="Confirma tu identidad" value={bioPass}
                    onChange={e => setBioPass(e.target.value)}
                    style={{ ...field, paddingLeft: 16, paddingRight: 50, background: TH.isDark ? 'rgba(255,255,255,.08)' : '#F5F5F7' }} />
                  <button type="button" onClick={() => setShowBioPass(p => !p)} aria-label={showBioPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: TH.sub, display: 'flex', padding: 2 }}>
                    {showBioPass ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </>)}
              <button onClick={activateBio} disabled={bioBusy} style={{ ...btnPrimary, padding: 14, borderRadius: 12, fontSize: 14, opacity: bioBusy ? .7 : 1 }}>
                {bioBusy ? 'Esperando tu celular...' : bioDone ? 'Volver a configurar' : 'Activar en este dispositivo'}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Confirmación de eliminación de vehículo (bottom sheet) ── */}
      {delVehicle && (() => {
        const t = typeInfo(delVehicle.v.type);
        const plateTxt = plateMask.format(plateMask.clean(delVehicle.v.plate || '')) || delVehicle.v.plate;
        return (
          <div onClick={closeDelSheet}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: delClosing ? 'ppFadeOut .2s ease forwards' : 'fadeIn .2s ease' }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background: TH.isDark ? '#16161A' : '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '24px 20px 36px', animation: delClosing ? 'slideDownOut .22s ease forwards' : 'slideUp .25s ease' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: TH.header, marginBottom: 4 }}>¿Eliminar este vehículo?</div>
              <div style={{ fontSize: 13, color: TH.sub, lineHeight: 1.5, marginBottom: 16 }}>
                Se eliminará de tu cuenta junto con todos sus datos relacionados. Esta acción no se puede deshacer.
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: TH.isDark ? 'rgba(255,255,255,.07)' : '#F5F5F7', borderRadius: 16, padding: '12px 14px', marginBottom: 18 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: bento.red, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <t.Icon size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: TH.header }}>{t.label}</div>
                  <div style={{ fontSize: 12, color: TH.sub, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{plateTxt}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={closeDelSheet}
                  style={{ flex: 1, padding: 14, borderRadius: 14, border: 'none', background: TH.isDark ? 'rgba(255,255,255,.08)' : '#F5F5F7', color: TH.sub, fontFamily: "'DM Sans'", fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                  Cancelar
                </button>
                <button onClick={confirmRemoveVehicle} disabled={deleting}
                  style={{ flex: 1, padding: 14, borderRadius: 14, border: 'none', background: bento.red, color: '#fff', fontFamily: "'DM Sans'", fontWeight: 800, cursor: 'pointer', fontSize: 14, opacity: deleting ? .7 : 1 }}>
                  {deleting ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
