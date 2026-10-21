import { useContext } from 'react';
import { AuthContext } from '../store/authStore';

// Expone usuario, estado de la sesión, login, register y logout a partir de authStore.
export default function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth tiene que usarse dentro de <AuthProvider>.');
  return context;
}
