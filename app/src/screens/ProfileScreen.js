import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Button from '../components/Button';
import KeyboardAwareScroll from '../components/KeyboardAwareScroll';
import Panel from '../components/Panel';
import PixelBox from '../components/PixelBox';
import Section from '../components/Section';
import PixelSpinner from '../components/PixelSpinner';
import ScreenHeader from '../components/ScreenHeader';
import ProfileForm from '../components/ProfileForm';
import ChangePasswordForm from '../components/ChangePasswordForm';
import { palette, spacing, type } from '../styles';
import { AVATAR_IMAGES } from '../config/avatars';
import { getMe } from '../services/users.service';
import useAuth from '../hooks/useAuth';
import { getSession } from '../services/session';

// Tarjeta de identidad: avatar, nombre y biografía actuales (se actualiza al guardar el formulario).
function ProfileSummary({ user }) {
  return (
    <Panel style={styles.summary}>
      <PixelBox
        backgroundColor={palette.cielo}
        style={styles.summaryAvatar}
        accessibilityLabel={`Avatar actual: ${user.avatar ?? 'avatar_1'}`}
      >
        <Image source={AVATAR_IMAGES[user.avatar] ?? AVATAR_IMAGES.avatar_1} style={styles.summaryImage} resizeMode="cover" />
      </PixelBox>
      <View style={styles.summaryText}>
        <Text accessibilityRole="header" numberOfLines={1} style={styles.summaryName}>{user.username}</Text>
        <Text numberOfLines={3} style={user.bio ? styles.summaryBio : styles.summaryBioEmpty}>
          {user.bio || 'Todavía no escribiste tu biografía.'}
        </Text>
      </View>
    </Panel>
  );
}

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
      <ScreenHeader title="MI PERFIL" style={styles.header} />

      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}

      {user && <ProfileSummary user={user} />}

      {user && (
        <Section title="EDITAR PERFIL">
          <ProfileForm user={user} onUserUpdated={setUser} />
        </Section>
      )}

      {user && (
        <Section title="SEGURIDAD">
          {showPasswordForm ? (
            <>
              <ChangePasswordForm accessToken={getSession()?.accessToken} />
              <Button color="blanco" label="CANCELAR" onPress={() => setShowPasswordForm(false)} />
            </>
          ) : (
            <>
              <Text style={styles.hint}>Al cambiar la contraseña vas a tener que volver a iniciar sesión.</Text>
              <Button color="cielo" label="CAMBIAR CONTRASEÑA" onPress={() => setShowPasswordForm(true)} />
            </>
          )}
        </Section>
      )}
      {footer}
    </KeyboardAwareScroll>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: palette.fondo },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 1.5, gap: spacing.xl },
  header: { marginBottom: 0 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, backgroundColor: palette.fondo },
  body: { ...type.subtitle, color: palette.tinta },
  error: { ...type.error, textAlign: 'center' },
  hint: { ...type.body, color: palette.tinta },
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.lg },
  summaryAvatar: { width: 84, height: 84, overflow: 'hidden' },
  summaryImage: { width: '100%', height: '100%' },
  summaryText: { flex: 1, gap: spacing.sm },
  summaryName: { ...type.heading, color: palette.tinta },
  summaryBio: { ...type.body, color: palette.tinta },
  summaryBioEmpty: { ...type.body, color: palette.azul },
});
