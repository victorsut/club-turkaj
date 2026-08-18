// src/components/ui/vehicleArtUtils.js
// Utilidades compartidas de las ilustraciones de vehículos.

// Aclara (+) / oscurece (−) un hex en unidades 0-255.
export function shade(hex, amt) {
  const c = parseInt((hex || '#9E9E9E').replace('#', ''), 16);
  const f = (v) => Math.max(0, Math.min(255, v + amt));
  const r = f(c >> 16), g = f((c >> 8) & 255), b = f(c & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
