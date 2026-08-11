// ============================================================
// Puntos Plus — useToast Hook
// ============================================================
import { useState, useCallback, useRef } from 'react';

/**
 * Hook para mostrar notificaciones temporales (toasts).
 * Reemplaza el pattern fire()/setToast() del monolito.
 *
 * @param {number} [duration=3000] - Duración en ms
 * @returns {{ toast, fire }}
 *
 * fire(message, type?) — type opcional 'success'|'error'|'warn'|'info'
 * para el Toast (si se omite, el componente la deriva del mensaje).
 */
export function useToast(duration = 3000) {
  const [toast, setToast] = useState(null);
  // FIX (11-ago): un timer compartido. Sin cancelar el anterior, dos
  // fire() seguidos hacían que el timeout del PRIMERO apagara el
  // SEGUNDO antes de tiempo (se veía en el flujo de encuestas, que
  // dispara dos toasts). Ahora cada fire reinicia el reloj.
  const timerRef = useRef(null);

  const fire = useCallback(
    (message, type) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setToast(type ? { msg: message, type } : message);
      timerRef.current = setTimeout(() => { setToast(null); timerRef.current = null; }, duration);
    },
    [duration]
  );

  return { toast, fire };
}

export default useToast;
