import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import PixelBox from './PixelBox';
import { palette, spacing, type } from '../styles';

// Opción o filtro compacto. `selected` lo pinta de amarillo. Sin onPress es una etiqueta (badge) sin interacción.
export default function Chip({ label, selected = false, onPress, color, accessibilityLabel }) {
  const background = color ?? (selected ? palette.amarillo : palette.blanco);
  const content = (pressed) => (
    <PixelBox pressed={pressed} shadowOffset={2} backgroundColor={background} style={local.face}>
      <Text style={[type.caption, local.label]}>{label}</Text>
    </PixelBox>
  );
  if (!onPress) return content(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={local.pressable}
    >
      {({ pressed }) => content(pressed)}
    </Pressable>
  );
}

const local = StyleSheet.create({
  pressable: { alignSelf: 'flex-start' },
  face: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  label: { color: palette.tinta },
});
