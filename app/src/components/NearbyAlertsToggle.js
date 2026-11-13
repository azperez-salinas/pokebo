import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import useAuth from '../hooks/useAuth';
import { disableNearbyAlerts, enableNearbyAlerts } from '../services/nearbyAlerts.service';
import PixelBox from './PixelBox';
import { palette, spacing, type } from '../styles';

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
        <PixelBox shadowOffset={2} backgroundColor={enabled ? palette.verde : palette.linea} style={styles.state}>
          <Text style={styles.stateText}>{pending ? '...' : enabled ? 'SÍ' : 'NO'}</Text>
        </PixelBox>
      </Pressable>
      <Text style={styles.hint}>
        Te avisamos sobre nuevos avistamientos cercanos mientras usás la app.
      </Text>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  label: { ...type.body, color: palette.tinta },
  state: { minWidth: 52, alignItems: 'center', paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  stateText: { ...type.labelLg, color: palette.tinta },
  hint: { ...type.caption, color: palette.tinta },
  error: { ...type.error },
});
