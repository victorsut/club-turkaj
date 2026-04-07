// src/views/client/GoogleProfile.jsx
import { useState, useRef, useEffect } from 'react';
import { sb } from '../../lib/supabaseClient';
import { inputStyle, btnStyle } from '../../constants/styles';
import { CARD_PREFIX } from '../../constants/config';
import { Back } from '../../components/ui/Icons';

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
// Drum Picker — columna individual
// ═══════════════════════════════════════════════════════════
const ITEM_H  = 48;
const VISIBLE = 5;
const CENTER_Y = ITEM_H * Math.floor(VISIBLE / 2);

function DrumPicker({ items, selectedIndex, onChange }) {
  const indexToY = idx => CENTER_Y - idx * ITEM_H;
  const yToIndex = y   => Math.round((CENTER_Y - y) / ITEM_H);

  const translateRef   = useRef(indexToY(selectedIndex));
  const [displayY, setDisplayY]     = useState(translateRef.current);
  const [isSnapping, setIsSnapping] = useState(false);
  const isDragging     = useRef(false);
  const startYRef      = useRef(0);
  const startTransRef  = useRef(0);
  const containerRef   = useRef(null);

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
    isDragging.current   = true;
    startYRef.current    = e.clientY;
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
      {/* Highlight central */}
      <div style={{ position: 'absolute', top: CENTER_Y, left: 6, right: 6, height: ITEM_H, background: 'rgba(251,188,4,.12)', borderRadius: 10, borderTop: '1.5px solid rgba(251,188,4,.5)', borderBottom: '1.5px solid rgba(251,188,4,.5)', pointerEvents: 'none', zIndex: 2 }} />

      <div style={{ transform: `translateY(${displayY}px)`, transition: isSnapping ? 'transform .22s ease' : 'none', willChange: 'transform' }}>
        {items.map((item, i) => (
          <div key={i} style={{ height: ITEM_H, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: i === selectedIndex ? 17 : 14, fontWeight: i === selectedIndex ? 800 : 400, color: i === selectedIndex ? '#0D0D0D' : '#BDBDBD', fontFamily: "'DM Sans'", userSelect: 'none' }}>
            {item.label}
          </div>
        ))}
      </div>

      {/* Fades */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: CENTER_Y, background: 'linear-gradient(to bottom, rgba(255,255,255,.97), rgba(255,255,255,0))', pointerEvents: 'none', zIndex: 3 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: CENTER_Y, background: 'linear-gradient(to top, rgba(255,255,255,.97), rgba(255,255,255,0))', pointerEvents: 'none', zIndex: 3 }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Date Drum Picker — 3 columnas: día / mes / año
// ═══════════════════════════════════════════════════════════
const MONTHS     = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS_ITEMS = Array.from({ length: 31 }, (_, i) => ({ label: String(i + 1).padStart(2, '0') }));
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
    const month = m + 1;
    const day   = d + 1;
    onChange(`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`);
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

// ═══════════════════════════════════════════════════════════
// Componentes de UI auxiliares
// ═══════════════════════════════════════════════════════════
function StepBar({ step }) {
  const steps = ['Datos\npersonales', 'Datos\nadicionales', 'Vehículos'];
  const idx = { step1: 0, step2: 1, step3: 2 }[step] ?? 0;
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

function Field({ icon, placeholder, fieldKey, type, inputMode, maxLen, optional,
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
      {optional && filled && (
        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 10, fontWeight: 800, color: '#4CAF50', background: '#E8F5E9', padding: '2px 8px', borderRadius: 8 }}>+{regOptional} pts</div>
      )}
    </div>
  );
}

