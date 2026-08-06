// src/lib/rewardLocations.js
// D17 (6-ago-2026): localizaciones de canje por premio. Un premio
// declara estaciones (rewards.station_ids) y/o tiendas asociadas
// (rewards.store_ids). AMBOS vacíos/null = válido en todas las
// estaciones (comportamiento histórico, sin tiendas).

/**
 * Nombres de las localizaciones donde el premio es válido.
 * @returns {string[]|null} null = todas las estaciones (sin restricción)
 */
export function rewardLocationNames(reward, stations = [], stores = []) {
  const sids = reward?.stationIds || reward?.station_ids || [];
  const tids = reward?.storeIds || reward?.store_ids || [];
  if (!sids.length && !tids.length) return null;
  const names = [
    ...sids.map(id => stations.find(s => s.id === id)?.name).filter(Boolean),
    ...tids.map(id => stores.find(s => s.id === id)?.name).filter(Boolean),
  ];
  return names.length ? names : null;
}
