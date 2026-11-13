import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import PixelBox from './PixelBox';
import { palette, spacing, type } from '../styles';

// Color de fondo y de texto por variante. `destructive` es el rojo de acciones peligrosas (cerrar sesión, borrar).
const COLORS = {
  verde: { bg: palette.verde, text: palette.tinta },
  amarillo: { bg: palette.amarillo, text: palette.tinta },
  rosa: { bg: palette.rosa, text: palette.tinta },
  cielo: { bg: palette.cielo, text: palette.tinta },
  azul: { bg: palette.azul, text: palette.blanco },
  blanco: { bg: palette.blanco, text: palette.tinta },
};
const ALIASES = { green: 'verde', yellow: 'amarillo', destructive: 'rosa' };

// Botón único de la app. `size="small"` es para acciones secundarias dentro de un panel o encabezado.
export default function Button({ label, color = 'verde', size = 'medium', disabled = false, onPress, children, accessibilityLabel, style }) {
  const scheme = COLORS[ALIASES[color] ?? color] ?? COLORS.verde;
  const small = size === 'small';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[small ? local.small : local.medium, style]}
    >
      {({ pressed }) => (
        <PixelBox
          pressed={pressed && !disabled}
          backgroundColor={disabled ? palette.linea : scheme.bg}
          style={[local.face, small && local.faceSmall]}
        >
          {children ?? <Text style={[type.button, local.label, { color: disabled ? palette.azul : scheme.text }]}>{label}</Text>}
        </PixelBox>
      )}
    </Pressable>
  );
}

const local = StyleSheet.create({
  medium: { width: '100%', maxWidth: 340, alignSelf: 'center' },
  small: { alignSelf: 'flex-start' },
  face: { minHeight: 52, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', paddingHorizontal: spacing.lg },
  faceSmall: { minHeight: 36, paddingHorizontal: spacing.md },
  label: { textAlign: 'center' },
});
