import { useContext } from 'react';
import { NotificationsContext } from '../store/notificationsStore';

export default function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error('useNotifications tiene que usarse dentro de <NotificationsProvider>.');
  return context;
}
