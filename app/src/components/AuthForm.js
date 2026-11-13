import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Button from './Button';
import AuthLayout from './AuthLayout';
import TextField from './TextField';
import { BackButton } from './ScreenHeader';
import { palette, icons, spacing, type } from '../styles';
import useAuth from '../hooks/useAuth';

const pokeball = icons.pokeballs.pokebolaSinSombra;

export default function AuthForm({ mode, onBack, onSwitch, onRegistrationStarted, onLoginStarted }) {
  const { login, register } = useAuth();
  const isRegister = mode === 'register';
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function change(setValue) {
    return (value) => {
      setValue(value);
      setError('');
    };
  }

  async function submit() {
    if (submitting) return;

    const user = username.trim();
    const mail = email.trim().toLowerCase();
    if (!user) {
      setError('Ingresá tu nombre de usuario.');
      return;
    }
    if (isRegister && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      setError('Ingresá un correo válido.');
      return;
    }
    if (!password || (isRegister && password.length < 8)) {
      setError(isRegister ? 'La contraseña debe tener al menos 8 caracteres.' : 'Ingresá tu contraseña.');
      return;
    }
    if (isRegister && password !== confirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      // Registro y login crean un desafío. Solo verificar el código guarda la sesión.
      if (isRegister) {
        const pending = await register({ username: user, email: mail, password });
        onRegistrationStarted?.(pending);
      } else {
        const pending = await login({ username: user, password });
        onLoginStarted?.(pending);
      }
    } catch (cause) {
      setError(cause.message || 'No se pudo completar la solicitud.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout contentStyle={styles.content}>
      <View style={styles.back}>
        <BackButton disabled={submitting} onPress={onBack} />
      </View>

      <View style={styles.heading}>
        <Image accessibilityLabel="Pokébola" source={pokeball} style={styles.pokeball} />
        <Text style={styles.brand}>PokeBO</Text>
        <Text style={styles.title}>{isRegister ? 'CREÁ TU CUENTA' : 'BIENVENIDO DE NUEVO'}</Text>
        <Text style={styles.subtitle}>
          {isRegister ? 'Tu aventura por Uruguay empieza acá.' : 'Tu próxima aventura te espera.'}
        </Text>
      </View>

      <View style={styles.form}>
        <TextField
          label="USUARIO"
          placeholder="Tu nombre de explorador"
          autoComplete="username"
          value={username}
          onChangeText={change(setUsername)}
        />
        {isRegister && (
          <TextField
            label="CORREO"
            placeholder="tu@correo.com"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={change(setEmail)}
          />
        )}
        <TextField
          label="CONTRASEÑA"
          placeholder={isRegister ? 'Mínimo 8 caracteres' : 'Tu contraseña'}
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          secureTextEntry
          value={password}
          onChangeText={change(setPassword)}
        />
        {isRegister && (
          <TextField
            label="CONFIRMAR CONTRASEÑA"
            placeholder="Repetí tu contraseña"
            autoComplete="new-password"
            secureTextEntry
            value={confirmation}
            onChangeText={change(setConfirmation)}
            returnKeyType="done"
            onSubmitEditing={submit}
          />
        )}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <Button
          label={submitting ? 'CARGANDO...' : isRegister ? 'CREAR CUENTA' : 'ENTRAR'}
          disabled={submitting}
          onPress={submit}
        />
        <Pressable accessibilityRole="button" disabled={submitting} onPress={onSwitch} style={styles.switch}>
          <Text style={styles.switchText}>
            {isRegister ? '¿Ya tenés cuenta? Entrá' : '¿No tenés cuenta? Registrate'}
          </Text>
        </Pressable>
      </View>
      <Text style={styles.footer}>hecho en Uruguay</Text>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.md },
  back: { alignSelf: 'flex-start' },
  heading: { alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.xl },
  pokeball: { width: 128, height: 128, resizeMode: 'contain' },
  brand: { ...type.title, color: palette.tinta, marginTop: spacing.xs },
  title: { ...type.button, color: palette.tinta, textAlign: 'center', marginTop: spacing.xl },
  subtitle: { ...type.subtitle, color: palette.azul, textAlign: 'center', marginTop: spacing.sm },
  form: { width: '100%', maxWidth: 360, alignSelf: 'center', gap: spacing.lg },
  error: { ...type.error, textAlign: 'center' },
  switch: { alignSelf: 'center', padding: spacing.sm },
  switchText: { ...type.body, color: palette.azul, textAlign: 'center' },
  footer: { ...type.caption, color: palette.azul, textAlign: 'center', marginTop: 'auto', paddingTop: spacing.xl },
});
