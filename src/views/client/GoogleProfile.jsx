// src/views/client/GoogleProfile.jsx
// Wizard de registro en 3 pasos:
//   step1 → Datos personales (nombre*, fecha nac, teléfono)
//   step2 → Datos adicionales (DPI*, NIT, correo)
//   step3 → Vehículos (tipo + placa, múltiples, +2 pts c/u)
import { useState } from 'react';
import { sb } from '../../lib/supabaseClient';
import { inputStyle, btnStyle } from '../../constants/styles';
import { CARD_PREFIX } from '../../constants/config';
import { Back } from '../../components/ui/Icons';

// ── Tipos de vehículo ─────────────────────────────────────
const VEHICLE_TYPES = [
  { k: 'liviano',  label: 'Vehículo liviano', icon: '🚗' },
  { k: 'camion',   label: 'Camión',           icon: '🚛' },
  { k: 'moto',     label: 'Motocicleta',      icon: '🏍️' },
  { k: 'otro',     label: 'Otro',             icon: '🚌' },
];
const VEHICLE_PTS = 2;

// ── Indicador de progreso ─────────────────────────────────
function StepBar({ step }) {
  const steps = ['Datos\npersonales', 'Datos\nadicionales', 'Vehículos'];
  const idx = { step1: 0, step2: 1, step3: 2 }[step] ?? 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
      {steps.map((label, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: i <= idx ? '#FBBC04' : '#E0E0E0',
              color: i <= idx ? '#0D0D0D' : '#9E9E9E',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 900, flexShrink: 0,
              boxShadow: i === idx ? '0 0 0 4px rgba(251,188,4,.2)' : 'none',
              transition: 'all .2s',
            }}>
              {i < idx ? '✓' : i + 1}
            </div>
            <div style={{ fontSize: 9, fontWeight: 700, color: i <= idx ? '#F0A500' : '#9E9E9E', textAlign: 'center', whiteSpace: 'pre-line', lineHeight: 1.2 }}>
              {label}
            </div>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: 2, background: i < idx ? '#FBBC04' : '#E0E0E0', margin: '0 6px', marginBottom: 18, transition: 'background .2s' }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────
export default function GoogleProfile(ctx) {
  const { me, setMe, setCusts, cfg, googleStep, setGoogleStep,
    regProfile, setRegProfile, authError, setAuthError, clearAuthErr,
    setAuthScreen, fire, sbConnected, logActivity } = ctx;

  // Estado local de vehículos
  const [vehicles, setVehicles]         = useState([]);
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [newType, setNewType]           = useState('liviano');
  const [newPlate, setNewPlate]         = useState('');

  const isDark = false; // siempre claro en registro
  const maxBday = new Date(new Date().getFullYear() - 16,
    new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0];

  // ── Cálculo de puntos ──────────────────────────────────
  const optFields = ['phone', 'nit', 'email', 'bday']
    .filter(k => regProfile[k]?.trim()).length;
  const vehiclePts = vehicles.length * VEHICLE_PTS;
  const totalPts   = (cfg.regBase || 15) + optFields * (cfg.regOptional || 2) + vehiclePts;

  // ── Indicador de puntos flotante ───────────────────────
  const PtsCard = () => (
    <div style={{ background: '#FFF8E1', borderRadius: 14, padding: '12px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontSize: 11, color: '#9E9E9E', fontWeight: 700, textTransform: 'uppercase' }}>Puntos al registrarte</div>
        <div style={{ fontSize: 11, color: '#9E9E9E', marginTop: 2 }}>
          Base {cfg.regBase} + opcionales {optFields * (cfg.regOptional || 2)} + vehículos {vehiclePts}
        </div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color: '#F0A500' }}>{totalPts}</div>
    </div>
  );

  // ── Input helper ───────────────────────────────────────
  const Field = ({ icon, placeholder, fieldKey, type = 'text', inputMode, maxLen, optional }) => {
    const val = regProfile[fieldKey] || '';
    const filled = val.trim().length > 0;
    return (
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, zIndex: 1 }}>
          {icon}
        </div>
        {type === 'date' ? (
          <>
            <input type="date" value={val} max={maxBday} min="1930-01-01"
              onFocus={() => { if (!val) setRegProfile(p => ({ ...p, [fieldKey]: '2000-01-01' })); }}
              onChange={e => { setRegProfile(p => ({ ...p, [fieldKey]: e.target.value })); clearAuthErr(); }}
              style={{ ...inputStyle, paddingLeft: 42, color: val ? '#0D0D0D' : 'transparent' }} />
            {!val && (
              <div style={{ position: 'absolute', left: 42, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9E9E9E', pointerEvents: 'none', fontFamily: "'DM Sans'", fontWeight: 600 }}>
                {placeholder}
              </div>
            )}
          </>
        ) : (
          <input placeholder={placeholder} type={type} inputMode={inputMode} maxLength={maxLen}
            value={val}
            onChange={e => {
              let v = inputMode === 'numeric' ? e.target.value.replace(/[^0-9]/g, '') : e.target.value;
              if (maxLen && v.length > maxLen) v = v.slice(0, maxLen);
              setRegProfile(p => ({ ...p, [fieldKey]: v })); clearAuthErr();
            }}
            style={{ ...inputStyle, paddingLeft: 42 }} />
        )}
        {optional && filled && (
          <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 10, fontWeight: 800, color: '#4CAF50', background: '#E8F5E9', padding: '2px 8px', borderRadius: 8 }}>
            +{cfg.regOptional || 2} pts
          </div>
        )}
      </div>
    );
  };

  // ── Guardar en Supabase ───────────────────────────────
  const doFinish = async () => {
    const firstPlate = vehicles[0]?.plate || regProfile.plate || '';
    const fallbackCard = CARD_PREFIX.ORO + '-' + String(Date.now()).slice(-5);

    const bdayRaw = regProfile.bday || '';
    let bdayStored = '';
    if (bdayRaw) {
      const p = bdayRaw.split('-');
      if (p.length === 3) bdayStored = p[1] + '-' + p[2];
    }

    const updated = {
      ...me, name: regProfile.name,
      phone: regProfile.phone || '',
      dpi: regProfile.dpi || '',
      plate: firstPlate,
      email: regProfile.email || me?.email || '',
      bday: bdayStored,
      nit: regProfile.nit || '',
      points: totalPts,
      cardId: fallbackCard,
    };

    setMe(updated);
    setCusts(p => [...p, updated]);
    setAuthScreen('logged');
    setGoogleStep('welcome');
    fire(`🎉 ¡Bienvenido! +${totalPts} pts de registro`);

    if (sb && sbConnected) {
      const provider    = me?.authProvider || 'manual';
      const providerId  = me?.id?.startsWith('temp-') ? null : me?.id;

      const memberData = {
        phone:            regProfile.phone?.trim() || (provider === 'google' ? 'goog_' + (me?.id || '').substring(0, 12) : null),
        password_hash:    provider,
        auth_provider:    provider,
        auth_provider_id: providerId,
        name:             regProfile.name,
        dpi:              regProfile.dpi || null,
        plate:            firstPlate || null,
        nit:              regProfile.nit || null,
        email:            regProfile.email || me?.email || null,
        birthday:         bdayStored || null,
        points:           totalPts,
        gallons: 0, spent: 0, visits: 0, tickets: 0,
        redeemed_count: 0, referral_count: 0,
      };

      const { data: rows, error: memberErr } = await sb.from('members').insert(memberData).select();
      if (memberErr) { console.error('[Reg] member insert error:', memberErr); return; }

      const dbId = rows?.[0]?.id;
      if (!dbId) return;

      setMe(p => ({ ...p, id: dbId }));

      // Crear tarjeta
      const { data: cardRows } = await sb.from('physical_cards')
        .insert({ assigned_to: dbId, card_code: fallbackCard, tier: 'ORO', status: 'active' })
        .select();
      if (cardRows?.[0]) {
        await sb.from('members').update({ card_id: cardRows[0].id }).eq('id', dbId);
      }

      // Guardar vehículos en activity_log metadata
      if (vehicles.length > 0) {
        await sb.from('activity_log').insert({
          member_id:     dbId,
          activity_type: 'registro_vehiculos',
          description:   `${vehicles.length} vehículo${vehicles.length > 1 ? 's' : ''} registrado${vehicles.length > 1 ? 's' : ''} · +${vehiclePts} pts`,
          points_change: vehiclePts,
          metadata:      { vehicles },
        });
      }

      logActivity(dbId, 'registro',
        `Bienvenido a Club Turkaj · +${totalPts} pts de registro`, totalPts);
    }
  };

  // ══════════════════════════════════════════════════════
  // PASO 1 — Datos personales
  // ══════════════════════════════════════════════════════
  if (googleStep === 'step1' || googleStep === 'welcome') {
    const next = () => {
      clearAuthErr();
      if (!regProfile.name?.trim()) { setAuthError('El nombre es obligatorio'); return; }
      setGoogleStep('step2');
    };

    return (
      <div style={{ padding: '40px 24px 120px' }}>
        <button onClick={() => setAuthScreen('login')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#9E9E9E', fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600, marginBottom: 24 }}>
          <Back /> Volver
        </button>

        <StepBar step="step1" />

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#0D0D0D', marginBottom: 4 }}>Datos personales</div>
          <div style={{ fontSize: 13, color: '#9E9E9E' }}>Empecemos con tu información básica</div>
        </div>

        {authError && (
          <div style={{ background: '#FFEBEE', color: '#C62828', padding: '10px 14px', borderRadius: 12, fontSize: 12, fontWeight: 700, marginBottom: 16, textAlign: 'center' }}>
            {authError}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          <Field icon="👤" placeholder="Nombre completo *" fieldKey="name" />
          <Field icon="🎂" placeholder="Fecha de nacimiento (opcional)" fieldKey="bday" type="date" optional />
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#9E9E9E', fontWeight: 700, zIndex: 1 }}>
              🇬🇹 +502
            </div>
            <input placeholder="Teléfono 8 dígitos (opcional)" value={regProfile.phone || ''}
              inputMode="numeric" maxLength={8}
              onChange={e => { setRegProfile(p => ({ ...p, phone: e.target.value.replace(/[^0-9]/g, '') })); clearAuthErr(); }}
              style={{ ...inputStyle, paddingLeft: 80 }} />
            {(regProfile.phone || '').trim().length > 0 && (
              <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 10, fontWeight: 800, color: '#4CAF50', background: '#E8F5E9', padding: '2px 8px', borderRadius: 8 }}>
                +{cfg.regOptional || 2} pts
              </div>
            )}
          </div>
        </div>

        <PtsCard />

        <button onClick={next} style={{ ...btnStyle, background: '#FBBC04', color: '#0D0D0D' }}>
          Siguiente →
        </button>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════
  // PASO 2 — Datos adicionales
  // ══════════════════════════════════════════════════════
  if (googleStep === 'step2') {
    const next = () => {
      clearAuthErr();
      if (!regProfile.dpi?.trim()) { setAuthError('El DPI es obligatorio'); return; }
      if (!/^\d{13}$/.test(regProfile.dpi.trim())) { setAuthError('El DPI debe tener exactamente 13 dígitos'); return; }
      setGoogleStep('step3');
    };

    return (
      <div style={{ padding: '40px 24px 120px' }}>
        <button onClick={() => { setGoogleStep('step1'); clearAuthErr(); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#9E9E9E', fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600, marginBottom: 24 }}>
          <Back /> Atrás
        </button>

        <StepBar step="step2" />

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#0D0D0D', marginBottom: 4 }}>Datos adicionales</div>
          <div style={{ fontSize: 13, color: '#9E9E9E' }}>Necesitamos tu DPI para identificarte</div>
        </div>

        {authError && (
          <div style={{ background: '#FFEBEE', color: '#C62828', padding: '10px 14px', borderRadius: 12, fontSize: 12, fontWeight: 700, marginBottom: 16, textAlign: 'center' }}>
            {authError}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          <Field icon="🪪" placeholder="DPI — 13 dígitos *" fieldKey="dpi" inputMode="numeric" maxLen={13} />
          <Field icon="🧾" placeholder="NIT (opcional)" fieldKey="nit" optional />
          <Field icon="📧" placeholder="Correo electrónico (opcional)" fieldKey="email" type="email" optional />
        </div>

        <PtsCard />

        <button onClick={next} style={{ ...btnStyle, background: '#FBBC04', color: '#0D0D0D' }}>
          Siguiente →
        </button>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════
  // PASO 3 — Vehículos
  // ══════════════════════════════════════════════════════
  if (googleStep === 'step3') {
    const addVehicle = () => {
      if (!newPlate.trim()) { setAuthError('Ingresa la placa del vehículo'); return; }
      clearAuthErr();
      setVehicles(v => [...v, { type: newType, plate: newPlate.trim().toUpperCase() }]);
      setNewPlate(''); setNewType('liviano'); setAddingVehicle(false);
    };

    const removeVehicle = (i) => setVehicles(v => v.filter((_, idx) => idx !== i));

    const typeInfo = (k) => VEHICLE_TYPES.find(t => t.k === k) || VEHICLE_TYPES[0];

    return (
      <div style={{ padding: '40px 24px 120px' }}>
        <button onClick={() => { setGoogleStep('step2'); clearAuthErr(); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#9E9E9E', fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600, marginBottom: 24 }}>
          <Back /> Atrás
        </button>

        <StepBar step="step3" />

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#0D0D0D', marginBottom: 4 }}>Tus vehículos</div>
          <div style={{ fontSize: 13, color: '#9E9E9E' }}>
            Registrá tus vehículos para cargas más rápidas. Ganás <strong style={{ color: '#4CAF50' }}>+{VEHICLE_PTS} pts</strong> por cada uno.
          </div>
        </div>

        {authError && (
          <div style={{ background: '#FFEBEE', color: '#C62828', padding: '10px 14px', borderRadius: 12, fontSize: 12, fontWeight: 700, marginBottom: 16, textAlign: 'center' }}>
            {authError}
          </div>
        )}

        {/* Lista de vehículos agregados */}
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
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#4CAF50', background: '#E8F5E9', padding: '3px 8px', borderRadius: 8, marginRight: 4 }}>
                    +{VEHICLE_PTS} pts
                  </div>
                  <button onClick={() => removeVehicle(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#9E9E9E', padding: 4 }}>
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Formulario para agregar vehículo */}
        {addingVehicle ? (
          <div style={{ background: '#FFF8E1', borderRadius: 16, padding: 16, marginBottom: 16, border: '2px solid #FBBC04' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#424242', marginBottom: 12 }}>Tipo de vehículo</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              {VEHICLE_TYPES.map(t => (
                <button key={t.k} onClick={() => setNewType(t.k)} style={{
                  padding: '12px 8px', borderRadius: 12,
                  border: newType === t.k ? '2px solid #FBBC04' : '2px solid #eee',
                  background: newType === t.k ? '#FFF8E1' : '#fff',
                  color: newType === t.k ? '#F0A500' : '#9E9E9E',
                  cursor: 'pointer', fontFamily: "'DM Sans'", fontWeight: 700, fontSize: 13,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <span style={{ fontSize: 20 }}>{t.icon}</span> {t.label}
                </button>
              ))}
            </div>
            <input placeholder="Placa (ej: ABC-123)" value={newPlate}
              onChange={e => { setNewPlate(e.target.value.toUpperCase()); clearAuthErr(); }}
              style={{ ...inputStyle, marginBottom: 12, fontFamily: 'monospace', fontWeight: 700, letterSpacing: 2 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setAddingVehicle(false); setNewPlate(''); clearAuthErr(); }} style={{
                flex: 1, padding: 12, borderRadius: 12, border: '2px solid #eee',
                background: '#fff', color: '#9E9E9E', fontFamily: "'DM Sans'", fontWeight: 700, cursor: 'pointer', fontSize: 13,
              }}>
                Cancelar
              </button>
              <button onClick={addVehicle} style={{
                flex: 2, padding: 12, borderRadius: 12, border: 'none',
                background: '#FBBC04', color: '#0D0D0D', fontFamily: "'DM Sans'", fontWeight: 900, cursor: 'pointer', fontSize: 13,
              }}>
                + Agregar vehículo
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAddingVehicle(true)} style={{
            width: '100%', padding: '14px', borderRadius: 14,
            border: '2px dashed #FBBC04', background: '#FFF8E1',
            color: '#F0A500', fontFamily: "'DM Sans'", fontWeight: 800,
            fontSize: 14, cursor: 'pointer', marginBottom: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            🚗 Agregar vehículo {vehicles.length > 0 && `(${vehicles.length} registrado${vehicles.length > 1 ? 's' : ''})`}
          </button>
        )}

        {vehicles.length === 0 && (
          <div style={{ textAlign: 'center', fontSize: 12, color: '#9E9E9E', marginBottom: 16 }}>
            Podés saltarte este paso si no querés registrar vehículos ahora.
          </div>
        )}

        <PtsCard />

        <button onClick={doFinish} style={{ ...btnStyle, background: '#FBBC04', color: '#0D0D0D' }}>
          {vehicles.length > 0 ? `Finalizar registro (+${totalPts} pts) ✓` : 'Finalizar registro ✓'}
        </button>
      </div>
    );
  }

  return null;
}
