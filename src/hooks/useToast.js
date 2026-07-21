// ============================================================
// Puntos Plus — useToast Hook
// ============================================================
import { useState, useCallback } from 'react';

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

  const fire = useCallback(
    (message, type) => {
      setToast(type ? { msg: message, type } : message);
      setTimeout(() => setToast(null), duration);
    },
    [duration]
  );

  return { toast, fire };
}

export default useToast;
