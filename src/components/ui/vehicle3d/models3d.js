// src/components/ui/vehicle3d/models3d.js
// Registro LIGERO (sin three.js) de qué modelos tienen arte 3D — lo
// importa VehiclesHome eager sin arrastrar el chunk pesado del visor.
const WITH_3D = ['m_navi'];
export const has3D = (bodyKey) => WITH_3D.includes(bodyKey);
