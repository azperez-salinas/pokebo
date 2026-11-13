import React from 'react';
import { ImageBackground, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import KeyboardAwareScroll from './KeyboardAwareScroll';
import { palette, images, spacing } from '../styles';

const background = images.fondoBrillos;

// Fondo y scroll comunes de las pantallas de acceso. El teclado nunca tapa el campo activo (ver KeyboardAwareScroll).
export default function AuthLayout({ children, contentStyle }) {
  return (
    <ImageBackground source={background} resizeMode="cover" style={styles.background}>
      <SafeAreaView style={styles.container}>
        <KeyboardAwareScroll contentContainerStyle={[styles.content, contentStyle]}>
          {children}
        </KeyboardAwareScroll>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: palette.fondo },
  container: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
});
