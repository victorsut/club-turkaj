// src/components/ui/GrowModal.jsx
// D35 — Modal con container transform completo: NACE del cuadro
// presionado (pp-grow + transform-origin + tinte pp-tint) y al cerrar
// SE GUARDA en él (pp-grow-out + pp-tint-in, lo opuesto de la
// apertura), igual que HistorySheet. Cualquier vía de cierre (scrim o
// botón) pasa por close() para animar antes de desmontar.
// La salida es la MISMA flecha suelta de la ventana Promociones
// (ArrowLeft arriba-izquierda, sin recuadro — feedback 21-jul), no un
// botón "Cerrar": pasar `arrowColor` con el color según el fondo.
// Uso:
//   <GrowModal onClose={...} origin={mOrigin} tint={mTint} background="#fff" arrowColor="#0D0D0D">
//     {(close) => (<> ...contenido... </>)}
//   </GrowModal>
import { useState } from 'react';
import { ArrowLeft } from './Icons';

const CLOSE_MS = 200; // duración de ppGrowOut (+ margen) antes de desmontar

export default function GrowModal({ onClose, origin = '50% 50%', tint, background = '#fff', maxWidth = 380, maxHeight = '85vh', arrowColor, style = {}, children }) {
  const [closing, setClosing] = useState(false);

  const close = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, CLOSE_MS);
  };

  return (
    <div onClick={close} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
      zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, animation: closing ? 'ppFadeOut .22s ease forwards' : 'ppFade .2s ease',
    }}>
      <div onClick={e => e.stopPropagation()} className={closing ? 'pp-grow-out' : 'pp-grow'} style={{
        background, borderRadius: 24, maxWidth, width: '100%',
        maxHeight, overflowY: 'auto',
        transformOrigin: origin, position: 'relative',
        ...style,
      }}>
        {tint && <div className={closing ? 'pp-tint-in' : 'pp-tint'} style={{ position: 'absolute', inset: 0, background: tint, borderRadius: 24, zIndex: 5 }} />}
        {arrowColor && (
          <button onClick={close} aria-label="Volver" style={{
            position: 'absolute', top: 12, left: 10, zIndex: 6,
            width: 40, height: 40, border: 'none', background: 'none', cursor: 'pointer',
            color: arrowColor, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
          }}>
            <ArrowLeft />
          </button>
        )}
        {typeof children === 'function' ? children(close) : children}
      </div>
    </div>
  );
}
