import React, { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useFonts } from 'expo-font';
import styles, { colors, fontSources } from './src/styles';
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import MainNavigation from './src/navigation';
import { logout } from './src/services/auth.service';

export default function App() {
  const [screen, setScreen] = useState('welcome');
  const [session, setSession] = useState(null);
  const [fontsLoaded, fontError] = useFonts(fontSources);

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
