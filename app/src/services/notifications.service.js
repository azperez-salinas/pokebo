import { authRequest } from './session';

// Buzón: GET /notifications -> { notifications, unreadCount, nextBefore }
// type filtra por 'achievement' | 'nearby' | 'capture'; before pide la página siguiente (nextBefore de la anterior).
export async function getNotifications({ type, before, limit } = {}) {
  const query = [
    type && `type=${encodeURIComponent(type)}`,
    before && `before=${encodeURIComponent(before)}`,
    limit && `limit=${limit}`,
  ].filter(Boolean).join('&');
  return authRequest(`/notifications${query ? `?${query}` : ''}`);
}

export async function markNotificationRead(id) {
  return authRequest(`/notifications/${id}`, { method: 'PATCH', body: {} });
}

export async function markAllNotificationsRead(type) {
  return authRequest(`/notifications/read-all${type ? `?type=${encodeURIComponent(type)}` : ''}`, { method: 'PATCH', body: {} });
}
