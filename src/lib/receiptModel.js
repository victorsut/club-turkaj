// src/lib/receiptModel.js
// FA-lite (D37/D29) — Modelo NEUTRO de comprobante: estructura de
// datos independiente del destino de impresión. Hoy lo renderiza
// receiptPrinter.js (HTML térmico → window.print); en F7a este mismo
// modelo viaja como payload de la API para que PROPER lo imprima con
// su propio sistema. No agregar acá nada específico de HTML ni de un
// modelo de POS.
//
// Kinds de línea: 'center' ({brand|bold|small}), 'kv', 'big', 'code', 'sep'.

const kv = (k, v) => ({ kind: 'kv', k, v: v || '-' });
const center = (text, opts = {}) => ({ kind: 'center', text, ...opts });
const sep = () => ({ kind: 'sep' });

export function buildRedemptionReceipt({
  rewardName, cost, code,
  clientName, operatorName, stationName,
  when = new Date(),
}) {
  const dateStr = when.toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = when.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });

  const header = [
    center('PUNTOS PLUS', { brand: true }),
    center('Programa de Lealtad', { small: true }),
    sep(),
  ];
  const footer = [
    sep(),
    center('Gracias por su preferencia', { small: true }),
    center('Gasolineras Turkaj - Chichicastenango', { small: true }),
  ];

  // Copia del operador: respaldo completo (D29), sin firmas.
  const operatorCopy = [
    ...header,
    center('COMPROBANTE DE CANJE', { bold: true }),
    center('COPIA OPERADOR', { small: true }),
    sep(),
    kv('Fecha', dateStr),
    kv('Hora', timeStr),
    kv('Cliente', clientName),
    kv('Operador', operatorName),
    kv('Estacion', stationName),
    sep(),
    center('PREMIO CANJEADO', { small: true }),
    { kind: 'big', text: rewardName },
    center('Puntos: ' + cost + ' pts', { small: true }),
    sep(),
    center('CODIGO DE VERIFICACION', { small: true }),
    { kind: 'code', text: code },
    ...footer,
  ];

  // Copia del cliente: minimalista, sin datos sensibles (D29).
  const clientCopy = [
    ...header,
    center('COMPROBANTE DE CANJE', { bold: true }),
    center('COPIA CLIENTE', { small: true }),
    sep(),
    { kind: 'big', text: rewardName },
    kv('Estacion', stationName),
    kv('Fecha', dateStr + ' ' + timeStr),
    ...footer,
  ];

  return {
    docTitle: 'Comprobante Puntos Plus',
    copies: [
      { label: 'operator', lines: operatorCopy },
      { label: 'client', lines: clientCopy },
    ],
  };
}
