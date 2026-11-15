import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { palette } from '../styles';

// Indicador de carga pixel: tres cuadrados que se encienden uno tras otro. Reemplaza a ActivityIndicator.
const COUNT = 3;
const STEP_MS = 250;

export default function PixelSpinner({ accessibilityLabel = 'Cargando', size = 12, style }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setActive((current) => (current + 1) % COUNT), STEP_MS);
    return () => clearInterval(timer);
  }, []);
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={accessibilityLabel} style={[local.row, { gap: size / 2 }, style]}>
      {Array.from({ length: COUNT }, (_, index) => (
        <View
          key={index}
          style={[local.block, { width: size, height: size }, index === active && local.active]}
        />
      ))}
    </View>
  );
}

const local = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  block: { backgroundColor: palette.linea, borderWidth: 2, borderColor: palette.tinta },
  active: { backgroundColor: palette.amarillo },
});
