#!/usr/bin/env bash
# Construye las imágenes de Core y Edge, las publica en ECR con una etiqueta inmutable y la registra en SSM.
# Si las instancias ya existen, reinicia su servicio para que tomen la nueva imagen.
#
# Uso (desde la raíz del repo, con Docker Desktop corriendo y sesión AWS activa):
#   bash infra/scripts/release.sh            # core y edge
#   bash infra/scripts/release.sh core       # solo uno
set -euo pipefail
export MSYS_NO_PATHCONV=1 # Git Bash en Windows: no convertir /pokebo/... en rutas de Windows

REGION=us-east-2
# pwd -W (Git Bash en Windows) da C:/...; los git y docker nativos de Windows no entienden /c/...
ROOT="$(cd "$(dirname "$0")/../.." && { pwd -W 2>/dev/null || pwd; })"
ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
REGISTRY="$ACCOUNT.dkr.ecr.$REGION.amazonaws.com"

# Etiqueta = commit actual; si hay cambios sin commitear se agrega la fecha (las etiquetas de ECR son inmutables)
TAG="$(git -C "$ROOT" rev-parse --short HEAD)"
if [ -n "$(git -C "$ROOT" status --porcelain -- core-api edge-api)" ]; then
  TAG="$TAG-dirty-$(date -u +%Y%m%d%H%M%S)"
fi

SERVICES=("$@")
[ ${#SERVICES[@]} -eq 0 ] && SERVICES=(core edge)

# Config de Docker temporal: evita el credential helper de Windows (falla al guardar) y no deja el token de ECR en tu perfil
DOCKER_CONFIG="$(mktemp -d)"
command -v cygpath >/dev/null 2>&1 && DOCKER_CONFIG="$(cygpath -m "$DOCKER_CONFIG")"
export DOCKER_CONFIG
trap 'rm -rf "${DOCKER_CONFIG:?}"' EXIT

# `docker login` falla en Windows: el token de ECR (~4000 caracteres) supera el limite del almacen de credenciales.
# Se escribe la autenticacion directamente en la config temporal (se borra al salir).
ECR_AUTH="$(printf 'AWS:%s' "$(aws ecr get-login-password --region "$REGION")" | base64 -w0)"
printf '{"auths":{"%s":{"auth":"%s"}}}' "$REGISTRY" "$ECR_AUTH" > "$DOCKER_CONFIG/config.json"
unset ECR_AUTH

for service in "${SERVICES[@]}"; do
  case "$service" in
    core) dir=core-api ;;
    edge) dir=edge-api ;;
    *) echo "Servicio desconocido: $service (usar core o edge)"; exit 1 ;;
  esac
  repo="$REGISTRY/pokebo-demo/$dir"

  if aws ecr describe-images --region "$REGION" --repository-name "pokebo-demo/$dir" --image-ids imageTag="$TAG" >/dev/null 2>&1; then
    echo "[$dir] la etiqueta $TAG ya existe en ECR: no se vuelve a subir"
  else
    echo "[$dir] construyendo $repo:$TAG"
    docker build --platform linux/amd64 -t "$repo:$TAG" "$ROOT/$dir"
    docker push "$repo:$TAG"
  fi

  aws ssm put-parameter --region "$REGION" --name "/pokebo/demo/image-tag/$dir" --type String \
    --value "$TAG" --overwrite --query Version --output text >/dev/null
  echo "[$dir] etiqueta activa: $TAG"

  # Reiniciar el servicio en la instancia, si existe (no falla si todavía no se desplegó el stack de cómputo)
  name="Core"; [ "$service" = edge ] && name="Edge"
  instance="$(aws ec2 describe-instances --region "$REGION" \
    --filters "Name=tag:aws:cloudformation:stack-name,Values=PokeboCompute" "Name=tag:aws:cloudformation:logical-id,Values=$name*" \
              "Name=instance-state-name,Values=running" \
    --query 'Reservations[].Instances[].InstanceId' --output text)"
  if [ -n "$instance" ] && [ "$instance" != "None" ]; then
    aws ssm send-command --region "$REGION" --instance-ids "$instance" --document-name AWS-RunShellScript \
      --parameters 'commands=["systemctl restart pokebo-app"]' --query Command.CommandId --output text >/dev/null
    echo "[$dir] reinicio solicitado en $instance"
  fi
done
