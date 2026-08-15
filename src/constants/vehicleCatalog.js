// src/constants/vehicleCatalog.js
// F6 Etapa 1 — Catálogo HÍBRIDO de vehículos (D23): marcas y modelos
// comunes en Guatemala como SUGERENCIAS (datalist/chips) + entrada
// libre — nunca se bloquea escribir otra marca/modelo. También los
// tipos de aceite frecuentes para el chip-picker de la ficha.

export const VEHICLE_BRANDS = [
  { brand: 'Toyota', models: ['Corolla', 'Yaris', 'Hilux', 'RAV4', 'Prado', 'Agya', 'Rush', 'Corolla Cross', 'Fortuner', 'Coaster'] },
  { brand: 'Honda', models: ['Civic', 'CR-V', 'HR-V', 'Fit', 'Accord', 'Pilot'] },
  { brand: 'Nissan', models: ['Sentra', 'Versa', 'Frontier', 'Kicks', 'X-Trail', 'March', 'Urvan'] },
  { brand: 'Mitsubishi', models: ['L200', 'Montero', 'Outlander', 'ASX', 'Mirage', 'Xpander'] },
  { brand: 'Suzuki', models: ['Swift', 'Grand Vitara', 'Jimny', 'Alto', 'Ertiga', 'S-Presso'] },
  { brand: 'Hyundai', models: ['Accent', 'Tucson', 'Santa Fe', 'Creta', 'Grand i10', 'H1', 'Kona'] },
  { brand: 'Kia', models: ['Rio', 'Sportage', 'Picanto', 'Sorento', 'Seltos', 'Soluto'] },
  { brand: 'Chevrolet', models: ['Spark', 'Aveo', 'Tracker', 'Colorado', 'N300', 'Beat'] },
  { brand: 'Ford', models: ['Ranger', 'Escape', 'Explorer', 'F-150', 'EcoSport', 'Territory'] },
  { brand: 'Mazda', models: ['Mazda 3', 'CX-5', 'Mazda 2', 'CX-30', 'BT-50'] },
  { brand: 'Isuzu', models: ['D-Max', 'NPR', 'ELF', 'NQR', 'MU-X'] },
  { brand: 'Volkswagen', models: ['Jetta', 'Gol', 'Amarok', 'Tiguan', 'Saveiro'] },
  { brand: 'Hino', models: ['300', '500', 'Dutro'] },
  { brand: 'Freightliner', models: ['Cascadia', 'M2 106', 'Columbia'] },
  { brand: 'International', models: ['4300', 'ProStar', 'DuraStar'] },
  { brand: 'Bajaj', models: ['Pulsar 125', 'Pulsar NS160', 'Pulsar NS200', 'Boxer 100', 'Boxer 150', 'CT 100', 'RE (mototaxi)'] },
  { brand: 'Italika', models: ['FT125', 'FT150', 'DM150', 'AT110', '125Z', 'DT150'] },
  { brand: 'Honda Motos', models: ['CB125F', 'CGL125', 'XR150L', 'CB190R', 'Navi', 'Wave 110'] },
  { brand: 'Yamaha', models: ['YBR125', 'FZ 2.0', 'Crypton', 'XTZ125', 'FZ25'] },
  { brand: 'Suzuki Motos', models: ['GN125', 'AX100', 'Gixxer 150', 'EN125'] },
  { brand: 'Serpento', models: ['Cobra 125', 'Fox 150', 'Tazz 125'] },
  { brand: 'Freedom', models: ['Fuel 125', 'Metal 150', 'Cross 200'] },
];

export const OIL_TYPES = [
  '20W-50', '15W-40', '10W-30', '10W-40', '5W-30', '5W-20',
  '25W-60', 'Sintético', 'Semi-sintético', 'Mineral',
];

// Sugerencias de modelos para una marca escrita (tolerante a mayúsculas)
export function modelsFor(brand) {
  const b = (brand || '').trim().toLowerCase();
  if (!b) return [];
  const hit = VEHICLE_BRANDS.find(x => x.brand.toLowerCase() === b);
  return hit ? hit.models : [];
}

// ── Estilo de CARROCERÍA por modelo (E1.1, pedido del dueño) ──
// La ilustración se elige por la SILUETA del modelo real (sedán vs
// hatchback vs SUV vs picop doble cabina vs moto deportiva vs cub) —
// identificable y diferenciable SIN logos ni copias del diseño (eso
// es lo protegido por licencias). Palabra clave contenida en el
// modelo escrito → estilo; sin match → default por tipo de vehículo.
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
  moto_cub: ['boxer', 'ct 100', 'ct100', 'at110', 'wave', 'crypton', 'navi',
    'cgl', 'gn125', 'ax100', 'en125', '125z', 'cub'],
  van: ['urvan', 'h1', 'n300', 'hiace'],
  bus: ['coaster'],
  truck: ['npr', 'elf', 'nqr', 'dutro', 'cascadia', 'm2 106', 'columbia',
    '4300', 'prostar', 'durastar'],
  mototaxi: ['mototaxi', 'torito'],
};

const TYPE_DEFAULT_BODY = {
  liviano: 'sedan', picop: 'pickup', camion: 'truck', camion_ligero: 'van',
  microbus: 'bus', moto: 'moto_sport', mototaxi: 'mototaxi', otro: 'other',
};

export function bodyFor(vtype, model) {
  const m = (model || '').trim().toLowerCase();
  if (m) {
    for (const [body, keys] of Object.entries(MODEL_BODY)) {
      if (keys.some(k => m.includes(k))) return body;
    }
  }
  return TYPE_DEFAULT_BODY[vtype] || 'other';
}
