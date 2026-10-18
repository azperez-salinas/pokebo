import { request } from './api';

export async function register(data) {
  return request('/auth/register', { method: 'POST', body: data });
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
