// src/views/client/NotificationsSheet.jsx
// Inbox de notificaciones (campana del inicio, 28-jul-2026): lista lo
// que el motor de push registró en `notifications` para el miembro.
// Al abrir se marcan TODAS como leídas en el servidor (read_at), pero
// las que estaban sin leer conservan su indicador visual durante esta
// apertura. Mismo contenedor que HistorySheet: ventana full-screen que
// deja visible la BottomNav, entra/sale con container transform (D35)
// y registra el botón físico de volver.
import { useState, useRef, useEffect } from 'react';
import { bento, BRAND_ORANGE, clientMainBg } from '../../constants/styles';
import { ArrowLeft, Gift, Fuel, Warn, Info, XMark } from '../../components/ui/Icons';
import useBackLayer from '../../hooks/useBackLayer';

const CLOSE_MS = 200;

// Presentación por tipo de notificación (motor: type rutea también acá).
const TYPE_META = {
  purchase:    { Icon: Fuel, color: bento.green,  label: 'Compra' },
  reward:      { Icon: Gift, color: BRAND_ORANGE, label: 'Premio' },
  degradacion: { Icon: Warn, color: bento.amber,  label: 'Nivel' },
  general:     { Icon: Info, color: '#8E8E93',    label: 'Aviso' },
};

// "Hoy · 09:15", "Ayer · 18:40" o "26 jul · 14:03" (hora de Guatemala).
function fmtWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const tz = 'America/Guatemala';
  const day = d.toLocaleDateString('en-CA', { timeZone: tz });
  const today = new Date().toLocaleDateString('en-CA', { timeZone: tz });
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA', { timeZone: tz });
  const time = d.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz });
  if (day === today) return `Hoy · ${time}`;
  if (day === yesterday) return `Ayer · ${time}`;
  const date = d.toLocaleDateString('es-GT', { day: 'numeric', month: 'short', timeZone: tz });
  return `${date} · ${time}`;
}

export default function NotificationsSheet({ origin, onClose, notifs, markRead, clearNotifs, tierName, dark }) {
  const [closing, setClosing] = useState(false);

  // Limpiar TODAS (14-ago): doble tap de confirmación — el primer tap
  // arma "¿Borrar?" por 2.5s, el segundo ejecuta. Uno por uno va con
  // la X de cada tarjeta, sin confirmación (bajo costo de error).
  const [confirmClear, setConfirmClear] = useState(false);
  const confirmTimer = useRef(null);
  useEffect(() => () => clearTimeout(confirmTimer.current), []);
  const onClearAll = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      confirmTimer.current = setTimeout(() => setConfirmClear(false), 2500);
      return;
    }
    clearTimeout(confirmTimer.current);
    setConfirmClear(false);
    clearNotifs?.();
  };

  // Las sin leer AL ABRIR conservan el punto naranja mientras el sheet
  // esté abierto, aunque markRead() ya las estampe en el servidor.
  const unreadAtOpen = useRef(null);
  if (unreadAtOpen.current === null) {
    unreadAtOpen.current = new Set((notifs || []).filter(n => !n.read_at).map(n => n.id));
  }
  useEffect(() => {
    if (unreadAtOpen.current.size && markRead) markRead();
  }, [markRead]);

  const close = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, CLOSE_MS);
  };
  useBackLayer(true, close);

  const TH = {
    bg: dark ? clientMainBg(tierName, true) : '#F5F5F7',
    surface: dark ? 'rgba(255,255,255,.05)' : '#fff',
    header: dark ? '#fff' : '#0D0D0D',
    txt: dark ? '#E0E0E0' : '#424242',
    sub: dark ? 'rgba(255,255,255,.5)' : '#9E9E9E',
  };

  const items = notifs || [];
  const newCount = unreadAtOpen.current.size;

  return (
    <div className={closing ? 'pp-grow-out' : 'pp-grow'} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 55, margin: '0 auto',
      width: '100%', maxWidth: 480, zIndex: 90,
      background: TH.bg, overflowY: 'auto', paddingBottom: 24,
      transformOrigin: origin ? `${origin.x}px ${origin.y}px` : '50% 20%',
    }}>
      {/* Header: flecha suelta + título centrado (formato general) */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 2, background: TH.bg,
        padding: '16px 14px 8px', display: 'flex', alignItems: 'center',
      }}>
        <button onClick={close} aria-label="Volver" style={{
          width: 40, height: 40, border: 'none', cursor: 'pointer',
          background: 'none', color: TH.header, padding: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <ArrowLeft />
        </button>
        <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: TH.header }}>Notificaciones</div>
          <div style={{ fontSize: 11, color: TH.sub, fontWeight: 600, marginTop: 1 }}>
            {newCount > 0
              ? `${newCount} nueva${newCount === 1 ? '' : 's'}`
              : `${items.length} en total`}
          </div>
        </div>
        {/* Limpiar todas — doble tap de confirmación (14-ago) */}
        {items.length > 0 ? (
          <button onClick={onClearAll} style={{
            border: 'none', cursor: 'pointer', background: 'none', padding: '4px 0',
            minWidth: 52, flexShrink: 0, textAlign: 'right',
            fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 800,
            color: confirmClear ? bento.red : BRAND_ORANGE,
          }}>
            {confirmClear ? '¿Borrar?' : 'Limpiar'}
          </button>
        ) : (
          <div style={{ width: 52, flexShrink: 0 }} />
        )}
      </div>

      {items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 30px', color: TH.sub, fontSize: 13, fontWeight: 700 }}>
          Sin notificaciones todavía.
          Acá verás tus compras, premios y avisos del programa.
        </div>
      )}

      <div style={{ padding: '4px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(n => {
          const meta = TYPE_META[n.type] || TYPE_META.general;
          const isNew = unreadAtOpen.current.has(n.id);
          return (
            <div key={n.id} style={{
              display: 'flex', gap: 12, alignItems: 'flex-start',
              background: TH.surface, borderRadius: 16, padding: '12px 14px',
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                background: meta.color, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <meta.Icon />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <div style={{ flex: 1, fontSize: 13.5, fontWeight: 800, color: TH.header }}>
                    {n.title || meta.label}
                  </div>
                  {isNew && (
                    <span aria-label="Sin leer" style={{
                      width: 8, height: 8, borderRadius: 4, flexShrink: 0,
                      background: BRAND_ORANGE, alignSelf: 'center',
                    }} />
                  )}
                </div>
                {n.body && (
                  <div style={{ fontSize: 12, color: TH.txt, marginTop: 2, lineHeight: 1.45 }}>
                    {n.body}
                  </div>
                )}
                <div style={{ fontSize: 10.5, fontWeight: 700, color: TH.sub, marginTop: 5 }}>
                  {meta.label} · {fmtWhen(n.sent_at)}
                </div>
              </div>
              {/* Quitar ESTA notificación (14-ago) */}
              <button onClick={() => clearNotifs?.(n.id)} aria-label="Quitar notificación" style={{
                border: 'none', cursor: 'pointer', background: 'none',
                color: TH.sub, padding: 4, margin: '-4px -6px 0 0',
                flexShrink: 0, display: 'flex', alignSelf: 'flex-start',
              }}>
                <XMark />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
