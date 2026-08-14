// src/components/SurveyResultModal.jsx
// Resultado de la Encuesta de Satisfacción — modal PERSISTENTE (queda
// hasta que el cliente lo cierre). Sustituye al toast (14-ago): cuando
// la PWA se recarga al volver de Shell, los puntos se reclaman durante
// el boot y un toast de 2s se perdía sin que el cliente lo viera.
// result: { type: 'success', pts, count, limit, bonus } | { type: 'early' }
import { useState, useCallback } from 'react';
import { bento, BRAND_ORANGE } from '../constants/styles';
import { Check, Clock } from './ui/Icons';

export default function SurveyResultModal({ result, onClose, dark }) {
  const [closing, setClosing] = useState(false);

  // D35: cierre con la animación inversa antes de desmontar
  const close = useCallback(() => {
    setClosing(prev => {
      if (!prev) setTimeout(onClose, 200);
      return true;
    });
  }, [onClose]);

  const ok = result.type === 'success';
  const subTxt = dark ? 'rgba(255,255,255,.5)' : '#6E6E73';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
      zIndex: 260, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
      animation: closing ? 'fadeUpOut .2s ease forwards' : 'fadeUp .3s ease',
    }}>
      <div style={{
        background: dark ? '#101018' : '#fff',
        borderRadius: 24, maxWidth: 360, width: '100%', padding: '28px 24px',
        textAlign: 'center',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, margin: '0 auto 12px',
          background: ok ? bento.green : bento.amber, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {ok ? <Check /> : <Clock />}
        </div>

        <div style={{ fontSize: 18, fontWeight: 800, color: dark ? '#fff' : '#0D0D0D', marginBottom: 6 }}>
          {ok ? '¡Encuesta registrada!' : 'Encuesta no completada'}
        </div>

        {ok ? (
          <>
            <div style={{
              fontSize: 22, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
              color: dark ? '#7CD98F' : bento.green, marginBottom: 4,
            }}>
              +{result.pts} pts
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: subTxt, marginBottom: result.bonus ? 12 : 20 }}>
              {result.count}/{result.limit} encuestas hoy
            </div>
            {result.bonus && (
              <div style={{
                display: 'inline-block', padding: '8px 14px', borderRadius: 12,
                background: dark ? 'rgba(217,164,11,.18)' : '#FAF1DC',
                fontSize: 12.5, fontWeight: 700, marginBottom: 18,
                color: dark ? '#FFD54F' : '#B58000',
              }}>
                ¡Bonus! Ganaste 1 boleto de rifa gratis 🎟️
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: 13, fontWeight: 600, color: subTxt, lineHeight: 1.55, marginBottom: 20 }}>
            Volviste antes de terminar la encuesta de Shell y no se
            registró. Respondé todas las preguntas hasta el final y tus
            puntos se asignarán al regresar a la app.
          </div>
        )}

        <button onClick={close} style={{
          width: '100%', padding: 15, borderRadius: 14, border: 'none',
          background: ok ? BRAND_ORANGE : (dark ? 'rgba(255,255,255,.08)' : '#F5F5F7'),
          color: ok ? '#fff' : (dark ? '#ccc' : '#424242'),
          fontFamily: "'DM Sans'", fontSize: 15, fontWeight: 800,
          cursor: 'pointer',
        }}>
          {ok ? 'Continuar' : 'Entendido'}
        </button>
      </div>
    </div>
  );
}
