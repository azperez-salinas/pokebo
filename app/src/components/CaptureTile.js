import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AuthImage from './AuthImage';
import PixelBox from './PixelBox';
import Chip from './Chip';
import { palette, spacing, type } from '../styles';
import { photoSource } from '../services/images.service';

// Tarjeta de la galería: foto de la captura y nombre común de la especie.
export default function CaptureTile({ capture, onPress }) {
  const name = capture.species?.commonName ?? 'Sin nombre';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ver ${name}`}
      onPress={onPress}
      style={local.tile}
    >
      {({ pressed }) => (
        <PixelBox pressed={pressed} shadowOffset={2} style={local.face}>
          <View style={local.photoFrame}>
            <AuthImage source={photoSource(capture.photoUrl)} style={local.photo} resizeMode="cover" />
            {capture.count > 1 ? (
              <View style={local.count}><Chip label={`x${capture.count}`} color={palette.amarillo} /></View>
            ) : null}
          </View>
          <Text numberOfLines={2} style={local.name}>{name}</Text>
        </PixelBox>
      )}
    </Pressable>
  );
}

const local = StyleSheet.create({
  tile: { flex: 1, margin: spacing.xs },
  face: { padding: spacing.xs },
  photoFrame: { aspectRatio: 1, backgroundColor: palette.linea, overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  count: { position: 'absolute', top: spacing.xs, right: spacing.xs },
  name: { ...type.caption, color: palette.tinta, marginTop: spacing.xs, minHeight: 40 },
});
