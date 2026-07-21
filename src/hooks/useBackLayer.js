// src/hooks/useBackLayer.js
// Registra una capa de UI (ventana, modal, sheet) en la pila del botón
// físico de volver mientras `open` sea true. Al presionar volver se
// invoca `close` (la capa superior primero); si la capa se cierra por
// la UI, su entrada del history se consume sola.
// Uso: useBackLayer(isOpen, closeFn)  ·  en componentes que solo se
// montan abiertos: useBackLayer(true, closeFn)
import { useEffect, useRef } from 'react';
import { pushLayer, popLayer } from '../lib/backStack';

export default function useBackLayer(open, close) {
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!open) return undefined;
    const entry = pushLayer(() => closeRef.current());
    return () => popLayer(entry);
  }, [open]);
}
