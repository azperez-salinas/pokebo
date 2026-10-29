import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import AuthButton from './AuthButton';
import { palette, fonts } from '../styles';
import { changePassword } from '../services/auth.service';
import useAuth from '../hooks/useAuth';
import { clearSession } from '../services/session';

function PasswordField({ label, value, onChangeText, autoComplete, disabled }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput accessibilityLabel={label} style={styles.input} value={value}
        onChangeText={onChangeText} secureTextEntry autoComplete={autoComplete}
        autoCapitalize="none" autoCorrect={false} editable={!disabled} />
    </View>
  );
}

export default function ChangePasswordForm({ accessToken }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [changed, setChanged] = useState(false);
  const [error, setError] = useState('');
  //const { logout } = useAuth();

  async function save() {
    if (saving || changed) return;
    setError('');
    if (!currentPassword || !newPassword) {
      setError('Completá ambas contraseñas.');
      return;
    }
    if (newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmation) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }

    setSaving(true);
    try {
      await changePassword(accessToken, currentPassword, newPassword);

      // Sprint 2: cerrar la sesión usando AuthProvider.
      await clearSession()

      // AuthProvider notificará el cambio de sesión
      // y App.js mostrará la pantalla de bienvenida.
    } catch (cause) {
      setError(cause.code === 'INVALID_CURRENT_PASSWORD'
        ? 'La contraseña actual es incorrecta.'
        : cause.message || 'No se pudo cambiar la contraseña.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.label}>CAMBIAR CONTRASEÑA</Text>
      {changed ? (
        <Text accessibilityRole="alert" style={styles.success}>
          Contraseña actualizada. Volvé a iniciar sesión para continuar de forma segura.
        </Text>
      ) : (
        <>
          <PasswordField label="ACTUAL" value={currentPassword} onChangeText={setCurrentPassword}
            autoComplete="current-password" disabled={saving} />
          <PasswordField label="NUEVA" value={newPassword} onChangeText={setNewPassword}
            autoComplete="new-password" disabled={saving} />
          <PasswordField label="CONFIRMAR NUEVA" value={confirmation} onChangeText={setConfirmation}
            autoComplete="new-password" disabled={saving} />
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <AuthButton label={saving ? 'GUARDANDO...' : 'ACTUALIZAR CLAVE'} onPress={save} disabled={saving} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: palette.blanco, borderColor: palette.tinta, borderWidth: 4, borderRadius: 6, padding: 16, gap: 14 },
  field: { gap: 7 },
  label: { fontFamily: fonts.display, fontSize: 9, lineHeight: 16, color: palette.tinta },
  input: { borderWidth: 3, borderColor: palette.tinta, borderRadius: 5, backgroundColor: palette.fondo, padding: 10, fontFamily: fonts.body, fontSize: 23, color: palette.tinta },
  error: { fontFamily: fonts.body, fontSize: 22, color: palette.rosa, textAlign: 'center' },
  success: { fontFamily: fonts.body, fontSize: 22, color: palette.verde, textAlign: 'center' },
});
