// ============================================================
// Puntos Plus — Vehicle Service (F6 Etapa 1, 15-ago-2026)
// ============================================================
// Wrappers de las RPCs de vehículos (migración 20260815_f6e1):
// la tabla `vehicles` está cerrada a la API abierta — todo viaja
// con sesión de miembro (patrón SEC.C); la gestión de la BETA va
// con sesión de admin + auditoría. Vive en archivo propio por la
// regla de modularidad (rpcServices es solo el negocio core).
// ============================================================

import { sb } from '../lib/supabaseClient';
import { callRpc } from './rpcCore';
import { getMemberToken, getAdminToken } from './sessionTokens';

// Ficha completa + decisión de beta (server-side). Devuelve
// { ok, beta, vehicles } o { error }.
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

// ── Admin: lista de la beta (miembros con nombre + interruptor global) ──
export async function adminListVehiclesBeta() {
  if (!sb) return { data: null, error: { message: 'Sin conexión al servidor' } };
  return callRpc('admin_list_vehicles_beta', {}, { sessionToken: getAdminToken()?.token ?? null });
}

// ── Admin: gestión de la beta (agregar/quitar miembros o rollout
// global). Auditada server-side vía log_admin_action. ──
export async function adminSetVehiclesBeta({ memberId = null, add = true, enabled = null, audit = {} }) {
  if (!sb) return { data: null, error: { message: 'Sin conexión al servidor' } };
  return callRpc('admin_set_vehicles_beta', {
    p_member_id: memberId,
    p_add: add,
    p_enabled: enabled,
    p_admin_id: audit.adminId ?? null,
    p_admin_name: audit.adminName ?? null,
    p_admin_email: audit.adminEmail ?? null,
    p_reason_text: audit.reasonText ?? null,
  }, { sessionToken: getAdminToken()?.token ?? null });
}
