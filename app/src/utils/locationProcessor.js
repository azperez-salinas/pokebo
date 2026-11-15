// Qué pasa con cada lectura de ubicación en segundo plano. Sin React Native: las dependencias se inyectan
// (así se prueba en node) y locationTask.js las conecta con SecureStore, la API y las notificaciones.
import { decideCellChange } from './cellTracker.js';
import { buildNearbyNotification } from './nearbyNotification.js';
import { cellOf } from './h3.js';

// deps: { loadState(), saveState(state), report(h3Index) -> { nearby }, notify(notification), now() }
export function createLocationProcessor({ loadState, saveState, report, notify, now = Date.now }) {
  return async function processLocation(lat, lng) {
    const cell = cellOf(lat, lng);
    const { action, next } = decideCellChange(await loadState(), cell, now());
    if (action !== 'report') return { action, nearby: [] };

    // Si el pedido falla, el estado no avanza: la próxima lectura lo reintenta.
    const result = await report(cell);
    await saveState(next);

    const nearby = result?.nearby ?? [];
    const notification = buildNearbyNotification(nearby);
    if (notification) await notify(notification);
    return { action, nearby };
  };
}
