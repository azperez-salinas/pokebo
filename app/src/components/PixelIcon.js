import React from 'react';
import { View } from 'react-native';
import styles, { colors } from '../styles';

// Cada dígito representa un píxel: transparente, contorno, relleno o luz.
const icons = {
  map: ['0011100', '0122210', '1232321', '1222221', '0122210', '0012100', '0001000'],
  collection: ['0110110', '1321231', '1321231', '1321231', '1321231', '0111110', '0001000'],
  camera: ['0011100', '0112110', '1222221', '1231321', '1212121', '1231321', '0111110'],
  achievements: ['0001000', '0012100', '1112111', '1222221', '0122210', '0121210', '1100011'],
  settings: ['0011100', '0112110', '1121211', '1213121', '1121211', '0112110', '0011100'],
};
const fills = { map: '#ef6377', collection: '#b6bbd4', camera: '#b6bbd4', achievements: '#f4cf63', settings: '#b6bbd4' };

export default function PixelIcon({ name }) {
  const palette = ['transparent', colors.ink, fills[name], colors.background];
  return (
    <View accessible={false}>
      {icons[name].map((row, y) => (
        <View key={y} style={styles.iconRow}>
          {[...row].map((pixel, x) => (
            <View key={x} style={[styles.pixel, { backgroundColor: palette[Number(pixel)] }]} />
          ))}
        </View>
      ))}
    </View>
  );
}
