#!/usr/bin/env bash
# Apaga las 3 EC2 para ahorrar cómputo. NO borra nada. Sigue cobrando: NAT, Redis, IPv4 públicas y EBS.
# Orden: Edge (deja de recibir tráfico), Core, y MongoDB al final tras cerrar la base de datos de forma ordenada.
source "$(dirname "$0")/lib.sh"

edge="$(instance_id Edge)"; core="$(instance_id Core)"; mongo="$(instance_id Mongo)"

echo "Apagando Edge y Core..."
aws ec2 stop-instances --region "$REGION" --instance-ids "$edge" "$core" --query 'StoppingInstances[].InstanceId' --output text >/dev/null

if [ "$(instance_state "$mongo")" = "running" ]; then
  echo "Cerrando MongoDB de forma ordenada (docker stop, hasta 60 s)..."
  remote "$mongo" 'docker stop -t 60 mongo >/dev/null && echo "mongo detenido"' || echo "(no se pudo detener el contenedor: se apaga igual)"
fi
aws ec2 stop-instances --region "$REGION" --instance-ids "$mongo" --query 'StoppingInstances[].InstanceId' --output text >/dev/null

aws ec2 wait instance-stopped --region "$REGION" --instance-ids "$edge" "$core" "$mongo"
echo "Las 3 instancias están detenidas."
echo "Siguen generando costo: NAT Gateway, ElastiCache Redis, IPv4 públicas y discos EBS."
