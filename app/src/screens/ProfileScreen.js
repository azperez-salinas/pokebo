import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Button from '../components/Button';
import KeyboardAwareScroll from '../components/KeyboardAwareScroll';
import PixelSpinner from '../components/PixelSpinner';
import ScreenHeader from '../components/ScreenHeader';
import ProfileForm from '../components/ProfileForm';
import ChangePasswordForm from '../components/ChangePasswordForm';
import { palette, spacing, type } from '../styles';
import { getMe } from '../services/users.service';
import useAuth from '../hooks/useAuth';
import { getSession } from '../services/session';

// `footer` se muestra al final del scroll (Ajustes agrega ahí los avisos y cerrar sesión).
export default function ProfileScreen({ footer = null }) {
  const { status } = useAuth();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError('');
    setUser(null);

    if (status !== 'signedIn') {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    getMe()
      .then(({ user: currentUser }) => {
        if (active) {
          setUser(currentUser);
        }
      })
      .catch((cause) => {
        if (active) {
          setError(
            cause.message || 'No se pudo cargar el perfil.'
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [status]);

  if (loading) {
    return (
      <View style={styles.center}>
        <PixelSpinner accessibilityLabel="Cargando perfil" />
        <Text style={styles.body}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <KeyboardAwareScroll
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <ScreenHeader title="MI PERFIL" />

      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}

      {user && (
        showPasswordForm ? (
          <ChangePasswordForm
            accessToken={getSession()?.accessToken}
          />
        ) : (
          <ProfileForm
            user={user}
            onUserUpdated={setUser}
          />
        )
      )}

      {user && (
        <Button
          color="amarillo"
          label={
            showPasswordForm
              ? 'VOLVER AL PERFIL'
              : 'CAMBIAR CONTRASEÑA'
          }
          onPress={() =>
            setShowPasswordForm((current) => !current)
          }
        />
      )}
      {footer}
    </KeyboardAwareScroll>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: palette.fondo },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 1.5, gap: spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, backgroundColor: palette.fondo },
  body: { ...type.subtitle, color: palette.tinta },
  error: { ...type.error, textAlign: 'center' },
});
