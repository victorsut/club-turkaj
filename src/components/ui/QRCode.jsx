// src/components/ui/QRCode.jsx
// Genera codigos QR en SVG puro — funciona 100% offline
// Implementacion de QR Code version 2 (25x25) con modo byte

import { useMemo } from 'react';

// ── Tablas de Galois Field GF(256) ───────────────────────
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x; GF_LOG[x] = i;
    x = x << 1; if (x & 256) x ^= 285; x &= 255;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

const gfMul = (a, b) => (!a || !b) ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]];
const gfPolyMul = (p, q) => {
  const r = new Uint8Array(p.length + q.length - 1);
  for (let i = 0; i < p.length; i++)
    for (let j = 0; j < q.length; j++)
      r[i + j] ^= gfMul(p[i], q[j]);
  return r;
};
const gfPolyDiv = (dividend, divisor) => {
  let msg = Uint8Array.from(dividend);
  for (let i = 0; i < dividend.length - divisor.length + 1; i++) {
    const coef = msg[i];
    if (!coef) continue;
    for (let j = 1; j < divisor.length; j++)
      if (divisor[j]) msg[i + j] ^= gfMul(divisor[j], coef);
  }
  return msg.slice(dividend.length - divisor.length + 1);
};

// ── Generar polinomio generador para n bytes EC ──────────
const genPoly = (n) => {
  let g = new Uint8Array([1]);
  for (let i = 0; i < n; i++) g = gfPolyMul(g, new Uint8Array([1, GF_EXP[i]]));
  return g;
};

// ── Codificar datos en modo byte (version 2-M: 20 bytes max) ──
function encodeQR(text) {
  const bytes = new TextEncoder().encode(text);
  const n = bytes.length;

  // Version 2-M: 16 data codewords, 10 EC codewords
  const dataCW = 16;
  const ecCW   = 10;
  const totalCW = dataCW + ecCW;

  // Header: mode indicator (0100) + length (8 bits) + data + terminator
  const bits = [];
  const pushBits = (val, len) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
  };

  pushBits(0b0100, 4); // byte mode
  pushBits(n, 8);      // character count
  for (const b of bytes) pushBits(b, 8);
  // Terminator
  for (let i = 0; i < 4 && bits.length < dataCW * 8; i++) bits.push(0);
  // Pad to byte boundary
  while (bits.length % 8) bits.push(0);
  // Pad codewords
  const padBytes = [0xEC, 0x11];
  let pi = 0;
  while (bits.length < dataCW * 8) pushBits(padBytes[pi++ % 2], 8);

  // Convert bits to codewords
  const dataCWs = [];
  for (let i = 0; i < dataCW; i++) {
    let val = 0;
    for (let j = 0; j < 8; j++) val = (val << 1) | bits[i * 8 + j];
    dataCWs.push(val);
  }

  // Error correction
  const gen = genPoly(ecCW);
  const msg = new Uint8Array([...dataCWs, ...new Array(ecCW).fill(0)]);
  const ec  = gfPolyDiv(msg, gen);
  const allCW = [...dataCWs, ...ec];

  // Build bit stream
  const stream = [];
  for (const cw of allCW) pushBits.call({ push: (b) => stream.push(b) }, cw, 8);
  // (rebind pushBits)
  const stream2 = [];
  const pb2 = (val, len) => { for (let i = len - 1; i >= 0; i--) stream2.push((val >> i) & 1); };
  for (const cw of allCW) pb2(cw, 8);

  return stream2;
}

