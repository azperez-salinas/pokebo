import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Button from './Button';
import AuthLayout from './AuthLayout';
import TextField from './TextField';
import { BackButton } from './ScreenHeader';
import useAuth from '../hooks/useAuth';
import { palette, spacing, type } from '../styles';

export default function EmailVerificationForm({ pending, purpose, onBack }) {
  const {
    verifyRegistration, resendRegistration,
    verifyLogin, resendLogin,
  } = useAuth();
  const isLogin = purpose === 'login';
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(pending.resendAfter || 60);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function changeCode(value) {
    setCode(value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
    setError('');
    setInfo('');
  }

  async function verify() {
    if (submitting) return;
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      setError('Ingresá el código de 6 caracteres.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const verifyCode = isLogin ? verifyLogin : verifyRegistration;
      await verifyCode(pending.challengeId, code);
    } catch (cause) {
      setError(cause.message || 'No se pudo verificar el código.');
    } finally {
      setSubmitting(false);
    }
  }

  async function resend() {
    if (submitting || cooldown > 0) return;
    setSubmitting(true);
    setError('');
    setInfo('');
    try {
      const resendCode = isLogin ? resendLogin : resendRegistration;
      const result = await resendCode(pending.challengeId);
      setCode('');
      setCooldown(result.resendAfter || 60);
      setInfo('Enviamos un código nuevo. El anterior ya no es válido.');
    } catch (cause) {
      setError(cause.message || 'No se pudo reenviar el código.');
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
        <Text style={styles.title}>{isLogin ? 'CONFIRMÁ TU INICIO' : 'REVISÁ TU CORREO'}</Text>
        <Text style={styles.subtitle}>
          Ingresá el código alfanumérico de 6 caracteres que enviamos al correo asociado.
        </Text>
        <Text style={styles.expiration}>El código es válido por 5 minutos.</Text>
      </View>

      <View style={styles.form}>
        <TextField
          label="CÓDIGO DE VERIFICACIÓN"
          labelStyle={styles.fieldLabel}
          autoCapitalize="characters"
          autoComplete="one-time-code"
          keyboardType="default"
          maxLength={6}
          onChangeText={changeCode}
          placeholder="A7K3PX"
          style={styles.codeInput}
          value={code}
          returnKeyType="done"
          onSubmitEditing={verify}
        />
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {info ? <Text accessibilityRole="status" style={styles.info}>{info}</Text> : null}
        <Button label={submitting ? 'CARGANDO...' : 'VERIFICAR'} disabled={submitting} onPress={verify} />
        <Pressable
          accessibilityRole="button"
          disabled={submitting || cooldown > 0}
          onPress={resend}
          style={styles.resend}
        >
          <Text style={[styles.resendText, cooldown > 0 && styles.disabledText]}>
            {cooldown > 0 ? `REENVIAR EN ${cooldown} S` : 'REENVIAR CÓDIGO'}
          </Text>
        </Pressable>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.md },
  back: { alignSelf: 'flex-start' },
  heading: { alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.xl, gap: spacing.md },
  title: { ...type.title, color: palette.tinta, textAlign: 'center' },
  subtitle: { ...type.subtitle, color: palette.azul, textAlign: 'center', maxWidth: 360 },
  expiration: { ...type.body, color: palette.tinta, textAlign: 'center' },
  form: { width: '100%', maxWidth: 360, alignSelf: 'center', gap: spacing.lg },
  fieldLabel: { textAlign: 'center' },
  codeInput: { ...type.display, minHeight: 64, letterSpacing: 8, textAlign: 'center' },
  error: { ...type.error, textAlign: 'center' },
  info: { ...type.body, color: palette.verde, textAlign: 'center' },
  resend: { alignSelf: 'center', padding: spacing.md },
  resendText: { ...type.body, color: palette.azul, textAlign: 'center' },
  disabledText: { opacity: 0.5 },
});
