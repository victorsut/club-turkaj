// src/views/client/ClientMenu.jsx
// Pestaña MENÚ: Mi Cuenta, Niveles, Reglas de Inactividad, Términos y Condiciones
import { useState } from 'react';
import { sb } from '../../lib/supabaseClient';
import { inputStyle } from '../../constants/styles';
import TierCard from '../../components/ui/TierCard';
import { makeTier } from '../../lib/tierSystem';

const VEHICLE_TYPES = [
  { k: 'camion',        label: 'Camión',          icon: '🚛' },
  { k: 'camion_ligero', label: 'Camión ligero',    icon: '🚚' },
  { k: 'picop',         label: 'Picop',            icon: '🛻' },
  { k: 'microbus',      label: 'Micro Bus',        icon: '🚌' },
  { k: 'liviano',       label: 'Vehículo liviano', icon: '🚗' },
  { k: 'mototaxi',      label: 'Moto Taxi',        icon: '🛺' },
  { k: 'moto',          label: 'Motocicleta',      icon: '🏍️' },
  { k: 'otro',          label: 'Otros',            icon: '🔧' },
];
const typeInfo = k => VEHICLE_TYPES.find(t => t.k === k) || VEHICLE_TYPES[4];

export default function ClientMenu(ctx) {
  const { me, setMe, cfg, cTier, fire, sbConnected, logout } = ctx;

  const [section, setSection] = useState(null);
  const [form, setForm]       = useState(null);
  const [saving, setSaving]   = useState(false);
  // Vehículos
  const [vehicles, setVehicles]       = useState([]);
  const [addingV, setAddingV]         = useState(false);
  const [newVType, setNewVType]       = useState('liviano');
  const [newVPlate, setNewVPlate]     = useState('');
  // Contraseña
  const [showPassSec, setShowPassSec] = useState(false);
  const [passForm, setPassForm]       = useState({ current: '', newPass: '', confirm: '' });
  const [showP, setShowP]             = useState({ c: false, n: false, cf: false });
  const [savingPass, setSavingPass]   = useState(false);

  const tier      = cTier?.name || 'ORO';
  const isDark    = tier === 'BLACK';
  const isPlatino = tier === 'PLATINO';

  const TH = {
    bg:         isDark ? '#06060C'                   : isPlatino ? '#E8E8E8'    : '#fff',
    header:     isDark ? '#fff'                      : '#0D0D0D',
    text:       isDark ? '#E0E0E0'                   : '#424242',
    sub:        isDark ? 'rgba(255,255,255,.5)'       : '#9E9E9E',
    accent:     isDark ? '#FFD54F'                   : isPlatino ? '#1565C0'    : '#FBBC04',
    cardBg:     isDark ? 'rgba(255,255,255,.05)'     : isPlatino ? 'rgba(255,255,255,.6)' : '#fff',
    cardBorder: isDark ? '1px solid rgba(255,255,255,.08)' : isPlatino ? '1px solid #BDBDBD' : '1px solid #eee',
    warnBg:     isDark ? 'rgba(255,255,255,.05)'     : isPlatino ? 'rgba(21,101,192,.08)' : '#FFF3E0',
    warnHdr:    isDark ? '#FFB74D'                   : '#E65100',
    warnTxt:    isDark ? '#EF5350'                   : '#C62828',
    inputBg:    isDark ? '#1A1A2E'                   : isPlatino ? '#F5F5F5'    : '#FAFAFA',
    divider:    isDark ? 'rgba(255,255,255,.06)'     : '#F0F0F0',
  };

  // ── Guardar cambios de cuenta ────────────────────────────
  const saveAccount = async () => {
    if (!form.name?.trim()) { fire('❌ El nombre es obligatorio'); return; }
    if (form.phone && !/^\d{8}$/.test(form.phone.trim())) { fire('❌ Teléfono debe tener 8 dígitos'); return; }
    setSaving(true);
    const updates = { name: form.name.trim(), phone: form.phone?.trim() || me.phone, email: form.email?.trim() || null, nit: form.nit?.trim() || null, plate: form.plate?.trim() || null };
    if (sbConnected && sb) {
      const { error } = await sb.from('members').update(updates).eq('id', me.id);
      if (error) { fire('❌ Error al guardar: ' + error.message); setSaving(false); return; }
    }
    setMe(p => ({ ...p, ...updates }));
    setSaving(false);
    fire('✅ Datos actualizados');
    setSection(null);
  };

  // ── Items del menú principal ─────────────────────────────
  const menuItems = [
    { id: 'cuenta',      icon: '👤', label: 'Mi Cuenta',              desc: 'Editar datos personales' },
    { id: 'niveles',     icon: '🏆', label: 'Niveles y Beneficios',    desc: 'ORO, PLATINO y BLACK' },
    { id: 'inactividad', icon: '⚠️', label: 'Reglas de Inactividad',   desc: 'Condiciones de degradación' },
    { id: 'terminos',    icon: '📜', label: 'Términos y Condiciones',  desc: 'Condiciones de uso del programa' },
  ];

  // ── Render ───────────────────────────────────────────────
  const Back = () => (
    <button onClick={() => setSection(null)} style={{ background: 'none', border: 'none', color: TH.accent, cursor: 'pointer', fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, padding: '0 0 16px' }}>
      ← Volver al menú
    </button>
  );

  // ── Guardar contraseña ──────────────────────────────────
  const savePassword = async () => {
    if (!passForm.newPass || passForm.newPass.length < 6) { fire('❌ La contraseña debe tener al menos 6 caracteres'); return; }
    if (passForm.newPass !== passForm.confirm) { fire('❌ Las contraseñas no coinciden'); return; }
    setSavingPass(true);
    const hashed = 'pw:' + btoa(passForm.newPass);
    if (sbConnected && sb) {
      const { error } = await sb.from('members').update({ password_hash: hashed }).eq('id', me.id);
      if (error) { fire('❌ Error: ' + error.message); setSavingPass(false); return; }
    }
    setMe(p => ({ ...p, password_hash: hashed }));
    setSavingPass(false);
    setPassForm({ current: '', newPass: '', confirm: '' });
    setShowPassSec(false);
    fire('✅ Contraseña actualizada');
  };

  // ── MI CUENTA ────────────────────────────────────────────
  if (section === 'cuenta') {
    const f = form || { name: me?.name || '', phone: me?.phone || '', email: me?.email || '', nit: me?.nit || '' };
    if (!form) { setForm(f); }

    // Cargar vehículos del activity_log si aún no se cargaron
    const LBL = k => ({ label: '', icon: '' , ...typeInfo(k) });

    const editFields = [
      { k: 'name',  l: 'Nombre completo',   icon: '👤', type: 'text'  },
      { k: 'phone', l: 'Teléfono',          icon: '📱', type: 'tel'   },
      { k: 'email', l: 'Correo electrónico',icon: '📧', type: 'email' },
      { k: 'nit',   l: 'NIT',              icon: '🧾', type: 'text'  },
    ];
    const readonlyFields = [
      { l: 'DPI',               icon: '🪪', val: me?.dpi || '—' },
      { l: 'Fecha de nacimiento',icon: '🎂', val: me?.bday ? me.bday.replace('-', '/') : '—' },
    ];

    return (
      <div style={{ minHeight: '100vh', background: TH.bg, padding: '20px 20px 100px' }}>
        <Back />
        <div style={{ fontSize: 20, fontWeight: 900, color: TH.header, marginBottom: 20 }}>👤 Mi Cuenta</div>

        {/* Campos editables */}
        {editFields.map(field => (
          <div key={field.k} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: TH.sub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>{field.icon} {field.l}</div>
            <input type={field.type} value={form?.[field.k] || ''} onChange={e => setForm(p => ({ ...p, [field.k]: e.target.value }))}
              style={{ ...inputStyle, background: TH.inputBg, border: TH.cardBorder, color: TH.header, width: '100%', boxSizing: 'border-box' }} />
          </div>
        ))}

        {/* Campos bloqueados */}
        {readonlyFields.map(f => (
          <div key={f.l} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: TH.sub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>{f.icon} {f.l}</div>
            <div style={{ padding: '14px 16px', borderRadius: 14, background: isDark ? 'rgba(255,255,255,.03)' : '#F5F5F5', border: TH.cardBorder, fontSize: 14, color: TH.sub, fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
              {f.val} <span style={{ fontSize: 11 }}>🔒</span>
            </div>
          </div>
        ))}

        <button onClick={saveAccount} disabled={saving} style={{ width: '100%', padding: 16, borderRadius: 16, border: 'none', background: TH.accent, color: isDark ? '#0D0D0D' : isPlatino ? '#fff' : '#0D0D0D', fontFamily: "'DM Sans'", fontSize: 15, fontWeight: 900, cursor: 'pointer', marginBottom: 24, opacity: saving ? .7 : 1 }}>
          {saving ? 'Guardando...' : '✓ Guardar cambios'}
        </button>

        {/* ── Vehículos ── */}
        <div style={{ fontSize: 14, fontWeight: 900, color: TH.header, marginBottom: 12 }}>🚗 Mis Vehículos</div>
        {vehicles.map((v, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 14, background: TH.cardBg, border: TH.cardBorder, marginBottom: 10 }}>
            <div style={{ fontSize: 28, flexShrink: 0 }}>{typeInfo(v.type).icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: TH.header }}>{v.plate}</div>
              <div style={{ fontSize: 12, color: TH.sub }}>{typeInfo(v.type).label}</div>
            </div>
            <button onClick={() => setVehicles(p => p.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#EF5350' }}>✕</button>
          </div>
        ))}
        {addingV ? (
          <div style={{ background: TH.cardBg, border: TH.cardBorder, borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: TH.sub, marginBottom: 8, textTransform: 'uppercase' }}>Tipo de vehículo</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              {VEHICLE_TYPES.map(t => (
                <button key={t.k} onClick={() => setNewVType(t.k)} style={{ padding: '10px 8px', borderRadius: 10, border: `2px solid ${newVType === t.k ? TH.accent : 'transparent'}`, background: newVType === t.k ? (isDark ? 'rgba(255,213,79,.1)' : '#FFF8E1') : (isDark ? 'rgba(255,255,255,.04)' : '#F5F5F5'), fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 700, cursor: 'pointer', color: TH.header, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 18 }}>{t.icon}</span> {t.label}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: TH.sub, marginBottom: 8, textTransform: 'uppercase' }}>Placa</div>
            <input placeholder="Ej: ABC-123" value={newVPlate} onChange={e => setNewVPlate(e.target.value.toUpperCase())}
              style={{ ...inputStyle, background: TH.inputBg, border: TH.cardBorder, color: TH.header, marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setAddingV(false); setNewVPlate(''); }} style={{ flex: 1, padding: 12, borderRadius: 12, border: TH.cardBorder, background: 'none', color: TH.sub, fontFamily: "'DM Sans'", fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={async () => {
                if (!newVPlate.trim()) { fire('❌ Ingresa la placa'); return; }
                const newV = { type: newVType, plate: newVPlate.trim() };
                const updated = [...vehicles, newV];
                setVehicles(updated);
                setAddingV(false); setNewVPlate('');
                if (sb && sbConnected) {
                  await sb.from('members').update({ plate: updated[0]?.plate || '' }).eq('id', me.id);
                  await sb.from('activity_log').insert({ member_id: me.id, activity_type: 'vehiculo', description: `Vehículo agregado: ${typeInfo(newVType).label} ${newV.plate}`, points_change: 0 });
                }
                fire('✅ Vehículo agregado');
              }} style={{ flex: 2, padding: 12, borderRadius: 12, border: 'none', background: TH.accent, color: isDark ? '#0D0D0D' : isPlatino ? '#fff' : '#0D0D0D', fontFamily: "'DM Sans'", fontWeight: 800, cursor: 'pointer' }}>
                + Agregar
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAddingV(true)} style={{ width: '100%', padding: 14, borderRadius: 14, border: `2px dashed ${TH.accent}`, background: 'none', color: TH.accent, fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 24 }}>
            + Agregar vehículo
          </button>
        )}

        {/* ── Contraseña ── */}
        <button onClick={() => setShowPassSec(p => !p)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 14, border: TH.cardBorder, background: TH.cardBg, fontFamily: "'DM Sans'", cursor: 'pointer', marginBottom: showPassSec ? 12 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>🔑</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: TH.header }}>Cambiar contraseña</div>
              <div style={{ fontSize: 11, color: TH.sub }}>Actualizar tu contraseña de acceso</div>
            </div>
          </div>
          <span style={{ color: TH.sub, fontSize: 18 }}>{showPassSec ? '▲' : '▼'}</span>
        </button>

        {showPassSec && (
          <div style={{ background: TH.cardBg, border: TH.cardBorder, borderRadius: 16, padding: 16, marginBottom: 24 }}>
            {[
              { k: 'newPass', l: 'Nueva contraseña',    pk: 'n' },
              { k: 'confirm', l: 'Confirmar contraseña', pk: 'cf' },
            ].map(f => (
              <div key={f.k} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: TH.sub, marginBottom: 6, textTransform: 'uppercase' }}>{f.l}</div>
                <div style={{ position: 'relative' }}>
                  <input type={showP[f.pk] ? 'text' : 'password'} placeholder="••••••••" value={passForm[f.k]}
                    onChange={e => setPassForm(p => ({ ...p, [f.k]: e.target.value }))}
                    style={{ ...inputStyle, background: TH.inputBg, border: TH.cardBorder, color: TH.header, paddingRight: 48, borderColor: f.k === 'confirm' && passForm.confirm && passForm.confirm !== passForm.newPass ? '#EF5350' : f.k === 'confirm' && passForm.confirm && passForm.confirm === passForm.newPass ? '#4CAF50' : undefined }} />
                  <button type="button" onClick={() => setShowP(p => ({ ...p, [f.pk]: !p[f.pk] }))} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: TH.sub }}>
                    {showP[f.pk] ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
            ))}
            {passForm.confirm && passForm.confirm === passForm.newPass && <div style={{ fontSize: 11, color: '#4CAF50', fontWeight: 700, marginBottom: 10 }}>✓ Las contraseñas coinciden</div>}
            <button onClick={savePassword} disabled={savingPass} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: TH.accent, color: isDark ? '#0D0D0D' : isPlatino ? '#fff' : '#0D0D0D', fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 900, cursor: 'pointer', opacity: savingPass ? .7 : 1 }}>
              {savingPass ? 'Guardando...' : '🔒 Actualizar contraseña'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── NIVELES ──────────────────────────────────────────────
  if (section === 'niveles') {
    const tiers = [0, 150, 500].map(g => makeTier(g, cfg));
    const memberGal = me?.gallons || 0;
    return (
      <div style={{ paddingBottom: 100, minHeight: '100vh', background: TH.bg }}>
        <div style={{ padding: '20px 20px 0' }}>
          <Back />
          <div style={{ fontSize: 20, fontWeight: 900, color: TH.header, marginBottom: 20 }}>🏆 Niveles y Beneficios</div>
        </div>
        {tiers.map((t, i) => {
          const isCurrentTier = cTier?.name === t.name;
          return (
            <div key={t.name} style={{ position: 'relative' }}>
              {isCurrentTier && (
                <div style={{ position: 'absolute', top: 6, right: 26, zIndex: 10, background: t.name === 'BLACK' ? 'rgba(255,215,79,.9)' : t.name === 'PLATINO' ? '#1565C0' : 'rgba(0,0,0,.75)', color: t.name === 'BLACK' ? '#000' : '#fff', fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 8 }}>
                  📍 TU NIVEL · {memberGal.toFixed(0)} gal
                </div>
              )}
              <TierCard t={t} gal={isCurrentTier ? memberGal : [0, 150, 500][i]} small cfg={cfg} />
            </div>
          );
        })}
      </div>
    );
  }

  // ── INACTIVIDAD ──────────────────────────────────────────
  if (section === 'inactividad') {
    return (
      <div style={{ paddingBottom: 100, minHeight: '100vh', background: TH.bg, padding: '20px 20px 100px' }}>
        <Back />
        <div style={{ fontSize: 20, fontWeight: 900, color: TH.header, marginBottom: 6 }}>⚠️ Reglas de Inactividad</div>
        <div style={{ fontSize: 13, color: TH.sub, marginBottom: 24 }}>El nivel se ajusta automáticamente según los días sin actividad registrada en la aplicación.</div>
        {(cfg.degrad || []).map((d, i) => (
          <div key={i} style={{ marginBottom: 14, background: TH.warnBg, borderRadius: 16, padding: 16, border: `1px solid ${isDark ? 'rgba(255,255,255,.06)' : '#FFE0B2'}` }}>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 8, color: TH.warnHdr }}>📍 {d.tier}</div>
            {d.rules.map((r, j) => (
              <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: TH.warnHdr, color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{j+1}</div>
                <div style={{ fontSize: 13, color: TH.text, lineHeight: 1.4 }}><strong>{r.days} días</strong> sin actividad → {r.effect}</div>
              </div>
            ))}
          </div>
        ))}
        <div style={{ padding: '12px 16px', borderRadius: 14, background: isDark ? 'rgba(255,255,255,.04)' : '#F5F5F5', border: TH.cardBorder, marginTop: 8 }}>
          <div style={{ fontSize: 12, color: TH.sub, lineHeight: 1.6 }}>
            💡 Cualquier compra, canje, encuesta o compra de boletos de rifa cuenta como actividad y reinicia el contador de inactividad.
          </div>
        </div>
      </div>
    );
  }

  // ── TÉRMINOS Y CONDICIONES ────────────────────────────────
  if (section === 'terminos') {
    const secs = [
      {
        title: 'OBJETO',
        body: 'Los presentes Términos y Condiciones regulan la relación entre Gasolineras Turkaj ("Turkaj") y el usuario del programa de fidelización Club Turkaj ("el Programa"), disponible a través de la aplicación web progresiva accesible en club-turkaj.vercel.app. Al acceder y utilizar el Programa, el usuario acepta expresamente haber leído, comprendido y adherirse a los presentes términos, así como a las leyes vigentes de la República de Guatemala.',
      },
      {
        title: 'DESCRIPCIÓN DEL PROGRAMA',
        body: 'Club Turkaj es un programa de lealtad que permite a los clientes de Gasolineras Turkaj I, II y III en Chichicastenango, Guatemala, acumular puntos por compras de combustible y canjearlos por premios, descuentos y beneficios exclusivos. La participación en el Programa es voluntaria y gratuita.',
      },
      {
        title: 'REGISTRO Y MEMBRESÍA',
        body: 'Para participar en el Programa, el usuario debe registrarse proporcionando su nombre completo, Documento Personal de Identificación (DPI), número de teléfono y fecha de nacimiento. El usuario garantiza que la información proporcionada es verídica y exacta. Cada persona física puede tener una única cuenta activa. Turkaj se reserva el derecho de suspender cuentas con información incorrecta o duplicadas.',
      },
      {
        title: 'ACUMULACIÓN DE PUNTOS',
        body: 'Los puntos se acumulan a razón de 1 punto por cada Q10.00 de combustible comprado en las estaciones Turkaj I, II y III. Los puntos se asignan al momento de registrar la compra mediante el código QR personal del miembro. Turkaj puede otorgar puntos adicionales en eventos especiales, días festivos o aniversarios, según lo determine el programa en cada momento. Los puntos no tienen valor monetario y no son transferibles entre miembros.',
      },
      {
        title: 'NIVELES DE MEMBRESÍA',
        body: 'El Programa cuenta con tres niveles basados en el consumo acumulado de galones: ORO (0 a 149 galones), PLATINO (150 a 499 galones) y BLACK (500 galones o más). Cada nivel otorga beneficios diferenciados incluyendo descuentos en canje de premios y descuentos por galón. El nivel se calcula automáticamente con base en el historial de compras registradas en el Programa.',
      },
      {
        title: 'CANJE DE PUNTOS',
        body: 'Los puntos acumulados pueden canjearse por premios del catálogo disponible en la aplicación, sujetos a disponibilidad. El canje requiere la confirmación del miembro a través de la aplicación y la presencia física del miembro en la estación al momento de recibir el premio. Los premios canjeados no son reembolsables ni transferibles. Los miembros PLATINO y BLACK reciben descuentos del 10% y 15% respectivamente sobre el costo en puntos de los premios.',
      },
      {
        title: 'RIFA MENSUAL',
        body: 'Cada mes el Programa realiza una rifa entre los miembros participantes. Los boletos de rifa tienen un costo de 5 puntos cada uno. La participación en la rifa es voluntaria. El ganador se determina de forma aleatoria entre los boletos adquiridos para ese mes. Los puntos utilizados en la compra de boletos no son reembolsables en ningún caso.',
      },
      {
        title: 'INACTIVIDAD Y DEGRADACIÓN',
        body: 'Turkaj monitorea la actividad de los miembros. La inactividad prolongada puede resultar en la degradación del nivel del miembro o la pérdida de puntos acumulados, según las reglas de inactividad vigentes disponibles en la sección correspondiente de la aplicación. Las reglas de inactividad pueden modificarse con previo aviso al miembro a través de la aplicación.',
      },
      {
        title: 'PRIVACIDAD Y PROTECCIÓN DE DATOS',
        body: 'Turkaj recopila y procesa los datos personales del usuario con el único fin de operar el Programa de fidelización. Los datos no serán vendidos, cedidos ni compartidos con terceros sin consentimiento del usuario, salvo obligación legal. El usuario puede solicitar la eliminación de su cuenta y datos en cualquier momento contactando a Turkaj directamente.',
      },
      {
        title: 'MODIFICACIONES AL PROGRAMA',
        body: 'Turkaj se reserva el derecho de modificar, suspender o cancelar el Programa, sus beneficios, reglas o catálogo de premios en cualquier momento. Los cambios serán notificados a través de la aplicación. El uso continuado del Programa después de la notificación de cambios implica la aceptación de los mismos por parte del usuario.',
      },
      {
        title: 'PROPIEDAD INTELECTUAL',
        body: 'La aplicación Club Turkaj, su diseño, marca, logotipos, contenidos y código fuente son propiedad exclusiva de Gasolineras Turkaj. El usuario no podrá reproducir, copiar, distribuir ni modificar ningún elemento de la aplicación sin autorización expresa y por escrito de Turkaj.',
      },
      {
        title: 'LIMITACIÓN DE RESPONSABILIDAD',
        body: 'Turkaj no será responsable por fallas técnicas de la aplicación, interrupciones del servicio, pérdida de datos por causas de fuerza mayor o cualquier perjuicio indirecto derivado del uso del Programa. La responsabilidad máxima de Turkaj frente al usuario se limita al valor en puntos de los beneficios directamente afectados.',
      },
      {
        title: 'JURISDICCIÓN',
        body: 'Los presentes Términos y Condiciones se rigen por las leyes de la República de Guatemala. Cualquier controversia derivada de su interpretación o cumplimiento será sometida a los tribunales competentes del municipio de Chichicastenango, Quiché, Guatemala, renunciando las partes a cualquier otro fuero que pudiere corresponderles.',
      },
      {
        title: 'CONTACTO',
        body: 'Para consultas, reclamos o solicitudes relacionadas con el Programa, el usuario puede comunicarse con Gasolineras Turkaj directamente en cualquiera de las tres estaciones ubicadas en Chichicastenango, Guatemala, o a través de los canales de contacto habilitados en la aplicación.',
      },
    ];

    return (
      <div style={{ paddingBottom: 100, minHeight: '100vh', background: TH.bg, padding: '20px 20px 100px' }}>
        <Back />
        <div style={{ fontSize: 20, fontWeight: 900, color: TH.header, marginBottom: 4 }}>📜 Términos y Condiciones</div>
        <div style={{ fontSize: 12, color: TH.sub, marginBottom: 24 }}>Club Turkaj — Gasolineras Turkaj, Chichicastenango, Guatemala</div>

        {secs.map((s, i) => (
          <div key={i} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: TH.accent, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
              {String(i + 1).padStart(2, '0')}. {s.title}
            </div>
            <div style={{ fontSize: 13, color: TH.text, lineHeight: 1.7, paddingLeft: 12, borderLeft: `2px solid ${TH.accent}` }}>
              {s.body}
            </div>
          </div>
        ))}

        <div style={{ marginTop: 24, padding: '14px 16px', borderRadius: 14, background: isDark ? 'rgba(255,255,255,.04)' : '#F5F5F5', border: TH.cardBorder }}>
          <div style={{ fontSize: 11, color: TH.sub, textAlign: 'center', lineHeight: 1.6 }}>
            Al utilizar Club Turkaj aceptás estos términos y condiciones.<br />
            Última actualización: Mayo 2026
          </div>
        </div>
      </div>
    );
  }

  // ── MENÚ PRINCIPAL ───────────────────────────────────────
  return (
    <div style={{ paddingBottom: 100, minHeight: '100vh', background: TH.bg }}>
      {/* Header */}
      <div style={{ padding: '24px 20px 20px' }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: TH.header }}>☰ Menú</div>
        {me && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 16, padding: '14px 18px', borderRadius: 18, background: TH.cardBg, border: TH.cardBorder }}>
            <div style={{ width: 48, height: 48, borderRadius: 16, background: isDark ? 'rgba(255,213,79,.15)' : '#FFF8E1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: TH.accent, flexShrink: 0 }}>
              {(me.name || '?')[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: TH.header, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{me.name}</div>
              <div style={{ fontSize: 12, color: TH.sub, marginTop: 2 }}>{me.cardId || '—'} · <span style={{ color: TH.accent, fontWeight: 700 }}>{tier}</span></div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: TH.accent }}>{me.points}</div>
              <div style={{ fontSize: 9, color: TH.sub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5 }}>puntos</div>
            </div>
          </div>
        )}
      </div>

      {/* Items */}
      <div style={{ padding: '0 20px' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: TH.sub, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>
          Opciones
        </div>
        {menuItems.map((item, i) => (
          <button key={item.id} onClick={() => { setSection(item.id); setForm(null); }} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 16,
            padding: '16px 18px', borderRadius: 16, border: TH.cardBorder,
            background: TH.cardBg, marginBottom: 10, cursor: 'pointer',
            fontFamily: "'DM Sans'", textAlign: 'left',
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: isDark ? 'rgba(255,255,255,.08)' : '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
              {item.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: TH.header }}>{item.label}</div>
              <div style={{ fontSize: 12, color: TH.sub, marginTop: 2 }}>{item.desc}</div>
            </div>
            <div style={{ fontSize: 18, color: TH.sub }}>›</div>
          </button>
        ))}

        {/* Cerrar sesión */}
        <button onClick={logout} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 16,
          padding: '16px 18px', borderRadius: 16,
          border: `1px solid ${isDark ? 'rgba(239,83,80,.2)' : '#FFCDD2'}`,
          background: isDark ? 'rgba(239,83,80,.08)' : '#FFF5F5',
          marginTop: 8, cursor: 'pointer', fontFamily: "'DM Sans'", textAlign: 'left',
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: isDark ? 'rgba(239,83,80,.15)' : '#FFEBEE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
            🚪
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#E53935' }}>Cerrar sesión</div>
            <div style={{ fontSize: 12, color: TH.sub, marginTop: 2 }}>Salir de Club Turkaj</div>
          </div>
        </button>
      </div>
    </div>
  );
}
