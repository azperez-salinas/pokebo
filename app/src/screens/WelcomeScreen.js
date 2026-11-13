import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Button from '../components/Button';
import AuthLayout from '../components/AuthLayout';
import { palette, icons, spacing, type } from '../styles';
import appConfig from '../../app.json';

const pokeball = icons.pokeballs.pokebolaConSombra;

export default function WelcomeScreen({ onStart, onLogin }) {
  return (
    <AuthLayout contentStyle={styles.content}>
      <View style={styles.hero}>
        <Image accessibilityLabel="Pokébola" source={pokeball} style={styles.pokeball} />
        <Text style={styles.brand}>PokeBO</Text>
        <Text style={styles.tagline}>Salí a explorar y{'\n'}capturá la fauna de{'\n'}Uruguay</Text>
      </View>
      <View style={styles.actions}>
        <Button label="EMPEZAR" onPress={onStart} />
        <Button label="ENTRAR" color="amarillo" onPress={onLogin} />
        <Text style={styles.footer}>v{appConfig.expo.version} · hecho en Uruguay</Text>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'space-between' },
  hero: { alignItems: 'center', marginTop: spacing.xl * 2 },
  pokeball: { width: 190, height: 190, resizeMode: 'contain', marginBottom: spacing.xs },
  brand: { ...type.display, color: palette.tinta, textAlign: 'center' },
  tagline: { ...type.subtitle, color: palette.azul, textAlign: 'center', marginTop: spacing.lg },
  actions: { gap: spacing.md, paddingTop: spacing.xl },
  footer: { ...type.caption, color: palette.azul, textAlign: 'center', marginTop: spacing.sm },
});
