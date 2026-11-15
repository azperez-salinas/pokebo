import React from 'react';
import { StyleSheet } from 'react-native';
import PixelBox from './PixelBox';
import { palette, spacing } from '../styles';

// Panel/tarjeta: borde de tinta con sombra dura. `style` se aplica a la cara (padding, fondo, aspectRatio...).
export default function Panel({ children, style, outerStyle, shadowOffset }) {
  return (
    <PixelBox backgroundColor={palette.blanco} style={[local.face, style]} outerStyle={outerStyle} shadowOffset={shadowOffset}>
      {children}
    </PixelBox>
  );
}

const local = StyleSheet.create({
  face: { padding: spacing.md },
});
