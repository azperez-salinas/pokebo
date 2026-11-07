import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import useNotifications from '../hooks/useNotifications';
import { fonts, palette } from '../styles';

// Pokebola pixel-art: gris y apagada sin avisos; roja con botón amarillo y un número cuando hay sin leer.
// 0 vacío, 1 contorno, 2 mitad de arriba, 3 mitad de abajo, 4 botón
const PIXELS = [
  '001111100',
  '012222210',
  '122222221',
  '111444111',
  '133444331',
  '133333331',
  '013333310',
  '001111100',
];

function Pokeball({ active }) {
  const colors = ['transparent', palette.tinta, active ? palette.rosa : palette.linea, palette.blanco, active ? palette.amarillo : palette.blanco];
  return (
    <View accessible={false}>
      {PIXELS.map((row, y) => (
        <View key={y} style={local.row}>
          {[...row].map((pixel, x) => (
            <View key={x} style={[local.pixel, { backgroundColor: colors[Number(pixel)] }]} />
          ))}
        </View>
      ))}
    </View>
  );
}

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
      <Pokeball active={active} />
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
  row: { flexDirection: 'row' },
  pixel: { width: 3.5, height: 3.5 },
  badge: {
    position: 'absolute', top: -10, right: -10, minWidth: 22, height: 22, paddingHorizontal: 3,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: palette.rosa, borderWidth: 2, borderColor: palette.tinta, borderRadius: 11,
  },
  badgeText: { fontFamily: fonts.display, fontSize: 8, color: palette.blanco },
});
