// src/views/client/menu/DeleteAccountSection.jsx
// Borrado de cuenta desde el cliente (6-ago-2026, pedido del dueño):
// tarjeta "Zona de peligro" al FINAL de Mi Cuenta + bottom sheet de
// confirmación con fricción fuerte — advertencia de irreversibilidad
// con los números REALES del cliente (puntos/galones que pierde) y
// obligación de tipear ELIMINAR para habilitar el botón. El RPC
// delete_my_account (soft delete) anonimiza la PII de forma
// IRREVERSIBLE y revoca sesiones/huella/push; al terminar se cierra
// la sesión local. Ambos modos (claro/oscuro) vía TH.
import { useState } from 'react';
import { bento } from '../../../constants/styles';
import { Warn } from '../../../components/ui/Icons';
import useBackLayer from '../../../hooks/useBackLayer';
import { deleteMyAccountSecure } from '../../../services/secureReads';

const DANGER = '#D6281A';

export default function DeleteAccountSection({ ctx, TH }) {
  const { me, fire, logout } = ctx;
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [confirmTxt, setConfirmTxt] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => {
    if (busy) return;
    setClosing(true);
    setTimeout(() => { setOpen(false); setClosing(false); setConfirmTxt(''); }, 200);
  };
  useBackLayer(open, close);

  const armed = confirmTxt.trim().toUpperCase() === 'ELIMINAR';

  const doDelete = async () => {
    if (!armed || busy) return;
    setBusy(true);
    const res = await deleteMyAccountSecure(confirmTxt.trim());
    setBusy(false);
    if (res?.error) { fire('Error: ' + res.error, 'error'); return; }
    // La cuenta ya no existe: cerrar sesión local en todos lados.
    fire('Tu cuenta fue eliminada', 'success');
    logout();
  };

  const risks = [
    `Perderás tus ${me?.points ?? 0} puntos y tus ${me?.gallons ?? 0} galones acumulados (tu nivel se pierde)`,
    'Tus premios pendientes de recoger quedarán inválidos',
    'Tu historial y tu tarjeta digital dejarán de funcionar',
    'Tus datos personales se borran de forma permanente',
    'NADIE puede recuperar la cuenta — ni vos ni la empresa',
  ];

  return (
    <>
      {/* ── Tarjeta Zona de peligro (al final de Mi Cuenta) ── */}
      <div style={{
        marginTop: 26, borderRadius: 20, padding: 16,
        background: TH.isDark ? 'rgba(214,40,26,.10)' : 'rgba(214,40,26,.06)',
        border: `1px solid ${TH.isDark ? 'rgba(214,40,26,.45)' : 'rgba(214,40,26,.25)'}`,
      }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: DANGER, marginBottom: 8 }}>
          Zona de peligro
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.55, color: TH.sub, marginBottom: 12 }}>
          Eliminar tu cuenta borra tus datos personales de forma permanente e
          irreversible. Perdés tus puntos, tu nivel y tus premios pendientes.
        </div>
        <button onClick={() => setOpen(true)} style={{
          width: '100%', padding: 13, borderRadius: 12, cursor: 'pointer',
          background: 'transparent', border: `1.5px solid ${DANGER}`,
          color: DANGER, fontFamily: "'DM Sans'", fontSize: 13.5, fontWeight: 800,
        }}>
          Eliminar mi cuenta
        </button>
      </div>

      {/* ── Sheet de confirmación con fricción ── */}
      {open && (
        <div onClick={close} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)',
          zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          animation: closing ? 'ppFadeOut .2s ease forwards' : 'ppFade .2s ease',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: TH.isDark ? '#101018' : '#fff',
            borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480,
            padding: '12px 22px 40px', maxHeight: '90vh', overflowY: 'auto',
            animation: closing ? 'slideDownOut .2s ease-in forwards' : 'slideUp .3s cubic-bezier(.32,1.2,.64,1)',
          }}>
            <div style={{ width: 40, height: 4, borderRadius: 4, background: TH.isDark ? 'rgba(255,255,255,.2)' : '#E0E0E0', margin: '0 auto 18px' }} />

            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16, margin: '0 auto 10px',
                background: DANGER, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Warn />
              </div>
              <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: DANGER }}>
                Acción irreversible
              </div>
              <div style={{ fontSize: 19, fontWeight: 800, color: TH.header, marginTop: 4 }}>
                ¿Eliminar tu cuenta?
              </div>
            </div>

            <div style={{
              background: TH.isDark ? 'rgba(214,40,26,.10)' : 'rgba(214,40,26,.06)',
              borderRadius: 16, padding: '14px 16px', marginBottom: 16,
            }}>
              {risks.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '4px 0' }}>
                  <span style={{ color: DANGER, fontWeight: 900, lineHeight: '18px', flexShrink: 0 }}>•</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.5, color: TH.isDark ? '#E8C4C0' : '#7A2018' }}>{r}</span>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: TH.sub, marginBottom: 8 }}>
              Para confirmar, escribí <span style={{ color: DANGER, fontWeight: 800, letterSpacing: 1 }}>ELIMINAR</span>
            </div>
            <input
              value={confirmTxt}
              onChange={e => setConfirmTxt(e.target.value)}
              placeholder="ELIMINAR"
              autoCapitalize="characters"
              autoComplete="off"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '13px 16px',
                borderRadius: 12, fontFamily: "'DM Sans'", fontSize: 15, fontWeight: 800,
                letterSpacing: 2, textAlign: 'center', outline: 'none',
                background: TH.isDark ? 'rgba(255,255,255,.08)' : '#F5F5F7',
                border: `1.5px solid ${armed ? DANGER : 'transparent'}`,
                color: TH.header, marginBottom: 16,
              }}
            />

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={close} disabled={busy} style={{
                flex: 1, padding: 15, borderRadius: 14, border: 'none', cursor: 'pointer',
                background: TH.isDark ? 'rgba(255,255,255,.08)' : '#F5F5F7',
                color: TH.isDark ? '#ccc' : '#424242',
                fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 700,
              }}>
                Cancelar
              </button>
              <button onClick={doDelete} disabled={!armed || busy} style={{
                flex: 2, padding: 15, borderRadius: 14, border: 'none',
                background: armed && !busy ? DANGER : (TH.isDark ? 'rgba(255,255,255,.10)' : '#E5E5EA'),
                color: armed && !busy ? '#fff' : (TH.isDark ? 'rgba(255,255,255,.35)' : '#9E9E9E'),
                fontFamily: "'DM Sans'", fontSize: 14.5, fontWeight: 800,
                cursor: armed && !busy ? 'pointer' : 'not-allowed',
              }}>
                {busy ? 'Eliminando...' : 'Eliminar definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
