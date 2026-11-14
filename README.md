# Pokebo
Proyecto de Aplicaciones Móviles

Pokebo es una aplicación móvil para descubrir, identificar y registrar especies de Uruguay.
El repositorio contiene una app Expo, un Edge API expuesto a internet y un Core API aislado
que administra la lógica de negocio, MongoDB y Redis. Algunas funcionalidades continúan en desarrollo.

## Estructura

| Carpeta     | Qué es |
|-------------|--------|
| `app/`      | Cliente React Native (Expo). Solo habla con el Edge API. |
| `edge-api/` | Gateway en la DMZ. Verifica versión, JWT con clave pública y rate limit; valida cargas y reenvía solicitudes al Core. No contiene credenciales de datos, IA, correo ni push. |
| `core-api/` | Lógica de negocio en la red segura. Habla con MongoDB y Redis, firma JWT, identifica imágenes de forma síncrona y publica trabajos de correo/push. |

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
- `core-api/.env`: clave privada JWT, peppers OTP, conexiones de datos y configuración del proveedor de IA.
- `edge-api/.env`: clave pública JWT y URL interna del Core; no debe contener secretos importantes.
- `app/.env`: únicamente la URL pública del Edge API; nunca debe contener secretos.

`JWT_PRIVATE_KEY` y `JWT_PUBLIC_KEY` deben pertenecer al mismo par RSA. En AWS, el Core no es público y su
Security Group acepta conexiones únicamente desde Edge. Los valores reales deben obtenerse del almacenamiento
seguro del equipo y no copiarse al README.

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

## Mapas en aplicaciones compiladas

Pokebo utiliza `react-native-maps` con un proveedor diferente según la plataforma:

- Android utiliza Google Maps y requiere una API key de **Maps SDK for Android**.
- iOS utiliza Apple Maps mediante MapKit y no requiere una API key de mapas.

La selección se realiza en `MapScreen`: Android recibe `PROVIDER_GOOGLE` e iOS conserva el proveedor nativo.
No se debe configurar `iosGoogleMapsApiKey`, porque eso incorporaría Google Maps también en iOS.

### Expo, EAS y AWS cumplen funciones diferentes

- **Expo** sigue siendo el framework que genera y configura los proyectos nativos Android/iOS.
- **EAS Build** firma y compila el APK o la aplicación iOS; no aloja el backend.
- **AWS** alojará el Edge API, el Core API y sus dependencias. No reemplaza la compilación móvil ni las
  credenciales del SDK de mapas.

El tráfico de negocio de Pokebo debe ir siempre al Edge API. Los SDK nativos de mapas son la excepción esperada:
se conectan directamente con Google en Android o Apple en iOS para descargar el mapa.

### Identificadores nativos

Las dos aplicaciones utilizan el mismo identificador:

```text
Android package: com.pokebo.app
iOS bundle identifier: com.pokebo.app
```

### Configurar la clave de Google Maps para Android

En Google Cloud se debe habilitar **Maps SDK for Android** y crear una API key con estas restricciones:

```text
Tipo de aplicación: Apps para Android
Nombre del paquete: com.pokebo.app
Huella SHA-1: huella del certificado de EAS que firma el APK
Restricción de API: Maps SDK for Android
```

La huella SHA-1 no se inventa ni se obtiene del código. Como la aplicación se distribuirá mediante APK interno
y no mediante Google Play, se debe utilizar la huella del keystore administrado por EAS.

Primero iniciar sesión, vincular el proyecto y crear o consultar las credenciales Android:

```powershell
cd app
npx.cmd eas-cli login
npx.cmd eas-cli init
npx.cmd eas-cli credentials -p android
```

En el administrador de credenciales se selecciona el perfil `preview` y se crea un keystore si todavía no existe.
Luego se copia su huella SHA-1 a la restricción de la API key en Google Cloud. El keystore actual de Pokebo tiene:

```text
SHA-1: 51:1C:AB:44:63:08:73:BC:0A:D7:53:E3:1D:32:95:99:DC:77:DF:3E
```

