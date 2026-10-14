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


## 2026-10-14 — Auth: registro, login y cambio de contraseña

```text
Si el directorio actual no es un repositorio git o no corresponde a "pokebo", avisame y no hagas nada más.

Vas a implementar 3 endpoints de autenticación en core-api (y su forwarding real en edge-api, que hoy es un stub). Hacelo en 3 ramas separadas, una por requerimiento, mergeando cada una a sprint/01 antes de arrancar la siguiente (así cada rama parte ya con lo que dejó la anterior). Seguí el orden: primero registro, después login, después cambio de contraseña.

Reglas generales para las 3:
- Trabajá sobre lo que ya existe en el repo (rutas, controllers, services, modelos, middlewares) en vez de reescribirlo desde cero.
- Los mensajes de commit van CORTOS, sin explayarte: una línea tipo "feat(auth): registro de usuario" o "feat(auth): login" o "feat(auth): cambio de contraseña y verificación de JWT". Nada de bullets ni de explicar el detalle técnico en el commit.
- Al final de cada rama: commit, checkout a sprint/01, merge normal (no squash) de esa rama a sprint/01.
- No pushees a remoto en ningún momento, salvo que yo te lo pida después.
- Al terminar las 3 ramas, quedate parado en sprint/01.
- Actualizá prompts.md en la raíz del repo agregando una entrada nueva con la fecha de hoy, título "Auth: registro, login y cambio de contraseña", y pegá este prompt completo tal cual.

Decisiones ya tomadas (no me preguntes esto, implementalo así):
- Login recibe SOLO username y password. No recibe los demás campos del perfil.
- Si el username ya existe al registrarse, se responde 409 Conflict con { code: "USERNAME_TAKEN", message: "..." }. No hay sugerencia de usernames alternativos.
- Los avatares son predefinidos: el cliente elige un código de una lista fija (ej. "avatar_1" a "avatar_6"), no se sube ningún archivo para el avatar. Si más adelante se agrega foto de perfil personalizada (fuera de este alcance), sería un campo aparte usando GridFS.
- El refresh token se guarda en Redis con TTL, y revisar/renovarlo es responsabilidad de esta misma persona (vos), pero el endpoint de refresh (/auth/refresh) NO es parte de este trabajo todavía — dejalo igual que está (stub), solo preparate la base de Redis para que el que lo implemente después (podés ser vos mismo en otra tarea) tenga el terreno armado.

====================
RAMA 1: feature/auth-registro (desde sprint/01)
====================

Instalar en core-api (actualizar package.json y package-lock.json):
- bcrypt (hash de contraseña)
- jsonwebtoken (firma/verificación de JWT con RS256)
- joi (validación de datos de entrada)

Generar un par de claves RSA para firmar JWT (si no existe ya ninguna):
- Generar con openssl (o el método que prefieras) una clave privada y su pública.
- Guardarlas en core-api/.env y en edge-api/.env (la privada SOLO en core-api/.env, la pública en ambos), como valores reales reemplazando los placeholders que ya están en JWT_PRIVATE_KEY / JWT_PUBLIC_KEY de los .env.example. Recordá que .env está en .gitignore, así que esto no se commitea; dejá los .env.example como están (son solo plantillas).
- Documentá en un comentario en core-api/src/config/index.js cómo se regeneran si hiciera falta.

Modificar core-api/src/models/User.model.js:
- Agregar campo bio: String, con límite de caracteres (ej. maxlength: 160), opcional.
- Reemplazar el campo avatarId (ObjectId) por avatar: String, con enum de códigos predefinidos (ej. ['avatar_1','avatar_2','avatar_3','avatar_4','avatar_5','avatar_6']) y default 'avatar_1'.
- Confirmar que username ya tiene unique: true (ya lo tiene, no lo dupliques).
- dateOfBirth se graba en el registro y después nunca se vuelve a modificar por ningún endpoint (no hace falta lógica extra para esto, simplemente no expongas forma de cambiarlo).

Implementar core-api/src/validators/auth.validator.js → función/schema register (con Joi):
- fullname: string requerido
- username: string requerido
- dateOfBirth: fecha requerida (debe resultar en un usuario mayor a una edad mínima razonable si querés agregarlo, si no, solo validar que sea fecha válida y no futura)
- bio: string opcional, mismo límite de caracteres que el modelo
- avatar: string opcional, debe ser uno de los códigos predefinidos
- password: string requerido, largo mínimo razonable (ej. 8 caracteres)

Implementar core-api/src/services/auth.service.js → register(data):
- Verificar si username ya existe → si existe, lanzar un error que el controller traduzca a 409 { code: "USERNAME_TAKEN" }
- Hashear password con bcrypt
- Crear el User con los campos recibidos
- Generar un access token JWT (RS256, firmado con JWT_PRIVATE_KEY) con expiración corta (ej. 15 minutos) y un refresh token (JWT o id random, a tu criterio) con expiración larga (ej. 30 días)
- Guardar el refresh token en Redis (key tipo refresh:<userId>:<jti>, value con datos mínimos, TTL igual a la expiración del refresh)
- Devolver { user (sin passwordHash), accessToken, refreshToken }

Conectar todo:
- core-api/src/controllers/auth.controller.js: reemplazar el stub de register para llamar a auth.service.register, devolver 201 con el resultado, y manejar el error de username duplicado con 409
- core-api/src/routes/auth.routes.js: pasar el body por el validator antes del controller
- edge-api: implementar edge-api/src/services/forward.service.js de forma genérica (reenvía método + path + body + headers relevantes hacia CORE_API_URL, firmando con SERVICE_SHARED_SECRET vía HMAC en un header, por ejemplo X-Service-Signature) y conectar edge-api/src/routes/auth.routes.js para que POST /register use ese forwarder en vez del notImplemented
- core-api/src/middlewares/serviceAuth.middleware.js: implementar la verificación real de esa firma HMAC (recalcula con SERVICE_SHARED_SECRET y compara; si no coincide, 401) y aplicarlo en core-api/src/routes/auth.routes.js para la ruta /register

Commit corto. Merge a sprint/01.

====================
RAMA 2: feature/auth-login (desde sprint/01 ya actualizado)
====================

Implementar core-api/src/validators/auth.validator.js → función/schema login:
- username: string requerido
- password: string requerido
(nada más)

Implementar core-api/src/services/auth.service.js → login(credentials):
- Buscar User por username, si no existe responder 401 genérico (no reveles si el username existe o no, por seguridad: mismo mensaje que si la contraseña está mal)
- Comparar password con bcrypt contra passwordHash
- Si es válido: generar access + refresh token igual que en register, guardar refresh en Redis, actualizar lastLoginAt
- Devolver { user (sin passwordHash), accessToken, refreshToken }

Conectar:
- core-api/src/controllers/auth.controller.js: reemplazar el stub de login
- core-api/src/routes/auth.routes.js: pasar por el validator, y por serviceAuth.middleware (ya existe desde la rama anterior)
- edge-api/src/routes/auth.routes.js: conectar POST /login al forwarder (ya existe desde la rama anterior)

Commit corto. Merge a sprint/01.

====================
RAMA 3: feature/auth-cambio-password (desde sprint/01 ya actualizado)
====================

Implementar la verificación real de JWT (hoy es un stub que solo llama a next()):
- core-api/src/middlewares/auth.middleware.js: leer el access token del header Authorization (Bearer), verificarlo con JWT_PUBLIC_KEY (RS256), si es inválido o expiró responder 401, si es válido dejar el usuario (al menos su id) en req.user
- edge-api/src/middlewares/auth.middleware.js: misma verificación con la misma clave pública (el Edge también valida, no confía ciegamente en que todo pedido autenticado ya fue filtrado)

Agregar el endpoint de cambio de contraseña (no existe todavía, crealo):
- Ruta nueva PUT /api/v1/auth/password en core-api/src/routes/auth.routes.js, protegida por auth.middleware y serviceAuth.middleware
- Misma ruta espejo en edge-api/src/routes/auth.routes.js, protegida por appVersion, auth.middleware y rateLimit, conectada al forwarder
- Validator en auth.validator.js → changePassword: currentPassword (string requerido), newPassword (string requerido, mismo mínimo de caracteres que en registro)
- Service en auth.service.js → changePassword(userId, currentPassword, newPassword): buscar el User por userId (de req.user), comparar currentPassword con bcrypt contra el hash guardado (si no coincide, 401 { code: "INVALID_CURRENT_PASSWORD" }), hashear newPassword y guardar
- Controller: responder 200 { message: "Contraseña actualizada" } sin devolver ningún token nuevo

Commit corto. Merge a sprint/01.

====================
Al terminar
====================

Mostrame:
1. git log --oneline --graph de las 3 ramas y el resultado final en sprint/01
2. Confirmación de que estás parado en sprint/01 con todo mergeado
3. Lista de variables de entorno que agregaste o cambiaste en los .env (sin mostrar los valores reales de las claves, solo los nombres)
4. Cualquier supuesto que hayas tenido que tomar por tu cuenta, para que yo lo revise
```


