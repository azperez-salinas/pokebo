import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AuthImage from './AuthImage';
import { fonts, palette } from '../styles';
import { photoSource } from '../services/images.service';

// Tarjeta de la galería: foto de la captura y nombre común de la especie.
export default function CaptureTile({ capture, onPress }) {
  const name = capture.species?.commonName ?? 'Sin nombre';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ver ${name}`}
      onPress={onPress}
      style={({ pressed }) => [local.tile, pressed && local.pressed]}
    >
      <View style={local.photoFrame}>
        <AuthImage source={photoSource(capture.photoUrl)} style={local.photo} resizeMode="cover" />
        {capture.count > 1 ? (
          <View style={local.count}><Text style={local.countText}>x{capture.count}</Text></View>
        ) : null}
      </View>
      <Text numberOfLines={2} style={local.name}>{name}</Text>
    </Pressable>
  );
}

const local = StyleSheet.create({
  tile: { flex: 1, margin: 6, backgroundColor: palette.blanco, borderWidth: 3, borderColor: palette.tinta, borderRadius: 4, padding: 4 },
  pressed: { opacity: 0.65 },
  photoFrame: { aspectRatio: 1, backgroundColor: palette.linea, borderRadius: 2, overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  count: { position: 'absolute', top: 4, right: 4, backgroundColor: palette.amarillo, borderWidth: 2, borderColor: palette.tinta, borderRadius: 4, paddingHorizontal: 4 },
  countText: { fontFamily: fonts.display, fontSize: 8, color: palette.tinta },
  name: { fontFamily: fonts.body, fontSize: 18, lineHeight: 20, color: palette.tinta, marginTop: 4, minHeight: 40 },
});
