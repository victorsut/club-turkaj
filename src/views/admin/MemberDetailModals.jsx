// src/views/admin/MemberDetailModals.jsx
// Modales + REGLAS DE EDICIÓN de la ficha del miembro (extraídos de
// MemberDetail el 8-ago-2026 — límite de 500 líneas). FORMATO GENERAL
// Admin v2: modales OSCUROS centrados (patrón ReasonModal), sin emojis.
// Refinado del dueño (8-ago): el form de edición gana APODO y
// DIRECCIÓN (cascada dep → muni → cantón, mismo AddressPicker del
// registro), pierde la PLACA (se edita en la sección de vehículos) y
// el cumpleaños pasa a "Fecha de nacimiento" con el drum picker del
// registro. Todo sigue pasando por el flujo auditado de MemberDetail
// (ReasonModal → update_member_with_audit; migración 20260808d
// agrega nickname/address a la whitelist del RPC).
import { useState } from 'react';
import { adminTheme as AT, inputStyleDark, sMono } from '../../constants/styles';
import { VEHICLE_TYPES } from '../../components/ui/VehicleIcons';
import { DatePickerSheet } from '../../components/ui/DrumDatePicker';
import AddressPicker, { EMPTY_ADDRESS } from '../../components/ui/AddressPicker';
import { packAddress } from '../../constants/geoGt';
import { plateMask, phoneMask, dpiMask } from '../../lib/inputMasks';

// ═══ Reglas de edición (las usa MemberDetail para validar/diff) ═══

export const PROFILE_FIELDS = ['name', 'nickname', 'phone', 'dpi', 'email', 'nit', 'birthday'];

// '—' es el placeholder visual de la ficha (get_member_full mapea los
// vacíos así) — NUNCA debe validarse ni guardarse como dato.
const norm = (v) => { const s = (v ?? '').toString().trim(); return s === '—' ? '' : s; };

// F0.3.8.6: validacion por campo. Devuelve mensaje de error o null.
// phone/dpi son bloqueantes (formato estricto); el resto valida solo
// si no esta vacio. name se valida en validateForm (pre-submit).
export const validateField = (field, value) => {
  const v = norm(value);
  switch (field) {
    case 'name':
      return null;
    case 'nickname':
      if (v.length > 20) return 'El apodo no puede superar 20 caracteres';
      return null;
    case 'phone':
      if (!v) return null;
      if (!/^\d{8}$/.test(v)) return 'Telefono debe tener exactamente 8 digitos';
      return null;
    case 'dpi':
      if (!v) return null;
      if (!/^\d{13}$/.test(v)) return 'DPI debe tener exactamente 13 digitos';
      return null;
    case 'email':
      if (!v) return null;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Email invalido';
      return null;
    case 'bday':
      if (!v) return null;
      // Acepta MM-DD (registros viejos) y YYYY-MM-DD (fecha completa)
      if (!/^(\d{4}-)?(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v)) return 'Formato MM-DD o YYYY-MM-DD';
      return null;
    case 'points': {
      if (v === '') return null;
      const p = Number(v);
      if (isNaN(p) || p < 0 || !Number.isInteger(p)) return 'Debe ser entero >= 0';
      return null;
    }
    case 'gallons': {
      if (v === '') return null;
      const g = Number(v);
      if (isNaN(g) || g < 0) return 'Debe ser numero >= 0';
      return null;
    }
    default:
      return null;
  }
};

// F0.3.8.6: validacion completa pre-submit. Devuelve mapa de errores.
export const validateForm = (edited) => {
  const errors = {};
  ['nickname', 'phone', 'dpi', 'email', 'bday', 'points', 'gallons'].forEach(f => {
    const err = validateField(f, edited[f]);
    if (err) errors[f] = err;
  });
  const name = norm(edited.name);
  if (!name || name.length < 2) errors.name = 'Nombre requerido (minimo 2 caracteres)';
  return errors;
};

