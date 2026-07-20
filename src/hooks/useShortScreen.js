// src/hooks/useShortScreen.js
// R1b — detección reactiva de pantallas cortas (alto CSS ≤ maxH).
// El home compacta tipografías y paddings con este flag para que
// todos los cuadros quepan sin scroll en cualquier celular.
import { useEffect, useState } from 'react';

export default function useShortScreen(maxH = 800) {
  const [short, setShort] = useState(
    () => typeof window !== 'undefined' && window.innerHeight <= maxH
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-height: ${maxH}px)`);
    const fn = () => setShort(mq.matches);
    fn();
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, [maxH]);
  return short;
}
