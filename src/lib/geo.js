// ============================================================
// Puntos Plus — Utilidades de geolocalización
// ============================================================
// Lógica pura sin dependencia de React. Usada por el modal WiFi
// para detectar en qué estación (o cerca de cuál) está el cliente.
// ============================================================

// Distancia haversine en metros entre dos coordenadas.
export function distanceM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Estación activa más cercana dentro de maxM metros, o null.
// Turkaj I y II distan ~540 m entre sí — con el radio por defecto de
// 300 m nunca se confunden (gana la más cercana de todos modos).
export function nearestStation(stations, lat, lng, maxM = 300) {
  let best = null, bestD = Infinity;
  (stations || []).forEach((s) => {
    if (s.active === false || s.lat == null || s.lng == null) return;
    const d = distanceM(lat, lng, s.lat, s.lng);
    if (d < bestD) { bestD = d; best = s; }
  });
  return best && bestD <= maxM ? { station: best, distance: Math.round(bestD) } : null;
}

// Posición actual del dispositivo como Promise. Rechaza si el
// navegador no soporta geolocalización, el usuario niega el permiso
// o el GPS no responde en `timeout` ms (pasa en navegadores in-app).
export function getPosition(timeout = 8000) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('unsupported')); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout, maximumAge: 60000 },
    );
  });
}
