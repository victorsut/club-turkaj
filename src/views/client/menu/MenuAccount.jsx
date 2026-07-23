// src/views/client/menu/MenuAccount.jsx
// Sección Mi Cuenta (FORMATO GENERAL): datos editables con las máscaras
// de inputMasks, datos bloqueados (DPI/nacimiento), vehículos con
// iconos SVG (alta Y baja persisten en members) y cambio de contraseña.
import { useState, useEffect } from 'react';
import { sb } from '../../../lib/supabaseClient';
import { inputFlat, btnStyle, bento, BRAND_RED } from '../../../constants/styles';
import { User, Phone, Mail, Receipt, IdCard, Cake, Lock, Key, Eye, EyeOff, Plus, XMark, Chev } from '../../../components/ui/Icons';
import { VEHICLE_TYPES } from '../../../components/ui/VehicleIcons';
import { phoneMask, dpiMask, plateMask, capWords } from '../../../lib/inputMasks';
import { SectionHeader } from './menuUi';

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
    name: me?.name || '', phone: me?.phone || '', email: me?.email || '', nit: me?.nit || '',
  });
  const [saving, setSaving] = useState(false);

  const [vehicles, setVehicles] = useState(() => parseVehicles(me?.vehicles));
  useEffect(() => {
    const parsed = parseVehicles(me?.vehicles);
    if (parsed.length > 0) setVehicles(parsed);
  }, [me?.vehicles]);
  const [addingV, setAddingV]     = useState(false);
  const [newVType, setNewVType]   = useState('liviano');
  const [newVPlate, setNewVPlate] = useState('');

  const [showPassSec, setShowPassSec] = useState(false);
  const [passForm, setPassForm]       = useState({ newPass: '', confirm: '' });
  const [showP, setShowP]             = useState({ n: false, cf: false });
  const [savingPass, setSavingPass]   = useState(false);

  const field = { ...inputFlat, background: TH.isDark ? 'rgba(255,255,255,.08)' : '#fff', color: TH.header, paddingLeft: 44 };
  const label = { fontSize: 11, fontWeight: 800, color: TH.sub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 };
  const iconL = { position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: TH.sub, display: 'flex', zIndex: 1 };
  const btnPrimary = { ...btnStyle, background: BRAND_RED, color: '#fff' };

  // ── Guardar datos de cuenta ──────────────────────────────
  const saveAccount = async () => {
    if (!form.name?.trim()) { fire('El nombre es obligatorio', 'error'); return; }
    if (form.phone && !/^\d{8}$/.test(form.phone.trim())) { fire('El teléfono debe tener 8 dígitos', 'error'); return; }
    setSaving(true);
    const updates = { name: form.name.trim(), phone: form.phone?.trim() || me.phone, email: form.email?.trim() || null, nit: form.nit?.trim() || null };
    if (sbConnected && sb) {
      const { error } = await sb.from('members').update(updates).eq('id', me.id);
      if (error) { fire('Error al guardar: ' + error.message, 'error'); setSaving(false); return; }
    }
    setMe(p => ({ ...p, ...updates }));
    setSaving(false);
    fire('Datos actualizados', 'success');
    onBack();
  };

  // ── Vehículos (alta y baja persisten en members) ─────────
  const persistVehicles = async (updated) => {
    if (sb && sbConnected) {
      await sb.from('members').update({ plate: updated[0]?.plate || '', vehicles: updated }).eq('id', me.id);
    }
    setMe(p => ({ ...p, vehicles: updated, plate: updated[0]?.plate || '' }));
  };
  const addVehicle = async () => {
    if (!newVPlate.trim()) { fire('Ingresa la placa del vehículo', 'error'); return; }
    if (!plateMask.complete(newVPlate)) { fire('Placa incompleta — formato: P 123 ABC', 'error'); return; }
    const updated = [...vehicles, { type: newVType, plate: newVPlate }];
    setVehicles(updated); setAddingV(false); setNewVPlate(''); setNewVType('liviano');
    await persistVehicles(updated);
    if (sb && sbConnected) {
      await sb.from('activity_log').insert({ member_id: me.id, activity_type: 'vehiculo', description: `Vehículo agregado: ${typeInfo(newVType).label} ${plateMask.format(newVPlate)}`, points_change: 0 });
    }
    fire('Vehículo agregado', 'success');
  };
  const removeVehicle = async (i) => {
    const updated = vehicles.filter((_, j) => j !== i);
    setVehicles(updated);
    await persistVehicles(updated);
    fire('Vehículo eliminado', 'success');
  };

  // ── Contraseña ───────────────────────────────────────────
  const savePassword = async () => {
    if (!passForm.newPass || passForm.newPass.length < 6) { fire('La contraseña debe tener al menos 6 caracteres', 'error'); return; }
    if (passForm.newPass !== passForm.confirm) { fire('Las contraseñas no coinciden', 'error'); return; }
    setSavingPass(true);
    const hashed = 'pw:' + btoa(passForm.newPass);
    if (sbConnected && sb) {
      const { error } = await sb.from('members').update({ password_hash: hashed }).eq('id', me.id);
      if (error) { fire('Error: ' + error.message, 'error'); setSavingPass(false); return; }
    }
    setMe(p => ({ ...p, password_hash: hashed }));
    setSavingPass(false);
    setPassForm({ newPass: '', confirm: '' });
    setShowPassSec(false);
    fire('Contraseña actualizada', 'success');
  };

  const editFields = [
    { k: 'name',  l: 'Nombre completo',    icon: <User />,    autoCap: 'words', transform: capWords },
    { k: 'phone', l: 'Teléfono',           icon: <Phone />,   mask: phoneMask, inputMode: 'numeric' },
    { k: 'email', l: 'Correo electrónico', icon: <Mail />,    type: 'email' },
    { k: 'nit',   l: 'NIT',               icon: <Receipt /> },
  ];
  const readonlyFields = [
    { l: 'DPI',                 icon: <IdCard />, val: me?.dpi ? dpiMask.format(me.dpi) : '—' },
    { l: 'Fecha de nacimiento', icon: <Cake />,   val: me?.bday ? me.bday.replace('-', '/') : '—' },
  ];

  return (
    <>
      <SectionHeader title="Mi Cuenta" sub="Edita tus datos personales" onBack={onBack} TH={TH} />

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
        </div>
      ))}

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
            <button onClick={() => removeVehicle(i)} aria-label="Quitar vehículo"
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
              style={{ flex: 2, padding: 12, borderRadius: 12, border: 'none', background: BRAND_RED, color: '#fff', fontFamily: "'DM Sans'", fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>Agregar</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAddingV(true)} style={{ width: '100%', padding: 14, borderRadius: 16, border: 'none', background: TH.surface, color: TH.header, fontFamily: "'DM Sans'", fontWeight: 800, fontSize: 14, cursor: 'pointer', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ color: BRAND_RED, display: 'flex' }}><Plus /></span>
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
          {[
            { k: 'newPass', l: 'Nueva contraseña',     pk: 'n' },
            { k: 'confirm', l: 'Confirmar contraseña', pk: 'cf' },
          ].map(f => (
            <div key={f.k} style={{ marginBottom: 12 }}>
              <div style={label}>{f.l}</div>
              <div style={{ position: 'relative' }}>
                <input type={showP[f.pk] ? 'text' : 'password'} placeholder="Mínimo 6 caracteres" value={passForm[f.k]}
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
            {savingPass ? 'Guardando...' : 'Actualizar contraseña'}
          </button>
        </div>
      )}
    </>
  );
}
