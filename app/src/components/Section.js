import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Panel from './Panel';
import { palette, spacing, type } from '../styles';

// Sección de una pantalla de ajustes: título pequeño arriba y un panel con el contenido. Todas las secciones usan el
// mismo padding y separación, para que la pantalla se lea ordenada.
export default function Section({ title, children, style }) {
  return (
    <View style={[local.section, style]}>
      <Text accessibilityRole="header" style={local.title}>{title}</Text>
      <Panel style={local.panel}>{children}</Panel>
    </View>
  );
}

const local = StyleSheet.create({
  section: { gap: spacing.sm },
  title: { ...type.labelLg, color: palette.azul },
  panel: { padding: spacing.lg, gap: spacing.lg },
});
