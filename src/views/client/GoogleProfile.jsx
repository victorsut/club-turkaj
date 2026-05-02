// src/views/client/GoogleProfile.jsx
import { useState, useRef, useEffect } from 'react';
import { sb } from '../../lib/supabaseClient';
import { inputStyle, btnStyle } from '../../constants/styles';
import { CARD_PREFIX } from '../../constants/config';
import { Back } from '../../components/ui/Icons';
import { getNextCardCode } from '../../services/dataService';

// ── Tipos de vehículo ─────────────────────────────────────
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
const VEHICLE_PTS = 2;

// ═══════════════════════════════════════════════════════════
// Drum Picker
// ═══════════════════════════════════════════════════════════
const ITEM_H   = 48;
const VISIBLE  = 5;
const CENTER_Y = ITEM_H * Math.floor(VISIBLE / 2);

function DrumPicker({ items, selectedIndex, onChange }) {
  const indexToY = idx => CENTER_Y - idx * ITEM_H;
  const yToIndex = y   => Math.round((CENTER_Y - y) / ITEM_H);

  const translateRef  = useRef(indexToY(selectedIndex));
  const [displayY, setDisplayY]     = useState(translateRef.current);
  const [isSnapping, setIsSnapping] = useState(false);
  const isDragging    = useRef(false);
  const startYRef     = useRef(0);
  const startTransRef = useRef(0);
  const containerRef  = useRef(null);

  useEffect(() => {
    if (!isDragging.current) {
      const target = indexToY(selectedIndex);
      translateRef.current = target;
      setIsSnapping(true);
      setDisplayY(target);
    }
  }, [selectedIndex]);

  const onDown = e => {
    e.preventDefault();
    isDragging.current    = true;
    startYRef.current     = e.clientY;
    startTransRef.current = translateRef.current;
    setIsSnapping(false);
    containerRef.current?.setPointerCapture(e.pointerId);
  };
  const onMove = e => {
    if (!isDragging.current) return;
    const newY = startTransRef.current + (e.clientY - startYRef.current);
    translateRef.current = newY;
    setDisplayY(newY);
  };
  const onUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const idx    = Math.max(0, Math.min(items.length - 1, yToIndex(translateRef.current)));
    const snappy = indexToY(idx);
    translateRef.current = snappy;
    setIsSnapping(true);
    setDisplayY(snappy);
    onChange(idx);
  };

  return (
    <div ref={containerRef}
      style={{ flex: 1, height: ITEM_H * VISIBLE, overflow: 'hidden', position: 'relative', cursor: 'grab', touchAction: 'none', userSelect: 'none' }}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
    >
      <div style={{ position: 'absolute', top: CENTER_Y, left: 6, right: 6, height: ITEM_H, background: 'rgba(251,188,4,.12)', borderRadius: 10, borderTop: '1.5px solid rgba(251,188,4,.5)', borderBottom: '1.5px solid rgba(251,188,4,.5)', pointerEvents: 'none', zIndex: 2 }} />
      <div style={{ transform: `translateY(${displayY}px)`, transition: isSnapping ? 'transform .22s ease' : 'none', willChange: 'transform' }}>
        {items.map((item, i) => (
          <div key={i} style={{ height: ITEM_H, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: i === selectedIndex ? 17 : 14, fontWeight: i === selectedIndex ? 800 : 400, color: i === selectedIndex ? '#0D0D0D' : '#BDBDBD', fontFamily: "'DM Sans'", userSelect: 'none' }}>
            {item.label}
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: CENTER_Y, background: 'linear-gradient(to bottom, rgba(255,255,255,.97), rgba(255,255,255,0))', pointerEvents: 'none', zIndex: 3 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: CENTER_Y, background: 'linear-gradient(to top, rgba(255,255,255,.97), rgba(255,255,255,0))', pointerEvents: 'none', zIndex: 3 }} />
    </div>
  );
}

// ── Date Drum Picker ──────────────────────────────────────
const MONTHS      = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS_ITEMS  = Array.from({ length: 31 }, (_, i) => ({ label: String(i + 1).padStart(2, '0') }));
const MONTH_ITEMS = MONTHS.map(m => ({ label: m }));

