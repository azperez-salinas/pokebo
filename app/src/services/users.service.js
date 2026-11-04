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

// PUT /users/me/location: informa la celda H3 donde está el usuario (nunca sus coordenadas).
// Devuelve { nearby }: avistamientos de otros usuarios en su celda y las vecinas que todavía no se le avisaron.
export async function updateMyLocation(h3Index) {
  return authRequest('/users/me/location', { method: 'PUT', body: { h3Index } });
}
