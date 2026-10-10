# Historial de prompts

## 2026-10-07 — Esqueleto base del proyecto

```text
Trabajá sobre el repositorio actual (pokebo). Este es un esqueleto inicial: solo estructura de carpetas, archivos vacíos o con stubs mínimos, y endpoints que respondan 501 "Not implemented" o un placeholder. NO implementes lógica de negocio real, NO conectes a bases de datos de verdad, NO instales dependencias que no sean las imprescindibles para que cada proyecto arranque.

0. Git: ramas antes de tocar nada
1. git pull (rama principal, la que esté trackeada)
2. Crear y pasar a la rama sprint/01 desde la principal
3. Crear y pasar a la rama feature/esqueleto-base desde sprint/01
4. Hacé TODO el trabajo de este prompt en feature/esqueleto-base
5. Al terminar: commit(s) descriptivos, merge de feature/esqueleto-base dentro de sprint/01 (merge normal, no squash), y quedate parado en sprint/01 al final
6. No pushees a remoto salvo que yo te lo pida explícitamente después

0.1 prompts.md
Creá (o si ya existe, actualizá) un archivo prompts.md en la raíz del repo. Al final de tu trabajo, agregale una entrada con fecha de hoy, un título corto ("Esqueleto base del proyecto"), y pegá el prompt completo que te acabo de dar (este mismo texto, desde "Trabajá sobre el repositorio actual" hasta el final de la sección "Al terminar"). Este archivo lo vamos a ir usando como historial de los prompts que usemos en el proyecto, así que dejalo con un formato simple tipo encabezado con fecha y título corto, y el prompt usado debajo tal cual se envió.

Contexto de arquitectura
El sistema son 3 proyectos independientes, cada uno con su propio package.json y Dockerfile:
- /app          → cliente React Native
- /edge-api     → corre en la DMZ, es lo único con salida a internet
- /core-api     → corre en la red segura, lógica de negocio, Mongo+Redis

El Edge API es un proxy/gateway: verifica versión de la app, verifica el JWT con la clave PÚBLICA, aplica rate limiting, reenvía al Core firmando con un secreto compartido, y es el único que llama a la IA de identificación y al servicio de push (FCM/APNs). El Core API nunca tiene salida a internet: solo habla con MongoDB, Redis, y con el Edge (que le llega firmado). El Core firma los JWT con la clave PRIVADA.

1. /edge-api
Estructura:
/edge-api
  /src
    /routes          auth.routes.js, captures.routes.js, species.routes.js, map.routes.js, achievements.routes.js, notifications.routes.js, users.routes.js, appConfig.routes.js
    /middlewares      appVersion.middleware.js, auth.middleware.js, rateLimit.middleware.js, error.middleware.js
    /services         ai.service.js, push.service.js, forward.service.js
    /config           index.js (lee variables de entorno, no las hardcodees)
    /utils            errors.js (clase de error común)
    app.js
    server.js
  .env.example
  Dockerfile
  package.json

- Cada route monta los middlewares en el orden correcto (appVersion → auth → rateLimit → el resto) pero el handler final de cada endpoint solo responde algo tipo: res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'TODO' })
- Los endpoints /auth/register y /auth/login NO pasan por auth.middleware.js
- forward.service.js: función reenviarACore(path, metodo, body) con un TODO adentro, sin lógica real todavía
- ai.service.js y push.service.js: funciones exportadas con el nombre esperado pero vacías (throw new Error('not implemented') o similar)
- .env.example con las variables que va a necesitar (claves de ejemplo, nunca valores reales): JWT_PUBLIC_KEY, SERVICE_SHARED_SECRET, AI_PROVIDER_API_KEY, FIREBASE_CREDENTIALS, CORE_API_URL, PORT

Endpoints a crear como stub (mismo path que ve el cliente):
- POST   /api/v1/auth/register
- POST   /api/v1/auth/login
- POST   /api/v1/auth/refresh
- GET    /api/v1/users/me
- PUT    /api/v1/users/me/location
- GET    /api/v1/species
- GET    /api/v1/species/:id
- POST   /api/v1/captures
- GET    /api/v1/captures/me
- GET    /api/v1/map/sightings
- GET    /api/v1/achievements
- GET    /api/v1/notifications
- GET    /api/app-config   (sin /v1, resuelto localmente en el Edge, no reenvía al Core)

2. /core-api
Estructura:
/core-api
  /src
    /routes           mismos recursos que el Edge, menos /app-config
    /controllers       un archivo por recurso
    /services          auth.service.js, users.service.js, location.service.js, species.service.js, captures.service.js, sightings.service.js, achievements.service.js, notifications.service.js
    /models            User.model.js, Species.model.js, Capture.model.js, Sighting.model.js, Achievement.model.js, UserAchievement.model.js, Notification.model.js
    /middlewares       serviceAuth.middleware.js, auth.middleware.js, validate.middleware.js, error.middleware.js
    /validators        auth.validator.js, species.validator.js, captures.validator.js, map.validator.js
    /config            index.js, mongo.js (conexión, sin credenciales reales), redis.js (conexión, sin credenciales reales)
    /utils             errors.js
    app.js
    server.js
  .env.example
  Dockerfile
  package.json

- Cada modelo: solo el schema de Mongoose con los campos (según el documento de diseño, sección Modelo de datos), SIN métodos de negocio
- Cada controller: handler que responde 501, igual que en el Edge
- serviceAuth.middleware.js: stub que por ahora deja pasar todo (TODO: verificar firma HMAC con SERVICE_SHARED_SECRET)
- auth.middleware.js: stub que por ahora deja pasar todo (TODO: verificar JWT con clave pública)
- location.service.js: funciones vacías para manejar H3 + Redis (sin modelo Mongoose, es solo Redis)
- .env.example con: JWT_PRIVATE_KEY, SERVICE_SHARED_SECRET, MONGO_URI, REDIS_URI, PORT

Mismos endpoints que el Edge (sin /app-config), bajo /api/v1.

3. /app (React Native)
Solo la estructura de carpetas, sin pantallas funcionales:
/app
  /src
    /screens        LoginScreen.js, RegisterScreen.js, MapScreen.js, CameraScreen.js, CaptureResultScreen.js, MyCapturesScreen.js, EncyclopediaScreen.js, SpeciesDetailScreen.js, ProfileScreen.js, AchievementsScreen.js, NotificationsScreen.js
    /components      (vacía, con un .gitkeep)
    /navigation      index.js (stub)
    /services        api.js, auth.service.js, users.service.js, species.service.js, captures.service.js, map.service.js, achievements.service.js, notifications.service.js
    /store           authStore.js (stub)
    /tasks           locationTask.js (stub)
    /hooks           useAuth.js, useLocation.js, useCamera.js (stubs)
    /config          index.js (URL de API por ambiente)
    /assets          (vacía, con un .gitkeep)
  App.js             placeholder mínimo que renderiza un texto
  package.json

Cada screen es un componente funcional vacío que renderiza solo el nombre de la pantalla, nada más. No instales navegación real todavía, dejá navigation/index.js como un archivo con un TODO.

4. Docker Compose para desarrollo local
Un docker-compose.yml en la raíz que levante edge-api, core-api, mongo y redis con las redes dmz y secure como se describe en la sección de Despliegue del documento (mongo y redis sin puertos publicados hacia afuera, solo visibles en la red secure).

5. Raíz del repo
- README.md corto: qué es cada carpeta, cómo levantar todo con docker-compose, y que esto es un esqueleto sin lógica implementada
- .gitignore global (node_modules, .env, builds)

Al terminar
Mostrame el árbol de carpetas final (tree o equivalente) y la lista de archivos creados, confirmame que estás parado en sprint/01 con el merge ya hecho, y decime qué falta decidir o que dejaste con TODO explícito.
```