No se debe borrar ni reemplazar este keystore: las actualizaciones de un APK deben conservar la misma firma.

La clave real nunca se guarda en `app.json`, `app.config.js`, `.env.example`, el README ni Git. Se registra en el
entorno `preview` de EAS con visibilidad sensible. Para evitar que el valor quede escrito en el historial de
PowerShell, se carga de forma interactiva:

```powershell
npx eas-cli env:set --name GOOGLE_MAPS_API_KEY --value "<API_KEY>" --environment preview --visibility sensitive
```

Para desarrollo local se puede agregar temporalmente a `app/.env`, que está ignorado por Git:

```env
GOOGLE_MAPS_API_KEY=<API_KEY>
```

La clave termina incorporada en el APK porque Google Maps la necesita en el dispositivo. Su protección efectiva
es la combinación de restricciones `com.pokebo.app` + SHA-1 + `Maps SDK for Android`, no mantener oculto el valor
dentro del binario.

### URL del Edge API para el build remoto

`app/.env` conserva la URL LAN para Expo Go y no se sube a EAS porque está ignorado por Git. Cuando el Edge API
esté desplegado en AWS, su URL pública HTTPS se registrará por separado en el entorno `preview`:

No se debe usar la URL privada del Core, MongoDB o Redis. La compilación final queda pospuesta hasta contar con
esta URL. Si cambia después, es necesario generar un APK nuevo porque `EXPO_PUBLIC_API_URL` se incorpora al bundle.

### Generar e instalar el APK Android

El perfil `preview` de `app/eas.json` genera un APK de distribución interna, instalable directamente y sin Google
Play:

```powershell
cd app
npx.cmd eas-cli build -p android --profile preview
```

Al finalizar, EAS entrega un enlace o código QR para descargar el APK. Android puede pedir autorización para
instalar aplicaciones provenientes del navegador utilizado para descargarlo.

### Generar la aplicación iOS

iOS utiliza Apple Maps y no consulta `GOOGLE_MAPS_API_KEY`:

```powershell
cd app
npx.cmd eas-cli build -p ios --profile preview
```

Aunque no se publique en App Store, instalar una compilación interna en un iPhone físico requiere una membresía
activa de Apple Developer, registrar el dispositivo y firmar la aplicación mediante distribución Ad Hoc. EAS guía
el registro del dispositivo y la creación de los certificados durante el primer build. Un archivo iOS compilado no
puede instalarse libremente en cualquier iPhone como ocurre con un APK en Android.

Después de cambiar una API key, un identificador, un certificado o un plugin nativo hay que generar un binario
nuevo. Reiniciar Metro no actualiza la configuración nativa de una aplicación que ya fue compilada.

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

El catálogo de especies se encuentra en `mongo-init/seed/species.json`.

Al ejecutar `docker compose up`, el servicio temporal `mongo-seed` espera a que MongoDB esté disponible, sincroniza automáticamente el catálogo mediante `upsert` y finaliza. `core-api` arranca únicamente después de que esa carga termina correctamente. Esto funciona tanto para una base nueva como para un volumen ya existente y no genera duplicados.

Si se necesita repetir la importación manualmente con los servicios levantados, ejecutar desde la raíz del proyecto:

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

El resultado debe coincidir con la cantidad que informa el importador al finalizar (actualmente `691`).

## Verificación de correo al registrarse

El registro queda pendiente en Redis hasta que el usuario ingresa el código alfanumérico enviado por correo.
El código vence a los 5 minutos, admite hasta 5 intentos y cada reenvío invalida el código anterior.
MongoDB recibe al usuario y el Core emite los tokens solamente después de una verificación correcta.

### Envío del código por correo (Amazon SQS + Lambda + SES)

