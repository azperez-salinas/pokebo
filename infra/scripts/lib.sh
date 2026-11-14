#!/usr/bin/env bash
# Funciones comunes de los scripts de operación. Se carga con: source "$(dirname "$0")/lib.sh"
set -euo pipefail
export MSYS_NO_PATHCONV=1 PYTHONUTF8=1 PYTHONIOENCODING=utf-8 # Git Bash en Windows: rutas y Unicode de la CLI de AWS

REGION=us-east-2
PUBLIC_URL_PARAM=/pokebo/demo/edge-public-ip

# Id de la instancia de un servicio (Mongo, Core o Edge) en cualquier estado, salvo terminada
instance_id() {
  aws ec2 describe-instances --region "$REGION" \
    --filters "Name=tag:aws:cloudformation:logical-id,Values=$1*" \
              "Name=instance-state-name,Values=pending,running,stopping,stopped" \
    --query 'Reservations[].Instances[].InstanceId' --output text
}

instance_state() {
  aws ec2 describe-instances --region "$REGION" --instance-ids "$1" --query 'Reservations[0].Instances[0].State.Name' --output text
}

# URL pública de Edge (https://<ip-con-guiones>.sslip.io), calculada desde la IP elástica guardada en SSM
public_url() {
  local ip
  ip="$(aws ssm get-parameter --region "$REGION" --name "$PUBLIC_URL_PARAM" --query Parameter.Value --output text)"
  echo "https://${ip//./-}.sslip.io"
}

# Espera a que SSM vea la instancia online (el agente tarda un poco tras arrancar)
wait_ssm_online() {
  local id="$1" i
  for i in $(seq 1 60); do
    [ "$(aws ssm describe-instance-information --region "$REGION" --filters "Key=InstanceIds,Values=$id" \
        --query 'InstanceInformationList[0].PingStatus' --output text 2>/dev/null)" = "Online" ] && return 0
    sleep 10
  done
  echo "La instancia $id no apareció online en Systems Manager" >&2
  return 1
}

# Ejecuta un script bash en la instancia vía Systems Manager y muestra su salida.
# El script viaja en base64: evita cualquier problema de comillas. Uso: remote <instance-id> '<script>'
remote() {
  local id="$1" script="$2" b64 cid status i
  b64="$(printf '%s' "$script" | base64 -w0)"
  cid="$(aws ssm send-command --region "$REGION" --instance-ids "$id" --document-name AWS-RunShellScript \
        --timeout-seconds 600 --parameters "commands=[\"echo $b64 | base64 -d | bash\"]" \
        --query Command.CommandId --output text)"
  for i in $(seq 1 200); do
    status="$(aws ssm get-command-invocation --region "$REGION" --command-id "$cid" --instance-id "$id" --query Status --output text 2>/dev/null || echo Pending)"
    case "$status" in Success|Failed|Cancelled|TimedOut) break ;; esac
    sleep 3
  done
  aws ssm get-command-invocation --region "$REGION" --command-id "$cid" --instance-id "$id" \
    --query 'StandardOutputContent' --output text
  if [ "$status" != "Success" ]; then
    aws ssm get-command-invocation --region "$REGION" --command-id "$cid" --instance-id "$id" \
      --query 'StandardErrorContent' --output text >&2
    echo "El comando remoto terminó con estado: $status" >&2
    return 1
  fi
}

# Comando de mongosh como usuario de la aplicación, ejecutado en la instancia de MongoDB.
# La contraseña se lee de Secrets Manager en la propia instancia y nunca se imprime. Uso: mongo_eval '<js>'
mongo_eval() {
  local js_b64
  js_b64="$(printf '%s' "$1" | base64 -w0)"
  remote "$(instance_id Mongo)" "
set -e
P=\$(aws secretsmanager get-secret-value --region $REGION --secret-id pokebo/demo/mongo-app --query SecretString --output text)
echo $js_b64 | base64 -d > /tmp/eval.js
docker cp /tmp/eval.js mongo:/tmp/eval.js
docker exec -e P=\"\$P\" mongo sh -c 'mongosh --quiet -u pokebo_app -p \"\$P\" --authenticationDatabase pokebo pokebo --file /tmp/eval.js'
rm -f /tmp/eval.js
"
}
