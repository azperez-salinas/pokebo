import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Button from '../components/Button';
import ProfileScreen from './ProfileScreen';
import NearbyAlertsToggle from '../components/NearbyAlertsToggle';
import { palette, spacing, type } from '../styles';

export default function SettingsScreen({ onLogout }) {
  const [error, setError] = React.useState('');
  const [pending, setPending] = React.useState(false);

  async function signOut() {
    if (pending) return;
    setPending(true);
    setError('');
    try {
      await onLogout();
    } catch (cause) {
      setError(cause.message || 'No se pudo cerrar la sesión.');
      setPending(false);
    }
  }

  // Avisos y cerrar sesión van dentro del scroll del perfil: así toda la pantalla se desplaza con el teclado abierto.
  return (
    <View style={styles.container}>
      <ProfileScreen
        footer={(
          <>
            <NearbyAlertsToggle />
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <Button color="destructive" label={pending ? 'CERRANDO...' : 'CERRAR SESIÓN'} disabled={pending} onPress={signOut} />
          </>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.fondo },
  error: { ...type.error, textAlign: 'center', marginBottom: spacing.sm },
});