El Edge **no envía correo ni conoce credenciales de correo**. El Core genera el código, lo guarda (hasheado) en
Redis y publica un mensaje en la cola SQS `pokebo-demo-otp-email`; una Lambda (`workers/email-sender`) lo toma y
lo envía con Amazon SES desde `pokebouru@gmail.com`. Cada envío lleva un `deliveryId` y una marca en DynamoDB
evita enviarlo dos veces; si falla, se reintenta y, tras 5 intentos, queda en una cola de mensajes fallidos (DLQ).

Limitación del sandbox de SES: mientras la cuenta no salga del sandbox, SES **solo entrega a direcciones
verificadas** (SES > Identities). Para la demo están verificados los correos del equipo.

Variables del Core (ver `core-api/.env.example`): `AWS_REGION`, `OTP_EMAIL_QUEUE_URL` y `OTP_RESPONSE_MIN_MS`.

En desarrollo local con `docker compose`, el Core necesita esa cola y credenciales AWS para publicar el código,
así que el registro por correo no funciona sin ellas (modo de desarrollo pendiente de decidir).

En `core-api/.env` se recomienda definir un `REGISTRATION_CODE_PEPPER` largo y aleatorio, distinto de las
claves JWT y del `LOGIN_CODE_PEPPER`. Ya no existe un secreto compartido Edge-Core: el acceso al Core lo
restringen las reglas de red.

## Archivos de entorno

Todos los archivos `.env` reales están ignorados por Git. Los archivos importantes son:

| Archivo | Contenido | Sensibilidad |
|---------|-----------|--------------|
| `.env` | Credenciales de MongoDB y Redis utilizadas por Docker Compose. | Secreto |
| `core-api/.env` | Clave privada JWT, peppers de códigos, clave del proveedor de IA y conexiones internas. | Secreto crítico |
| `edge-api/.env` | Clave pública JWT y URL del Core. No contiene credenciales de datos, IA, correo ni push. | Configuración |
| `app/.env` | URL pública del Edge usada por Expo. | Configuración pública; nunca debe contener secretos |

Los archivos `.env.example` correspondientes documentan los nombres de las variables y son los únicos que
se pueden compartir o versionar sin cifrado.

## Despliegue en AWS

La demostración corre en AWS (`us-east-2`) con infraestructura como código en [`infra/`](./infra) (CDK v2, TypeScript).

- Arquitectura aprobada, decisiones y novedades de la implementación: [`AWS_MIGRATION_AGENT.md`](./AWS_MIGRATION_AGENT.md) (sección 19).
- Manual de operación (apagar y encender, reiniciar la app "de cero", backups, publicar versiones, diagnóstico y borrado):
  [`infra/README.md`](./infra/README.md).
- Resumen: Edge es lo único público (HTTPS con Caddy e IP elástica); Core, MongoDB y Redis son privados; el correo y el
  push salen por SQS + Lambda; los secretos viven en Secrets Manager.

## decisiones pokebo 11/11/26

se implementa notificación push para avistamientos cercanos mientras no se tiene la app en primer plano
	
	- Se guarda la última posición conocida del usuario por 5 minutos en Redis
	- Cuando surge un nuevo avistamiento
	- si matchea la posición en h3 del avistamiento con la ubicación última conocida del usuario (o algún hexágono vecino), se envía push

En AWS el push sale por Core → SQS → Lambda → FCM (solo Android por ahora). Se envía si el usuario tiene activos
`nearbyAlerts` y `pushEnabled` (la app activa ambos al aceptar "Avisos de cercanía") y al menos un token Android
registrado. Si FCM rechaza un token, la Lambda lo devuelve por una cola y el Core lo retira de MongoDB.

El radio de 2dsphere tiene un diámetro equivalente a los 7 hexágonos que componen la ubicación propia y sus vecinos (a definir)

El código de verificación se pide tanto al registrarse como iniciar sesión

al registrarse : evitamos que se creen cuentas solamente con poner un correo

al iniciar sesión: evitamos que alguien pueda ingresar si solamente tiene un user y una contraseña

	de igual forma, cerrar y abrir la app no impacta en un cierre la sesión, por lo que un usuario en un flujo de uso común, no tiene dobles verificaciones constantes