function DateDrumPicker({ value, onChange }) {
  const maxYear = new Date().getFullYear() - 16;
  const years   = Array.from({ length: maxYear - 1930 + 1 }, (_, i) => ({ label: String(1930 + i) }));

  const parse = () => {
    if (value && value.includes('-')) {
      const [y, m, d] = value.split('-').map(Number);
      const yi = years.findIndex(yr => yr.label === String(y));
      return { d: isNaN(d) ? 0 : d - 1, m: isNaN(m) ? 0 : m - 1, y: yi < 0 ? years.findIndex(yr => yr.label === '2000') : yi };
    }
    const def = years.findIndex(yr => yr.label === '2000');
    return { d: 0, m: 0, y: def < 0 ? 0 : def };
  };

  const init = parse();
  const [di, setDi] = useState(init.d);
  const [mi, setMi] = useState(init.m);
  const [yi, setYi] = useState(init.y);

  const emit = (d, m, y) => {
    const year  = parseInt(years[y].label);
    onChange(`${year}-${String(m + 1).padStart(2,'0')}-${String(d + 1).padStart(2,'0')}`);
  };

  return (
    <div style={{ display: 'flex', background: '#fff', borderRadius: 16, border: '1.5px solid #eee', overflow: 'hidden' }}>
      <DrumPicker items={DAYS_ITEMS}  selectedIndex={di} onChange={i => { setDi(i); emit(i, mi, yi); }} />
      <div style={{ width: 1, background: '#F0F0F0' }} />
      <DrumPicker items={MONTH_ITEMS} selectedIndex={mi} onChange={i => { setMi(i); emit(di, i, yi); }} />
      <div style={{ width: 1, background: '#F0F0F0' }} />
      <DrumPicker items={years}       selectedIndex={yi} onChange={i => { setYi(i); emit(di, mi, i); }} />
    </div>
  );
}

// ── UI helpers ────────────────────────────────────────────
function StepBar({ step }) {
  const steps = ['Datos\npersonales', 'Datos\nadicionales', 'Vehículos', 'Contraseña'];
  const idx = { step1: 0, step2: 1, step3: 2, step4: 3 }[step] ?? 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
      {steps.map((label, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: i <= idx ? '#FBBC04' : '#E0E0E0', color: i <= idx ? '#0D0D0D' : '#9E9E9E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, boxShadow: i === idx ? '0 0 0 4px rgba(251,188,4,.2)' : 'none' }}>
              {i < idx ? '✓' : i + 1}
            </div>
            <div style={{ fontSize: 9, fontWeight: 700, color: i <= idx ? '#F0A500' : '#9E9E9E', textAlign: 'center', whiteSpace: 'pre-line', lineHeight: 1.2 }}>{label}</div>
          </div>
          {i < steps.length - 1 && <div style={{ flex: 1, height: 2, background: i < idx ? '#FBBC04' : '#E0E0E0', margin: '0 6px', marginBottom: 18 }} />}
        </div>
      ))}
    </div>
  );
}

function PtsCard({ total, base, optional, vehicles }) {
  return (
    <div style={{ background: '#FFF8E1', borderRadius: 14, padding: '12px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontSize: 11, color: '#9E9E9E', fontWeight: 700, textTransform: 'uppercase' }}>Puntos al registrarte</div>
        <div style={{ fontSize: 11, color: '#9E9E9E', marginTop: 2 }}>Base {base} + opcionales {optional} + vehículos {vehicles}</div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color: '#F0A500' }}>{total}</div>
    </div>
  );
}

function Field({ icon, placeholder, fieldKey, type, inputMode, maxLen, bonus,
                 regProfile, setRegProfile, clearAuthErr, regOptional }) {
  const val    = regProfile[fieldKey] || '';
  const filled = val.trim().length > 0;
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, zIndex: 1 }}>{icon}</div>
      <input
        placeholder={placeholder} type={type || 'text'} inputMode={inputMode} maxLength={maxLen}
        value={val}
        onChange={e => {
          let v = inputMode === 'numeric' ? e.target.value.replace(/[^0-9]/g, '') : e.target.value;
          if (maxLen && v.length > maxLen) v = v.slice(0, maxLen);
          setRegProfile(p => ({ ...p, [fieldKey]: v }));
          clearAuthErr();
        }}
        style={{ ...inputStyle, paddingLeft: 42 }}
      />
      {bonus && filled && (
        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 10, fontWeight: 800, color: '#4CAF50', background: '#E8F5E9', padding: '2px 8px', borderRadius: 8 }}>+{regOptional} pts</div>
      )}
    </div>
  );
}

