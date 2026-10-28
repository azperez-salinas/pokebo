import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import AuthButton from '../components/AuthButton';
import ProfileForm from '../components/ProfileForm';
import ChangePasswordForm from '../components/ChangePasswordForm';
import { palette, fonts } from '../styles';
import { getMe } from '../services/users.service';
import useAuth from '../hooks/useAuth';
import { getSession } from '../services/session';

export default function ProfileScreen() {
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
        <ActivityIndicator color={palette.azul} />
        <Text style={styles.body}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>MI PERFIL</Text>

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
        <AuthButton
          color="yellow"
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.fondo },
  content: { padding: 18, paddingBottom: 40, gap: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontFamily: fonts.display, fontSize: 16, lineHeight: 25, color: palette.azul, textAlign: 'center' },
  body: { fontFamily: fonts.body, fontSize: 23, color: palette.tinta },
  error: { fontFamily: fonts.body, fontSize: 22, color: palette.rosa, textAlign: 'center' },
});
