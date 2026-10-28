import { request } from './api';

const authorized = (accessToken) => ({ Authorization: `Bearer ${accessToken}` });

export async function getMe(accessToken) {
  return request('/users/me', { headers: authorized(accessToken) });
}

export async function updateMe(accessToken, changes) {
  return request('/users/me', { method: 'PATCH', headers: authorized(accessToken), body: changes });
}

export async function updateMyLocation(lat, lng) {
  // TODO
  throw new Error('not implemented');
}
