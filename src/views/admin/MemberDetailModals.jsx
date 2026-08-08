// src/views/admin/MemberDetailModals.jsx
// Modales de la ficha del miembro (extraídos de MemberDetail el
// 8-ago-2026 — el archivo pasaba de 500 líneas — y rediseñados al
// FORMATO GENERAL Admin v2: modales OSCUROS centrados como
// ReasonModal, sin emojis, tipos de vehículo con iconos SVG del
// cliente). La lógica no cambia: todo sigue pasando por el flujo
// auditado de MemberDetail (ReasonModal → RPCs).
import { adminTheme as AT, inputStyleDark, sMono } from '../../constants/styles';
import { VEHICLE_TYPES } from '../../components/ui/VehicleIcons';
import { plateMask } from '../../lib/inputMasks';

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

// ── Editar datos del miembro ────────────────────────────────────
export function EditMemberModal({ editMember, setEditMember, fieldErrors, setFieldErrors, validateField, onSave, onClose }) {
  const FIELDS = [
    { k: 'name',  l: 'Nombre',     t: 'text',  max: 60 },
    { k: 'phone', l: 'Teléfono',   t: 'tel',   max: 8,  numeric: true },
    { k: 'dpi',   l: 'DPI',        t: 'text',  max: 13, numeric: true },
    { k: 'plate', l: 'Placa',      t: 'text',  max: 10 },
    { k: 'email', l: 'Email',      t: 'email', max: 80 },
    { k: 'nit',   l: 'NIT',        t: 'text',  max: 12 },
    { k: 'bday',  l: 'Cumpleaños', t: 'text',  max: 10 },
  ];
  return (
    <div style={overlay} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={sheet}>
        <div style={title}>Editar miembro</div>
        {FIELDS.map(f => (
          <div key={f.k} style={{ marginBottom: 10 }}>
            <label style={lbl}>{f.l}</label>
            <input
              type={f.t}
              value={editMember[f.k] || ''}
              maxLength={f.max}
              inputMode={f.numeric ? 'numeric' : undefined}
              onChange={e => {
                let val = e.target.value;
                if (f.numeric) val = val.replace(/[^0-9]/g, '');
                setEditMember(p => ({ ...p, [f.k]: val }));
                if (fieldErrors[f.k]) setFieldErrors(prev => ({ ...prev, [f.k]: null }));
              }}
              onBlur={e => {
                let val = e.target.value;
                if (!f.numeric && val !== val.trim()) {
                  val = val.trim();
                  setEditMember(p => ({ ...p, [f.k]: val }));
                }
                setFieldErrors(prev => ({ ...prev, [f.k]: validateField(f.k, val) }));
              }}
              style={{ ...inputStyleDark, fontSize: 13, padding: '10px 12px', borderColor: fieldErrors[f.k] ? '#EF5350' : undefined }}
            />
            {fieldErrors[f.k] && <div style={errTxt}>{fieldErrors[f.k]}</div>}
          </div>
        ))}
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
          <button onClick={() => onSave(editMember)} style={btnMain}>Guardar cambios</button>
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
          Se asignará una contraseña nueva a <strong style={{ color: '#E0E0E0' }}>{member.name}</strong> ({member.phone}).
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
