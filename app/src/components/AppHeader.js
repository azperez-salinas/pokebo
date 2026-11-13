import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import NotificationBell from './NotificationBell';
import { border, icons, palette, spacing, type } from '../styles';

// Marco superior de la app: logo (la pokébola del inicio) con el nombre a la derecha y, al otro extremo, el buzón de
// avisos. Va fijo sobre todas las pestañas.
export default function AppHeader({ onOpenInbox }) {
  return (
    <View style={local.container}>
      <View style={local.logo} accessibilityRole="header" accessibilityLabel="PokeBO">
        <Image accessible={false} source={icons.pokeballs.pokebolaConSombra} style={local.pokeball} />
        <Text style={local.brand}>PokeBO</Text>
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
    borderBottomWidth: border.width,
    borderColor: border.color,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  logo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pokeball: { width: 40, height: 40, resizeMode: 'contain' },
  brand: { ...type.title, color: palette.tinta },
});
