// src/views/client/menu/MenuAccount.jsx
// Sección Mi Cuenta (FORMATO GENERAL): datos editables con las máscaras
// de inputMasks, datos bloqueados (DPI/nacimiento), cambio de contraseña
// y biometría. CANDADOS 8-ago-2026 (pedido del dueño): el TELÉFONO solo
// cambia con verificación OTP (PhoneChangeSection) y el NIT cada 2 meses
// (candado server-side en update_my_profile — aquí solo se refleja).
// Vehículos extraídos a VehiclesSection (límite de 500 líneas).
import { useState, useEffect } from 'react';
import { sb } from '../../../lib/supabaseClient';
import { inputFlat, btnStyle, bento, BRAND_ORANGE } from '../../../constants/styles';
import { User, Mail, Receipt, IdCard, Cake, Lock, Key, Eye, EyeOff, Chev, Fingerprint, Check } from '../../../components/ui/Icons';
import { biometricsAvailable, registerBiometric, isUserCancel } from '../../../lib/webauthnClient';
import { getMemberToken } from '../../../services/sessionTokens';
import { DatePickerSheet } from '../../../components/ui/DrumDatePicker';
import { dpiMask, capWords } from '../../../lib/inputMasks';
import AddressPicker, { EMPTY_ADDRESS } from '../../../components/ui/AddressPicker';
import { packAddress } from '../../../constants/geoGt';
import { SectionHeader } from './menuUi';
import AvatarEditor from './AvatarEditor';
import DeleteAccountSection from './DeleteAccountSection';
import PhoneChangeSection from './PhoneChangeSection';
import VehiclesSection from './VehiclesSection';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
// Fecha legible desde 'YYYY-MM-DD' (completa) o 'MM-DD' (registros viejos)
const fmtBday = v => {
  if (!v) return null;
  const p = v.split('-');
  if (p.length === 3) return `${p[2]} / ${MONTHS[+p[1] - 1] || p[1]} / ${p[0]}`;
  if (p.length === 2) return `${p[1]} / ${MONTHS[+p[0] - 1] || p[0]}`;
  return v;
};

export default function MenuAccount({ ctx, TH, onBack }) {
  const { me, setMe, fire, sbConnected } = ctx;

  const [form, setForm] = useState({
    nickname: me?.nickname || '', email: me?.email || '', nit: me?.nit || '', bday: '',
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

  // NIT: candado de 2 meses desde el último cambio (nit_changed_at
  // viene del perfil; el candado REAL vive en update_my_profile)
  const nitLockUntil = me?.nitChangedAt
    ? new Date(new Date(me.nitChangedAt).getTime() + 60 * 86400000) : null;
  const nitLocked = !!(nitLockUntil && nitLockUntil > new Date());
  const fmtLockDate = d => `${d.getDate()} / ${MONTHS[d.getMonth()]} / ${d.getFullYear()}`;

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
  // 8-ago: el TELÉFONO ya no viaja aquí (solo PhoneChangeSection con
  // OTP) y el NIT solo se envía si CAMBIÓ (enviar el mismo valor no
  // debe disparar el candado de 2 meses).
  const saveAccount = async () => {
    // 1-ago: el nombre REAL ya no es editable por el cliente — el
    // sobrenombre visible es el APODO (nickname, máx 20).
    if (form.nickname && form.nickname.trim().length > 20) { fire('El apodo no puede superar 20 caracteres', 'error'); return; }
    setSaving(true);
    // Completa = dep+muni (cantón solo exigible en Chichicastenango);
    // incompleta → null (no se inventan datos con los preseleccionados)
    const addressStored = packAddress(addr);
    const nitTrim = form.nit?.trim() || null;
    const nitChanged = nitTrim !== (me?.nit || null);
    const updates = {
      nickname: form.nickname?.trim() || null, email: form.email?.trim() || null,
      address: addressStored,
      ...(nitChanged ? { nit: nitTrim } : {}),
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
    setMe(p => ({
      ...p, ...local,
      ...(birthday ? { bday: birthday } : {}),
      // refleja el candado sin esperar el refetch del perfil
      ...(nitChanged ? { nit: nitTrim || '', nitChangedAt: new Date().toISOString() } : {}),
    }));
    setSaving(false);
    fire('Datos actualizados', 'success');
    onBack();
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
    { k: 'email', l: 'Correo electrónico', icon: <Mail />, type: 'email' },
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

      {/* ── Teléfono: bloqueado — solo cambia con código SMS (8-ago) ── */}
      <PhoneChangeSection ctx={{ me, setMe, fire }} TH={TH} />

      {/* ── NIT: editable cada 2 meses (candado server-side 8-ago) ── */}
      <div style={{ marginBottom: 14 }}>
        <div style={label}>NIT</div>
        {nitLocked ? (
          <>
            <div style={{ ...field, display: 'flex', alignItems: 'center', color: TH.sub, position: 'relative' }}>
              <div style={iconL}><Receipt /></div>
              <span style={{ flex: 1 }}>{me?.nit || '—'}</span>
              <span style={{ display: 'flex', color: TH.sub, opacity: .6 }}><Lock /></span>
            </div>
            <div style={{ fontSize: 11, color: TH.sub, marginTop: 5 }}>
              El NIT se cambia cada 2 meses — podrás cambiarlo el {fmtLockDate(nitLockUntil)}.
            </div>
          </>
        ) : (
          <>
            <div style={{ position: 'relative' }}>
              <div style={iconL}><Receipt /></div>
              <input value={form.nit || ''} onChange={e => setForm(p => ({ ...p, nit: e.target.value }))} style={field} />
            </div>
            <div style={{ fontSize: 11, color: TH.sub, marginTop: 5 }}>
              Solo puede cambiarse cada 2 meses — revisalo antes de guardar.
            </div>
          </>
        )}
      </div>

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

      {/* ── Vehículos (extraídos a su propio componente, 8-ago) ── */}
      <VehiclesSection ctx={{ me, setMe, fire, sbConnected }} TH={TH} />

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

      {/* ── Zona de peligro: borrar la cuenta (soft delete anonimizado,
          6-ago) — al FINAL a propósito: el cliente pasa por todos sus
          datos antes de llegar acá y el flujo exige tipear ELIMINAR ── */}
      <DeleteAccountSection ctx={ctx} TH={TH} />
    </>
  );
}
