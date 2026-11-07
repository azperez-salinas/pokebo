import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import useNotifications from '../hooks/useNotifications';
import { fonts, icons, palette } from '../styles';

// Ícono del buzón (arriba a la derecha). onPress abre la pantalla de avisos.
export default function NotificationBell({ onPress }) {
  const { unreadCount } = useNotifications();
  const active = unreadCount > 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={active ? `Avisos, ${unreadCount} sin leer` : 'Avisos'}
      hitSlop={10}
      onPress={onPress}
      style={({ pressed }) => [local.button, active && local.buttonActive, pressed && local.pressed]}
    >
      <Image accessible={false} source={icons.extras.inbox} style={local.icon} resizeMode="contain" />
      {active ? (
        <View style={local.badge}>
          <Text style={local.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const local = StyleSheet.create({
  button: {
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
    backgroundColor: palette.fondo, borderWidth: 3, borderColor: palette.tinta, borderRadius: 4,
  },
  buttonActive: { backgroundColor: palette.amarillo },
  pressed: { opacity: 0.7 },
  icon: { width: 48, height: 48 },
  badge: {
    position: 'absolute', top: -10, right: -10, minWidth: 22, height: 22, paddingHorizontal: 3,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: palette.rosa, borderWidth: 2, borderColor: palette.tinta, borderRadius: 11,
  },
  badgeText: { fontFamily: fonts.display, fontSize: 8, color: palette.blanco },
});
