import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Button from './Button';
import Icon from './Icon';
import { icons, palette, spacing, type } from '../styles';

// Encabezado de pantalla: título centrado en PressStart2P, botón "volver" opcional a la izquierda y un slot `right`.
// Unifica los tres "volver" distintos y los títulos de pantalla (antes 11/13/15/16/18/20 px).
export function BackButton({ onPress, label = 'VOLVER' }) {
  return (
    <Button size="small" color="blanco" label={label} onPress={onPress} accessibilityLabel={label === 'VOLVER' ? 'Volver' : label}>
      <Icon source={icons.arrows.arrowLeft} size={24} />
      <Text style={[type.button, local.backText]}>{label}</Text>
    </Button>
  );
}

export default function ScreenHeader({ title, onBack, right, subtitle, style }) {
  const hasSides = Boolean(onBack || right);
  return (
    <View style={[local.container, style]}>
      {hasSides ? (
        <View style={local.sides}>
          <View style={local.side}>{onBack ? <BackButton onPress={onBack} /> : null}</View>
          <View style={[local.side, local.right]}>{right}</View>
        </View>
      ) : null}
      <Text accessibilityRole="header" style={[type.title, local.title]}>{title}</Text>
      {subtitle ? <Text style={[type.subtitle, local.subtitle]}>{subtitle}</Text> : null}
    </View>
  );
}

const local = StyleSheet.create({
  container: { gap: spacing.sm, marginBottom: spacing.md },
  sides: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  side: { flex: 1 },
  right: { alignItems: 'flex-end' },
  title: { color: palette.tinta, textAlign: 'center' },
  subtitle: { color: palette.azul, textAlign: 'center' },
  backText: { color: palette.tinta, marginLeft: spacing.xs },
});
