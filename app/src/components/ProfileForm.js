import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Button from './Button';
import Panel from './Panel';
import PixelBox from './PixelBox';
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
    <Panel style={styles.panel}>
      <PixelBox
        outerStyle={styles.currentAvatarOuter}
        style={styles.currentAvatar}
        backgroundColor={palette.cielo}
        accessibilityLabel={`Avatar actual: ${original.avatar ?? 'avatar_1'}`}
      >
        <Image source={AVATAR_IMAGES[original.avatar] ?? AVATAR_IMAGES.avatar_1}
          style={styles.avatarImage} resizeMode="cover" />
      </PixelBox>
      <Text style={styles.body}>Explorador: {original.username}</Text>
      <TextField label="USUARIO" value={username} onChangeText={setUsername} editable={!saving} />
      <TextField label="BIOGRAFÍA" value={bio} onChangeText={setBio} editable={!saving} multiline maxLength={150}
        placeholder="Contá algo sobre vos..." counter={`${bio.length}/150`} autoCapitalize="sentences" />
      <Text style={styles.label}>ELEGÍ TU AVATAR</Text>
      <View style={styles.avatars} accessibilityRole="radiogroup">
        {AVATARS.map((item, index) => (
          <Pressable key={item} accessibilityRole="radio" accessibilityLabel={`Avatar ${index + 1}`}
            accessibilityState={{ checked: avatar === item }} disabled={saving} onPress={() => setAvatar(item)}
            style={[styles.avatar, avatar === item && styles.avatarSelected]}>
            <Image source={AVATAR_IMAGES[item]} style={styles.avatarImage} resizeMode="cover" />
          </Pressable>
        ))}
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {message ? <Text accessibilityRole="alert" style={styles.success}>{message}</Text> : null}
      <Button label={saving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'} disabled={saving} onPress={save} />
    </Panel>
  );
}

const styles = StyleSheet.create({
  panel: { padding: spacing.lg, gap: spacing.lg },
  body: { ...type.subtitle, color: palette.tinta },
  label: { ...type.label, color: palette.tinta },
  avatars: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 1 },
  avatar: { width: 52, height: 52, backgroundColor: palette.linea, borderColor: palette.tinta, borderWidth: border.width, borderRadius: 0, alignItems: 'center', justifyContent: 'center' },
  avatarSelected: { backgroundColor: palette.cielo, borderColor: palette.azul },
  avatarImage: { width: '100%', height: '100%' },
  currentAvatarOuter: { alignSelf: 'center' },
  currentAvatar: { width: 100, height: 100, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  error: { ...type.error, textAlign: 'center' },
  success: { ...type.body, color: palette.verde, textAlign: 'center' },
});
