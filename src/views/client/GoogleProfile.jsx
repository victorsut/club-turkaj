// src/views/client/GoogleProfile.jsx
// Wizard de registro en 4 pasos (FORMATO GENERAL: flat, acento rojo,
// iconos SVG). Drum picker en ui/DrumDatePicker, helpers en registerUi,
// iconos de vehículo en ui/VehicleIcons.
import { useState } from 'react';
import { sb } from '../../lib/supabaseClient';
import { inputFlat, btnStyle, BRAND_ORANGE } from '../../constants/styles';
import { User, IdCard, Mail, Receipt, Eye, EyeOff, Plus, XMark } from '../../components/ui/Icons';
import { DatePickerSheet } from '../../components/ui/DrumDatePicker';
import { VEHICLE_TYPES } from '../../components/ui/VehicleIcons';
import { WizardHeader, PtsCard, Field, DateField } from './registerUi';
import { getNextCardCode } from '../../services/dataService';

const VEHICLE_PTS = 2;

// Acción primaria = color sólido de marca (regla FORMATO GENERAL)
const btnPrimary = { ...btnStyle, background: BRAND_ORANGE, color: '#fff' };

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
  const [checkingPhone, setCheckingPhone] = useState(false);

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
      fire('Bienvenido a Puntos Plus! +' + totalPts + ' pts de registro', 'success');

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
          fire('Este numero ya esta registrado. Inicia sesion.', 'warn');
          setSaving(false); return;
        }
        const dpiDoubleCheck = await checkDpiDuplicate(regProfile.dpi?.trim());
        if (dpiDoubleCheck) {
          setAuthScreen('login'); setGoogleStep('welcome');
          fire('Este DPI ya esta registrado. Inicia sesion.', 'warn');
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
        logActivity(dbId, 'registro', 'Bienvenido a Puntos Plus - +' + totalPts + ' pts', totalPts);
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

  // ══ PASO 1 — Datos personales (todos obligatorios, sin bonus) ═
  if (googleStep === 'step1' || googleStep === 'welcome') {
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
      <div style={{ padding: '24px 24px 120px' }}>
        {showDatePicker && (
          <DatePickerSheet
            tempDate={tempDate}
            setTempDate={setTempDate}
            setShowDatePicker={setShowDatePicker}
            setRegProfile={setRegProfile}
          />
        )}
        <WizardHeader step="step1" onBack={() => setAuthScreen('login')} />
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#0D0D0D', marginBottom: 4 }}>Datos personales</div>
          <div style={{ fontSize: 13, color: '#9E9E9E' }}>Todos los campos son obligatorios</div>
        </div>
        {errBox}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          <Field {...fieldProps} icon={<User />} placeholder="Nombre completo *" fieldKey="name" />
          <DateField
            value={regProfile.bday}
            onOpen={() => { setTempDate(regProfile.bday || '2000-01-01'); setShowDatePicker(true); }}
          />
          <Field {...fieldProps} icon={<IdCard />} placeholder="DPI — 13 dígitos *" fieldKey="dpi" inputMode="numeric" maxLen={13} />
          {/* Teléfono con prefijo */}
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#9E9E9E', fontWeight: 700, zIndex: 1 }}>+502</div>
            <input placeholder="Teléfono 8 dígitos *" value={regProfile.phone || ''} inputMode="numeric" maxLength={8}
              onChange={e => { setRegProfile(p => ({ ...p, phone: e.target.value.replace(/[^0-9]/g, '') })); clearAuthErr(); }}
              style={{ ...inputFlat, paddingLeft: 62 }} />
          </div>
        </div>
        <PtsCard total={totalPts} base={cfg.regBase || 15} optional={optFields * regOptional} vehicles={vehiclePts} />
        <button onClick={next} disabled={checkingPhone} style={{ ...btnPrimary, opacity: checkingPhone ? .7 : 1 }}>
          {checkingPhone ? 'Verificando...' : 'Siguiente'}
        </button>
      </div>
    );
  }

  // ══ PASO 2 — Datos adicionales (opcionales, +pts) ═════════
  if (googleStep === 'step2') {
    return (
      <div style={{ padding: '24px 24px 120px' }}>
        <WizardHeader step="step2" onBack={() => { setGoogleStep('step1'); clearAuthErr(); }} />
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#0D0D0D', marginBottom: 4 }}>Datos adicionales</div>
          <div style={{ fontSize: 13, color: '#9E9E9E' }}>Opcionales — ganá <strong style={{ color: BRAND_ORANGE }}>+{regOptional} pts</strong> por cada uno que completes</div>
        </div>
        {errBox}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          <Field {...fieldProps} icon={<Mail />} placeholder="Correo electrónico (opcional)" fieldKey="email" type="email" bonus />
          <Field {...fieldProps} icon={<Receipt />} placeholder="NIT (opcional)" fieldKey="nit" bonus />
        </div>
        <PtsCard total={totalPts} base={cfg.regBase || 15} optional={optFields * regOptional} vehicles={vehiclePts} />
        <button onClick={() => { clearAuthErr(); setGoogleStep('step3'); }} style={btnPrimary}>
          Siguiente
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
      <div style={{ padding: '24px 24px 120px' }}>
        <WizardHeader step="step3" onBack={() => { setGoogleStep('step2'); clearAuthErr(); }} />
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#0D0D0D', marginBottom: 4 }}>Tus vehículos</div>
          <div style={{ fontSize: 13, color: '#9E9E9E' }}>Ganás <strong style={{ color: BRAND_ORANGE }}>+{VEHICLE_PTS} pts</strong> por cada vehículo registrado.</div>
        </div>
        {errBox}

        {/* Vehículos registrados */}
        {vehicles.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {vehicles.map((v, i) => {
              const t = typeInfo(v.type);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#F5F5F7', borderRadius: 16, padding: '12px 14px' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: '#0D0D0D', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <t.Icon size={22} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#0D0D0D' }}>{t.label}</div>
                    <div style={{ fontSize: 12, color: '#9E9E9E', fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{v.plate}</div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: BRAND_ORANGE, background: 'rgba(250,84,8,.1)', padding: '3px 8px', borderRadius: 8, marginRight: 2 }}>+{VEHICLE_PTS} pts</div>
                  <button onClick={() => setVehicles(vs => vs.filter((_, idx) => idx !== i))} aria-label="Quitar vehículo"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9E9E9E', padding: 4, display: 'flex' }}><XMark /></button>
                </div>
              );
            })}
          </div>
        )}

        {/* Formulario agregar */}
        {addingVehicle ? (
          <div style={{ background: '#F5F5F7', borderRadius: 20, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0D0D0D', marginBottom: 12 }}>Tipo de vehículo</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              {VEHICLE_TYPES.map(t => (
                <button key={t.k} onClick={() => setNewType(t.k)} style={{ padding: '10px 8px', borderRadius: 12, border: 'none', background: newType === t.k ? '#0D0D0D' : '#fff', color: newType === t.k ? '#fff' : '#757575', cursor: 'pointer', fontFamily: "'DM Sans'", fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <t.Icon size={18} />{t.label}
                </button>
              ))}
            </div>
            <input placeholder="Placa (ej: ABC-123)" value={newPlate}
              onChange={e => { setNewPlate(e.target.value.toUpperCase()); clearAuthErr(); }}
              style={{ ...inputFlat, marginBottom: 12, background: '#fff', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, letterSpacing: 2 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setAddingVehicle(false); setNewPlate(''); clearAuthErr(); }}
                style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: '#fff', color: '#9E9E9E', fontFamily: "'DM Sans'", fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              <button onClick={addVehicle}
                style={{ flex: 2, padding: 12, borderRadius: 12, border: 'none', background: BRAND_ORANGE, color: '#fff', fontFamily: "'DM Sans'", fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>Agregar</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAddingVehicle(true)} style={{ width: '100%', padding: 14, borderRadius: 16, border: '1.5px solid #ECECEE', background: '#fff', color: '#0D0D0D', fontFamily: "'DM Sans'", fontWeight: 800, fontSize: 14, cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ color: BRAND_ORANGE, display: 'flex' }}><Plus /></span>
            Agregar vehículo {vehicles.length > 0 && `(${vehicles.length} registrado${vehicles.length > 1 ? 's' : ''})`}
          </button>
        )}

        {vehicles.length === 0 && !addingVehicle && (
          <div style={{ textAlign: 'center', fontSize: 12, color: '#9E9E9E', marginBottom: 16 }}>Podés omitir este paso si no querés registrar vehículos ahora.</div>
        )}

        <PtsCard total={totalPts} base={cfg.regBase || 15} optional={optFields * regOptional} vehicles={vehiclePts} />
        <button onClick={() => { clearAuthErr(); setGoogleStep('step4'); }} style={btnPrimary}>
          Siguiente
        </button>
      </div>
    );
  }

  // ══ PASO 4 — Contraseña ══════════════════════════════════
  if (googleStep === 'step4') {
    return (
      <div style={{ padding: '24px 24px 120px' }}>
        <WizardHeader step="step4" onBack={() => { setGoogleStep('step3'); clearAuthErr(); }} />
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#0D0D0D', marginBottom: 4 }}>Crear contraseña</div>
          <div style={{ fontSize: 13, color: '#9E9E9E' }}>Usarás esta contraseña para acceder a tu cuenta</div>
        </div>
        {errBox}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {/* Nueva contraseña */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9E9E9E', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>Contraseña</div>
            <div style={{ position: 'relative' }}>
              <input type={showPass ? 'text' : 'password'} placeholder="Mínimo 6 caracteres" value={password}
                onChange={e => { setPassword(e.target.value); clearAuthErr(); }}
                style={{ ...inputFlat, paddingRight: 50 }} />
              <button type="button" onClick={() => setShowPass(p => !p)} aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9E9E9E', display: 'flex', padding: 2 }}>
                {showPass ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </div>

          {/* Confirmar contraseña */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9E9E9E', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>Confirmar contraseña</div>
            <div style={{ position: 'relative' }}>
              <input type={showPassConfirm ? 'text' : 'password'} placeholder="Repetí tu contraseña" value={passConfirm}
                onChange={e => { setPassConfirm(e.target.value); clearAuthErr(); }}
                style={{ ...inputFlat, paddingRight: 50,
                  borderColor: passConfirm && passConfirm !== password ? '#EF5350' : passConfirm && passConfirm === password ? BRAND_ORANGE : 'transparent' }} />
              <button type="button" onClick={() => setShowPassConfirm(p => !p)} aria-label={showPassConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9E9E9E', display: 'flex', padding: 2 }}>
                {showPassConfirm ? <EyeOff /> : <Eye />}
              </button>
            </div>
            {passConfirm && passConfirm === password && (
              <div style={{ fontSize: 11, color: BRAND_ORANGE, fontWeight: 700, marginTop: 6 }}>Las contraseñas coinciden</div>
            )}
            {passConfirm && passConfirm !== password && (
              <div style={{ fontSize: 11, color: '#EF5350', fontWeight: 700, marginTop: 6 }}>Las contraseñas no coinciden</div>
            )}
          </div>
        </div>

        {/* Indicador de fortaleza */}
        {password.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: password.length >= i * 2 + 2 ? (password.length >= 10 ? '#0D0D0D' : BRAND_ORANGE) : '#ECECEE', transition: 'background .2s' }} />
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#9E9E9E' }}>
              {password.length < 6 ? 'Muy corta' : password.length < 8 ? 'Aceptable' : password.length < 10 ? 'Buena' : 'Excelente'}
            </div>
          </div>
        )}

        <PtsCard total={totalPts} base={cfg.regBase || 15} optional={optFields * regOptional} vehicles={vehiclePts} />
        <button onClick={doFinish} disabled={saving} style={{ ...btnPrimary, background: saving ? '#E0E0E0' : BRAND_ORANGE, color: saving ? '#9E9E9E' : '#fff', opacity: saving ? .8 : 1 }}>
          {saving ? 'Guardando...' : 'Finalizar registro (' + totalPts + ' pts)'}
        </button>
      </div>
    );
  }

  return null;
}