## 2026-10-14 — Fix: refresh stub, serviceAuth duplicado y prueba en Docker

```text
Si el directorio actual no es un repositorio git o no corresponde a "pokebo", avisame y no hagas nada más.

Docker Desktop ya está corriendo. Hacé esto en una rama nueva feature/fix-auth-refresh-y-bcrypt desde sprint/01, con commits cortos (una línea, sin explayarte), merge normal (--no-ff) a sprint/01 al final, sin pushear a remoto.

1. POST /refresh en core-api (core-api/src/routes/auth.routes.js): hoy tiene auth.middleware delante, lo que lo rompe porque auth.service.refresh() sigue sin implementar y revienta con un error no controlado (probablemente sale como 500 en vez de un 501 limpio). Devolvé esa ruta al comportamiento de stub simple: sacale el middleware auth y el validate, y que el controller responda directamente 501 { code: "NOT_IMPLEMENTED", message: "TODO" }, igual que estaba antes de la rama de auth. Dejá un comentario arriba de la ruta explicando que se revierte a stub a propósito hasta que alguien implemente el refresh de verdad (con Redis vía token.service.js, que ya existe y tiene findRefreshToken/revokeRefreshToken listos para usar).

2. serviceAuth duplicado: está montado global en core-api/src/app.js para todo /api/v1, y además puesto explícitamente en cada ruta de core-api/src/routes/auth.routes.js. El middleware ya se protege con req.serviceAuthenticated para no recalcular la firma dos veces, así que funciona, pero es redundante y confunde a quien lea el código. Sacalo de auth.routes.js (dejalo solo montado global en app.js) y confirmá que las demás rutas (users, species, captures, map, achievements, notifications) NO lo tengan repetido tampoco.

3. Agregar JWT_PUBLIC_KEY a core-api/.env.example (hoy falta esa variable en la plantilla, aunque el código ya la puede derivar de la privada). Agregala con el mismo formato que JWT_PRIVATE_KEY (placeholder entre comillas, con un comentario arriba explicando que es la clave pública correspondiente).

4. Probar de verdad con Docker, ahora que está levantado:
   - docker compose build (sin cache si hace falta) y fijate en particular que bcrypt compile bien en la imagen de core-api (node:20-alpine u otra base, la que esté en el Dockerfile) — esto es lo más importante a confirmar, porque bcrypt compila un binario nativo y puede fallar en Linux/Alpine aunque funcione en Windows.
   - docker compose up -d
   - Esperar a que mongo, redis, core-api y edge-api estén healthy/arriba (docker compose ps)
   - Pegarle con curl (o el cliente que prefieras) a través del Edge (no directo al Core) a estos casos, y mostrame el resultado de cada uno:
     a) POST /api/v1/auth/register con datos válidos → esperar 201
     b) POST /api/v1/auth/register repitiendo el mismo username → esperar 409 USERNAME_TAKEN
     c) POST /api/v1/auth/login con usuario/contraseña correctos → esperar 200 con accessToken y refreshToken
     d) POST /api/v1/auth/login con contraseña incorrecta → esperar 401 INVALID_CREDENTIALS
     e) PUT /api/v1/auth/password sin Authorization header → esperar 401
     f) PUT /api/v1/auth/password con el accessToken del login y la contraseña actual correcta → esperar 200, y después confirmar que un login con la contraseña vieja ya da 401 y con la nueva da 200
     g) POST /api/v1/auth/refresh (para confirmar que después del punto 1 vuelve a responder 501 limpio, no 500)
   - docker compose logs core-api --tail=50 y docker compose logs edge-api --tail=50, pegame cualquier error o warning que aparezca durante estas pruebas (no solo si falla, también si hay warnings raros)
   - docker compose down al terminar

Al final: actualizá prompts.md con una entrada nueva (fecha de hoy, título "Fix: refresh stub, serviceAuth duplicado y prueba en Docker") pegando este prompt completo. Confirmame que quedaste en sprint/01 con todo mergeado, y pegame los resultados reales de cada prueba (a-g) y de los logs, no un resumen de que "todo salió bien" — quiero ver las respuestas HTTP concretas (status code y body) de cada una.
```


