import { useEffect } from 'react';
import { AppState } from 'react-native';
import { checkNearbySightings, stopLegacyBackgroundLocation } from '../services/nearbyAlerts.service';
import { notifyInboxChanged } from '../store/notificationsStore';

const POLL_MS = 45 * 1000;

// En primer plano reporta H3 aunque no cambie de celda, para detectar sightings nuevos.
export default function useNearbyAlertsSync(status, user) {
  const enabled = !!user?.settings?.nearbyAlerts;

  useEffect(() => {
    if (status === 'loading') return;
    let disposed = false;
    let running = false;

    stopLegacyBackgroundLocation().catch(() => {});
    if (status !== 'signedIn' || !enabled) return () => { disposed = true; };

    const poll = async () => {
      if (disposed || running || AppState.currentState !== 'active') return;
      running = true;
      try {
        const result = await checkNearbySightings();
        if (result?.nearby?.length) notifyInboxChanged();
      } catch (cause) {
        console.warn('[nearbyAlerts]', cause?.code || cause?.message);
      } finally {
        running = false;
      }
    };

    poll();
    const timer = setInterval(poll, POLL_MS);
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') poll();
    });
    return () => {
      disposed = true;
      clearInterval(timer);
      subscription.remove();
    };
  }, [status, enabled]);
}
