// ============================================================
// Puntos Plus — Vehicle Service (F6 Etapa 1, 15-ago-2026)
// ============================================================
// Wrappers de las RPCs de vehículos (migración 20260815_f6e1):
// la tabla `vehicles` está cerrada a la API abierta — todo viaja
// con sesión de miembro (patrón SEC.C). La BETA controlada (lista
// cerrada + interruptor global) se retiró en el rollout del 4-sep-2026
// (mig 20260904). Vive en archivo propio por la regla de modularidad
// (rpcServices es solo el negocio core).
// ============================================================

import { sb } from '../lib/supabaseClient';
import { callRpc } from './rpcCore';
import { getMemberToken } from './sessionTokens';

// Ficha completa del socio. Devuelve { ok, vehicles } o { error }.
export async function listMyVehicles() {
  if (!sb) return { data: null, error: { message: 'Sin conexión al servidor' } };
  return callRpc('list_my_vehicles', {}, { sessionToken: getMemberToken()?.token ?? null });
}

// Alta (sin id) o edición (con id). p_vehicle whitelisteado server-side:
// { id?, vtype, brand, model, version, color, plate, km, oil_type, next_service }
export async function saveMyVehicle(vehicle) {
  if (!sb) return { data: null, error: { message: 'Sin conexión al servidor' } };
  return callRpc('save_my_vehicle', {
    p_vehicle: vehicle,
  }, { sessionToken: getMemberToken()?.token ?? null });
}

export async function deleteMyVehicle(vehicleId) {
  if (!sb) return { data: null, error: { message: 'Sin conexión al servidor' } };
  return callRpc('delete_my_vehicle', {
    p_vehicle_id: vehicleId,
  }, { sessionToken: getMemberToken()?.token ?? null });
}

// ── F6 E2: combustible + telemetría ──────────────────────────
// El cliente confirma/cambia el vehículo de una compra desde el
// modal de calificación y opcionalmente reporta el odómetro
// (ventana de 7 días server-side; todo validado como suyo).
export async function assignPurchaseVehicle({ purchaseId, vehicleId, km = null }) {
  if (!sb) return { data: null, error: { message: 'Sin conexión al servidor' } };
  return callRpc('assign_purchase_vehicle', {
    p_purchase_id: purchaseId,
    p_vehicle_id: vehicleId,
    p_km: km,
  }, { sessionToken: getMemberToken()?.token ?? null });
}

// Telemetría por vehículo: { ok, stats: { <vehicleId>: { fuel_count,
// total_gallons, total_amount, last_fuel_at, km_per_gal, km_per_day } } }
export async function listMyVehicleStats() {
  if (!sb) return { data: null, error: { message: 'Sin conexión al servidor' } };
  return callRpc('list_my_vehicle_stats', {}, { sessionToken: getMemberToken()?.token ?? null });
}

// ── F6 E3a: historial de cargas del miembro ──────────────────
// { ok, loads: [{ id, created_at, station_name, fuel_type, gallons,
// amount, vehicle_id, km_reading }], editable_days } — base del
// historial de consumo y del editor de reasignación (cargas mal
// atribuidas cuando el modal no apareció por falta de conexión).
export async function listMyFuelHistory(limit = 40) {
  if (!sb) return { data: null, error: { message: 'Sin conexión al servidor' } };
  return callRpc('list_my_fuel_history', {
    p_limit: limit,
  }, { sessionToken: getMemberToken()?.token ?? null });
}

// ── F6 E3b: consumos MANUALES (cargas fuera de Turkaj) ───────
// Completan la telemetría: con llenados parciales el rendimiento
// solo es correcto si TODO el combustible entre lecturas cuenta.
export async function addMyFuelLog({ vehicleId, gallons, amount = null, km = null }) {
  if (!sb) return { data: null, error: { message: 'Sin conexión al servidor' } };
  return callRpc('add_my_fuel_log', {
    p_vehicle_id: vehicleId,
    p_gallons: gallons,
    p_amount: amount,
    p_km: km,
  }, { sessionToken: getMemberToken()?.token ?? null });
}

export async function deleteMyFuelLog(logId) {
  if (!sb) return { data: null, error: { message: 'Sin conexión al servidor' } };
  return callRpc('delete_my_fuel_log', {
    p_log_id: logId,
  }, { sessionToken: getMemberToken()?.token ?? null });
}

// ── F6 E4: CONFIRMAR servicio realizado + programar el próximo ──
// Estampa last_service/last_service_km, avanza el odómetro si la
// lectura es mayor y fija next_service / next_service_km (al menos
// uno) — con eso las alertas del cron se cortan solas.
export async function confirmMyVehicleService({ vehicleId, doneOn, km = null, nextService = null, nextServiceKm = null }) {
  if (!sb) return { data: null, error: { message: 'Sin conexión al servidor' } };
  return callRpc('confirm_my_vehicle_service', {
    p_vehicle_id: vehicleId,
    p_done_on: doneOn,
    p_km: km,
    p_next_service: nextService,
    p_next_service_km: nextServiceKm,
  }, { sessionToken: getMemberToken()?.token ?? null });
}
