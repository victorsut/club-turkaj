// src/constants/vehicleCatalog.js
// F6 E1.2 — Catálogo HÍBRIDO de vehículos (D23) FILTRADO POR TIPO
// (pedido del dueño 15-ago: quien eligió MOTOCICLETA no puede ver un
// Toyota Yaris entre las sugerencias). Cada modelo declara su(s)
// tipo(s) del catálogo canónico (VEHICLE_TYPES): las sugerencias de
// marca y modelo se filtran por el tipo elegido — la entrada LIBRE
// sigue permitida (híbrido: sugerir, nunca bloquear).
// También: tipos de aceite frecuentes y el mapeo modelo → silueta
// (con capa de MODELOS ESPECÍFICOS con arte propio, ej. Honda Navi).

// t: tipos donde el modelo aplica (claves de VEHICLE_TYPES)
export const VEHICLE_BRANDS = [
  { brand: 'Toyota', models: [
    { name: 'Corolla', t: ['liviano'] }, { name: 'Yaris', t: ['liviano'] },
    { name: 'Hilux', t: ['picop'] }, { name: 'RAV4', t: ['liviano'] },
    { name: 'Prado', t: ['liviano'] }, { name: 'Agya', t: ['liviano'] },
    { name: 'Rush', t: ['liviano'] }, { name: 'Corolla Cross', t: ['liviano'] },
    { name: 'Fortuner', t: ['liviano'] }, { name: 'Coaster', t: ['microbus'] },
    { name: 'Hiace', t: ['camion_ligero', 'microbus'] },
  ] },
  { brand: 'Honda', models: [
    { name: 'Civic', t: ['liviano'] }, { name: 'CR-V', t: ['liviano'] },
    { name: 'HR-V', t: ['liviano'] }, { name: 'Fit', t: ['liviano'] },
    { name: 'Accord', t: ['liviano'] }, { name: 'Pilot', t: ['liviano'] },
    // Motos Honda (mismo fabricante, tipo distinto)
    { name: 'Navi', t: ['moto'] }, { name: 'CB125F', t: ['moto'] },
    { name: 'CGL125', t: ['moto'] }, { name: 'XR150L', t: ['moto'] },
    { name: 'CB190R', t: ['moto'] }, { name: 'Wave 110', t: ['moto'] },
  ] },
  { brand: 'Nissan', models: [
    { name: 'Sentra', t: ['liviano'] }, { name: 'Versa', t: ['liviano'] },
    { name: 'Frontier', t: ['picop'] }, { name: 'Kicks', t: ['liviano'] },
    { name: 'X-Trail', t: ['liviano'] }, { name: 'March', t: ['liviano'] },
    { name: 'Urvan', t: ['camion_ligero', 'microbus'] },
  ] },
  { brand: 'Mitsubishi', models: [
    { name: 'L200', t: ['picop'] }, { name: 'Montero', t: ['liviano'] },
    { name: 'Outlander', t: ['liviano'] }, { name: 'ASX', t: ['liviano'] },
    { name: 'Mirage', t: ['liviano'] }, { name: 'Xpander', t: ['liviano'] },
  ] },
  { brand: 'Suzuki', models: [
    { name: 'Swift', t: ['liviano'] }, { name: 'Grand Vitara', t: ['liviano'] },
    { name: 'Jimny', t: ['liviano'] }, { name: 'Alto', t: ['liviano'] },
    { name: 'Ertiga', t: ['liviano'] }, { name: 'S-Presso', t: ['liviano'] },
    { name: 'GN125', t: ['moto'] }, { name: 'GN125F', t: ['moto'] },
    { name: 'AX100', t: ['moto'] },
    { name: 'Gixxer 150', t: ['moto'] }, { name: 'EN125', t: ['moto'] },
  ] },
  { brand: 'Hyundai', models: [
    { name: 'Accent', t: ['liviano'] }, { name: 'Tucson', t: ['liviano'] },
    { name: 'Santa Fe', t: ['liviano'] }, { name: 'Creta', t: ['liviano'] },
    { name: 'Grand i10', t: ['liviano'] }, { name: 'Kona', t: ['liviano'] },
    { name: 'H1', t: ['camion_ligero', 'microbus'] },
  ] },
  { brand: 'Kia', models: [
    { name: 'Rio', t: ['liviano'] }, { name: 'Sportage', t: ['liviano'] },
    { name: 'Picanto', t: ['liviano'] }, { name: 'Sorento', t: ['liviano'] },
    { name: 'Seltos', t: ['liviano'] }, { name: 'Soluto', t: ['liviano'] },
  ] },
  { brand: 'Chevrolet', models: [
    { name: 'Spark', t: ['liviano'] }, { name: 'Aveo', t: ['liviano'] },
    { name: 'Tracker', t: ['liviano'] }, { name: 'Colorado', t: ['picop'] },
    { name: 'N300', t: ['camion_ligero'] }, { name: 'Beat', t: ['liviano'] },
  ] },
  { brand: 'Ford', models: [
    { name: 'Ranger', t: ['picop'] }, { name: 'Escape', t: ['liviano'] },
    { name: 'Explorer', t: ['liviano'] }, { name: 'F-150', t: ['picop'] },
    { name: 'EcoSport', t: ['liviano'] }, { name: 'Territory', t: ['liviano'] },
  ] },
  { brand: 'Mazda', models: [
    { name: 'Mazda 3', t: ['liviano'] }, { name: 'CX-5', t: ['liviano'] },
    { name: 'Mazda 2', t: ['liviano'] }, { name: 'CX-30', t: ['liviano'] },
    { name: 'BT-50', t: ['picop'] },
  ] },
  { brand: 'Isuzu', models: [
    { name: 'D-Max', t: ['picop'] }, { name: 'NPR', t: ['camion'] },
    { name: 'ELF', t: ['camion'] }, { name: 'NQR', t: ['camion'] },
    { name: 'MU-X', t: ['liviano'] },
  ] },
  { brand: 'Volkswagen', models: [
    { name: 'Jetta', t: ['liviano'] }, { name: 'Gol', t: ['liviano'] },
    { name: 'Amarok', t: ['picop'] }, { name: 'Tiguan', t: ['liviano'] },
    { name: 'Saveiro', t: ['picop'] },
  ] },
  { brand: 'Hino', models: [
    { name: '300', t: ['camion'] }, { name: '500', t: ['camion'] },
    { name: 'Dutro', t: ['camion'] },
  ] },
  { brand: 'Freightliner', models: [
    { name: 'Cascadia', t: ['camion'] }, { name: 'M2 106', t: ['camion'] },
    { name: 'Columbia', t: ['camion'] },
  ] },
  { brand: 'International', models: [
    { name: '4300', t: ['camion'] }, { name: 'ProStar', t: ['camion'] },
    { name: 'DuraStar', t: ['camion'] },
  ] },
  { brand: 'Bajaj', models: [
    { name: 'Pulsar 125', t: ['moto'] }, { name: 'Pulsar NS160', t: ['moto'] },
    { name: 'Pulsar NS200', t: ['moto'] }, { name: 'Boxer 100', t: ['moto'] },
    { name: 'Boxer 150', t: ['moto'] }, { name: 'CT 100', t: ['moto'] },
    { name: 'RE', t: ['mototaxi'] },
  ] },
  { brand: 'Italika', models: [
    { name: 'FT125', t: ['moto'] }, { name: 'FT150', t: ['moto'] },
    { name: 'DM150', t: ['moto'] }, { name: 'AT110', t: ['moto'] },
    { name: '125Z', t: ['moto'] }, { name: 'DT150', t: ['moto'] },
  ] },
  { brand: 'Yamaha', models: [
    { name: 'YBR125', t: ['moto'] }, { name: 'FZ 2.0', t: ['moto'] },
    { name: 'Crypton', t: ['moto'] }, { name: 'XTZ125', t: ['moto'] },
    { name: 'FZ25', t: ['moto'] },
  ] },
  { brand: 'Serpento', models: [
    { name: 'Cobra 125', t: ['moto'] }, { name: 'Fox 150', t: ['moto'] },
    { name: 'Tazz 125', t: ['moto'] },
  ] },
  { brand: 'Freedom', models: [
    { name: 'Fuel 125', t: ['moto'] }, { name: 'Metal 150', t: ['moto'] },
    { name: 'Cross 200', t: ['moto'] },
  ] },
  { brand: 'TVS', models: [
    { name: 'King', t: ['mototaxi'] },
  ] },
];

