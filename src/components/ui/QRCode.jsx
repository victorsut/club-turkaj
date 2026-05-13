// src/components/ui/QRCode.jsx
import { QRCodeSVG } from 'qrcode.react';

/**
 * Wrapper de qrcode.react que mantiene la API legacy
 * (code, sz, scanColor).
 *
 * IMPORTANTE: scanColor se acepta como prop por compatibilidad
 * con el caller en App.jsx:1549, pero se IGNORA internamente.
 * El QR siempre se renderiza en negro puro (#000) sobre blanco
 * (#FFFFFF) para garantizar máxima compatibilidad con lectores
 * (cámaras de celulares modestos, navegadores in-app, lectura
 * con poca luz). La estética de tier sigue viva en el wrapper
 * decorativo de App.jsx (gradiente de fondo, borde, label del
 * card_code).
 */
export default function QRCode({ code, sz = 180, scanColor }) {
  return (
    <QRCodeSVG
      value={code || ''}
      size={sz}
      level="Q"
      fgColor="#000"
      bgColor="#FFFFFF"
      marginSize={4}
    />
  );
}
