import { useEffect } from 'react';
import { AppState } from 'react-native';
import { registerDevicePushToken } from '../services/pushToken.service';

export default function usePushTokenRegistration(status, user) {
  const userId = user?._id;
  const nearbyAlertsEnabled = user?.settings?.nearbyAlerts === true;

  useEffect(() => {
    if (
      status !== 'signedIn' ||
      !userId ||
      !nearbyAlertsEnabled
    ) {
      return;
    }

    let active = true;

    async function register() {
      if (!active || AppState.currentState !== 'active') {
        return;
      }

      try {
        const result = await registerDevicePushToken(userId);
        console.log('[push] Estado del registro:', result.status);

        if (active && result.status === 'registered') {
          console.info('[push] Dispositivo registrado correctamente.');
        }
      } catch (error) {
        if (active) {
          console.warn(
            '[push] No se pudo registrar el dispositivo:',
            error?.message,
            'Código:', error?.code
          );
        }
      }
    }

    // Registrar cuando la sesión y los avisos estén habilitados.
    register();

    // Reintentar al volver a primer plano.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        register();
      }
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, [status, userId, nearbyAlertsEnabled]);
}