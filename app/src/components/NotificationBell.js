import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from './Icon';
import PixelBox from './PixelBox';
import useNotifications from '../hooks/useNotifications';
import { icons, palette, type } from '../styles';

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
    >
      {({ pressed }) => (
        <PixelBox pressed={pressed} shadowOffset={2} backgroundColor={active ? palette.amarillo : palette.fondo} style={local.button}>
          <Icon source={icons.extras.inbox} size={24} />
          {active ? (
            <View style={local.badge}>
              <Text style={local.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          ) : null}
        </PixelBox>
      )}
    </Pressable>
  );
}

const local = StyleSheet.create({
  button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', top: -10, right: -10, minWidth: 22, height: 22, paddingHorizontal: 3,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: palette.rosa, borderWidth: 2, borderColor: palette.tinta, borderRadius: 0,
  },
  badgeText: { ...type.label, color: palette.blanco },
});
