import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import AuthButton from '../components/AuthButton';
import AuthLayout from '../components/AuthLayout';
import palette from '../assets/palette.json';
import { fonts } from '../styles';
import appConfig from '../../app.json';

const pokeball = require('../assets/icons/pokeballs/pokebola-con-sombra.png');

export default function WelcomeScreen({ onStart, onLogin }) {
  return (
    <AuthLayout contentStyle={styles.content}>
      <View style={styles.hero}>
        <Image accessibilityLabel="Pokébola" source={pokeball} style={styles.pokeball} />
        <Text style={styles.brand}>PokédexUy</Text>
        <Text style={styles.tagline}>Salí a explorar y{'\n'}capturá la fauna de{'\n'}Uruguay</Text>
      </View>
      <View style={styles.actions}>
        <AuthButton label="EMPEZAR" onPress={onStart} />
        <AuthButton label="ENTRAR" color="yellow" onPress={onLogin} />
        <Text style={styles.footer}>v{appConfig.expo.version} · hecho en Uruguay</Text>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'space-between' },
  hero: { alignItems: 'center', marginTop: 58 },
  pokeball: { width: 190, height: 190, resizeMode: 'contain', marginBottom: 4 },
  brand: { fontFamily: fonts.display, fontSize: 18, color: palette.tinta, textAlign: 'center' },
  tagline: {
    fontFamily: fonts.body,
    fontSize: 23,
    lineHeight: 24,
    color: palette.azul,
    textAlign: 'center',
    marginTop: 16,
  },
  actions: { gap: 6, paddingTop: 32 },
  footer: { fontFamily: fonts.body, fontSize: 16, color: palette.azul, textAlign: 'center', marginTop: 9 },
});
