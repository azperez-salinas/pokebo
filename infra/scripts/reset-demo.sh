#!/usr/bin/env bash
# Deja la app "de cero" para la demo: conserva SOLO el catálogo (species y achievements) y borra
# usuarios, capturas, avistamientos, avisos, logros de usuarios, fotos (GridFS) y todo Redis (sesiones y OTP).
# DESTRUCTIVO. Exige --yes. Antes toma un snapshot de seguridad (omitir con --sin-snapshot).
#
# Uso: bash infra/scripts/reset-demo.sh --yes [--sin-snapshot]
source "$(dirname "$0")/lib.sh"

yes=0; snapshot=1
for arg in "$@"; do
  case "$arg" in
    --yes) yes=1 ;;
    --sin-snapshot) snapshot=0 ;;
    *) echo "Argumento desconocido: $arg" >&2; exit 1 ;;
  esac
done
[ "$yes" = 1 ] || { echo "Esto BORRA usuarios, capturas y sesiones. Repetir con --yes para confirmar."; exit 1; }

echo "== Antes"
mongo_eval 'db.getCollectionNames().sort().forEach(n => print(n + ": " + db.getCollection(n).countDocuments()));'

[ "$snapshot" = 1 ] && bash "$(dirname "$0")/snapshot.sh" "pokebo-demo antes de reset-demo $(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "== Borrando datos de la app en MongoDB (se conservan species y achievements)"
mongo_eval '
const wipe = ["users", "captures", "sightings", "notifications", "userachievements", "fs.files", "fs.chunks"];
const existing = new Set(db.getCollectionNames());
for (const name of wipe) {
  if (existing.has(name)) print("vaciada " + name + ": " + db.getCollection(name).deleteMany({}).deletedCount);
}
'

echo "== Vaciando Redis (sesiones, OTP, celdas H3, avisos vistos)"
remote "$(instance_id Core)" 'docker exec core-api node -e "
const { createClient } = require(\"redis\");
(async () => { const c = createClient({ url: process.env.REDIS_URI }); await c.connect(); await c.flushDb(); console.log(\"redis vaciado, claves:\", await c.dbSize()); await c.quit(); })().catch((e) => { console.error(e.message); process.exit(1); });
"'

echo "== Después"
mongo_eval 'db.getCollectionNames().sort().forEach(n => print(n + ": " + db.getCollection(n).countDocuments()));'
echo "Listo: la app está de cero (catálogo intacto)."
