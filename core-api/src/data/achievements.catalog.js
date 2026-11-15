// Catálogo de logros. criteria.type:
//   total_captures   -> cantidad de capturas del usuario
//   distinct_species -> especies distintas capturadas; criteria.filter restringe cuáles cuentan
//                       (class, family, families, category = rareza). Sin filter cuenta cualquier especie.
// group: sección en la pantalla de logros. order: posición dentro de la lista.

// "Acuático" = animales que viven en el agua o dependen de ella (el catálogo de especies no tiene ese dato)
const AQUATIC_FAMILIES = [
  // mamíferos marinos
  'Balaenidae', 'Balaenopteridae', 'Delphinidae', 'Hyperoodontidae', 'Iniidae', 'Kogiidae', 'Neobalaenidae',
  'Otariidae', 'Phocidae', 'Phocoenidae', 'Physeteridae',
  // aves acuáticas y marinas
  'Anatidae', 'Anhingidae', 'Diomedeidae', 'Fregatidae', 'Hydrobatidae', 'Laridae', 'Phalacrocoracidae',
  'Phoenicopteridae', 'Podicipedidae', 'Procellariidae', 'Spheniscidae', 'Stercorariidae', 'Sulidae',
  // tortugas marinas
  'Cheloniidae', 'Dermochelyidae',
];

const species = (group, code, name, description, icon, filter, threshold) => ({
  code, name, description, icon, group,
  criteria: { type: 'distinct_species', filter, threshold },
});
const captures = (code, name, description, icon, threshold) => ({
  code, name, description, icon, group: 'inicio',
  criteria: { type: 'total_captures', threshold },
});

const ACHIEVEMENTS = [
  captures('first_capture', 'Primera captura', 'Capturá tu primer animal.', 'paw', 1),
  captures('captures_10', 'Fotógrafo de campo', 'Hacé 10 capturas.', 'camera', 10),
  captures('captures_50', 'Explorador', 'Hacé 50 capturas.', 'map', 50),
  captures('captures_100', 'Naturalista', 'Hacé 100 capturas.', 'trophy', 100),

  species('aves', 'aves_5', 'Observador de aves', 'Capturá 5 aves distintas.', 'bird', { class: 'Aves' }, 5),
  species('aves', 'aves_10', 'Pajarero', 'Capturá 10 aves distintas.', 'bird', { class: 'Aves' }, 10),
  species('aves', 'aves_25', 'Ornitólogo', 'Capturá 25 aves distintas.', 'bird', { class: 'Aves' }, 25),
  species('aves', 'aves_50', 'Maestro de las aves', 'Capturá 50 aves distintas.', 'bird', { class: 'Aves' }, 50),

  species('mamiferos', 'mamiferos_5', 'Amigo de los mamíferos', 'Capturá 5 mamíferos distintos.', 'paw', { class: 'Mammalia' }, 5),
  species('mamiferos', 'mamiferos_15', 'Mastozoólogo', 'Capturá 15 mamíferos distintos.', 'paw', { class: 'Mammalia' }, 15),
  species('mamiferos', 'felinos_3', 'Domador de felinos', 'Capturá 3 felinos distintos.', 'cat', { family: 'Felidae' }, 3),
  species('mamiferos', 'felinos_5', 'Rey de la selva', 'Capturá 5 felinos distintos.', 'cat', { family: 'Felidae' }, 5),

  species('reptiles_anfibios', 'reptiles_5', 'Herpetólogo', 'Capturá 5 reptiles distintos.', 'snake', { class: 'Reptilia' }, 5),
  species('reptiles_anfibios', 'anfibios_5', 'Amigo de los sapos', 'Capturá 5 anfibios distintos.', 'frog', { class: 'Amphibia' }, 5),

  species('acuaticos', 'acuaticos_5', 'Rumbo al agua', 'Capturá 5 animales acuáticos distintos.', 'fish', { families: AQUATIC_FAMILIES }, 5),
  species('acuaticos', 'acuaticos_15', 'Lobo de mar', 'Capturá 15 animales acuáticos distintos.', 'fish', { families: AQUATIC_FAMILIES }, 15),

  species('rareza', 'comunes_10', 'Los de siempre', 'Capturá 10 especies comunes distintas.', 'star', { category: 'comun' }, 10),
  species('rareza', 'raros_3', 'Ojo de halcón', 'Capturá 3 especies raras distintas.', 'star', { category: 'raro' }, 3),
  species('rareza', 'muy_raros_1', 'Golpe de suerte', 'Capturá 1 especie muy rara.', 'star', { category: 'muy_raro' }, 1),
  species('rareza', 'muy_raros_3', 'Cazador de joyas', 'Capturá 3 especies muy raras distintas.', 'star', { category: 'muy_raro' }, 3),
  species('rareza', 'domesticos_3', 'Mejor amigo', 'Capturá 3 animales domésticos distintos.', 'paw', { category: 'domestico' }, 3),
];

// Orden de las secciones en la app
const GROUPS = [
  { id: 'inicio', name: 'Primeros pasos' },
  { id: 'aves', name: 'Aves' },
  { id: 'mamiferos', name: 'Mamíferos' },
  { id: 'reptiles_anfibios', name: 'Reptiles y anfibios' },
  { id: 'acuaticos', name: 'Acuáticos' },
  { id: 'rareza', name: 'Rareza' },
];

module.exports = { ACHIEVEMENTS, GROUPS, AQUATIC_FAMILIES };
