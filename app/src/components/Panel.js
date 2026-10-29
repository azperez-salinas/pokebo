import React from 'react';
import { StyleSheet, View } from 'react-native';
import { palette } from '../styles';

// Panel del boceto: contorno de tinta, borde suave por dentro y sombra abajo (luz arriba, sombra abajo).
export default function Panel({ children, style }) {
  return (
    <View style={local.outer}>
      <View style={[local.inner, style]}>{children}</View>
    </View>
  );
}

const local = StyleSheet.create({
  outer: { backgroundColor: palette.tinta, borderRadius: 10, paddingTop: 4, paddingHorizontal: 4, paddingBottom: 8 },
  inner: { backgroundColor: palette.blanco, borderWidth: 3, borderColor: palette.linea, borderRadius: 6, padding: 12 },
});
