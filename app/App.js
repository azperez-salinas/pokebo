import React, { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useFonts } from 'expo-font';
import styles, { colors, fontSources } from './src/styles';
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import MainNavigation from './src/navigation';
import { AuthProvider } from './src/store/authStore';
import useAuth from './src/hooks/useAuth';

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}

function Loading({ label }) {
  return (
    <View style={[styles.screen, styles.content]}>
      <ActivityIndicator accessibilityLabel={label} color={colors.accent} />
    </View>
  );
}

function Root() {
  const [screen, setScreen] = useState('welcome');
  const { status, logout } = useAuth();
  const [fontsLoaded, fontError] = useFonts(fontSources);

  if (!fontsLoaded) {
    return fontError
      ? (
        <View style={[styles.screen, styles.content]}>
          <Text accessibilityRole="alert">No se pudieron cargar las fuentes. Reiniciá la app.</Text>
        </View>
      )
      : <Loading label="Cargando fuentes" />;
  }

  if (status === 'loading') return <Loading label="Cargando sesión" />;

  if (status === 'signedIn') {
    return <MainNavigation onLogout={async () => {
      await logout();
      setScreen('welcome');
    }} />;
  }

  if (screen === 'login') {
    return <LoginScreen onBack={() => setScreen('welcome')} onRegister={() => setScreen('register')} />;
  }

  if (screen === 'register') {
    return <RegisterScreen onBack={() => setScreen('welcome')} onLogin={() => setScreen('login')} />;
  }

  return <WelcomeScreen onStart={() => setScreen('register')} onLogin={() => setScreen('login')} />;
}
