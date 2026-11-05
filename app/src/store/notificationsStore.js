import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { getNotifications } from '../services/notifications.service';

// Cantidad de avisos sin leer del buzón (la usa el ícono de arriba a la derecha).
// Se actualiza al abrir la app, al volver a primer plano, cada minuto y cuando alguien llama notifyInboxChanged().
export const NotificationsContext = createContext(null);

const POLL_MS = 60 * 1000;
const listeners = new Set();

// Para avisar que pasó algo que puede haber creado avisos (ej. una captura)
export function notifyInboxChanged() {
  listeners.forEach((listener) => listener());
}

export function NotificationsProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const response = await getNotifications({ limit: 1 });
      if (mounted.current) setUnreadCount(response.unreadCount ?? 0);
    } catch {
      // sin conexión: queda el último valor
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    refresh();
    listeners.add(refresh);
    const timer = setInterval(refresh, POLL_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      mounted.current = false;
      listeners.delete(refresh);
      clearInterval(timer);
      subscription.remove();
    };
  }, [refresh]);

  const value = useMemo(() => ({ unreadCount, setUnreadCount, refresh }), [unreadCount, refresh]);
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}
