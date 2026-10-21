import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';

// Ubicación en PRIMER PLANO (permiso "mientras se usa"). La de segundo plano vive en tasks/locationTask.js.
export default function useLocation() {
  const [permission, setPermission] = useState(null);

  useEffect(() => {
    Location.getForegroundPermissionsAsync().then(setPermission).catch(() => setPermission(null));
  }, []);

  const requestPermission = useCallback(async () => {
    const response = await Location.requestForegroundPermissionsAsync();
    setPermission(response);
    return response;
  }, []);

  // Pide el permiso si hace falta y devuelve { lat, lng }. Lanza un error con code si no se puede.
  const getCurrentPosition = useCallback(async () => {
    let response = await Location.getForegroundPermissionsAsync();
    if (!response.granted && response.canAskAgain) response = await Location.requestForegroundPermissionsAsync();
    setPermission(response);
    if (!response.granted) {
      throw Object.assign(new Error('Necesitamos tu ubicación para registrar dónde viste al animal.'), { code: 'LOCATION_DENIED' });
    }

    try {
      const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return { lat: coords.latitude, lng: coords.longitude };
    } catch {
      throw Object.assign(new Error('No pudimos obtener tu ubicación. Revisá que el GPS esté activado.'), { code: 'LOCATION_UNAVAILABLE' });
    }
  }, []);

  return { permission, requestPermission, getCurrentPosition };
}
