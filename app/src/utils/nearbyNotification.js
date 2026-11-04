// Texto de la notificación local con los avistamientos cercanos que devuelve PUT /users/me/location.
// nearby: [{ id, species: { commonName } | null, zone: 'own' | 'near', ... }]. Devuelve null si no hay nada que avisar.

export const NOTIFICATION_TYPE = 'nearby-sighting';
const MAX_NAMES = 3;

const nameOf = (sighting) => sighting.species?.commonName || 'un animal';

export function buildNearbyNotification(nearby) {
  if (!Array.isArray(nearby) || nearby.length === 0) return null;
  const data = { type: NOTIFICATION_TYPE, sightingIds: nearby.map((sighting) => sighting.id) };

  if (nearby.length === 1) {
    const [sighting] = nearby;
    return {
      title: `${nameOf(sighting)} cerca de vos`,
      body: sighting.zone === 'own' ? 'Lo vieron hace poco en tu zona.' : 'Lo vieron hace poco en una zona vecina.',
      data,
    };
  }

  const names = [...new Set(nearby.map(nameOf))];
  const shown = names.slice(0, MAX_NAMES).join(', ');
  const rest = names.length - MAX_NAMES;
  return {
    title: `${nearby.length} avistamientos cerca de vos`,
    body: rest > 0 ? `${shown} y ${rest} más.` : `${shown}.`,
    data,
  };
}
