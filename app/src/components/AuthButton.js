import React from 'react';
import { ImageBackground, Pressable, StyleSheet, Text } from 'react-native';
import { palette, fonts, buttons } from '../styles';

const assets = {
  green: buttons.rect.verde,
  yellow: buttons.rect.amarillo,
};

export default function AuthButton({ label, color = 'green', disabled = false, onPress }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={styles.button}>
      {({ pressed }) => (
        <ImageBackground
          source={assets[color][disabled ? 'disabled' : pressed ? 'pressed' : 'normal']}
          resizeMode="stretch"
          style={styles.image}
        >
          <Text style={styles.label}>{label}</Text>
        </ImageBackground>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: '100%', maxWidth: 340, alignSelf: 'center' },
  image: { height: 58, alignItems: 'center', justifyContent: 'center', paddingBottom: 5 },
  label: { fontFamily: fonts.display, fontSize: 11, color: palette.tinta, textAlign: 'center' },
});
