# Infraestructura AWS de PokebO (demo) y runbook

CDK v2 (TypeScript) para la demostración, en `us-east-2`. La arquitectura aprobada y las decisiones están en
[../AWS_MIGRATION_AGENT.md](../AWS_MIGRATION_AGENT.md). Este archivo es el **manual de operación**.

URL pública: `https://18-191-90-176.sslip.io` (IP elástica `18.191.90.176`; **no liberarla** hasta después de la demo).

## Stacks

| Stack | Contenido | Notas |
|---|---|---|
| `PokeboNetwork` | VPC, subred pública y privada, NAT, 4 Security Groups | |
| `PokeboData` | 8 secretos, EC2 MongoDB (Docker), volumen de datos, ElastiCache Redis | Con *termination protection* |
| `PokeboMessaging` | 3 colas SQS + DLQ, DynamoDB, Lambdas de correo y push, alarmas | |
| `PokeboRegistry` | Repositorios ECR de Core y Edge | |
| `PokeboCompute` | EC2 Core y Edge, IP elástica, Caddy, logs | |

Antes de desplegar: `npm test`, `npx cdk synth --strict`, `npx cdk diff`. No usar `--hotswap`.

## Requisitos en tu equipo
Git Bash, AWS CLI con sesión activa (`aws sts get-caller-identity`), Node, y Docker Desktop solo para publicar imágenes.
Todos los scripts están en `infra/scripts/` y se ejecutan desde la raíz del repo con `bash infra/scripts/<script>.sh`.

## Operación diaria (todo probado el 2026-11-14)

| Qué quiero | Comando | Duración probada |
|---|---|---|
| Ver el estado | `bash infra/scripts/status.sh` | segundos |
| Apagar las EC2 para ahorrar | `bash infra/scripts/stop.sh` | ~50 s |
| Encender todo | `bash infra/scripts/start.sh` | ~110 s |
| Dejar la app de cero para la demo | `bash infra/scripts/reset-demo.sh --yes` | ~1 min |
| Copia de seguridad de MongoDB | `bash infra/scripts/snapshot.sh` | ~1 min |
| Publicar una versión nueva de Core/Edge | `bash infra/scripts/release.sh [core\|edge]` | 2 a 5 min |

### Apagar y encender
`stop.sh` cierra MongoDB de forma ordenada y apaga Edge, Core y MongoDB. **No borra nada**: la IP elástica, Redis, el NAT y
los discos siguen existiendo. `start.sh` enciende en el orden MongoDB → Core → Edge y no termina con éxito hasta que
Core responde `{"status":"ok","mongo":true,"redis":true}` y la URL pública da 200.

Importante: aunque apagues las 3 EC2, **siguen cobrando** NAT Gateway (≈ USD 1,08/día), Redis (≈ 0,62/día), las IPv4
públicas (≈ 0,24/día) y el EBS. Apagar solo las EC2 ahorra aproximadamente la mitad del costo fijo.

> Gotcha ya resuelto: MongoDB corre con `restart=unless-stopped`; un `docker stop` manual hace que Docker NO lo relance
> al reiniciar. Por eso `start.sh` ejecuta `docker start mongo`. Si encendés una EC2 desde la consola de AWS en vez de
> con el script, MongoDB puede quedar parado: `bash infra/scripts/start.sh` lo corrige (es idempotente).

### Reiniciar la app "de cero" antes de la demo
`reset-demo.sh --yes` **conserva** `species` (691) y `achievements` (21) y **borra** usuarios (incluidas las 4 cuentas),
capturas, avistamientos, avisos, logros de usuarios, fotos (GridFS) y todo Redis (sesiones, OTP, celdas H3). Antes toma un
snapshot de seguridad (omitir con `--sin-snapshot`). Sin `--yes` se niega a ejecutar. Después, los 4 integrantes se
registran de nuevo con sus correos (deben estar verificados en SES).

### Backup y restauración de MongoDB
- **Backup:** `snapshot.sh` crea un snapshot cifrado del disco de datos. Los snapshots cuestan ≈ USD 0,05 por GiB-mes
  (solo se cobra lo ocupado). Tomar uno antes de la demo.
- **Validado:** se creó un volumen a partir de un snapshot (30 GiB, cifrado) y se eliminó. La restauración *completa* sobre la
  instancia **no se ejecutó**; el procedimiento es:
  1. `bash infra/scripts/stop.sh`.
  2. Crear un volumen desde el snapshot en `us-east-2a` (`aws ec2 create-volume --snapshot-id <snap> --availability-zone us-east-2a --volume-type gp3 --encrypted`).
  3. Desasociar el volumen actual de MongoDB (`/dev/sdf`) y asociar el nuevo en `/dev/sdf`.
  4. `bash infra/scripts/start.sh`.
  5. Ojo: CloudFormation seguirá creyendo que el volumen original está asociado (deriva). Si se vuelve a desplegar `PokeboData`, revisar el `diff` antes.

