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

  const login = useCallback(async (credentials) => session.saveSession(await authService.login(credentials)), []);

  const register = useCallback(async (data) => session.saveSession(await authService.register(data)), []);

  // Revoca el refresh token en el servidor y borra el almacenamiento seguro aunque la llamada falle
  const logout = useCallback(async () => {
    const refreshToken = session.getSession()?.refreshToken;
    try {
      if (refreshToken) await authService.logout(refreshToken);
    } finally {
      await session.clearSession();
    }
  }, []);

  const value = useMemo(() => ({ status, user, login, register, logout }), [status, user, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
