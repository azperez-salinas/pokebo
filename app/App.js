import React, { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useFonts } from 'expo-font';
import styles, { colors, fonts } from './src/styles';
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import MainNavigation from './src/navigation';
import { logout } from './src/services/auth.service';

export default function App() {
  const [screen, setScreen] = useState('welcome');
  const [session, setSession] = useState(null);
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

  if (session) {
    return <MainNavigation onLogout={async () => {
      await logout(session.refreshToken);
      setSession(null);
      setScreen('welcome');
    }} />;
  }

  if (screen === 'login') {
    return (
      <LoginScreen
        onBack={() => setScreen('welcome')}
        onRegister={() => setScreen('register')}
        onAuthenticated={setSession}
      />
    );
  }

  if (screen === 'register') {
    return (
      <RegisterScreen
        onBack={() => setScreen('welcome')}
        onLogin={() => setScreen('login')}
        onAuthenticated={setSession}
      />
    );
  }

  return <WelcomeScreen onStart={() => setScreen('register')} onLogin={() => setScreen('login')} />;
}
