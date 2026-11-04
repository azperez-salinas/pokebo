import { request } from './api';

export async function register(data) {
  return request('/auth/registrations', { method: 'POST', body: data });
}

export async function verifyRegistration(challengeId, code) {
  return request('/auth/registrations/verify', { method: 'POST', body: { challengeId, code } });
}

export async function resendRegistration(challengeId) {
  return request('/auth/registrations/resend', { method: 'POST', body: { challengeId } });
}

export async function login(credentials) {
  return request('/auth/login', { method: 'POST', body: credentials });
}

export async function refresh(refreshToken) {
  return request('/auth/refresh', { method: 'POST', body: { refreshToken } });
}

export async function logout(refreshToken) {
  return request('/auth/logout', { method: 'POST', body: { refreshToken } });
}

export async function changePassword(accessToken, currentPassword, newPassword) {
  return request('/auth/password', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: { currentPassword, newPassword },
  });
}
