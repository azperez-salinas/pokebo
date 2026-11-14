#!/usr/bin/env bash
# Enciende las 3 EC2 en orden (MongoDB -> Core -> Edge) y espera a que la URL pública responda.
# Cada instancia vuelve a levantar su contenedor sola (docker restart policy + servicio pokebo-app).
source "$(dirname "$0")/lib.sh"

edge="$(instance_id Edge)"; core="$(instance_id Core)"; mongo="$(instance_id Mongo)"
started="$(date +%s)"

start_and_wait() {
  local name="$1" id="$2"
  [ "$(instance_state "$id")" = "running" ] || aws ec2 start-instances --region "$REGION" --instance-ids "$id" >/dev/null
  aws ec2 wait instance-running --region "$REGION" --instance-ids "$id"
  wait_ssm_online "$id"
  echo "$name en marcha ($id)"
}

start_and_wait MongoDB "$mongo"
# stop.sh cierra MongoDB con `docker stop`; con restart=unless-stopped Docker NO lo relanza solo tras reiniciar. Se arranca a mano.
remote "$mongo" 'docker start mongo >/dev/null 2>&1 || true'
echo "Esperando a que MongoDB esté sano..."
health=""
for i in $(seq 1 30); do
  health="$(remote "$mongo" 'docker inspect -f "{{.State.Health.Status}}" mongo 2>/dev/null || echo none' | tr -d '[:space:]')"
  [ "$health" = "healthy" ] && break
  sleep 10
done
echo "MongoDB: ${health:-desconocido}"
[ "$health" = "healthy" ] || { echo "MongoDB no quedó sano. Ver el diagnóstico en infra/README.md" >&2; exit 1; }

start_and_wait Core "$core"
start_and_wait Edge "$edge"

# Core (que reintenta solo mientras MongoDB/Redis no estén listos) debe responder 200 con ambos conectados
echo "Esperando a que Core se conecte a MongoDB y Redis..."
core_health=""
for i in $(seq 1 60); do
  core_health="$(remote "$core" 'curl -s -m 5 http://127.0.0.1:4000/health || true' | tr -d '[:space:]')"
  case "$core_health" in *'"status":"ok"'*) break ;; esac
  sleep 10
done
echo "Core: ${core_health:-sin respuesta}"
case "$core_health" in *'"status":"ok"'*) ;; *) echo "Core no quedó sano. Ver el diagnóstico en infra/README.md" >&2; exit 1 ;; esac

URL="$(public_url)"
echo "Esperando a que $URL/health responda 200..."
for i in $(seq 1 60); do
  [ "$(curl -s -m 8 -o /dev/null -w '%{http_code}' "$URL/health" || true)" = "200" ] && { echo "OK en $(( $(date +%s) - started )) s: $URL"; exit 0; }
  sleep 10
done
echo "La URL no respondió a tiempo. Ver el diagnóstico en infra/README.md" >&2
exit 1