// ── Campo fecha: muestra el valor como texto, drum picker en bottom sheet ──
function DateField({ value, regOptional, onOpen }) {
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
      <span style={{ flex: 1 }}>{display || 'Fecha de nacimiento (opcional)'}</span>
      {display && (
        <div style={{ fontSize: 10, fontWeight: 800, color: '#4CAF50', background: '#E8F5E9', padding: '2px 8px', borderRadius: 8 }}>+{regOptional} pts</div>
      )}
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

  // Estado vehículos — solo tipo, sin placa
  const [selectedVehicles, setSelectedVehicles] = useState({}); // { k: count }
  const [showDatePicker, setShowDatePicker]      = useState(false);
  const [tempDate, setTempDate]                  = useState(regProfile.bday || '2000-01-01');

  const regOptional = cfg.regOptional || 2;
  const optFields   = ['phone', 'nit', 'email', 'bday'].filter(k => regProfile[k]?.trim()).length;
  const vehicleCount = Object.values(selectedVehicles).reduce((a, b) => a + b, 0);
  const vehiclePts   = vehicleCount * VEHICLE_PTS;
  const totalPts     = (cfg.regBase || 15) + optFields * regOptional + vehiclePts;

  const fieldProps = { regProfile, setRegProfile, clearAuthErr, regOptional };

  const addVehicle    = k => setSelectedVehicles(p => ({ ...p, [k]: (p[k] || 0) + 1 }));
  const removeVehicle = k => setSelectedVehicles(p => {
    const n = { ...p };
    if ((n[k] || 0) <= 1) delete n[k]; else n[k]--;
    return n;
  });

  // ── Guardar ───────────────────────────────────────────────
  const doFinish = async () => {
    const fallbackCard = CARD_PREFIX.ORO + '-' + String(Date.now()).slice(-5);
    const bdayRaw      = regProfile.bday || '';
    let bdayStored = '';
    if (bdayRaw) { const p = bdayRaw.split('-'); if (p.length === 3) bdayStored = p[1] + '-' + p[2]; }

    const vehiclesList = Object.entries(selectedVehicles).flatMap(([k, cnt]) =>
      Array.from({ length: cnt }, () => ({ type: k }))
    );

    const updated = { ...me, name: regProfile.name, phone: regProfile.phone || '', dpi: regProfile.dpi || '', email: regProfile.email || me?.email || '', bday: bdayStored, nit: regProfile.nit || '', points: totalPts, cardId: fallbackCard };
    setMe(updated);
    setCusts(p => [...p, updated]);
    setAuthScreen('logged');
    setGoogleStep('welcome');
    fire(`🎉 ¡Bienvenido! +${totalPts} pts de registro`);

    if (sb && sbConnected) {
      const provider   = me?.authProvider || 'manual';
      const providerId = me?.id?.startsWith('temp-') ? null : me?.id;
      const memberData = {
        phone:            regProfile.phone?.trim() || (provider === 'google' ? 'goog_' + (me?.id || '').substring(0, 12) : null),
        password_hash:    provider, auth_provider: provider, auth_provider_id: providerId,
        name: regProfile.name, dpi: regProfile.dpi || null, plate: null,
        nit: regProfile.nit || null, email: regProfile.email || me?.email || null,
        birthday: bdayStored || null, points: totalPts,
        gallons: 0, spent: 0, visits: 0, tickets: 0, redeemed_count: 0, referral_count: 0,
      };
      const { data: rows, error: memberErr } = await sb.from('members').insert(memberData).select();
      if (memberErr) { console.error('[Reg]', memberErr); return; }
      const dbId = rows?.[0]?.id;
      if (!dbId) return;
      setMe(p => ({ ...p, id: dbId }));
      const { data: cardRows } = await sb.from('physical_cards').insert({ assigned_to: dbId, card_code: fallbackCard, tier: 'ORO', status: 'active' }).select();
      if (cardRows?.[0]) await sb.from('members').update({ card_id: cardRows[0].id }).eq('id', dbId);
      if (vehiclesList.length > 0) {
        await sb.from('activity_log').insert({ member_id: dbId, activity_type: 'registro_vehiculos', description: `${vehiclesList.length} vehículo(s) · +${vehiclePts} pts`, points_change: vehiclePts, metadata: { vehicles: vehiclesList } });
      }
      logActivity(dbId, 'registro', `Bienvenido a Club Turkaj · +${totalPts} pts`, totalPts);
    }
  };

  const errBox = authError ? (
    <div style={{ background: '#FFEBEE', color: '#C62828', padding: '10px 14px', borderRadius: 12, fontSize: 12, fontWeight: 700, marginBottom: 16, textAlign: 'center' }}>{authError}</div>
  ) : null;

  // ── Bottom sheet del drum picker ──────────────────────────
  const DatePickerSheet = () => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '0 0 32px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
          <button onClick={() => setShowDatePicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#9E9E9E', fontFamily: "'DM Sans'" }}>Cancelar</button>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0D0D0D' }}>Fecha de nacimiento</div>
          <button onClick={() => {
            setRegProfile(p => ({ ...p, bday: tempDate }));
            setShowDatePicker(false);
          }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 800, color: '#FBBC04', fontFamily: "'DM Sans'" }}>Seleccionar</button>
        </div>
        <div style={{ padding: '12px 20px 0' }}>
          <DateDrumPicker value={tempDate} onChange={setTempDate} />
        </div>
      </div>
    </div>
  );

  // ══ PASO 1 ═══════════════════════════════════════════════
  if (googleStep === 'step1' || googleStep === 'welcome') {
    const next = () => {
      clearAuthErr();
      if (!regProfile.name?.trim()) { setAuthError('El nombre es obligatorio'); return; }
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
          <div style={{ fontSize: 13, color: '#9E9E9E' }}>Empecemos con tu información básica</div>
        </div>
        {errBox}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          <Field {...fieldProps} icon="👤" placeholder="Nombre completo *" fieldKey="name" />
          <DateField
            value={regProfile.bday}
            regOptional={regOptional}
            onOpen={() => { setTempDate(regProfile.bday || '2000-01-01'); setShowDatePicker(true); }}
          />
          {/* Teléfono */}
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#9E9E9E', fontWeight: 700, zIndex: 1 }}>🇬🇹 +502</div>
            <input placeholder="Teléfono 8 dígitos (opcional)" value={regProfile.phone || ''} inputMode="numeric" maxLength={8}
              onChange={e => { setRegProfile(p => ({ ...p, phone: e.target.value.replace(/[^0-9]/g, '') })); clearAuthErr(); }}
              style={{ ...inputStyle, paddingLeft: 80 }} />
            {(regProfile.phone || '').length > 0 && (
              <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 10, fontWeight: 800, color: '#4CAF50', background: '#E8F5E9', padding: '2px 8px', borderRadius: 8 }}>+{regOptional} pts</div>
            )}
          </div>
        </div>
        <PtsCard total={totalPts} base={cfg.regBase || 15} optional={optFields * regOptional} vehicles={vehiclePts} />
        <button onClick={next} style={{ ...btnStyle, background: '#FBBC04', color: '#0D0D0D' }}>Siguiente →</button>
      </div>
    );
  }

  // ══ PASO 2 ═══════════════════════════════════════════════
  if (googleStep === 'step2') {
    const next = () => {
      clearAuthErr();
      if (!regProfile.dpi?.trim()) { setAuthError('El DPI es obligatorio'); return; }
      if (!/^\d{13}$/.test(regProfile.dpi.trim())) { setAuthError('El DPI debe tener exactamente 13 dígitos'); return; }
      setGoogleStep('step3');
    };
    return (
      <div style={{ padding: '40px 24px 120px' }}>
        <button onClick={() => { setGoogleStep('step1'); clearAuthErr(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#9E9E9E', fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600, marginBottom: 24 }}>
          <Back /> Atrás
        </button>
        <StepBar step="step2" />
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#0D0D0D', marginBottom: 4 }}>Datos adicionales</div>
          <div style={{ fontSize: 13, color: '#9E9E9E' }}>Necesitamos tu DPI para identificarte</div>
        </div>
        {errBox}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          <Field {...fieldProps} icon="🪪" placeholder="DPI — 13 dígitos *" fieldKey="dpi" inputMode="numeric" maxLen={13} />
          <Field {...fieldProps} icon="🧾" placeholder="NIT (opcional)" fieldKey="nit" optional />
          <Field {...fieldProps} icon="📧" placeholder="Correo electrónico (opcional)" fieldKey="email" type="email" optional />
        </div>
        <PtsCard total={totalPts} base={cfg.regBase || 15} optional={optFields * regOptional} vehicles={vehiclePts} />
        <button onClick={next} style={{ ...btnStyle, background: '#FBBC04', color: '#0D0D0D' }}>Siguiente →</button>
      </div>
    );
  }

  // ══ PASO 3 — Vehículos (solo tipo, sin placa) ════════════
  if (googleStep === 'step3') {
    return (
      <div style={{ padding: '40px 24px 120px' }}>
        <button onClick={() => { setGoogleStep('step2'); clearAuthErr(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#9E9E9E', fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600, marginBottom: 24 }}>
          <Back /> Atrás
        </button>
        <StepBar step="step3" />
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#0D0D0D', marginBottom: 4 }}>Tus vehículos</div>
          <div style={{ fontSize: 13, color: '#9E9E9E' }}>
            Tocá para agregar · Ganás <strong style={{ color: '#4CAF50' }}>+{VEHICLE_PTS} pts</strong> por cada vehículo.
          </div>
        </div>
        {errBox}

        {/* Grid de tipos de vehículo */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {VEHICLE_TYPES.map(t => {
            const count = selectedVehicles[t.k] || 0;
            const active = count > 0;
            return (
              <div key={t.k} style={{ borderRadius: 16, border: active ? '2px solid #FBBC04' : '2px solid #eee', background: active ? '#FFF8E1' : '#FAFAFA', padding: '14px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ fontSize: 32 }}>{t.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: active ? '#0D0D0D' : '#9E9E9E', textAlign: 'center', lineHeight: 1.3 }}>{t.label}</div>
                {/* Contador */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                  <button onClick={() => removeVehicle(t.k)} disabled={!active}
                    style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid ' + (active ? '#FBBC04' : '#eee'), background: active ? '#FBBC04' : '#f5f5f5', color: active ? '#0D0D0D' : '#ccc', fontWeight: 900, fontSize: 16, cursor: active ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                    −
                  </button>
                  <span style={{ fontSize: 16, fontWeight: 900, color: active ? '#0D0D0D' : '#ccc', minWidth: 16, textAlign: 'center' }}>{count}</span>
                  <button onClick={() => addVehicle(t.k)}
                    style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #FBBC04', background: '#FBBC04', color: '#0D0D0D', fontWeight: 900, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                    +
                  </button>
                </div>
                {active && (
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#4CAF50' }}>+{count * VEHICLE_PTS} pts</div>
                )}
              </div>
            );
          })}
        </div>

        {vehicleCount === 0 && (
          <div style={{ textAlign: 'center', fontSize: 12, color: '#9E9E9E', marginBottom: 16 }}>
            Podés omitir este paso y agregar vehículos más adelante.
          </div>
        )}

        <PtsCard total={totalPts} base={cfg.regBase || 15} optional={optFields * regOptional} vehicles={vehiclePts} />
        <button onClick={doFinish} style={{ ...btnStyle, background: '#FBBC04', color: '#0D0D0D' }}>
          {vehicleCount > 0 ? `Finalizar registro (+${totalPts} pts) ✓` : 'Finalizar registro ✓'}
        </button>
      </div>
    );
  }

  return null;
}
