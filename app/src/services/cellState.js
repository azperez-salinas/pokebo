import * as SecureStore from 'expo-secure-store';

// Última celda H3 informada al servidor: { current, previous, changedAt }. La lee la tarea en segundo plano,
// que corre sin pantallas, por eso vive en el almacenamiento seguro y no en memoria.
const KEY = 'pokebo.nearbyCell';
// En segundo plano el teléfono puede estar bloqueado: tiene que poder leerse después del primer desbloqueo.
const OPTIONS = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };

export async function loadCellState() {
  try {
    const raw = await SecureStore.getItemAsync(KEY, OPTIONS);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveCellState(state) {
  await SecureStore.setItemAsync(KEY, JSON.stringify(state), OPTIONS);
}

export async function clearCellState() {
  await SecureStore.deleteItemAsync(KEY, OPTIONS).catch(() => {});
}