## 2026-10-14 — Auth: refresh token con rotación

```text
Estás en el repo pokebo, rama sprint/01 actualizada y limpia. Implementá POST /refresh de verdad (Core + Edge) con rotación de refresh tokens, y aprovechá para revocar los refresh tokens existentes cuando se cambia la contraseña.

Contexto que ya existe y no hay que tocar:
- core-api/src/services/token.service.js ya tiene signAccessToken, signRefreshToken, verifyToken, storeRefreshToken, findRefreshToken, revokeRefreshToken, issueTokens. Las claves en Redis son refresh:<userId>:<jti>.
- Los JWT son RS256. El access token lleva type: 'access'. El refresh lleva type: 'refresh' y jti.
- core-api/src/routes/auth.routes.js tiene POST /refresh montado sin middlewares (solo controller.refresh), con un comentario que dice que está así a propósito hasta implementar esto.
- edge-api/src/routes/auth.routes.js tiene POST /refresh con appVersion, auth, rateLimit, notImplemented.
- serviceAuth ya está montado global en core-api/src/app.js para todo /api/v1, no hace falta agregarlo por ruta.

Trabajá en una sola rama: feature/auth-refresh-token, creada desde sprint/01.

1. Validator
   En core-api/src/validators/auth.validator.js agregá un schema refresh que exija refreshToken (string, requerido). No toques los demás schemas.

2. Core: lógica de refresh (rotación)
   En core-api/src/services/auth.service.js reemplazá el refresh(refreshToken) actual (que tira "not implemented") por esto:
   - Verificar el token con token.service.verifyToken. Si falla (inválido o expirado) o si payload.type !== 'refresh', tirar AppError(401, 'INVALID_REFRESH_TOKEN', ...).
   - Buscar en Redis con findRefreshToken(payload.sub, payload.jti). Si no existe (ya usado, revocado, o vencido), tirar el mismo AppError(401, 'INVALID_REFRESH_TOKEN', ...). No distingas el motivo en la respuesta, para no dar pistas.
   - Buscar el User por payload.sub. Si no existe, AppError(404, 'USER_NOT_FOUND', ...).
   - Revocar el refresh token viejo con revokeRefreshToken(payload.sub, payload.jti) (rotación: un refresh token usado no sirve una segunda vez).
   - Emitir tokens nuevos con issueTokens(user) y devolver lo mismo que devuelven register/login (access, refresh, y el usuario con toPublicUser si corresponde — fijate cómo lo hacen esas funciones y seguí el mismo patrón).

3. Core: ruta
   En core-api/src/routes/auth.routes.js, cambiá la línea de /refresh a:
     router.post('/refresh', validate(schemas.refresh), controller.refresh);
   Sacá el comentario que decía que estaba pendiente. No le pongas el middleware auth (el usuario no tiene access token válido en este punto, por eso pide refresh).

4. Core: controller
   En core-api/src/controllers/auth.controller.js, el método refresh ya debe existir como stub 501 — reemplazalo para que tome req.body.refreshToken, llame a authService.refresh(...) y devuelva 200 con el resultado, con el mismo manejo de errores (next(err) o como estén haciendo los demás métodos del controller) que usan register/login/changePassword.

5. Core: revocar refresh tokens al cambiar contraseña
   En core-api/src/services/token.service.js agregá una función revokeAllRefreshTokens(userId) que borre todas las claves refresh:<userId>:* en Redis (con SCAN, no KEYS, para no bloquear). En auth.service.js, al final de changePassword (después de guardar la nueva contraseña), llamá a revokeAllRefreshTokens(user._id) para que las sesiones viejas queden inválidas.

6. Edge: wire real
   En edge-api/src/routes/auth.routes.js cambiá la línea de /refresh a:
     router.post('/refresh', appVersion, rateLimit, forward);
   Sacá el middleware auth (no tiene sentido pedir un access token válido para renovarlo) y reemplazá notImplemented por forward, igual que están armadas /register y /login.

7. Tests
   Si ya existe algún test (mockeado o no) para register/login/changePassword, agregá casos equivalentes para /refresh: refresh válido devuelve 200 con tokens nuevos; usar el mismo refresh token dos veces devuelve 401 la segunda vez (por la rotación); un refresh token con type: 'access' (mandar un access token donde va el refresh) devuelve 401; un refresh token de un usuario que ya no existe devuelve 404; después de un changePassword exitoso, un refresh token emitido antes del cambio deja de servir (401).

Git:
- Una sola rama feature/auth-refresh-token desde sprint/01.
- Commits cortos y en español, sin explayarse, por ejemplo: "feat(auth): rotación de refresh token" y "feat(auth): revocar refresh tokens al cambiar password" (podés separarlos en 2 commits o dejarlo en uno, como prefieras, pero sin mezclar con otra cosa).
- Al terminar, merge --no-ff de feature/auth-refresh-token a sprint/01.
- Agregá una entrada nueva a prompts.md en la raíz del repo con la fecha de hoy, un título corto, y el texto completo de este prompt. Commit aparte para eso: "docs: agregar prompt de refresh token a prompts.md". Mergealo también a sprint/01 con --no-ff.
- No hagas push a origin bajo ninguna circunstancia.

Al final contame: en qué rama quedaste, el grafo de commits resultante, qué tests corriste y con qué resultado, y cualquier supuesto que hayas tenido que tomar.
```


