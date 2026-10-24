# pokedex-uy
Proyecto de Aplicaciones Móviles

> **Estado: esqueleto.** Solo hay estructura de carpetas y stubs. Los endpoints responden
> `501 NOT_IMPLEMENTED` y no hay lógica de negocio ni conexión real a bases de datos.

## Estructura

| Carpeta     | Qué es |
|-------------|--------|
| `app/`      | Cliente React Native (Expo). Solo habla con el Edge API. |
| `edge-api/` | Gateway en la DMZ, único servicio con salida a internet. Verifica versión de la app, JWT (clave pública) y rate limit; reenvía al Core firmando con un secreto compartido; llama a la IA de identificación y al servicio de push (FCM/APNs). |
| `core-api/` | Lógica de negocio en la red segura. Solo habla con MongoDB, Redis y el Edge. Firma los JWT con la clave privada. |

Cada proyecto es independiente y tiene su propio `package.json`.

## Levantar con Docker Compose

```bash
# opcional: copiar las variables de ejemplo y completarlas
cp edge-api/.env.example edge-api/.env
cp core-api/.env.example core-api/.env

docker compose up --build
```

- Edge API: http://localhost:3000 (ej. `GET /api/app-config`, `GET /api/v1/species` → 501)
- Core API, MongoDB y Redis solo son accesibles dentro de la red `secure` (no publican puertos).

## Cargar especies en MongoDB

El catálogo inicial de 670 especies se encuentra en `mongo-init/seed/species.json`.

Con MongoDB levantado, ejecutar desde la raíz del proyecto:

```bash
docker compose exec mongo sh -c 'mongosh --quiet --host localhost --username "$MONGO_APP_USER" --password "$MONGO_APP_PASSWORD" --authenticationDatabase pokebo --file /docker-entrypoint-initdb.d/seed/import-species.js'
```

El script carga las especies en la colección `pokebo.species`. Utiliza `upsert` por nombre científico, por lo que puede ejecutarse nuevamente sin generar duplicados.

Para verificar la carga, ingresar a MongoDB:

```bash
docker compose exec mongo mongosh -u pokebo_app --authenticationDatabase pokebo pokebo
```

Ingresar la contraseña configurada en `MONGO_APP_PASSWORD` y ejecutar:

```javascript
db.species.countDocuments({})
```

El resultado esperado es `670`.

## App

La app usa Expo SDK 57 y requiere Node.js 22.13 o superior. Para abrirla con
Expo Go 57, instalá las dependencias y arrancá Metro:

```bash
cd app
npm install
npm start
```

Escaneá el QR con Expo Go. La computadora y el teléfono deben estar en la misma
red Wi-Fi. Para probar el registro y el inicio de sesión, copiá `app/.env.example`
a `app/.env` y cambiá `EXPO_PUBLIC_API_URL` por la IP local de la computadora.
El Edge API debe estar levantado en el puerto 3000; `localhost` dentro del
teléfono apunta al propio teléfono. Reiniciá Metro después de cambiar `.env`.
