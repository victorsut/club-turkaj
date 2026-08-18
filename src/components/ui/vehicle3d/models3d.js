// src/components/ui/vehicle3d/models3d.js
// Registro LIGERO (sin three.js) de qué modelos tienen arte 3D — lo
// importa VehiclesHome eager sin arrastrar el chunk pesado del visor.
// DECISIÓN del dueño (18-ago-2026): el visor 3D queda EN PAUSA por
// ahora — lista vacía (el botón no se muestra); la infra queda lista
// para reactivarlo agregando la clave del modelo.
const WITH_3D = [];
export const has3D = (bodyKey) => WITH_3D.includes(bodyKey);
