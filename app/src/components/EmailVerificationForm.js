import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import AuthButton from './AuthButton';
import AuthLayout from './AuthLayout';
import useAuth from '../hooks/useAuth';
import { fonts, icons, palette } from '../styles';

const backArrow = icons.arrows.arrowLeft;

export default function EmailVerificationForm({ pending, onBack }) {
  const { verifyRegistration, resendRegistration } = useAuth();
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
      await verifyRegistration(pending.challengeId, code);
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
      const result = await resendRegistration(pending.challengeId);
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
      <Pressable accessibilityLabel="Volver" accessibilityRole="button" disabled={submitting} onPress={onBack} style={styles.back}>
        <Image source={backArrow} style={styles.backIcon} />
        <Text style={styles.backText}>VOLVER</Text>
      </Pressable>

      <View style={styles.heading}>
        <Text style={styles.title}>REVISA TU CORREO</Text>
        <Text style={styles.subtitle}>Ingresá el código alfanumérico de 6 caracteres que te enviamos.</Text>
        <Text style={styles.expiration}>El código es válido por 5 minutos.</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.fieldLabel}>CODIGO DE VERIFICACION</Text>
        <TextInput
          accessibilityLabel="Código de verificación"
          autoCapitalize="characters"
          autoComplete="one-time-code"
          autoCorrect={false}
          keyboardType="default"
          maxLength={6}
          onChangeText={changeCode}
          placeholder="A7K3PX"
          placeholderTextColor={palette.azul}
          selectionColor={palette.azul}
          style={styles.codeInput}
          value={code}
        />
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {info ? <Text accessibilityRole="status" style={styles.info}>{info}</Text> : null}
        <AuthButton
          label={submitting ? 'CARGANDO...' : 'VERIFICAR'}
          disabled={submitting}
          onPress={verify}
        />
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
  content: { paddingTop: 6 },
  back: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 8, paddingRight: 12 },
  backIcon: { width: 25, height: 25, resizeMode: 'contain' },
  backText: { fontFamily: fonts.body, fontSize: 20, color: palette.azul, marginLeft: 4 },
  heading: { alignItems: 'center', marginTop: 60, marginBottom: 32, gap: 12 },
  title: { fontFamily: fonts.display, fontSize: 13, lineHeight: 20, color: palette.tinta, textAlign: 'center' },
  subtitle: { fontFamily: fonts.body, fontSize: 22, color: palette.azul, textAlign: 'center', maxWidth: 360 },
  expiration: { fontFamily: fonts.body, fontSize: 20, color: palette.tinta, textAlign: 'center' },
  form: { width: '100%', maxWidth: 360, alignSelf: 'center', gap: 14 },
  fieldLabel: { fontFamily: fonts.display, fontSize: 9, lineHeight: 15, color: palette.tinta, textAlign: 'center' },
  codeInput: {
    height: 64,
    borderWidth: 3,
    borderRadius: 9,
    borderColor: palette.tinta,
    backgroundColor: palette.blanco,
    color: palette.tinta,
    paddingHorizontal: 13,
    fontFamily: fonts.display,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
  },
  error: { fontFamily: fonts.body, fontSize: 19, color: palette.rosa, textAlign: 'center' },
  info: { fontFamily: fonts.body, fontSize: 19, color: palette.verde || palette.azul, textAlign: 'center' },
  resend: { alignSelf: 'center', padding: 10 },
  resendText: { fontFamily: fonts.body, fontSize: 20, color: palette.azul, textAlign: 'center' },
  disabledText: { opacity: 0.5 },
});