export const OIL_TYPES = [
  '20W-50', '15W-40', '10W-30', '10W-40', '5W-30', '5W-20',
  '25W-60', 'Sintético', 'Semi-sintético', 'Mineral',
];

// ── Filtros por TIPO (pedido del dueño) — 'otro' ve todo ─────
const brandMatchesType = (b, vtype) =>
  !vtype || vtype === 'otro' || b.models.some(m => m.t.includes(vtype));

export function brandsFor(vtype) {
  return VEHICLE_BRANDS.filter(b => brandMatchesType(b, vtype)).map(b => b.brand);
}

// Modelos sugeridos para una marca escrita, filtrados por tipo
export function modelsFor(brand, vtype) {
  const b = (brand || '').trim().toLowerCase();
  if (!b) return [];
  const hit = VEHICLE_BRANDS.find(x => x.brand.toLowerCase() === b);
  if (!hit) return [];
  return hit.models
    .filter(m => !vtype || vtype === 'otro' || m.t.includes(vtype))
    .map(m => m.name);
}

// ── Silueta por MODELO ───────────────────────────────────────
// Capa 1 — MODELOS ESPECÍFICOS con arte propio (más parecidos al
// real; se amplía con la lista que el dueño irá detallando):
const MODEL_SPECIFIC = {
  m_navi: ['navi'],
  m_gn125: ['gn125', 'gn 125'], // cubre GN125 y GN125F
};
// Capa 2 — estilo de CARROCERÍA genérico por palabra clave:
const MODEL_BODY = {
  suv: ['rav4', 'cr-v', 'crv', 'hr-v', 'hrv', 'tucson', 'santa fe', 'sportage',
    'kicks', 'x-trail', 'xtrail', 'outlander', 'asx', 'grand vitara', 'jimny',
    'creta', 'kona', 'tracker', 'escape', 'explorer', 'cx-5', 'cx5', 'cx-30',
    'cx30', 'mu-x', 'mux', 'tiguan', 'montero', 'prado', 'fortuner', 'rush',
    'seltos', 'sorento', 'pilot', 'territory', 'xpander', 'ertiga',
    'corolla cross', 'ecosport'],
  hatch: ['yaris', 'swift', 'fit', 'march', 'mirage', 'grand i10', 'picanto',
    'spark', 'beat', 'agya', 'alto', 's-presso', 'gol', 'mazda 2', 'i10'],
  pickup2: ['hilux', 'l200', 'frontier', 'd-max', 'dmax', 'ranger', 'bt-50',
    'bt50', 'amarok', 'colorado', 'f-150', 'f150', 'saveiro'],
  moto_cub: ['boxer', 'ct 100', 'ct100', 'at110', 'wave', 'crypton',
    'cgl', 'gn125', 'ax100', 'en125', '125z', 'cub'],
  van: ['urvan', 'h1', 'n300', 'hiace'],
  bus: ['coaster'],
  truck: ['npr', 'elf', 'nqr', 'dutro', 'cascadia', 'm2 106', 'columbia',
    '4300', 'prostar', 'durastar'],
  mototaxi: ['mototaxi', 'torito', 'king'],
};

const TYPE_DEFAULT_BODY = {
  liviano: 'sedan', picop: 'pickup', camion: 'truck', camion_ligero: 'van',
  microbus: 'bus', moto: 'moto_sport', mototaxi: 'mototaxi', otro: 'other',
};

export function bodyFor(vtype, model) {
  const m = (model || '').trim().toLowerCase();
  if (m) {
    // modelo específico primero (arte propio), luego carrocería genérica
    for (const [art, keys] of Object.entries(MODEL_SPECIFIC)) {
      if (keys.some(k => m.includes(k))) return art;
    }
    for (const [body, keys] of Object.entries(MODEL_BODY)) {
      if (keys.some(k => m.includes(k))) return body;
    }
  }
  return TYPE_DEFAULT_BODY[vtype] || 'other';
}