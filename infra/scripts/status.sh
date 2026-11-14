#!/usr/bin/env bash
# Muestra el estado de las 3 EC2, del Redis, de la URL pública y del servicio. Solo lectura.
source "$(dirname "$0")/lib.sh"

echo "== EC2"
for svc in Edge Core Mongo; do
  id="$(instance_id "$svc")"
  printf '%-6s %-22s %s\n' "$svc" "${id:-no existe}" "${id:+$(instance_state "$id")}"
done

echo "== Redis"
aws elasticache describe-replication-groups --region "$REGION" --query 'ReplicationGroups[0].[ReplicationGroupId,Status]' --output text

URL="$(public_url)"
echo "== URL pública: $URL"
code="$(curl -s -m 10 -o /dev/null -w '%{http_code}' "$URL/health" || true)"
echo "GET /health -> HTTP ${code:-000} (200 = Edge arriba)"

echo "== Alarmas en estado ALARM"
alarms="$(aws cloudwatch describe-alarms --region "$REGION" --state-value ALARM --alarm-name-prefix pokebo-demo \
  --query 'MetricAlarms[].AlarmName' --output text)"
echo "${alarms:-(ninguna)}"
