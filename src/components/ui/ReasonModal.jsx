// src/components/ui/ReasonModal.jsx
// Modal genérico reusable para recolectar el motivo de una acción
// administrativa sensible. Espeja las reglas server-side del RPC
// log_admin_action (F0.3.1.5): mínimo 8 chars tras trim, máximo 500
// chars sin trim. Solo UI — no toca Supabase.
import { useState, useEffect } from 'react';
import { adminTheme as AT, inputStyleDark } from '../../constants/styles';

export default function ReasonModal({ open, onClose, onConfirm, actionLabel, loading = false }) {
  const [reason, setReason] = useState('');
  // Fix 8-ago (caso real: eliminar promoción "no lo permitía" en la
  // computadora): el botón deshabilitado no comunicaba POR QUÉ. Ahora
  // el clic con motivo inválido resalta el aviso en un recuadro rojo.
  const [tried, setTried] = useState(false);

  // Resetear el textarea cada vez que el modal se abre, para no
  // arrastrar el motivo de una acción anterior.
  useEffect(() => {
    if (open) { setReason(''); setTried(false); }
  }, [open]);

  if (!open) return null;

  // ─── Validación client-side (espeja log_admin_action F0.3.1.5) ───
  const trimmedLen = reason.trim().length; // mínimo se mide tras trim
  const rawLen = reason.length;            // máximo se mide sin trim
  const tooShort = trimmedLen < 8;
  const tooLong = rawLen > 500;
  const valid = !tooShort && !tooLong;
  const confirmDisabled = !valid || loading;

  const handleConfirm = () => {
    // Motivo inválido: NO deshabilitar en silencio — marcar el aviso
    // (el usuario reportó "no lo permite" sin saber que faltaban chars)
    if (!valid) { setTried(true); return; }
    if (loading) return;
    // Se entrega el texto SIN trim: el server persiste el original
    // (estricto al leer, generoso al guardar — F0.3.1.5).
    onConfirm(reason);
  };

  return (
    <div
      onClick={loading ? undefined : onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: AT.bg, border: `1px solid ${AT.border}`,
          borderRadius: 20, padding: 24, width: '100%', maxWidth: 400,
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        {/* Título */}
        <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 12 }}>
          Motivo del cambio
        </div>

        {/* Acción a realizar */}
        <div style={{
          background: 'rgba(251,188,4,.08)', border: '1px solid rgba(251,188,4,.25)',
          borderRadius: 12, padding: '10px 12px', marginBottom: 14,
          fontSize: 13, color: '#E0E0E0', fontWeight: 600,
        }}>
          Vas a realizar la siguiente acción:{' '}
          <span style={{ color: '#FBBC04', fontWeight: 800 }}>{actionLabel}</span>
        </div>

        {/* Subtítulo */}
        <div style={{ fontSize: 12, color: '#9E9E9E', marginBottom: 10 }}>
          Esta acción quedará registrada. Por favor, indica el motivo:
        </div>

        {/* Textarea */}
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={loading}
          rows={5}
          placeholder="Describe el motivo de este cambio..."
          style={{
            ...inputStyleDark,
            width: '100%', minHeight: 110, resize: 'vertical',
            lineHeight: 1.5,
            border: `1.5px solid ${tooLong ? '#EF5350' : '#3A3A3A'}`,
          }}
        />

        {/* Hint + contador */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 6, marginBottom: tried && !valid ? 10 : 20, fontSize: 11, fontWeight: 700,
        }}>
          <span style={{ color: tooShort ? '#EF5350' : '#2E7D32' }}>
            {tooShort
              ? `Minimo 8 caracteres (faltan ${8 - trimmedLen})`
              : 'Listo para confirmar'
            }
          </span>
          <span style={{ color: tooLong ? '#EF5350' : '#777' }}>
            {rawLen} / 500
          </span>
        </div>

        {/* Aviso REFORZADO tras intentar confirmar con motivo inválido */}
        {tried && !valid && (
          <div style={{
            background: 'rgba(239,83,80,.12)', border: '1px solid rgba(239,83,80,.45)',
            borderRadius: 12, padding: '10px 12px', marginBottom: 16,
            fontSize: 12, color: '#EF9A9A', fontWeight: 700, lineHeight: 1.5,
          }}>
            {tooShort
              ? `Para confirmar, el motivo debe tener al menos 8 caracteres — llevás ${trimmedLen}.`
              : 'El motivo supera los 500 caracteres — recortalo para confirmar.'}
          </div>
        )}

        {/* Botones */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1, padding: '14px 16px',
              background: 'transparent', border: `1px solid ${AT.border}`,
              borderRadius: 14, color: '#9E9E9E',
              fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            style={{
              flex: 1, padding: '14px 16px',
              background: confirmDisabled ? '#3A3A3A' : '#FBBC04',
              border: 'none', borderRadius: 14,
              color: confirmDisabled ? '#777' : '#0D0D0D',
              fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Procesando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
