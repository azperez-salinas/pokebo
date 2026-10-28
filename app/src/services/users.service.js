import { request } from './api';
import { authRequest, updateSessionUser } from './session';

const authorized = (accessToken) => ({ Authorization: `Bearer ${accessToken}` });

export async function getMe() {
  return authRequest('/users/me');
}

export async function updateMe(changes) {
  const response = await authRequest('/users/me', {
    method: 'PATCH',
    body: changes,
  });

  if (response?.user) {
    await updateSessionUser(response.user);
  }

  return response;
}

export async function updateMyLocation(lat, lng) {
  // TODO
  throw new Error('not implemented');
}
