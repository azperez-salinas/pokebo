import React from 'react';
import { StyleSheet, View } from 'react-native';
import { palette, border } from '../styles';

// Barra segmentada. `value` va de 0 a `max`. Unifica la barra de logros y la de confianza de la captura.
// `color` es el relleno ('cielo' por defecto, 'verde' para completado o confianza).
export default function ProgressBar({ value, max = 1, segments = 10, color = 'cielo', height = 24, accessibilityLabel, style }) {
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  const filled = Math.round(ratio * segments);
  return (
    <View accessible={Boolean(accessibilityLabel)} accessibilityLabel={accessibilityLabel} style={[local.bar, { height }, style]}>
      {Array.from({ length: segments }, (_, index) => (
        <View key={index} style={[local.segment, index < filled && { backgroundColor: palette[color] ?? palette.cielo }]} />
      ))}
    </View>
  );
}

const local = StyleSheet.create({
  bar: { flexDirection: 'row', padding: 3, backgroundColor: palette.linea, borderWidth: border.width, borderColor: border.color, borderRadius: 0 },
  segment: { flex: 1, marginHorizontal: 1, backgroundColor: palette.linea },
});
