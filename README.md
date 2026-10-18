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
