import { authRequest } from './session';

// POST /captures como multipart/form-data: image (JPEG), lat y lng
export async function createCapture({ uri, lat, lng }) {
  const form = new FormData();
  form.append('image', { uri, name: 'capture.jpg', type: 'image/jpeg' });
  form.append('lat', String(lat));
  form.append('lng', String(lng));
  return authRequest('/captures', { method: 'POST', body: form });
}

// GET /captures/me: galería del usuario. Filtros opcionales: year, month, family, class, speciesId, page y limit.
export async function getMyCaptures(filters = {}) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.append(key, String(value));
  });
  const qs = query.toString();
  return authRequest(`/captures/me${qs ? `?${qs}` : ''}`);
}