## 2026-10-10 — Modelos de MongoDB con Mongoose

```text
Necesito definir los modelos de MongoDB utilizando Mongoose para el backend de Pokebo, la aplicación de captura e identificación de especies animales.

Los modelos son User, Species, Capture, Sighting, Achievement, UserAchievement y Notification.

Definí los esquemas con sus campos, tipos de datos, referencias entre entidades, restricciones e índices necesarios. Utilizá ObjectId para las relaciones entre documentos y para referenciar las imágenes almacenadas en GridFS.

Cada modelo debe estar separado en su propio archivo JavaScript y exportarse utilizando mongoose.model().
```


## 2026-10-10 — Conexión a MongoDB

```text
Necesito configurar la conexión de Core API a MongoDB utilizando Mongoose.

La URI de conexión debe obtenerse desde la configuración del proyecto mediante MONGO_URI, sin incluir credenciales directamente en el código.

Creá un archivo config/mongo.js que exporte una función asíncrona connectMongo(), encargada de establecer la conexión a la base de datos y de gestionar eventos de conexión y reintentos.
```


## 2026-10-10 — Configuración de GridFS

```text
Hay que configurar GridFS para almacenar imágenes en MongoDB dentro de Core API.

Utilizá GridFSBucket del driver de MongoDB y reutilizá la conexión que ya establece Mongoose.

Creá un archivo config/gridfs.js con una función initGridFS() para inicializar el bucket y una función getGridFSBucket() para acceder a él desde otros módulos.

La inicialización debe realizarse después de que MongoDB se haya conectado correctamente.
```


## 2026-10-10 — Conexión a Redis

```text
Configurar la conexión de Core API a Redis utilizando Node.js.

La URI debe obtenerse desde REDIS_URI mediante el archivo de configuración del proyecto.

Creá config/redis.js utilizando el paquete redis, con una función asíncrona connectRedis() y un cliente reutilizable para las futuras operaciones.

Incluir el manejo de eventos de error y exportá tanto la función de conexión como el cliente.
```
