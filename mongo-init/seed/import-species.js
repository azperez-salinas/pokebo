// Carga incremental del catalogo Pokebo en la coleccion pokebo.species.
// EJECUCION MANUAL: este archivo esta en una SUBCARPETA para que no lo ejecute
// automaticamente docker-entrypoint-initdb.d al inicializar Mongo por primera vez.
// Requiere mongosh (incluido en la imagen mongo:7) y el volumen mongo-init del compose.
// Ejecutar con el usuario de aplicacion pokebo_app, no desde Edge API.

const fs = require('fs');
const PATH = '/docker-entrypoint-initdb.d/seed/species.json';
const DB_NAME = 'pokebo';
const COLLECTION_NAME = 'species';
const BATCH_SIZE = 100;
const RARITIES = new Set(['comun', 'poco_comun', 'raro', 'muy_raro']);
const FIELDS = [
  'commonName', 'class', 'family', 'scientificName', 'description',
  'diet', 'category', 'habitat', 'conservationStatus', 'funFact'
];
const FIELDS_SET = new Set(FIELDS);

function fail(message) {
  throw new Error(message);
}

function loadAndValidate() {
  if (!fs.existsSync(PATH)) fail('No existe el archivo: ' + PATH);
  const data = JSON.parse(fs.readFileSync(PATH, 'utf8'));
  if (!Array.isArray(data) || data.length === 0) {
    fail('species.json debe contener un array no vacio.');
  }
  const seen = new Set();
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      fail('Registro ' + (i + 1) + ': debe ser un objeto.');
    }
    for (const key of Object.keys(item)) {
      if (!FIELDS_SET.has(key)) {
        fail('Registro ' + (i + 1) + ': campo no permitido "' + key + '".');
      }
    }
    for (const field of FIELDS) {
      if (typeof item[field] !== 'string' || !item[field].trim()) {
        fail('Registro ' + (i + 1) + ': campo obligatorio "' + field + '" ausente o vacio.');
      }
    }
    if (!RARITIES.has(item.category)) {
      fail('Registro ' + (i + 1) + ': category invalida "' + item.category + '".');
    }
    const key = item.scientificName.trim().toLocaleLowerCase('en');
    if (seen.has(key)) {
      fail('Nombre cientifico duplicado dentro del JSON: ' + item.scientificName);
    }
    seen.add(key);
  }
  return data;
}

async function run() {
  // Validar los 670 registros ANTES de escribir el primero.
  const items = loadAndValidate();
  print('Archivo validado: ' + items.length + ' especies, sin duplicados ni campos invalidos.');

  if (process.env.SEED_DRY_RUN === '1') {
    print('DRY RUN: sin cambios en MongoDB.');
    return;
  }

  const database = db.getSiblingDB(DB_NAME);
  const collection = database.getCollection(COLLECTION_NAME);
  // Unicidad incluso cuando Mongo se utiliza antes de levantar Mongoose.
  await collection.createIndex({ scientificName: 1 }, { unique: true });

  let inserted = 0;
  let matched = 0;
  let modified = 0;
  for (let offset = 0; offset < items.length; offset += BATCH_SIZE) {
    const now = new Date();
    const operations = items.slice(offset, offset + BATCH_SIZE).map((item) => ({
      updateOne: {
        filter: { scientificName: item.scientificName },
        update: {
          $set: { ...item, updatedAt: now },
          $setOnInsert: { createdAt: now },
        },
        upsert: true,
      }
    }));
    const result = await collection.bulkWrite(operations, { ordered: true });
    inserted += result.upsertedCount;
    matched += result.matchedCount;
    modified += result.modifiedCount;
    print('Lote ' + (Math.floor(offset / BATCH_SIZE) + 1) + ' completado (' + Math.min(offset + BATCH_SIZE, items.length) + '/' + items.length + ').');
  }

  print('Importacion exitosa en ' + DB_NAME + '.' + COLLECTION_NAME);
  print('Nuevas: ' + inserted + '; existentes: ' + matched + '; modificadas: ' + modified + '.');
  print('Registros en el JSON: ' + items.length + '. No se eliminaron especies ajenas al archivo.');
}

(async function main() {
  try {
    await run();
  } catch (error) {
    print('ERROR al importar especies: ' +
      (error && error.stack ? error.stack : error));
    quit(1);
  }
})();
