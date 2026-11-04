import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/auth.service';
import * as session from '../services/session';

// Estado global de la sesión (React Context). Los tokens NO viven acá: quedan en services/session
// (memoria + almacenamiento seguro). Las pantallas solo ven el usuario y el estado.
export const AuthContext = createContext(null);

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
    session.loadSession().then(apply);
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
