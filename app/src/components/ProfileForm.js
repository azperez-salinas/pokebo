import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Button from './Button';
import TextField from './TextField';
import { palette, border, spacing, type } from '../styles';
import { updateMe } from '../services/users.service';

import { AVATARS, AVATAR_IMAGES } from '../config/avatars';

export default function ProfileForm({ user, onUserUpdated }) {
  const [original, setOriginal] = useState(user);
  const [username, setUsername] = useState(user.username ?? '');
  const [bio, setBio] = useState(user.bio ?? '');
  const [avatar, setAvatar] = useState(user.avatar ?? 'avatar_1');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function save() {
    if (saving) return;
    setError('');
    setMessage('');

    const name = username.trim();
    if (!name) {
      setError('El nombre de usuario es obligatorio.');
      return;
    }
    if (bio.length > 150) {
      setError('La biografía no puede superar 150 caracteres.');
      return;
    }

    const changes = {};
    if (name !== original.username) changes.username = name;
    if (bio !== (original.bio ?? '')) changes.bio = bio;
    if (avatar !== original.avatar) changes.avatar = avatar;
    if (Object.keys(changes).length === 0) {
      setMessage('No hay cambios para guardar.');
      return;
    }

    setSaving(true);
    try {
      const { user: updated } = await updateMe(changes);
      setOriginal(updated);
      setUsername(updated.username ?? '');
      setBio(updated.bio ?? '');
      setAvatar(updated.avatar ?? 'avatar_1');
      onUserUpdated?.(updated); // TODO authStore: sincronizar usuario; JWT conserva posible username anterior.
      setMessage('Perfil actualizado correctamente.');
    } catch (cause) {
      setError(cause.code === 'USERNAME_TAKEN'
        ? 'Ese nombre de usuario ya está en uso.'
        : cause.message || 'No se pudo actualizar el perfil.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.form}>
      <TextField label="USUARIO" value={username} onChangeText={setUsername} editable={!saving} />
      <TextField label="BIOGRAFÍA" value={bio} onChangeText={setBio} editable={!saving} multiline maxLength={150}
        placeholder="Contá algo sobre vos..." counter={`${bio.length}/150`} autoCapitalize="sentences" />
      <View style={styles.group}>
        <Text style={styles.label}>AVATAR</Text>
        <View style={styles.avatars} accessibilityRole="radiogroup">
          {AVATARS.map((item, index) => (
            <Pressable key={item} accessibilityRole="radio" accessibilityLabel={`Avatar ${index + 1}`}
              accessibilityState={{ checked: avatar === item }} disabled={saving} onPress={() => setAvatar(item)}
              style={[styles.avatar, avatar === item && styles.avatarSelected]}>
              <Image source={AVATAR_IMAGES[item]} style={styles.avatarImage} resizeMode="cover" />
            </Pressable>
          ))}
        </View>
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {message ? <Text accessibilityRole="alert" style={styles.success}>{message}</Text> : null}
      <Button label={saving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'} disabled={saving} onPress={save} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  group: { gap: spacing.sm },
  label: { ...type.label, color: palette.tinta },
  // 3 avatares por fila, repartidos en todo el ancho
  avatars: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md },
  avatar: { width: '31%', aspectRatio: 1, backgroundColor: palette.linea, borderColor: palette.tinta, borderWidth: border.width, borderRadius: 0, overflow: 'hidden' },
  avatarSelected: { borderColor: palette.azul, borderWidth: border.width + 2 },
  avatarImage: { width: '100%', height: '100%' },
  error: { ...type.error, textAlign: 'center' },
  success: { ...type.body, color: palette.verde, textAlign: 'center' },
});
