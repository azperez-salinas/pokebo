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

La comunicación respeta siempre este recorrido:

```text
App Expo ──HTTP──> Edge API :3000 ──red interna──> Core API :4000 ──> MongoDB / Redis
```

La app nunca debe conectarse directamente al Core, MongoDB o Redis. El único servicio publicado por Docker
en la computadora es el Edge API.

## Requisitos de desarrollo

- Docker Desktop con Docker Compose.
- Node.js 22.13 o superior y npm.
- Expo Go compatible con Expo SDK 58 instalado en el teléfono.
- Computadora y teléfono conectados a la misma red Wi-Fi privada.

## Configuración inicial

Los `.env` reales están ignorados por Git. En PowerShell, desde la raíz del repositorio, se pueden crear a
partir de los ejemplos con:

```powershell
Copy-Item .env.example .env
Copy-Item core-api/.env.example core-api/.env
Copy-Item edge-api/.env.example edge-api/.env
Copy-Item app/.env.example app/.env
```

Luego se deben completar los valores reales:

- `.env`: contraseñas de MongoDB y Redis utilizadas por Docker Compose.
- `core-api/.env`: clave privada JWT, secreto compartido Edge-Core y `REGISTRATION_CODE_PEPPER`.
- `edge-api/.env`: clave pública JWT, el mismo secreto Edge-Core y las credenciales SMTP.
- `app/.env`: únicamente la URL pública del Edge API; nunca debe contener secretos.

`JWT_PRIVATE_KEY` y `JWT_PUBLIC_KEY` deben pertenecer al mismo par RSA. `SERVICE_SHARED_SECRET` debe tener
exactamente el mismo valor en Core y Edge. Los valores reales deben obtenerse del almacenamiento seguro del
equipo y no copiarse al README.

## Configurar la IP para Expo Go

`localhost` dentro del teléfono identifica al propio teléfono, no a la computadora. Por eso la app debe usar
la dirección IPv4 de la computadora dentro de la red Wi-Fi.

En Windows se puede consultar con:

```powershell
Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.InterfaceAlias -eq 'Wi-Fi' } |
  Select-Object IPAddress
```

También se puede ejecutar `ipconfig` y buscar **Dirección IPv4** en el adaptador Wi-Fi. En esta computadora
la dirección actual es `192.168.1.20`, pero puede cambiar al reconectarse o reiniciar el router.

Configurar `app/.env` reemplazando la IP por la dirección actual:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.20:3000
```

No se agrega `/api` ni `/api/v1`: el cliente lo incorpora automáticamente. Cada vez que se modifica
`app/.env` hay que detener Metro y volver a iniciarlo con la caché limpia.

## Levantar el proyecto

### 1. Backend y bases de datos

Desde la raíz:

```powershell
docker compose up --build
```

Para ejecutarlo en segundo plano:

```powershell
docker compose up --build -d
docker compose ps
```

El resultado esperado es:

- Edge API publicado en `0.0.0.0:3000`.
- Core API disponible solamente dentro de Docker en el puerto 4000.
- MongoDB y Redis con estado `healthy`.

Los logs pueden consultarse con:

```powershell
docker compose logs -f edge-api core-api
```

Para detener todo sin eliminar los volúmenes de datos:

```powershell
docker compose down
```

### 2. Aplicación Expo

En otra terminal:

```powershell
cd app
npm ci
npm start -- --clear
```

Escanear el código QR con Expo Go. La app cargará `EXPO_PUBLIC_API_URL` al iniciar Metro y enviará todas las
solicitudes al Edge. En condiciones normales nunca es necesario iniciar `edge-api` o `core-api` mediante npm
si ya están ejecutándose con Docker Compose.

### 3. Comprobar la conexión desde el teléfono

Abrir en el navegador del teléfono:

```text
http://<IP_LAN_DE_TU_PC>:3000/api/app-config
```

Por ejemplo, con la IP actual:

```text
http://192.168.1.20:3000/api/app-config
```

Aunque ese endpoint responda que todavía no está implementado, recibir una respuesta HTTP confirma que el
teléfono llega al Edge. Si el navegador no conecta, revisar el firewall, la IP y la red antes de depurar la app.

### Problemas de conexión frecuentes

Si la app muestra `No se pudo conectar al servidor. Revisá la URL del Edge API y tu conexión`:

1. Confirmar que `docker compose ps` muestre el Edge activo y el puerto `0.0.0.0:3000->3000`.
2. Confirmar que `EXPO_PUBLIC_API_URL` use la IP Wi-Fi actual, no `localhost` ni una IP anterior.
3. Reiniciar Metro con `npm start -- --clear` después de cambiar el `.env`.
4. Abrir la URL de comprobación desde el navegador del teléfono.
5. Verificar que ambos dispositivos estén en la misma Wi-Fi y que no sea una red de invitados.


## Cargar especies en MongoDB

El catálogo inicial de 671 especies se encuentra en `mongo-init/seed/species.json`.

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

El resultado esperado es `671`.

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

