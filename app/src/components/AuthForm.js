import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import AuthButton from './AuthButton';
import AuthLayout from './AuthLayout';
import { palette, fonts, icons } from '../styles';
import { login, register } from '../services/auth.service';

const pokeball = icons.pokeballs.pokebolaSinSombra;
const backArrow = icons.arrows.arrowLeft;

function Field({ label, value, onChangeText, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onChangeText}
        placeholderTextColor={palette.azul}
        selectionColor={palette.azul}
        style={styles.input}
        value={value}
        {...props}
      />
    </View>
  );
}

export default function AuthForm({ mode, onBack, onSwitch, onAuthenticated }) {
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
      const session = isRegister
        ? await register({ username: user, email: mail, password })
        : await login({ username: user, password });
      onAuthenticated(session);
    } catch (cause) {
      setError(cause.message || 'No se pudo completar la solicitud.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout contentStyle={styles.content}>
      <Pressable accessibilityLabel="Volver" accessibilityRole="button" disabled={submitting} onPress={onBack} style={styles.back}>
        <Image source={backArrow} style={styles.backIcon} />
        <Text style={styles.backText}>VOLVER</Text>
      </Pressable>

      <View style={styles.heading}>
        <Image accessibilityLabel="Pokébola" source={pokeball} style={styles.pokeball} />
        <Text style={styles.brand}>PokédexUy</Text>
        <Text style={styles.title}>{isRegister ? 'CREÁ TU CUENTA' : 'BIENVENIDO DE NUEVO'}</Text>
        <Text style={styles.subtitle}>
          {isRegister ? 'Tu aventura por Uruguay empieza acá.' : 'Tu próxima aventura te espera.'}
        </Text>
      </View>

      <View style={styles.form}>
        <Field
          label="USUARIO"
          placeholder="Tu nombre de explorador"
          autoComplete="username"
          value={username}
          onChangeText={change(setUsername)}
        />
        {isRegister && (
          <Field
            label="CORREO"
            placeholder="tu@correo.com"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={change(setEmail)}
          />
        )}
        <Field
          label="CONTRASEÑA"
          placeholder={isRegister ? 'Mínimo 8 caracteres' : 'Tu contraseña'}
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          secureTextEntry
          value={password}
          onChangeText={change(setPassword)}
        />
        {isRegister && (
          <Field
            label="CONFIRMAR CONTRASEÑA"
            placeholder="Repetí tu contraseña"
            autoComplete="new-password"
            secureTextEntry
            value={confirmation}
            onChangeText={change(setConfirmation)}
          />
        )}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <AuthButton
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
  content: { paddingTop: 6 },
  back: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 8, paddingRight: 12 },
  backIcon: { width: 25, height: 25, resizeMode: 'contain' },
  backText: { fontFamily: fonts.body, fontSize: 20, color: palette.azul, marginLeft: 4 },
  heading: { alignItems: 'center', marginBottom: 20 },
  pokeball: { width: 126, height: 126, resizeMode: 'contain' },
  brand: { fontFamily: fonts.display, fontSize: 15, color: palette.tinta, marginTop: 2 },
  title: { fontFamily: fonts.display, fontSize: 11, lineHeight: 18, color: palette.tinta, textAlign: 'center', marginTop: 24 },
  subtitle: { fontFamily: fonts.body, fontSize: 21, color: palette.azul, textAlign: 'center', marginTop: 9 },
  form: { width: '100%', maxWidth: 360, alignSelf: 'center', gap: 12 },
  field: { gap: 7 },
  fieldLabel: { fontFamily: fonts.display, fontSize: 9, lineHeight: 15, color: palette.tinta },
  input: {
    height: 52,
    borderWidth: 3,
    borderRadius: 9,
    borderColor: palette.tinta,
    backgroundColor: palette.blanco,
    color: palette.tinta,
    paddingHorizontal: 13,
    fontFamily: fonts.body,
    fontSize: 22,
  },
  error: { fontFamily: fonts.body, fontSize: 19, color: palette.rosa, textAlign: 'center' },
  switch: { alignSelf: 'center', padding: 8 },
  switchText: { fontFamily: fonts.body, fontSize: 19, color: palette.azul, textAlign: 'center' },
  footer: { fontFamily: fonts.body, fontSize: 16, color: palette.azul, textAlign: 'center', marginTop: 'auto', paddingTop: 20 },
});
