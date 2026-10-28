import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import AuthButton from './AuthButton';
import { palette, fonts } from '../styles';
import { updateMe } from '../services/users.service';

const AVATARS = ['avatar_1', 'avatar_2', 'avatar_3', 'avatar_4', 'avatar_5', 'avatar_6'];

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
    <View style={styles.panel}>
      <View
      style={styles.currentAvatar}
      accessibilityLabel={`Avatar actual: ${original.avatar ?? 'avatar_1'}`}>
        <Text style={styles.currentAvatarText}>
        {(original.avatar ?? 'avatar_1').split('_')[1]}
      </Text>
      </View>
      <Text style={styles.body}>Explorador: {original.username}</Text>
      <View style={styles.field}>
        <Text style={styles.label}>USUARIO</Text>
        <TextInput accessibilityLabel="Usuario" style={styles.input} value={username}
          onChangeText={setUsername} editable={!saving} autoCapitalize="none" autoCorrect={false} />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>BIOGRAFÍA</Text>
        <TextInput accessibilityLabel="Biografía" style={[styles.input, styles.multiline]}
          value={bio} onChangeText={setBio} editable={!saving} multiline maxLength={150}
          placeholder="Contá algo sobre vos..." placeholderTextColor={palette.azul} />
        <Text style={styles.counter}>{bio.length}/150</Text>
      </View>
      <Text style={styles.label}>ELEGÍ TU AVATAR</Text>
      <View style={styles.avatars} accessibilityRole="radiogroup">
        {AVATARS.map((item, index) => (
          <Pressable key={item} accessibilityRole="radio" accessibilityLabel={`Avatar ${index + 1}`}
            accessibilityState={{ checked: avatar === item }} disabled={saving} onPress={() => setAvatar(item)}
            style={[styles.avatar, avatar === item && styles.avatarSelected]}>
            <Text style={styles.avatarText}>{index + 1}</Text>
          </Pressable>
        ))}
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {message ? <Text accessibilityRole="alert" style={styles.success}>{message}</Text> : null}
      <AuthButton label={saving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'} disabled={saving} onPress={save} />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: palette.blanco, borderColor: palette.tinta, borderWidth: 4, borderRadius: 6, padding: 16, gap: 14 },
  body: { fontFamily: fonts.body, fontSize: 23, color: palette.tinta },
  field: { gap: 7 },
  label: { fontFamily: fonts.display, fontSize: 9, lineHeight: 16, color: palette.tinta },
  input: { borderWidth: 3, borderColor: palette.tinta, borderRadius: 5, backgroundColor: palette.fondo, padding: 10, fontFamily: fonts.body, fontSize: 23, color: palette.tinta },
  multiline: { minHeight: 95, textAlignVertical: 'top' },
  counter: { fontFamily: fonts.display, fontSize: 9, color: palette.azul, textAlign: 'right' },
  avatars: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  avatar: { width: 52, height: 52, backgroundColor: palette.linea, borderColor: palette.tinta, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  avatarSelected: { backgroundColor: palette.cielo, borderColor: palette.azul, borderWidth: 4 },
  avatarText: { fontFamily: fonts.display, fontSize: 15, color: palette.tinta },
  currentAvatar: {
  width: 100,
  height: 100,
  alignSelf: 'center',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: palette.cielo,
  borderColor: palette.tinta,
  borderWidth: 4,
  borderRadius: 6,
  borderBottomWidth: 8,
  },
  currentAvatarText: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: palette.azul,
  },
  error: { fontFamily: fonts.body, fontSize: 22, color: palette.rosa, textAlign: 'center' },
  success: { fontFamily: fonts.body, fontSize: 22, color: palette.verde, textAlign: 'center' },
});
