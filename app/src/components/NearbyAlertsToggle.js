import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import useAuth from '../hooks/useAuth';
import { disableNearbyAlerts, enableNearbyAlerts } from '../services/nearbyAlerts.service';
import { fonts, palette } from '../styles';

const ERRORS = {
  FOREGROUND_DENIED: 'Necesitamos el permiso de ubicación para avisarte. Habilitalo en los ajustes del teléfono.',
  NOTIFICATIONS_DENIED: 'Activá las notificaciones de la app en los ajustes del teléfono para recibir los avisos.',
};

// Interruptor de "Avisos de cercanía": avisa cuando entrás a una zona con avistamientos de otros usuarios.
export default function NearbyAlertsToggle() {
  const { user } = useAuth();
  const enabled = !!user?.settings?.nearbyAlerts;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function toggle() {
    if (pending) return;
    setPending(true);
    setError('');
    try {
      if (enabled) await disableNearbyAlerts();
      else await enableNearbyAlerts();
    } catch (cause) {
      setError(ERRORS[cause.code] || cause.message || 'No se pudo cambiar el aviso. Probá de nuevo.');
    } finally {
      setPending(false);
    }
  }

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="switch"
        accessibilityLabel="Avisos de cercanía"
        accessibilityState={{ checked: enabled, busy: pending }}
        disabled={pending}
        onPress={toggle}
        style={styles.row}
      >
        <Text style={styles.label}>AVISOS DE CERCANÍA</Text>
        <Text style={[styles.state, enabled && styles.stateOn]}>{pending ? '...' : enabled ? 'SÍ' : 'NO'}</Text>
      </Pressable>
      <Text style={styles.hint}>
        Te avisamos sobre nuevos avistamientos cercanos mientras usás la app.
      </Text>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingVertical: 8, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  label: { fontFamily: fonts.body, fontSize: 22, color: palette.tinta },
  state: { fontFamily: fonts.body, fontSize: 22, color: palette.linea },
  stateOn: { color: palette.azul },
  hint: { fontFamily: fonts.body, fontSize: 16, lineHeight: 18, color: palette.tinta },
  error: { fontFamily: fonts.body, fontSize: 17, lineHeight: 19, color: palette.rosa },
});
