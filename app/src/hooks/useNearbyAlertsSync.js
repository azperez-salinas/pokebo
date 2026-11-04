import { useEffect } from 'react';
import { syncNearbyAlerts } from '../services/nearbyAlerts.service';

// Mantiene la tarea de ubicación en segundo plano alineada con la sesión y con settings.nearbyAlerts del usuario.
export default function useNearbyAlertsSync(status, user) {
  const enabled = !!user?.settings?.nearbyAlerts;

  useEffect(() => {
    if (status === 'loading') return;
    syncNearbyAlerts({ signedIn: status === 'signedIn', enabled }).catch((cause) => {
      console.warn('[nearbyAlerts]', cause?.code || cause?.message);
    });
  }, [status, enabled]);
}