// Diff por categoria: solo campos/categorias modificados. `original`
// y `edited` usan nombres del cliente (bday, no birthday); '—' cuenta
// como vacío en ambos lados (evita falsos cambios). La dirección se
// compara como JSON (objeto packAddress o null).
export const buildDiff = (original, edited) => {
  const changes = {};
  const profileDiff = {};

  PROFILE_FIELDS.forEach(field => {
    const clientField = field === 'birthday' ? 'bday' : field;
    if (norm(edited[clientField]) !== norm(original[clientField])) {
      profileDiff[field] = norm(edited[clientField]) || null;
    }
  });

  const origAddr = original.address || null;
  const editAddr = edited.address || null;
  if (JSON.stringify(origAddr) !== JSON.stringify(editAddr)) profileDiff.address = editAddr;

  if (Object.keys(profileDiff).length > 0) changes.profile = profileDiff;

  const editedPoints = +edited.points || 0;
  const originalPoints = +original.points || 0;
  if (editedPoints !== originalPoints) changes.points = editedPoints;

  const editedGallons = +edited.gallons || 0;
  const originalGallons = +original.gallons || 0;
  if (editedGallons !== originalGallons) changes.gallons = editedGallons;

  return changes;
};

// ═══ Estilos compartidos de los modales ═══

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
const title = { fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 16 };
const lbl = { display: 'block', fontSize: 11, fontWeight: 800, color: '#9E9E9E', marginBottom: 5, textTransform: 'uppercase', letterSpacing: .8 };
const errTxt = { color: '#EF5350', fontSize: 12, marginTop: 4 };
const btnGhost = {
  flex: 1, padding: 13, borderRadius: 12, cursor: 'pointer',
  border: `1px solid ${AT.border}`, background: 'transparent', color: '#9E9E9E',
  fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700,
};
const btnMain = {
  flex: 2, padding: 13, borderRadius: 12, cursor: 'pointer', border: 'none',
  background: '#FBBC04', color: '#0D0D0D',
  fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 800,
};

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
// Fecha legible desde 'YYYY-MM-DD' (completa) o 'MM-DD' (registros viejos)
const fmtBday = (v) => {
  if (!v) return null;
  const p = v.split('-');
  if (p.length === 3) return `${p[2]} / ${MONTHS[+p[1] - 1] || p[1]} / ${p[0]}`;
  if (p.length === 2) return `${p[1]} / ${MONTHS[+p[0] - 1] || p[0]}`;
  return v;
};

