import React from 'react';
import { Image } from 'react-native';

// Ícono PNG pixel. Los PNG de `icons/arrows`, `icons/panel` y `icons/extras` miden 48x48, así que `size` debe ser
// 48 (1x), 96 (2x), 144 (3x) o 24 (1/2). Otras medidas obligan a interpolar y se ven borrosas.
const BASE = 48;

export default function Icon({ source, size = BASE, accessibilityLabel, style }) {
  if (__DEV__ && size % BASE !== 0 && BASE % size !== 0) {
    console.warn(`Icon: size ${size} no es una escala entera de ${BASE}px; el pixel art se verá borroso.`);
  }
  return (
    <Image
      source={source}
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      resizeMode="contain"
      style={[{ width: size, height: size }, style]}
    />
  );
}
