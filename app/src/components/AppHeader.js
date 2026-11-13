import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import NotificationBell from './NotificationBell';
import { border, palette, spacing, type } from '../styles';

// Marco superior de la app: logo a la izquierda y buzón de avisos a la derecha. Va fijo sobre todas las pestañas.
// TODO: reemplazar el texto provisional por la imagen del logo cuando exista (ver `logo`).
export default function AppHeader({ onOpenInbox, logo = null }) {
  return (
    <View style={local.container}>
      <View style={local.logo} accessibilityRole="header">
        {logo ?? <Text style={local.logoPlaceholder}>LOGO DE POKEBO</Text>}
      </View>
      <NotificationBell onPress={onOpenInbox} />
    </View>
  );
}

const local = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.blanco,
    borderTopWidth: border.width,
    borderBottomWidth: border.width,
    borderColor: border.color,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  logo: { flex: 1, justifyContent: 'center' },
  logoPlaceholder: { ...type.heading, color: palette.tinta },
});
