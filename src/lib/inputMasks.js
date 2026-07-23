// src/lib/inputMasks.js
// Máscaras de escritura continua para campos de login/registro.
// Patrón: el estado guarda el valor CRUDO (sin separadores) para que
// validaciones y BD no cambien; el input muestra format(raw) y clean()
// convierte lo tecleado de vuelta a crudo. Los separadores (espacios,
// guión) se insertan solos mientras el usuario escribe sin pausas.

// Teléfono GT: 8 dígitos mostrados como "XXXX XXXX"
export const phoneMask = {
  clean:  v => v.replace(/\D/g, '').slice(0, 8),
  format: v => (v.length > 4 ? v.slice(0, 4) + ' ' + v.slice(4) : v),
};

// DPI: 13 dígitos agrupados 4-5-4 → "XXXX XXXXX XXXX"
export const dpiMask = {
  clean:  v => v.replace(/\D/g, '').slice(0, 13),
  format: v => [v.slice(0, 4), v.slice(4, 9), v.slice(9, 13)].filter(Boolean).join(' '),
};

// NIT: guión antes del último carácter, que se va corriendo al escribir
// ("1234567" → "123456-7"). El dígito verificador puede ser K.
export const nitMask = {
  clean:  v => v.toUpperCase().replace(/[^0-9K]/g, '').slice(0, 12),
  format: v => (v.length >= 2 ? v.slice(0, -1) + '-' + v.slice(-1) : v),
};

// Placa GT: 1 letra + 3 números + 3 letras → "P 123 ABC".
// clean() acepta caracteres solo si encajan en la posición que toca,
// así el teclado puede escribir de corrido sin separadores.
export const plateMask = {
  clean: v => {
    let out = '';
    for (const ch of v.toUpperCase().replace(/[^A-Z0-9]/g, '')) {
      const i = out.length;
      if (i === 0 && /[A-Z]/.test(ch)) out += ch;
      else if (i >= 1 && i <= 3 && /[0-9]/.test(ch)) out += ch;
      else if (i >= 4 && i <= 6 && /[A-Z]/.test(ch)) out += ch;
    }
    return out;
  },
  format: v => [v.slice(0, 1), v.slice(1, 4), v.slice(4, 7)].filter(Boolean).join(' '),
  complete: v => v.length === 7,
};

// Nombre propio: mayúscula al inicio de cada palabra (refuerzo en JS de
// autoCapitalize="words", que algunos teclados/in-app browsers ignoran)
export const capWords = v => v.replace(/(^|\s)\p{Ll}/gu, m => m.toUpperCase());
