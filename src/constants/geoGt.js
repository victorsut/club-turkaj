// src/constants/geoGt.js
// División territorial de Guatemala para la DIRECCIÓN del miembro
// (dato opcional del registro / Mi Cuenta): departamento → municipio →
// cantón. Solo Chichicastenango tiene lista de cantones (el resto usa
// texto libre). La lista de cantones es EDITABLE — el negocio conoce
// mejor los nombres locales; agregar/corregir acá y llega a toda la app.

export const DEFAULT_DEPT = 'Quiché';
export const DEFAULT_MUNI = 'Chichicastenango';

// Cantones de Chichicastenango — lista oficial de 90 cantones provista
// por el negocio (27-jul-2026) + el casco urbano al inicio = 91.
export const CANTONES_CHICHI = [
  'Chichicastenango (Casco Urbano)',
  'Agua Escondida', 'Agua Viva', 'Antiguo Xepocol', 'Camanchaj',
  'Camanibal', 'Chicuá Primero', 'Chicuá Segundo', 'Chicuá Tercero',
  'Chijtinimit', 'Chilimá', 'Chipacá Primero', 'Chontalá', 'Chuabaj',
  'Chucalibal Primero', 'Chucalibal Segundo', 'Chucám',
  'Chuchipacá Segundo', 'Chucojom', 'Chugüexá Primero',
  'Chugüexá Segundo "A"', 'Chugüexá Segundo "B"', 'Chugüexá Tercero',
  'Chugüexá Cuarto', 'Chujulimul Primero', 'Chujulimul Segundo',
  'Chujupén', 'Chulumal Primero', 'Chulumal Segundo', 'Chulumal Tercero',
  'Chulumal Cuarto', 'Chumanzana', 'Chunimá', 'Chupol',
  'Chutzorop Primero', 'Chutzorop Segundo', 'Chutzorop Tercero',
  'Lacamá Primero', 'Lacamá Segundo', 'Lacamá Tercero', 'Las Trampas',
  'Mactzul Primero', 'Mactzul Segundo', 'Mactzul Tercero',
  'Mactzul Cuarto', 'Mactzul Quinto', 'Mactzul Sexto', 'Mactzul Séptimo',
  'Mirador Chontalá', 'Mucubaltzip', 'Pacamán', 'Pachoj', 'Pajuliboy',
  'Panimaché Primero', 'Panimaché Segundo', 'Panimaché Tercero',
  'Panimaché Cuarto', 'Panimaché Quinto Alto', 'Panimaché Quinto Bajo',
  'Panquiac', 'Paquixic', 'Patulup Primero', 'Patulup Segundo',
  'Patzibal', 'Paxot Primero', 'Paxot Segundo', 'Paxot Tercero',
  'Pocohil Primero', 'Pocohil Segundo, Primer Centro',
  'Pocohil Segundo, Segundo Centro', 'Quiejel', 'Río Camanibal',
  'Río Mactzul', 'Río Xajil', 'Sacbichol', 'Sacpulup',
  'Saquilla Primero', 'Saquilla Segundo', 'Semejá Primero',
  'Semejá Segundo', 'Semejá Tercero', 'Sepelá', 'Tzanimicabaj',
  'Xabillaguach', 'Xalbaquiej', 'Xeabaj Primero', 'Xeabaj Segundo',
  'Xecalibal', 'Xecojá', 'Xepocol', 'Xepol',
];

