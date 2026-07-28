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
