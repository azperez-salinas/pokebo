// Parámetros del mapa, para ajustarlos en un solo lugar.
// La resolución H3 (tamaño del hexágono) vive en utils/h3.js: tiene que ser la misma que usa el Core.

// Anillos de hexágonos vecinos que el usuario puede ver además del suyo. Es también el alcance de los avistamientos.
// Con hexágonos de ~28 m: 1 = su hexágono + 6 vecinos (~50 m); 2 = ~100 m. El Core acepta de 1 a 2.
export const RING_K = 2;

// true: el mapa no se puede arrastrar y la cámara sigue al usuario (solo se puede acercar y alejar).
// false: se puede arrastrar, pero sin salir de la zona permitida.
export const LOCK_MAP_MOVEMENT = true;

// Solo iOS (Apple Maps): ángulo de visión vertical de la cámara, que se usa para pasar el alejamiento máximo
// a distancia de cámara. Si en un iPhone se ve más o menos zona de la esperada al alejar, ajustar este valor.
export const IOS_CAMERA_FOV_DEGREES = 30;

// Duración de la animación con la que la cámara sigue al usuario cuando se mueve (ms).
export const FOLLOW_ANIMATION_MS = 300;

// Encuadre inicial: 1 hace que el hexágono del usuario ocupe justo el ancho de la pantalla; más de 1 deja margen.
export const HEX_FIT_FACTOR = 1.05;

// Alejamiento máximo: 1 hace que el hexágono + vecinos ocupe justo el ancho de la pantalla.
export const RING_FIT_FACTOR = 1;

// Cada cuánto se actualizan los avistamientos con el mapa abierto (ms).
export const SIGHTINGS_REFRESH_MS = 45000;

// Cada cuántos metros se recalcula el hexágono del usuario con el mapa abierto.
export const WATCH_DISTANCE_METERS = 5;

// Duración de la animación al centrar el mapa con el botón de GPS (ms).
export const RECENTER_ANIMATION_MS = 600;

// Sin ubicación, el mapa arranca en Montevideo.
export const FALLBACK_REGION = { latitude: -34.9011, longitude: -56.1645, latitudeDelta: 0.08, longitudeDelta: 0.08 };
