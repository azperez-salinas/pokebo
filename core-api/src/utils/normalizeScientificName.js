// Forma normalizada de un nombre científico para compararlo con el catálogo:
// minúsculas, sin tildes y sin espacios extra. (El seed mongo-init/seed/import-species.js aplica la misma regla.)
function normalizeScientificName(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

module.exports = normalizeScientificName;
