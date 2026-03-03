// ============================================================
// Club Turkaj — useToast Hook
// ============================================================
import { useState, useCallback } from 'react';

/**
 * Hook para mostrar notificaciones temporales (toasts).
 * Reemplaza el pattern fire()/setToast() del monolito.
 *
 * @param {number} [duration=3000] - Duración en ms
 * @returns {{ toast, fire }}
 */
export function useToast(duration = 3000) {
  const [toast, setToast] = useState(null);

  const fire = useCallback(
    (message) => {
      setToast(message);
      setTimeout(() => setToast(null), duration);
    },
    [duration]
  );

  return { toast, fire };
}
