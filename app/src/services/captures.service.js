import { authRequest } from './session';

// POST /captures como multipart/form-data: image (JPEG), lat y lng
export async function createCapture({ uri, lat, lng }) {
  const form = new FormData();
  form.append('image', { uri, name: 'capture.jpg', type: 'image/jpeg' });
  form.append('lat', String(lat));
  form.append('lng', String(lng));
  return authRequest('/captures', { method: 'POST', body: form });
}

export async function getMyCaptures() {
  // TODO
  throw new Error('not implemented');
}
