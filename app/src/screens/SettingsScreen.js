import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ComingSoon from '../components/ComingSoon';
import palette from '../assets/palette.json';
import { fonts } from '../styles';

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

  return (
    <View style={styles.container}>
      <ComingSoon title="Ajustes" />
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <Pressable accessibilityRole="button" disabled={pending} onPress={signOut} style={styles.button}>
        <Text style={styles.label}>{pending ? 'CERRANDO...' : 'CERRAR SESIÓN'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  error: { fontFamily: fonts.body, fontSize: 19, color: palette.rosa, textAlign: 'center' },
  button: { alignSelf: 'center', padding: 16 },
  label: { fontFamily: fonts.body, fontSize: 22, color: palette.azul },
});
