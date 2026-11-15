// Tarea en segundo plano que avisa en qué celda H3 está el usuario (PUT /users/me/location) y muestra una
// notificación local si hay avistamientos cerca. Solo informa cuando CAMBIA de celda; si no cambió, no hay pedidos.
// Se importa desde App.js: TaskManager.defineTask tiene que ejecutarse al cargar la app, también cuando Android
// la despierta sin pantallas. Necesita un development build (no corre en Expo Go).
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import {
  clearCellState,
  loadCellState,
  saveCellState,
} from "../services/cellState";
import { getSession, loadSession } from "../services/session";
import { updateMyLocation } from "../services/users.service";
import { createLocationProcessor } from "../utils/locationProcessor";

export const LOCATION_TASK_NAME = "pokebo-location-task";
export const NEARBY_CHANNEL_ID = "nearby-sightings";

// Android: una lectura cada 150 m recorridos, con al menos 30 s entre una y otra.
// modificado para pruebas
const DISTANCE_INTERVAL_METERS = 50;
const MIN_TIME_INTERVAL_MS = 5 * 1000;

// Para que los avisos también se vean con la app abierta
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const processLocation = createLocationProcessor({
  loadState: loadCellState,
  saveState: saveCellState,
  report: updateMyLocation,
  notify: ({ title, body, data }) =>
    Notifications.scheduleNotificationAsync({
      content: { title, body, data, sound: "default" },
      trigger: { channelId: NEARBY_CHANNEL_ID },
    }),
});

// Las lecturas se procesan de a una: dos lecturas seguidas no deben informar la misma celda dos veces.
let queue = Promise.resolve();

async function handleLocations(locations) {
  const { latitude, longitude } = locations[locations.length - 1].coords;
  try {
    // La tarea puede arrancar en un contexto nuevo (app cerrada): la sesión se lee del almacenamiento seguro.
    if (!getSession()) await loadSession();
    if (!getSession()) {
      await stopBackgroundLocation();
      return;
    }
    await processLocation(latitude, longitude);
  } catch (cause) {
    if (cause?.code === "SESSION_ENDED") await stopBackgroundLocation();
    else console.warn("[locationTask]", cause?.code || cause?.message); // sin coordenadas en el log
  }
}

TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
  if (error) {
    console.warn("[locationTask]", error.message);
    return queue;
  }
  const locations = data?.locations;
  if (locations?.length) queue = queue.then(() => handleLocations(locations));
  return queue;
});

async function ensureNotificationChannel() {
  await Notifications.setNotificationChannelAsync(NEARBY_CHANNEL_ID, {
    name: "Avistamientos cercanos",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

// Empieza a seguir la ubicación en segundo plano. Hay que tener los permisos ya concedidos. Es idempotente.
let starting = null;
export function startBackgroundLocation() {
  if (!starting) {
    starting = (async () => {
      await ensureNotificationChannel();
      if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME))
        return;
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: DISTANCE_INTERVAL_METERS,
        timeInterval: MIN_TIME_INTERVAL_MS,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: "Pokebo",
          notificationBody: "Buscando avistamientos cerca de vos",
          killServiceOnDestroy: false, // sigue aunque se cierre la app desde recientes
        },
      });
    })().finally(() => {
      starting = null;
    });
  }
  return starting;
}

// Deja de seguir la ubicación y olvida la última celda.
export async function stopBackgroundLocation() {
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
  await clearCellState();
}
