# Pokebo
Proyecto de Aplicaciones Móviles

Pokebo es una aplicación móvil para descubrir, identificar y registrar especies de Uruguay.
El repositorio contiene una app Expo, un Edge API expuesto a internet y un Core API aislado
que administra la lógica de negocio, MongoDB y Redis. Algunas funcionalidades continúan en desarrollo.

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

## Verificación de correo al registrarse

El registro queda pendiente en Redis hasta que el usuario ingresa el código alfanumérico enviado por correo.
El código vence a los 5 minutos, admite hasta 5 intentos y cada reenvío invalida el código anterior.
MongoDB recibe al usuario y el Core emite los tokens solamente después de una verificación correcta.

### Gmail SMTP (MVP académico)

El envío transaccional se realiza desde el Edge mediante Gmail SMTP. Esto permite que una persona se registre
con una dirección real (por ejemplo, `pepe@gmail.com`) y reciba el código enviado por Pokebo sin comprar un dominio.
La cuenta remitente configurada para el proyecto es `pokebouru@gmail.com`:

```env
MAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=pokebouru@gmail.com
SMTP_APP_PASSWORD=
MAIL_FROM="Pokebo <pokebouru@gmail.com>"
REGISTRATION_RESPONSE_MIN_MS=1000
```

Para completar `SMTP_APP_PASSWORD`:

1. Activar la verificación en dos pasos de la cuenta Google remitente.
2. Abrir la configuración de **Contraseñas de aplicaciones** de Google y crear una para Pokebo.
3. Copiar la contraseña generada de 16 caracteres únicamente a `edge-api/.env`, sin comillas ni espacios.
4. Reiniciar el Edge API para que tome la nueva configuración.

No se debe usar la contraseña normal de Gmail ni guardar la contraseña de aplicación en Git, el README,
la app móvil o el Core. Gmail SMTP es apropiado para la demo académica y pruebas de bajo volumen; para una
puesta en producción se debe migrar a un proveedor transaccional con dominio propio y límites controlados.

En `core-api/.env` se recomienda definir un `REGISTRATION_CODE_PEPPER` largo y aleatorio, distinto de las
claves JWT y del secreto compartido Edge-Core.

## Archivos de entorno

Todos los archivos `.env` reales están ignorados por Git. Los archivos importantes son:

| Archivo | Contenido | Sensibilidad |
|---------|-----------|--------------|
| `.env` | Credenciales de MongoDB y Redis utilizadas por Docker Compose. | Secreto |
| `core-api/.env` | Clave privada JWT, secreto Edge-Core, conexiones internas y pepper de registro. | Secreto crítico |
| `edge-api/.env` | Clave pública JWT, secreto Edge-Core, contraseña de aplicación SMTP y credenciales de servicios externos. | Secreto crítico |
| `app/.env` | URL pública del Edge usada por Expo. | Configuración pública; nunca debe contener secretos |

Los archivos `.env.example` correspondientes documentan los nombres de las variables y son los únicos que
se pueden compartir o versionar sin cifrado.

### Compartir la configuración con el equipo

No se deben subir los `.env` reales en texto plano a una carpeta compartida de Drive. La opción recomendada
es guardar cada secreto en un gestor de contraseñas o de secretos con acceso por usuario y auditoría. Si el
equipo necesariamente utiliza Drive, los `.env` deben colocarse dentro de un archivo cifrado y la contraseña
debe compartirse por un canal diferente. Cuando una persona deja el equipo, se deben rotar como mínimo
`SMTP_APP_PASSWORD`, `SERVICE_SHARED_SECRET`, las claves JWT y las contraseñas de MongoDB y Redis.

Nunca se deben copiar secretos a capturas de pantalla, tickets, chats, documentación ni builds de la app.
