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