// Campo fecha: muestra texto normal, drum picker en bottom sheet al tocar
function DateField({ value, onOpen }) {
  const formatDisplay = v => {
    if (!v || !v.includes('-')) return null;
    const [y, m, d] = v.split('-').map(Number);
    if (!y || !m || !d) return null;
    const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return `${String(d).padStart(2,'0')} / ${months[m-1]} / ${y}`;
  };
  const display = formatDisplay(value);
  return (
    <div onClick={onOpen} style={{ ...inputStyle, paddingLeft: 42, display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative', color: display ? '#0D0D0D' : '#9E9E9E', userSelect: 'none' }}>
      <div style={{ position: 'absolute', left: 14, fontSize: 16 }}>🎂</div>
      <span style={{ flex: 1 }}>{display || 'Fecha de nacimiento *'}</span>
      <span style={{ fontSize: 13, color: '#BDBDBD' }}>›</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Componente principal
// ═══════════════════════════════════════════════════════════
export default function GoogleProfile(ctx) {
  const { me, setMe, setCusts, cfg, googleStep, setGoogleStep,
    regProfile, setRegProfile, authError, setAuthError, clearAuthErr,
    setAuthScreen, fire, sbConnected, logActivity } = ctx;

  const [vehicles, setVehicles]           = useState([]);
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [newType, setNewType]             = useState('liviano');
  const [newPlate, setNewPlate]           = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate]             = useState('2000-01-01');
  const [password, setPassword]             = useState('');
  const [passConfirm, setPassConfirm]       = useState('');
  const [showPass, setShowPass]             = useState(false);
  const [showPassConfirm, setShowPassConfirm] = useState(false);

  // ── Verificar si el telefono o DPI ya existe en Supabase ─
  const checkPhoneDuplicate = async (phone) => {
    if (!sb || !phone) return false;
    const { data } = await sb.from('members').select('id').eq('phone', phone.trim()).maybeSingle();
    return !!data;
  };

  const checkDpiDuplicate = async (dpi) => {
    if (!sb || !dpi) return false;
    const { data } = await sb.from('members').select('id').eq('dpi', dpi.trim()).maybeSingle();
    return !!data;
  };

  // Solo email y nit dan puntos opcionales
  const regOptional = cfg.regOptional || 2;
  const optFields  = ['email', 'nit'].filter(k => regProfile[k]?.trim()).length;
  const vehiclePts = vehicles.length * VEHICLE_PTS;
  const totalPts   = (cfg.regBase || 15) + optFields * regOptional + vehiclePts;

  const fieldProps = { regProfile, setRegProfile, clearAuthErr, regOptional };

  const [saving, setSaving] = useState(false);

  // ── Guardar ───────────────────────────────────────────────
  const doFinish = async () => {
    if (!password.trim() || password.length < 6) { setAuthError('La contrasena debe tener al menos 6 caracteres'); return; }
    if (password !== passConfirm) { setAuthError('Las contrasenas no coinciden'); return; }
    setSaving(true);
    try {
      const firstPlate = vehicles[0]?.plate || '';
      // Obtener correlativo con fallback si falla Supabase
      let fallbackCard = 'CTOD-00001';
      try { fallbackCard = await getNextCardCode('ORO'); } catch(e) { console.warn('[Reg] getNextCardCode falló, usando fallback'); }

      const bdayRaw = regProfile.bday || '';
      let bdayStored = '';
      if (bdayRaw) { const p = bdayRaw.split('-'); if (p.length === 3) bdayStored = p[1] + '-' + p[2]; }

      const updated = { ...me, name: regProfile.name, phone: regProfile.phone || '', dpi: regProfile.dpi || '', plate: firstPlate, email: regProfile.email || me?.email || '', bday: bdayStored, nit: regProfile.nit || '', points: totalPts, cardId: fallbackCard };
      setMe(updated);
      setCusts(p => [...p, updated]);
      setAuthScreen('logged');
      setGoogleStep('welcome');
      fire('Bienvenido a Club Turkaj! +' + totalPts + ' pts de registro');

      if (sb && sbConnected) {
        const provider   = me?.authProvider || 'manual';
        const providerId = me?.id?.startsWith('temp-') ? null : me?.id;
        const memberData = {
          phone:            regProfile.phone?.trim() || (provider === 'google' ? 'goog_' + (me?.id || '').substring(0, 12) : null),
          password_hash:    'pw:' + btoa(password),
          auth_provider:    provider,
          auth_provider_id: providerId,
          name:             regProfile.name,
          dpi:              regProfile.dpi || null,
          plate:            firstPlate || null,
          vehicles:         vehicles.length > 0 ? vehicles : [],
          nit:              regProfile.nit || null,
          email:            regProfile.email || me?.email || null,
          birthday:         bdayStored || null,
          points:           totalPts,
          gallons: 0, spent: 0, visits: 0, tickets: 0, redeemed_count: 0, referral_count: 0,
        };
        console.log('[Reg] Insertando miembro:', memberData.name, memberData.phone);
        // Segunda verificacion antes del insert (por si acaso)
        const doubleCheck = await checkPhoneDuplicate(regProfile.phone?.trim());
        if (doubleCheck) {
          setAuthScreen('login'); setGoogleStep('welcome');
          fire('Este numero ya esta registrado. Inicia sesion.');
          setSaving(false); return;
        }
        const dpiDoubleCheck = await checkDpiDuplicate(regProfile.dpi?.trim());
        if (dpiDoubleCheck) {
          setAuthScreen('login'); setGoogleStep('welcome');
          fire('Este DPI ya esta registrado. Inicia sesion.');
          setSaving(false); return;
        }
        const { data: rows, error: memberErr } = await sb.from('members').insert(memberData).select();
        if (memberErr) { console.error('[Reg] Error insert members:', memberErr.message, memberErr.details); setSaving(false); return; }
        const dbId = rows?.[0]?.id;
        if (!dbId) { console.error('[Reg] No se obtuvo ID del miembro'); setSaving(false); return; }
        console.log('[Reg] Miembro creado con ID:', dbId);
        setMe(p => ({ ...p, id: dbId }));

        // Crear tarjeta
        const { data: cardRows, error: cardErr } = await sb.from('physical_cards').insert({ assigned_to: dbId, card_code: fallbackCard, tier: 'ORO', status: 'active' }).select();
        if (cardErr) console.error('[Reg] Error creando tarjeta:', cardErr.message);
        if (cardRows?.[0]) await sb.from('members').update({ card_id: cardRows[0].id }).eq('id', dbId);

        // Actividad de vehiculos
        if (vehicles.length > 0) {
          await sb.from('activity_log').insert({ member_id: dbId, activity_type: 'registro_vehiculos', description: vehicles.length + ' vehiculo(s) - +' + vehiclePts + ' pts', points_change: vehiclePts, metadata: { vehicles } });
        }
        logActivity(dbId, 'registro', 'Bienvenido a Club Turkaj - +' + totalPts + ' pts', totalPts);
        console.log('[Reg] Registro completado exitosamente');
      } else {
        console.warn('[Reg] Sin conexion a Supabase — registro solo en memoria');
      }
    } catch (err) {
      console.error('[Reg] Error inesperado:', err.message);
      setAuthError('Error al guardar. Intenta de nuevo.');
    }
    setSaving(false);
  };

  const errBox = authError ? (
    <div style={{ background: '#FFEBEE', color: '#C62828', padding: '10px 14px', borderRadius: 12, fontSize: 12, fontWeight: 700, marginBottom: 16, textAlign: 'center' }}>{authError}</div>
  ) : null;

  // ── Bottom sheet del drum picker ──────────────────────────
  const DatePickerSheet = () => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '0 0 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
          <button onClick={() => setShowDatePicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#9E9E9E', fontFamily: "'DM Sans'" }}>Cancelar</button>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0D0D0D' }}>Fecha de nacimiento</div>
          <button onClick={() => { setRegProfile(p => ({ ...p, bday: tempDate })); setShowDatePicker(false); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 800, color: '#FBBC04', fontFamily: "'DM Sans'" }}>Seleccionar</button>
        </div>
        <div style={{ padding: '12px 20px 0' }}>
          <DateDrumPicker value={tempDate} onChange={setTempDate} />
        </div>
      </div>
    </div>
  );

  // ══ PASO 1 — Datos personales (todos obligatorios, sin bonus) ═
  if (googleStep === 'step1' || googleStep === 'welcome') {
    const [checkingPhone, setCheckingPhone] = useState(false);
    const next = async () => {
      clearAuthErr();
      if (!regProfile.name?.trim())  { setAuthError('El nombre es obligatorio'); return; }
      if (!regProfile.bday?.trim())  { setAuthError('La fecha de nacimiento es obligatoria'); return; }
      if (!regProfile.dpi?.trim())   { setAuthError('El DPI es obligatorio'); return; }
      if (!/^\d{13}$/.test(regProfile.dpi.trim())) { setAuthError('El DPI debe tener exactamente 13 digitos'); return; }
      if (!regProfile.phone?.trim()) { setAuthError('El telefono es obligatorio'); return; }
      if (!/^\d{8}$/.test(regProfile.phone.trim())) { setAuthError('El telefono debe tener exactamente 8 digitos'); return; }
      // Verificar si el telefono ya esta registrado
      setCheckingPhone(true);
      const phoneExists = await checkPhoneDuplicate(regProfile.phone.trim());
      if (phoneExists) {
        setCheckingPhone(false);
        setAuthError('Este numero de telefono ya esta registrado. Si ya tienes cuenta, inicia sesion.');
        return;
      }
      // Verificar si el DPI ya esta registrado
      const dpiExists = await checkDpiDuplicate(regProfile.dpi.trim());
      setCheckingPhone(false);
      if (dpiExists) {
        setAuthError('Este DPI ya esta registrado. Si ya tienes cuenta, inicia sesion.');
        return;
      }
      setGoogleStep('step2');
    };
    return (
      <div style={{ padding: '40px 24px 120px' }}>
        {showDatePicker && <DatePickerSheet />}
        <button onClick={() => setAuthScreen('login')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#9E9E9E', fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600, marginBottom: 24 }}>
          <Back /> Volver
        </button>
        <StepBar step="step1" />
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#0D0D0D', marginBottom: 4 }}>Datos personales</div>
          <div style={{ fontSize: 13, color: '#9E9E9E' }}>Todos los campos son obligatorios</div>
        </div>
        {errBox}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          <Field {...fieldProps} icon="👤" placeholder="Nombre completo *" fieldKey="name" />
          <DateField
            value={regProfile.bday}
            onOpen={() => { setTempDate(regProfile.bday || '2000-01-01'); setShowDatePicker(true); }}
          />
          <Field {...fieldProps} icon="🪪" placeholder="DPI — 13 dígitos *" fieldKey="dpi" inputMode="numeric" maxLen={13} />
          {/* Teléfono con prefijo */}
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#9E9E9E', fontWeight: 700, zIndex: 1 }}>🇬🇹 +502</div>
            <input placeholder="Teléfono 8 dígitos *" value={regProfile.phone || ''} inputMode="numeric" maxLength={8}
              onChange={e => { setRegProfile(p => ({ ...p, phone: e.target.value.replace(/[^0-9]/g, '') })); clearAuthErr(); }}
              style={{ ...inputStyle, paddingLeft: 80 }} />
          </div>
        </div>
        <PtsCard total={totalPts} base={cfg.regBase || 15} optional={optFields * regOptional} vehicles={vehiclePts} />
        <button onClick={next} disabled={checkingPhone} style={{ ...btnStyle, background: '#FBBC04', color: '#0D0D0D', opacity: checkingPhone ? .7 : 1 }}>
          {checkingPhone ? 'Verificando...' : 'Siguiente →'}
        </button>
      </div>
    );
  }

  // ══ PASO 2 — Datos adicionales (opcionales, +pts) ═════════
  if (googleStep === 'step2') {
    return (
      <div style={{ padding: '40px 24px 120px' }}>
        <button onClick={() => { setGoogleStep('step1'); clearAuthErr(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#9E9E9E', fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600, marginBottom: 24 }}>
          <Back /> Atrás
        </button>
        <StepBar step="step2" />
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#0D0D0D', marginBottom: 4 }}>Datos adicionales</div>
          <div style={{ fontSize: 13, color: '#9E9E9E' }}>Opcionales — ganá <strong style={{ color: '#4CAF50' }}>+{regOptional} pts</strong> por cada uno que completes</div>
        </div>
        {errBox}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          <Field {...fieldProps} icon="📧" placeholder="Correo electrónico (opcional)" fieldKey="email" type="email" bonus />
          <Field {...fieldProps} icon="🧾" placeholder="NIT (opcional)" fieldKey="nit" bonus />
        </div>
        <PtsCard total={totalPts} base={cfg.regBase || 15} optional={optFields * regOptional} vehicles={vehiclePts} />
        <button onClick={() => { clearAuthErr(); setGoogleStep('step3'); }} style={{ ...btnStyle, background: '#FBBC04', color: '#0D0D0D' }}>
          Siguiente →
        </button>
      </div>
    );
  }

  // ══ PASO 3 — Vehículos (con placa) ═══════════════════════
  if (googleStep === 'step3') {
    const addVehicle = () => {
      if (!newPlate.trim()) { setAuthError('Ingresa la placa del vehículo'); return; }
      clearAuthErr();
      setVehicles(v => [...v, { type: newType, plate: newPlate.trim().toUpperCase() }]);
      setNewPlate(''); setNewType('liviano'); setAddingVehicle(false);
    };
    const typeInfo = k => VEHICLE_TYPES.find(t => t.k === k) || VEHICLE_TYPES[0];
    return (
      <div style={{ padding: '40px 24px 120px' }}>
        <button onClick={() => { setGoogleStep('step2'); clearAuthErr(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#9E9E9E', fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600, marginBottom: 24 }}>
          <Back /> Atrás
        </button>
        <StepBar step="step3" />
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#0D0D0D', marginBottom: 4 }}>Tus vehículos</div>
          <div style={{ fontSize: 13, color: '#9E9E9E' }}>Ganás <strong style={{ color: '#4CAF50' }}>+{VEHICLE_PTS} pts</strong> por cada vehículo registrado.</div>
        </div>
        {errBox}

        {/* Vehículos registrados */}
        {vehicles.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {vehicles.map((v, i) => {
              const t = typeInfo(v.type);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#F9F9F9', borderRadius: 14, padding: '12px 16px', border: '1px solid #eee' }}>
                  <div style={{ fontSize: 28 }}>{t.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#0D0D0D' }}>{t.label}</div>
                    <div style={{ fontSize: 12, color: '#9E9E9E', fontFamily: 'monospace', marginTop: 2 }}>{v.plate}</div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#4CAF50', background: '#E8F5E9', padding: '3px 8px', borderRadius: 8, marginRight: 4 }}>+{VEHICLE_PTS} pts</div>
                  <button onClick={() => setVehicles(vs => vs.filter((_, idx) => idx !== i))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#9E9E9E', padding: 4 }}>✕</button>
                </div>
              );
            })}
          </div>
        )}

        {/* Formulario agregar */}
        {addingVehicle ? (
          <div style={{ background: '#FFF8E1', borderRadius: 16, padding: 16, marginBottom: 16, border: '2px solid #FBBC04' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#424242', marginBottom: 12 }}>Tipo de vehículo</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              {VEHICLE_TYPES.map(t => (
                <button key={t.k} onClick={() => setNewType(t.k)} style={{ padding: '10px 8px', borderRadius: 12, border: newType === t.k ? '2px solid #FBBC04' : '2px solid #eee', background: newType === t.k ? '#FFF8E1' : '#fff', color: newType === t.k ? '#F0A500' : '#9E9E9E', cursor: 'pointer', fontFamily: "'DM Sans'", fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <span style={{ fontSize: 18 }}>{t.icon}</span>{t.label}
                </button>
              ))}
            </div>
            <input placeholder="Placa (ej: ABC-123)" value={newPlate}
              onChange={e => { setNewPlate(e.target.value.toUpperCase()); clearAuthErr(); }}
              style={{ ...inputStyle, marginBottom: 12, fontFamily: 'monospace', fontWeight: 700, letterSpacing: 2 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setAddingVehicle(false); setNewPlate(''); clearAuthErr(); }}
                style={{ flex: 1, padding: 12, borderRadius: 12, border: '2px solid #eee', background: '#fff', color: '#9E9E9E', fontFamily: "'DM Sans'", fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              <button onClick={addVehicle}
                style={{ flex: 2, padding: 12, borderRadius: 12, border: 'none', background: '#FBBC04', color: '#0D0D0D', fontFamily: "'DM Sans'", fontWeight: 900, cursor: 'pointer', fontSize: 13 }}>+ Agregar</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAddingVehicle(true)} style={{ width: '100%', padding: 14, borderRadius: 14, border: '2px dashed #FBBC04', background: '#FFF8E1', color: '#F0A500', fontFamily: "'DM Sans'", fontWeight: 800, fontSize: 14, cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            🚗 Agregar vehículo {vehicles.length > 0 && `(${vehicles.length} registrado${vehicles.length > 1 ? 's' : ''})`}
          </button>
        )}

        {vehicles.length === 0 && !addingVehicle && (
          <div style={{ textAlign: 'center', fontSize: 12, color: '#9E9E9E', marginBottom: 16 }}>Podés omitir este paso si no querés registrar vehículos ahora.</div>
        )}

        <PtsCard total={totalPts} base={cfg.regBase || 15} optional={optFields * regOptional} vehicles={vehiclePts} />
        <button onClick={() => { clearAuthErr(); setGoogleStep('step4'); }} style={{ ...btnStyle, background: '#FBBC04', color: '#0D0D0D' }}>
          Siguiente →
        </button>
      </div>
    );
  }

  // ══ PASO 4 — Contraseña ══════════════════════════════════
  if (googleStep === 'step4') {
    return (
      <div style={{ padding: '40px 24px 120px' }}>
        <button onClick={() => { setGoogleStep('step3'); clearAuthErr(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#9E9E9E', fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600, marginBottom: 24 }}>
          <Back /> Atrás
        </button>
        <StepBar step="step4" />
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#0D0D0D', marginBottom: 4 }}>Crear contraseña</div>
          <div style={{ fontSize: 13, color: '#9E9E9E' }}>Usarás esta contraseña para acceder a tu cuenta</div>
        </div>
        {errBox}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {/* Nueva contraseña */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9E9E9E', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>🔒 Contraseña</div>
            <div style={{ position: 'relative' }}>
              <input type={showPass ? 'text' : 'password'} placeholder="Mínimo 6 caracteres" value={password}
                onChange={e => { setPassword(e.target.value); clearAuthErr(); }}
                style={{ ...inputStyle, paddingRight: 50 }} />
              <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#9E9E9E' }}>
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Confirmar contraseña */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9E9E9E', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>🔒 Confirmar contraseña</div>
            <div style={{ position: 'relative' }}>
              <input type={showPassConfirm ? 'text' : 'password'} placeholder="Repetí tu contraseña" value={passConfirm}
                onChange={e => { setPassConfirm(e.target.value); clearAuthErr(); }}
                style={{ ...inputStyle, paddingRight: 50,
                  borderColor: passConfirm && passConfirm !== password ? '#EF5350' : passConfirm && passConfirm === password ? '#4CAF50' : undefined }} />
              <button type="button" onClick={() => setShowPassConfirm(p => !p)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#9E9E9E' }}>
                {showPassConfirm ? '🙈' : '👁️'}
              </button>
            </div>
            {passConfirm && passConfirm === password && (
              <div style={{ fontSize: 11, color: '#4CAF50', fontWeight: 700, marginTop: 6 }}>✓ Las contraseñas coinciden</div>
            )}
            {passConfirm && passConfirm !== password && (
              <div style={{ fontSize: 11, color: '#EF5350', fontWeight: 700, marginTop: 6 }}>✗ Las contraseñas no coinciden</div>
            )}
          </div>
        </div>

        {/* Indicador de fortaleza */}
        {password.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: password.length >= i * 2 + 2 ? (password.length >= 10 ? '#4CAF50' : '#FBBC04') : '#E0E0E0', transition: 'background .2s' }} />
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#9E9E9E' }}>
              {password.length < 6 ? 'Muy corta' : password.length < 8 ? 'Aceptable' : password.length < 10 ? 'Buena' : '✓ Excelente'}
            </div>
          </div>
        )}

        <PtsCard total={totalPts} base={cfg.regBase || 15} optional={optFields * regOptional} vehicles={vehiclePts} />
        <button onClick={doFinish} disabled={saving} style={{ ...btnStyle, background: saving ? '#E0E0E0' : '#FBBC04', color: '#0D0D0D', opacity: saving ? .7 : 1 }}>
          {saving ? 'Guardando...' : 'Finalizar registro (' + totalPts + ' pts)'}
        </button>
      </div>
    );
  }

  return null;
}
