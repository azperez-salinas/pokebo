import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/auth.service';
import * as session from '../services/session';
import { getMe } from '../services/users.service';

// Estado global de la sesión (React Context). Los tokens NO viven acá: quedan en services/session
// (memoria + almacenamiento seguro). Las pantallas solo ven el usuario y el estado.
export const AuthContext = createContext(null);

// Los tokens guardados pueden ser de una cuenta que ya no existe (ej. se borró la base). Se confirma al abrir la app:
// si el servidor ya no la conoce, authRequest cierra la sesión y el store vuelve al login. Sin conexión u otro error,
// se mantiene la sesión guardada. Si responde, se aprovecha para refrescar el usuario (ej. settings.nearbyAlerts).
async function verifyStoredSession() {
  try {
    const response = await getMe();
    if (response?.user) await session.updateSessionUser(response.user);
  } catch {
    // SESSION_ENDED ya cerró la sesión; cualquier otro error (red, timeout) no debe sacar al usuario
  }
}

export function AuthProvider({ children }) {
  // 'loading' mientras se lee el almacenamiento seguro al iniciar, después 'signedIn' o 'signedOut'
  const [status, setStatus] = useState('loading');
  const [user, setUser] = useState(null);

  useEffect(() => {
    let active = true;
    const apply = (current) => {
      if (!active) return;
      setUser(current?.user ?? null);
      setStatus(current ? 'signedIn' : 'signedOut');
    };
    const unsubscribe = session.subscribe(apply);
    session.loadSession().then((current) => {
      apply(current);
      if (current) verifyStoredSession();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Usuario y contraseña inician un desafío; la sesión se guarda recién al verificar el código.
  const login = useCallback((credentials) => authService.login(credentials), []);
  const verifyLogin = useCallback(
    async (challengeId, code) => session.saveSession(await authService.verifyLogin(challengeId, code)),
    [],
  );
  const resendLogin = useCallback((challengeId) => authService.resendLogin(challengeId), []);

  // Iniciar el registro no crea una sesion. Solo verificar el codigo emite y guarda tokens.
  const register = useCallback((data) => authService.register(data), []);
  const verifyRegistration = useCallback(
    async (challengeId, code) => session.saveSession(await authService.verifyRegistration(challengeId, code)),
    [],
  );
  const resendRegistration = useCallback(
    (challengeId) => authService.resendRegistration(challengeId),
    [],
  );

  // Revoca el refresh token en el servidor y borra el almacenamiento seguro aunque la llamada falle
  const logout = useCallback(async () => {
    const refreshToken = session.getSession()?.refreshToken;
    try {
      if (refreshToken) await authService.logout(refreshToken);
    } finally {
      await session.clearSession();
    }
  }, []);

  const value = useMemo(
    () => ({
      status, user, login, verifyLogin, resendLogin,
      register, verifyRegistration, resendRegistration, logout,
    }),
    [status, user, login, verifyLogin, resendLogin, register, verifyRegistration, resendRegistration, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