// 22 departamentos con sus municipios (oficiales a la fecha).
export const DEPARTAMENTOS = [
  { name: 'Alta Verapaz', munis: [
    'Cobán', 'Chahal', 'Chisec', 'Fray Bartolomé de las Casas', 'Lanquín',
    'Panzós', 'Raxruhá', 'San Cristóbal Verapaz', 'San Juan Chamelco',
    'San Pedro Carchá', 'Santa Catalina La Tinta', 'Santa Cruz Verapaz',
    'Santa María Cahabón', 'Senahú', 'Tactic', 'Tamahú', 'Tucurú',
  ] },
  { name: 'Baja Verapaz', munis: [
    'Salamá', 'Cubulco', 'El Chol', 'Granados', 'Purulhá', 'Rabinal',
    'San Jerónimo', 'San Miguel Chicaj',
  ] },
  { name: 'Chimaltenango', munis: [
    'Chimaltenango', 'Acatenango', 'El Tejar', 'Parramos', 'Patzicía',
    'Patzún', 'San Andrés Itzapa', 'San José Poaquil', 'San Juan Comalapa',
    'San Martín Jilotepeque', 'San Miguel Pochuta', 'San Pedro Yepocapa',
    'Santa Apolonia', 'Santa Cruz Balanyá', 'Tecpán Guatemala', 'Zaragoza',
  ] },
  { name: 'Chiquimula', munis: [
    'Chiquimula', 'Camotán', 'Concepción Las Minas', 'Esquipulas', 'Ipala',
    'Jocotán', 'Olopa', 'Quezaltepeque', 'San Jacinto', 'San José La Arada',
    'San Juan Ermita',
  ] },
  { name: 'El Progreso', munis: [
    'Guastatoya', 'El Jícaro', 'Morazán', 'San Agustín Acasaguastlán',
    'San Antonio La Paz', 'San Cristóbal Acasaguastlán', 'Sanarate', 'Sansare',
  ] },
  { name: 'Escuintla', munis: [
    'Escuintla', 'Guanagazapa', 'Iztapa', 'La Democracia', 'La Gomera',
    'Masagua', 'Nueva Concepción', 'Palín', 'San José', 'San Vicente Pacaya',
    'Santa Lucía Cotzumalguapa', 'Sipacate', 'Siquinalá', 'Tiquisate',
  ] },
  { name: 'Guatemala', munis: [
    'Guatemala', 'Amatitlán', 'Chinautla', 'Chuarrancho', 'Fraijanes',
    'Mixco', 'Palencia', 'San José del Golfo', 'San José Pinula',
    'San Juan Sacatepéquez', 'San Miguel Petapa', 'San Pedro Ayampuc',
    'San Pedro Sacatepéquez', 'San Raymundo', 'Santa Catarina Pinula',
    'Villa Canales', 'Villa Nueva',
  ] },
  { name: 'Huehuetenango', munis: [
    'Huehuetenango', 'Aguacatán', 'Chiantla', 'Colotenango',
    'Concepción Huista', 'Cuilco', 'Jacaltenango', 'La Democracia',
    'La Libertad', 'Malacatancito', 'Nentón', 'Petatán',
    'San Antonio Huista', 'San Gaspar Ixchil', 'San Ildefonso Ixtahuacán',
    'San Juan Atitán', 'San Juan Ixcoy', 'San Mateo Ixtatán',
    'San Miguel Acatán', 'San Pedro Necta', 'San Pedro Soloma',
    'San Rafael La Independencia', 'San Rafael Petzal',
    'San Sebastián Coatán', 'San Sebastián Huehuetenango',
    'Santa Ana Huista', 'Santa Bárbara', 'Santa Cruz Barillas',
    'Santa Eulalia', 'Santiago Chimaltenango', 'Tectitán',
    'Todos Santos Cuchumatán', 'Unión Cantinil',
  ] },
  { name: 'Izabal', munis: [
    'Puerto Barrios', 'El Estor', 'Livingston', 'Los Amates', 'Morales',
  ] },
  { name: 'Jalapa', munis: [
    'Jalapa', 'Mataquescuintla', 'Monjas', 'San Carlos Alzatate',
    'San Luis Jilotepeque', 'San Manuel Chaparrón', 'San Pedro Pinula',
  ] },
  { name: 'Jutiapa', munis: [
    'Jutiapa', 'Agua Blanca', 'Asunción Mita', 'Atescatempa', 'Comapa',
    'Conguaco', 'El Adelanto', 'El Progreso', 'Jalpatagua', 'Jerez',
    'Moyuta', 'Pasaco', 'Quesada', 'San José Acatempa',
    'Santa Catarina Mita', 'Yupiltepeque', 'Zapotitlán',
  ] },
  { name: 'Petén', munis: [
    'Flores', 'Dolores', 'El Chal', 'La Libertad', 'Las Cruces',
    'Melchor de Mencos', 'Poptún', 'San Andrés', 'San Benito',
    'San Francisco', 'San José', 'San Luis', 'Santa Ana', 'Sayaxché',
  ] },
  { name: 'Quetzaltenango', munis: [
    'Quetzaltenango', 'Almolonga', 'Cabricán', 'Cajolá', 'Cantel',
    'Coatepeque', 'Colomba Costa Cuca', 'Concepción Chiquirichapa',
    'El Palmar', 'Flores Costa Cuca', 'Génova', 'Huitán', 'La Esperanza',
    'Olintepeque', 'Palestina de Los Altos', 'Salcajá', 'San Carlos Sija',
    'San Francisco La Unión', 'San Juan Ostuncalco',
    'San Martín Sacatepéquez', 'San Mateo', 'San Miguel Sigüilá',
    'Sibilia', 'Zunil',
  ] },
  { name: 'Quiché', munis: [
    'Chichicastenango', 'Santa Cruz del Quiché', 'Canillá', 'Chajul',
    'Chicamán', 'Chiché', 'Chinique', 'Cunén', 'Ixcán', 'Joyabaj', 'Nebaj',
    'Pachalum', 'Patzité', 'Sacapulas', 'San Andrés Sajcabajá',
    'San Antonio Ilotenango', 'San Bartolomé Jocotenango', 'San Juan Cotzal',
    'San Pedro Jocopilas', 'Uspantán', 'Zacualpa',
  ] },
  { name: 'Retalhuleu', munis: [
    'Retalhuleu', 'Champerico', 'El Asintal', 'Nuevo San Carlos',
    'San Andrés Villa Seca', 'San Felipe', 'San Martín Zapotitlán',
    'San Sebastián', 'Santa Cruz Muluá',
  ] },
  { name: 'Sacatepéquez', munis: [
    'Antigua Guatemala', 'Alotenango', 'Ciudad Vieja', 'Jocotenango',
    'Magdalena Milpas Altas', 'Pastores', 'San Antonio Aguas Calientes',
    'San Bartolomé Milpas Altas', 'San Lucas Sacatepéquez',
    'San Miguel Dueñas', 'Santa Catarina Barahona',
    'Santa Lucía Milpas Altas', 'Santa María de Jesús',
    'Santiago Sacatepéquez', 'Santo Domingo Xenacoj', 'Sumpango',
  ] },
  { name: 'San Marcos', munis: [
    'San Marcos', 'Ayutla', 'Catarina', 'Comitancillo',
    'Concepción Tutuapa', 'El Quetzal', 'El Rodeo', 'El Tumbador',
    'Esquipulas Palo Gordo', 'Ixchiguán', 'La Blanca', 'La Reforma',
    'Malacatán', 'Nuevo Progreso', 'Ocós', 'Pajapita', 'Río Blanco',
    'San Antonio Sacatepéquez', 'San Cristóbal Cucho', 'San José Ojetenam',
    'San Lorenzo', 'San Miguel Ixtahuacán', 'San Pablo',
    'San Pedro Sacatepéquez', 'San Rafael Pie de la Cuesta', 'Sibinal',
    'Sipacapa', 'Tacaná', 'Tajumulco', 'Tejutla',
  ] },
  { name: 'Santa Rosa', munis: [
    'Cuilapa', 'Barberena', 'Casillas', 'Chiquimulilla', 'Guazacapán',
    'Nueva Santa Rosa', 'Oratorio', 'Pueblo Nuevo Viñas', 'San Juan Tecuaco',
    'San Rafael Las Flores', 'Santa Cruz Naranjo', 'Santa María Ixhuatán',
    'Santa Rosa de Lima', 'Taxisco',
  ] },
  { name: 'Sololá', munis: [
    'Sololá', 'Concepción', 'Nahualá', 'Panajachel', 'San Andrés Semetabaj',
    'San Antonio Palopó', 'San José Chacayá', 'San Juan La Laguna',
    'San Lucas Tolimán', 'San Marcos La Laguna', 'San Pablo La Laguna',
    'San Pedro La Laguna', 'Santa Catarina Ixtahuacán',
    'Santa Catarina Palopó', 'Santa Clara La Laguna',
    'Santa Cruz La Laguna', 'Santa Lucía Utatlán', 'Santa María Visitación',
    'Santiago Atitlán',
  ] },
  { name: 'Suchitepéquez', munis: [
    'Mazatenango', 'Chicacao', 'Cuyotenango', 'Patulul', 'Pueblo Nuevo',
    'Río Bravo', 'Samayac', 'San Antonio Suchitepéquez', 'San Bernardino',
    'San Francisco Zapotitlán', 'San Gabriel', 'San José El Ídolo',
    'San José La Máquina', 'San Juan Bautista', 'San Lorenzo',
    'San Miguel Panán', 'San Pablo Jocopilas', 'Santa Bárbara',
    'Santo Domingo Suchitepéquez', 'Santo Tomás La Unión', 'Zunilito',
  ] },
  { name: 'Totonicapán', munis: [
    'Totonicapán', 'Momostenango', 'San Andrés Xecul', 'San Bartolo',
    'San Cristóbal Totonicapán', 'San Francisco El Alto',
    'Santa Lucía La Reforma', 'Santa María Chiquimula',
  ] },
  { name: 'Zacapa', munis: [
    'Zacapa', 'Cabañas', 'Estanzuela', 'Gualán', 'Huité', 'La Unión',
    'Río Hondo', 'San Diego', 'San Jorge', 'Teculután', 'Usumatlán',
  ] },
];

export const DEPT_NAMES = DEPARTAMENTOS.map(d => d.name);

export const munisOf = dept =>
  DEPARTAMENTOS.find(d => d.name === dept)?.munis || [];

// ¿El municipio tiene lista de cantones? (hoy solo Chichicastenango)
export const cantonesOf = (dept, muni) =>
  (dept === DEFAULT_DEPT && muni === DEFAULT_MUNI) ? CANTONES_CHICHI : null;

// Dirección legible: "Chulumal II, Chichicastenango, Quiché"
export const fmtAddress = a => {
  if (!a) return '';
  return [a.canton, a.muni, a.dept].filter(Boolean).join(', ');
};