// ── Editar datos del miembro ────────────────────────────────────
export function EditMemberModal({ editMember, setEditMember, fieldErrors, setFieldErrors, onSave, onClose }) {
  // Dirección en cascada (mismo componente del registro); se empaqueta
  // con packAddress al guardar (incompleta = null, no se inventan datos)
  const [addr, setAddr] = useState(editMember.address || EMPTY_ADDRESS);
  const [showBday, setShowBday] = useState(false);
  const [tempDate, setTempDate] = useState('2000-01-01');

  const bdayVal = norm(editMember.bday);
  const openBdayPicker = () => {
    setTempDate(/^\d{4}-\d{2}-\d{2}$/.test(bdayVal) ? bdayVal
      : bdayVal.length === 5 ? '2000-' + bdayVal : '2000-01-01');
    setShowBday(true);
  };

  // phone/dpi con MÁSCARA del registro (estado crudo, display con
  // espacios — mask.clean ya limita 8/13 dígitos); NIT sin máscara
  // (regla del 23-jul: texto plano en form y BD).
  const FIELDS = [
    { k: 'name',     l: 'Nombre',     t: 'text',  max: 60 },
    { k: 'nickname', l: 'Apodo',      t: 'text',  max: 20 },
    { k: 'phone',    l: 'Teléfono',   t: 'tel',   mask: phoneMask, inputMode: 'numeric' },
    { k: 'dpi',      l: 'DPI',        t: 'text',  mask: dpiMask,   inputMode: 'numeric' },
    { k: 'email',    l: 'Email',      t: 'email', max: 80 },
    { k: 'nit',      l: 'NIT',        t: 'text',  max: 12 },
  ];

  return (
    <div style={overlay} onClick={onClose}>
      {/* stopPropagation: el sheet vive DENTRO del overlay del modal —
          sin esto, el clic burbujea y cierra el modal completo */}
      {showBday && (
        <div onClick={e => e.stopPropagation()}>
          <DatePickerSheet
            tempDate={tempDate}
            setTempDate={setTempDate}
            setShowDatePicker={setShowBday}
            setRegProfile={(up) => { const r = up({}); if (r.bday) setEditMember(p => ({ ...p, bday: r.bday })); }}
            dark={true}
          />
        </div>
      )}
      <div onClick={e => e.stopPropagation()} style={sheet}>
        <div style={title}>Editar miembro</div>
        {FIELDS.map(f => (
          <div key={f.k} style={{ marginBottom: 10 }}>
            <label style={lbl}>{f.l}</label>
            <input
              type={f.t}
              value={f.mask ? f.mask.format(editMember[f.k] || '') : (editMember[f.k] || '')}
              maxLength={f.max}
              inputMode={f.inputMode}
              onChange={e => {
                const val = f.mask ? f.mask.clean(e.target.value) : e.target.value;
                setEditMember(p => ({ ...p, [f.k]: val }));
                if (fieldErrors[f.k]) setFieldErrors(prev => ({ ...prev, [f.k]: null }));
              }}
              onBlur={e => {
                // Validar siempre el valor CRUDO (la máscara agrega espacios)
                let val = f.mask ? f.mask.clean(e.target.value) : e.target.value;
                if (!f.mask && val !== val.trim()) {
                  val = val.trim();
                  setEditMember(p => ({ ...p, [f.k]: val }));
                }
                setFieldErrors(prev => ({ ...prev, [f.k]: validateField(f.k, val) }));
              }}
              style={{ ...inputStyleDark, fontSize: 13, padding: '10px 12px', borderColor: fieldErrors[f.k] ? '#EF5350' : undefined, ...(f.mask ? { fontVariantNumeric: 'tabular-nums', letterSpacing: .5 } : {}) }}
            />
            {fieldErrors[f.k] && <div style={errTxt}>{fieldErrors[f.k]}</div>}
          </div>
        ))}

        {/* Fecha de nacimiento — drum picker del registro */}
        <div style={{ marginBottom: 10 }}>
          <label style={lbl}>Fecha de nacimiento</label>
          <div onClick={openBdayPicker}
            style={{ ...inputStyleDark, fontSize: 13, padding: '10px 12px', cursor: 'pointer', userSelect: 'none', color: bdayVal ? '#E0E0E0' : '#777' }}>
            {fmtBday(bdayVal) || 'Seleccionar fecha'}
          </div>
          {fieldErrors.bday && <div style={errTxt}>{fieldErrors.bday}</div>}
        </div>

        {/* Dirección — cascada dep → muni → cantón del registro */}
        <div style={{ marginBottom: 10 }}>
          <label style={lbl}>Dirección</label>
          <AddressPicker value={addr} onChange={setAddr} dark={true} fieldBg="rgba(255,255,255,.08)" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '16px 0' }}>
          {[
            { k: 'points',  l: 'Puntos',  step: 1 },
            { k: 'gallons', l: 'Galones', step: 0.01 },
          ].map(f => (
            <div key={f.k}>
              <label style={lbl}>{f.l}</label>
              <input
                type="number" min={0} step={f.step}
                value={editMember[f.k] ?? ''}
                onChange={e => {
                  setEditMember(p => ({ ...p, [f.k]: e.target.value }));
                  if (fieldErrors[f.k]) setFieldErrors(prev => ({ ...prev, [f.k]: null }));
                }}
                onBlur={e => setFieldErrors(prev => ({ ...prev, [f.k]: validateField(f.k, e.target.value) }))}
                style={{ ...inputStyleDark, ...sMono, fontSize: 14, textAlign: 'center', padding: 10, borderColor: fieldErrors[f.k] ? '#EF5350' : undefined }}
              />
              {fieldErrors[f.k] && <div style={errTxt}>{fieldErrors[f.k]}</div>}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={btnGhost}>Cancelar</button>
          <button onClick={() => onSave({ ...editMember, address: packAddress(addr) })} style={btnMain}>Guardar cambios</button>
        </div>
      </div>
    </div>
  );
}

// ── Restablecer contraseña ──────────────────────────────────────
export function PwResetModal({ pwModal, setPwModal, member, onSubmit, onClose }) {
  return (
    <div style={overlay} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={sheet}>
        <div style={{ ...title, marginBottom: 6 }}>Restablecer contraseña</div>
        <div style={{ fontSize: 12.5, color: '#9E9E9E', marginBottom: 18, lineHeight: 1.55 }}>
          Se asignará una contraseña nueva a <strong style={{ color: '#E0E0E0' }}>{member.name}</strong> ({member.phone && member.phone !== '—' ? phoneMask.format(member.phone) : '—'}).
          Entregásela al cliente y pedile que la cambie desde Mi Cuenta.
        </div>
        {[
          { k: 'pass', l: 'Nueva contraseña' },
          { k: 'confirm', l: 'Confirmar contraseña' },
        ].map(f => (
          <div key={f.k} style={{ marginBottom: 12 }}>
            <label style={lbl}>{f.l}</label>
            <input
              type="text" autoComplete="off" placeholder="Mínimo 6 caracteres"
              value={pwModal[f.k]}
              onChange={e => setPwModal(p => ({ ...p, [f.k]: e.target.value }))}
              style={{ ...inputStyleDark, fontSize: 14, padding: '10px 12px' }}
            />
          </div>
        ))}
        {pwModal.confirm && pwModal.confirm !== pwModal.pass && (
          <div style={{ ...errTxt, marginBottom: 10 }}>Las contraseñas no coinciden</div>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <button onClick={onClose} style={btnGhost}>Cancelar</button>
          <button onClick={onSubmit} style={btnMain}>Restablecer</button>
        </div>
      </div>
    </div>
  );
}

// ── Agregar / editar UN vehículo ────────────────────────────────
export function VehicleModal({ vehModal, setVehModal, onSave, onClose }) {
  return (
    <div style={overlay} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={sheet}>
        <div style={title}>{vehModal.idx == null ? 'Agregar vehículo' : 'Editar vehículo'}</div>
        <label style={lbl}>Tipo de vehículo</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {VEHICLE_TYPES.map(t => {
            const on = vehModal.type === t.k;
            return (
              <button key={t.k} onClick={() => setVehModal(p => ({ ...p, type: t.k }))} style={{
                padding: '10px 8px', borderRadius: 12, cursor: 'pointer',
                border: `1px solid ${on ? '#FBBC04' : AT.border}`,
                background: on ? 'rgba(251,188,4,.12)' : 'transparent',
                color: on ? '#FBBC04' : '#9E9E9E',
                fontFamily: "'DM Sans'", fontWeight: 700, fontSize: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <t.Icon size={18} />{t.label}
              </button>
            );
          })}
        </div>
        <label style={lbl}>Placa</label>
        <input
          placeholder="Placa (ej: P 123 ABC)"
          value={plateMask.format(vehModal.plate)}
          autoCapitalize="characters"
          onChange={e => setVehModal(p => ({ ...p, plate: plateMask.clean(e.target.value) }))}
          style={{ ...inputStyleDark, marginBottom: 16, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, letterSpacing: 2 }}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={btnGhost}>Cancelar</button>
          <button onClick={onSave} style={btnMain}>{vehModal.idx == null ? 'Agregar' : 'Guardar cambios'}</button>
        </div>
      </div>
    </div>
  );
}
