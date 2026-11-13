import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Button from './Button';
import Panel from './Panel';
import TextField from './TextField';
import { palette, spacing, type } from '../styles';
import { changePassword } from '../services/auth.service';
import { clearSession } from '../services/session';

function PasswordField({ label, value, onChangeText, autoComplete, disabled }) {
  return (
    <TextField label={label} value={value} onChangeText={onChangeText} secureTextEntry
      autoComplete={autoComplete} editable={!disabled} />
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
    <Panel style={styles.panel}>
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
          <Button label={saving ? 'GUARDANDO...' : 'ACTUALIZAR CLAVE'} onPress={save} disabled={saving} />
        </>
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  panel: { padding: spacing.lg, gap: spacing.lg },
  label: { ...type.label, color: palette.tinta },
  error: { ...type.error, textAlign: 'center' },
  success: { ...type.body, color: palette.verde, textAlign: 'center' },
});
