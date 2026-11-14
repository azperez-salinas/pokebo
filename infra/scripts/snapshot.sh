#!/usr/bin/env bash
# Crea un snapshot del disco de datos de MongoDB (catálogo + todo lo demás) con etiquetas del proyecto.
# Uso: bash infra/scripts/snapshot.sh [descripcion]
# Para un snapshot consistente conviene tomarlo con la app quieta o tras `stop.sh`; MongoDB usa journaling, así que
# también es recuperable si se toma en caliente.
source "$(dirname "$0")/lib.sh"

mongo="$(instance_id Mongo)"
volume="$(aws ec2 describe-volumes --region "$REGION" \
  --filters "Name=attachment.instance-id,Values=$mongo" "Name=attachment.device,Values=/dev/sdf" \
  --query 'Volumes[0].VolumeId' --output text)"
[ -n "$volume" ] && [ "$volume" != "None" ] || { echo "No se encontró el disco de datos de MongoDB" >&2; exit 1; }

desc="${1:-pokebo-demo mongo $(date -u +%Y-%m-%dT%H:%M:%SZ)}"
snap="$(aws ec2 create-snapshot --region "$REGION" --volume-id "$volume" --description "$desc" \
  --tag-specifications "ResourceType=snapshot,Tags=[{Key=Project,Value=Pokebo},{Key=Environment,Value=demo},{Key=ManagedBy,Value=script},{Key=Name,Value=pokebo-demo-mongo}]" \
  --query SnapshotId --output text)"
echo "Snapshot $snap del volumen $volume en curso..."
aws ec2 wait snapshot-completed --region "$REGION" --snapshot-ids "$snap"
aws ec2 describe-snapshots --region "$REGION" --snapshot-ids "$snap" --query 'Snapshots[0].[SnapshotId,State,VolumeSize,Encrypted]' --output text