// ── Matriz QR Version 2 (25x25) ──────────────────────────
function buildMatrix(bits) {
  const SIZE = 25;
  const mat  = Array.from({ length: SIZE }, () => new Array(SIZE).fill(null));
  const func = Array.from({ length: SIZE }, () => new Array(SIZE).fill(false));

  // Marcar modulo funcional
  const setFunc = (r, c, v) => { mat[r][c] = v; func[r][c] = true; };

  // Finder patterns (7x7 con separador)
  const finder = (row, col) => {
    for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) {
      const nr = row + r, nc = col + c;
      if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
      const inside = r >= 0 && r <= 6 && c >= 0 && c <= 6;
      const border = r === 0 || r === 6 || c === 0 || c === 6;
      const inner  = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      setFunc(nr, nc, inside && (border || inner) ? 1 : 0);
    }
  };
  finder(0, 0); finder(0, SIZE - 7); finder(SIZE - 7, 0);

  // Alignment pattern Version 2 (centro en 18,18)
  for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++) {
    const nr = 18 + r, nc = 18 + c;
    if (!func[nr][nc]) {
      const v = (r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0)) ? 1 : 0;
      setFunc(nr, nc, v);
    }
  }

  // Timing patterns
  for (let i = 8; i < SIZE - 8; i++) {
    setFunc(6, i, i % 2 === 0 ? 1 : 0);
    setFunc(i, 6, i % 2 === 0 ? 1 : 0);
  }

  // Dark module
  setFunc(SIZE - 8, 8, 1);

  // Format info (mask 0: 000) para nivel M
  // Pre-calculado para version 2, nivel M, mascara 0: 101010000010010
  const fmtBits = [1,0,1,0,1,0,0,0,0,0,1,0,0,1,0];
  const fmtPos1 = [[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[7,8],[8,8],[8,7],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0]];
  const fmtPos2 = [[SIZE-1,8],[SIZE-2,8],[SIZE-3,8],[SIZE-4,8],[SIZE-5,8],[SIZE-6,8],[SIZE-7,8],[8,SIZE-8],[8,SIZE-7],[8,SIZE-6],[8,SIZE-5],[8,SIZE-4],[8,SIZE-3],[8,SIZE-2],[8,SIZE-1]];
  fmtPos1.forEach(([r,c], i) => setFunc(r, c, fmtBits[i]));
  fmtPos2.forEach(([r,c], i) => setFunc(r, c, fmtBits[i]));

  // Colocar bits de datos (zigzag, mascara 0: (row+col)%2===0 invierte)
  let bi = 0;
  let up = true;
  for (let right = SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < SIZE; vert++) {
      const row = up ? SIZE - 1 - vert : vert;
      for (let lr = 0; lr < 2; lr++) {
        const col = right - lr;
        if (!func[row][col]) {
          const bit = bi < bits.length ? bits[bi++] : 0;
          const mask = (row + col) % 2 === 0;
          mat[row][col] = mask ? bit ^ 1 : bit;
        }
      }
    }
    up = !up;
  }

  return mat;
}

// ── Componente React ─────────────────────────────────────
export default function QRCode({ code, sz = 180, scanColor = '#000', bg = '#fff' }) {
  const matrix = useMemo(() => {
    if (!code) return null;
    try {
      // Limitar a 16 bytes para Version 2
      const truncated = code.length > 16 ? code.slice(-12) : code;
      const bits = encodeQR(truncated);
      return buildMatrix(bits);
    } catch (e) {
      console.warn('[QR] Error generando:', e.message);
      return null;
    }
  }, [code]);

  if (!matrix) {
    return (
      <div style={{ width: sz, height: sz, background: bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#9E9E9E' }}>
        QR no disponible
      </div>
    );
  }

  const SIZE   = matrix.length;
  const MODULE = sz / (SIZE + 8); // 4 modulos de quiet zone cada lado
  const OFFSET = MODULE * 4;
  const total  = sz;

  return (
    <svg
      width={total}
      height={total}
      viewBox={`0 0 ${total} ${total}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ borderRadius: 8, flexShrink: 0 }}
    >
      {/* Fondo */}
      <rect width={total} height={total} fill={bg} rx="8" />
      {/* Modulos */}
      {matrix.map((row, r) =>
        row.map((cell, c) =>
          cell === 1 ? (
            <rect
              key={`${r}-${c}`}
              x={OFFSET + c * MODULE}
              y={OFFSET + r * MODULE}
              width={MODULE}
              height={MODULE}
              fill={scanColor}
            />
          ) : null
        )
      )}
    </svg>
  );
}
