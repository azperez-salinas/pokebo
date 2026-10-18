import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useFonts } from 'expo-font';
import styles, { colors, fonts } from './src/styles';

// TODO: reemplazar por la navegación (src/navigation) cuando esté definida.
export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    [fonts.display]: require('./src/assets/fonts/PressStart2P-Regular.ttf'),
    [fonts.body]: require('./src/assets/fonts/VT323-Regular.ttf'),
  });

  if (!fontsLoaded) {
    return (
      <View style={[styles.screen, styles.content]}>
        {fontError
          ? <Text accessibilityRole="alert">No se pudieron cargar las fuentes. Reiniciá la app.</Text>
          : <ActivityIndicator accessibilityLabel="Cargando fuentes" color={colors.accent} />}
      </View>
    );
  }

  return (
    <View style={[styles.screen, styles.content]}>
      <Text style={styles.title}>pokebo</Text>
    </View>
  );
}
