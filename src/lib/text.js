// src/lib/text.js — utilidades de texto visibles al usuario.

// Quita todo pictograma (emoji + variation selectors + ZWJ) del texto
// (directiva 21-jul: cero emojis en la app). Las descripciones viejas
// de activity_log traen emojis GRABADOS en la BD ("🎂 Bonus", "🎉 x2",
// "🎁 Canje…") — se limpian al MOSTRAR, sin tocar los datos: los emojis
// de rewards.icon siguen siendo claves semánticas de RewardIcon.
export const stripEmojis = (s) =>
  String(s ?? '')
    .replace(/[\p{Extended_Pictographic}️‍]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[·\s]+|[·\s]+$/g, '')
    .trim();

// Primer nombre. Regla del dueño (29-jul): la vista del CLIENTE muestra
// solo el primer nombre del personal — el apellido es dato interno.
// Aplicar al MOSTRAR (el nombre completo sigue viajando y se usa en
// admin, operador y comprobantes impresos).
export const firstName = (s) => String(s ?? '').trim().split(/\s+/)[0] || '';