### Publicar una versión nueva (y volver atrás)
`release.sh` construye con Docker local, sube a ECR con la etiqueta del commit (con `-dirty-<fecha>` si hay cambios sin
commitear), guarda la etiqueta en SSM y reinicia el servicio. Las etiquetas son inmutables y nunca se usa `latest`.
**Rollback:** `aws ssm put-parameter --name /pokebo/demo/image-tag/core-api --type String --value <etiqueta-anterior> --overwrite`
y reiniciar el servicio (`systemctl restart pokebo-app` en la instancia). Etiquetas disponibles:
`aws ecr describe-images --repository-name pokebo-demo/core-api --query 'imageDetails[].imageTags'`.

## Diagnóstico (sin SSH: Systems Manager)

Ejecutar un comando en una instancia (usa `lib.sh`):
```bash
source infra/scripts/lib.sh
remote "$(instance_id Core)" 'docker ps; docker logs --tail 30 core-api'
remote "$(instance_id Mongo)" 'docker inspect -f "{{.State.Health.Status}}" mongo'
remote "$(instance_id Edge)" 'docker logs --tail 30 caddy'
```
Para una consola interactiva: `aws ssm start-session --target <instance-id>` (requiere el plugin *session-manager-plugin*)
o la consola de AWS → EC2 → Connect → Session Manager.

| Síntoma | Dónde mirar |
|---|---|
| La URL no responde | `status.sh`; logs de Caddy: `remote ... 'docker logs --tail 30 caddy'` |
| Core "degraded" | `curl http://127.0.0.1:4000/health` en Core: dice qué falta (`mongo` o `redis`) |
| MongoDB parado | `start.sh` (hace `docker start mongo`) |
| No llegan códigos por correo | Cola `pokebo-demo-otp-email-dlq`, logs de la Lambda, y que el destinatario esté **verificado en SES** (sandbox) |
| No llegan push | Cola `pokebo-demo-push-dlq`, logs de la Lambda de push, token Android registrado y `pushEnabled` |
| Una alarma en ALARM | `status.sh` las lista |

Logs en CloudWatch: `/pokebo/demo/core-api`, `/pokebo/demo/edge-api`, `/pokebo/demo/caddy` (retención 7 días) y los grupos de
las Lambdas. En Git Bash anteponer `MSYS_NO_PATHCONV=1` a los comandos `aws logs`.

## Secretos
Los valores se cargan con `aws secretsmanager put-secret-value`, **sin pegarlos en chats ni dejarlos en archivos**. Los
generados por AWS (Mongo, Redis, peppers) no se tocan. Los cargados a mano: `pokebo/demo/jwt-private-key`,
`pokebo/demo/ai-provider-key`, `pokebo/demo/fcm-service-account`. La clave pública JWT está en el parámetro SSM
`/pokebo/demo/jwt-public-key`. Rotar la clave JWT invalida todas las sesiones (hay que actualizar también el parámetro público y
reiniciar Core y Edge).

## Salir del sandbox de SES
Mientras la cuenta esté en sandbox, SES solo entrega a correos verificados (SES → Identities). Verificados: remitente
`pokebouru@gmail.com` y los 4 del equipo (cada persona debe abrir el enlace del correo de AWS).

## Apagado completo y borrado (teardown) — NO PROBADO, destructivo
Para cortar **todo** el costo fijo (hay que pedir aprobación antes de ejecutarlo):
1. (Opcional) `bash infra/scripts/snapshot.sh` para conservar los datos.
2. Borrar el cómputo y el resto: `npx cdk destroy PokeboCompute PokeboMessaging PokeboRegistry`.
3. Desactivar la protección del stack de datos y borrarlo:
   `aws cloudformation update-termination-protection --no-enable-termination-protection --stack-name PokeboData`
   y `npx cdk destroy PokeboData`. El **volumen de datos de MongoDB se conserva** (política *Retain*): borrarlo a mano si ya
   no se quiere (`aws ec2 delete-volume`). La **IP elástica también se conserva**: liberarla con
   `aws ec2 release-address --allocation-id <id>` (la URL de la app dejará de funcionar).
4. `npx cdk destroy PokeboNetwork` (elimina el NAT).
5. Los secretos quedan 30 días en recuperación; para reutilizar el nombre de inmediato:
   `aws secretsmanager delete-secret --secret-id <nombre> --force-delete-without-recovery`.
6. Opcional: `CDKToolkit` (stack de arranque de CDK) y los snapshots.

**Orden:** si se quita alguna referencia entre stacks (por ejemplo una cola usada por Compute), CloudFormation bloquea el
borrado ("export in use"); borrar primero el stack que consume.

## Costos de referencia (precios us-east-2)
Con todo encendido: ≈ USD 4 al día. Con las EC2 apagadas: ≈ USD 2 al día. Detalle y estimación en la sección 14 del documento
de migración. Revisar el gasto real en *Billing and Cost Management → Cost Explorer*.