## 2026-10-14 — Auth: recuperación de contraseña por mail

```text
Estás en el repo pokebo, rama sprint/01 actualizada y limpia. Implementá un flujo de "olvidé mi contraseña" (Core + Edge), separado del cambio de contraseña que ya existe, con un código de 6 dígitos que se manda por mail. El email pasa a ser obligatorio.

1. Modelo
   En core-api/src/models/User.model.js, el campo email pasa de opcional/sparse a required: true, unique: true (sin sparse). No toques los demás campos.

2. Validators
   En core-api/src/validators/auth.validator.js:
   - En el schema register, agregá email: Joi.string().email().required() (hoy no está, porque el registro no lo pedía).
   - Agregá un schema forgotPassword con usernameOrEmail: Joi.string().required().
   - Agregá un schema resetPassword con usernameOrEmail: Joi.string().required(), code: Joi.string().length(6).pattern(/^[0-9]+$/).required(), newPassword: Joi.string().min(PASSWORD_MIN_LENGTH).required().

3. Servicio de mail (mockeado)
   Creá core-api/src/services/mail.service.js con una función sendPasswordResetCode(email, code) que por ahora solo hace console.log con un mensaje claro tipo [MAIL MOCK] Código de recuperación para <email>: <code>. Agregá un comentario arriba explicando que esto es un mock para desarrollo/demo y que en producción debería reemplazarse por un proveedor real (ej. Resend, Nodemailer con SMTP), dejando un env var MAIL_PROVIDER=console como único valor soportado por ahora. No instales ninguna librería de mail de verdad.

4. Core: lógica de negocio
   En core-api/src/services/auth.service.js:
   - En register, si el email ya existe tirá AppError(409, 'EMAIL_TAKEN', 'El email ya está en uso'), de forma análoga a usernameTaken. Si el error de Mongo es un duplicado (code 11000), fijate en error.keyPattern o error.keyValue para devolver USERNAME_TAKEN o EMAIL_TAKEN según corresponda.
   - Agregá forgotPassword(usernameOrEmail):
     * Buscá el usuario por username o por email (User.findOne({ $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }] })).
     * Si no existe, no hagas nada más (no tires error, no reveles si existe o no la cuenta).
     * Si existe, generá un código de 6 dígitos con crypto.randomInt(0, 1000000) (formateado con padStart a 6 dígitos), guardá en Redis la key pwreset:<userId> con { hash: sha256(code), attempts: 0 } y TTL de 15 minutos, y llamá a mailService.sendPasswordResetCode(user.email, code).
     * La función siempre devuelve algo genérico como { message: 'Si la cuenta existe, se envió un código al mail asociado' }, exista o no el usuario, para no filtrar qué cuentas existen.
   - Agregá resetPassword(usernameOrEmail, code, newPassword):
     * Buscá el usuario igual que en forgotPassword.
     * Mismo error genérico AppError(401, 'INVALID_RESET_CODE', 'Código inválido o expirado') tanto si el usuario no existe, como si no hay código pendiente en Redis, como si el código no coincide, como si ya se gastaron los intentos. No distingas el motivo en la respuesta.
     * Si hay un código pendiente: comparar sha256(code) recibido contra el hash guardado con crypto.timingSafeEqual (convirtiendo ambos a Buffer). Si no coincide, incrementar attempts en Redis; si attempts llega a 5, borrar la key (invalidar el código) y tirar el error. Si coincide: hashear newPassword con bcrypt, guardarla, borrar la key de Redis del código, y llamar a revokeAllRefreshTokens(user._id) (ya existe en token.service.js) para cortar todas las sesiones viejas.

5. Core: rutas y controller
   En core-api/src/routes/auth.routes.js agregá:
     router.post('/forgot-password', validate(schemas.forgotPassword), controller.forgotPassword);
     router.post('/reset-password', validate(schemas.resetPassword), controller.resetPassword);
   Sin auth (el usuario no está logueado en este flujo). En core-api/src/controllers/auth.controller.js agregá forgotPassword y resetPassword siguiendo el mismo patrón try/catch/next que los demás métodos, devolviendo 200 con el resultado del service.

6. Edge
   En edge-api/src/routes/auth.routes.js agregá, igual que register/login (sin auth):
     router.post('/forgot-password', appVersion, rateLimit, forward);
     router.post('/reset-password', appVersion, rateLimit, forward);

7. Env
   En core-api/.env.example agregá una línea MAIL_PROVIDER=console con un comentario corto explicando que es el único valor soportado por ahora y que en producción se reemplazaría por un proveedor real.

8. Tests
   Si existe el smoke test del scratchpad que vienen usando para register/login/password/refresh, agregá ahí casos para este flujo: forgot-password con usuario existente genera código y llama al mail mock (podés verificar indirectamente leyendo la key de Redis); forgot-password con usuario inexistente devuelve el mismo mensaje genérico y no crea nada en Redis; reset-password con código correcto cambia la contraseña y permite loguear con la nueva; reset-password con código incorrecto da 401 INVALID_RESET_CODE; reset-password después de 5 intentos fallidos invalida el código aunque después se mande el correcto; reset-password con código vencido (TTL pasado, podés simularlo borrando la key a mano en el test) da 401; después de un reset exitoso, los refresh tokens emitidos antes quedan inválidos (401 al usarlos), igual que en change-password.

Git:
- Una sola rama feature/auth-recuperar-password desde sprint/01.
- Commits cortos en español, por ejemplo "feat(auth): recuperación de contraseña por código de mail" (podés separar en más de uno si mezclás cosas muy distintas, pero sin alargarte en los mensajes).
- Al terminar, merge --no-ff de feature/auth-recuperar-password a sprint/01.
- Agregá una entrada a prompts.md con la fecha de hoy, un título corto, y el texto completo de este prompt. Commit aparte: "docs: agregar prompt de recuperación de contraseña a prompts.md". Mergealo también con --no-ff.
- A diferencia de las veces anteriores, esta vez SÍ hacé push: git push origin sprint/01, al final, después de los dos merges.

Al final contame: en qué rama quedaste, el grafo de commits resultante, si el push salió bien, qué tests corriste y con qué resultado, y cualquier supuesto que hayas tenido que tomar (en especial si había usuarios de prueba sin email en la base que rompan la validación required).
```
