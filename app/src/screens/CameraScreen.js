import React, { useState } from 'react';
import { ActivityIndicator, ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView } from 'expo-camera';
import AuthButton from '../components/AuthButton';
import CaptureResultScreen from './CaptureResultScreen';
import useCamera from '../hooks/useCamera';
import useLocation from '../hooks/useLocation';
import { createCapture } from '../services/captures.service';
import styles, { buttons, colors, fonts, palette } from '../styles';

// Flujo: Pantalla → hooks (cámara, ubicación) → captures.service → Edge API
export default function CameraScreen() {
  const { permission, askPermission, cameraRef, takePhoto } = useCamera();
  const { getCurrentPosition } = useLocation();
  const [ready, setReady] = useState(false);
  const [sending, setSending] = useState(false);
  const [outcome, setOutcome] = useState(null); // { result } o { error }

  async function capture() {
    if (sending || !ready) return; // evita envíos dobles
    setSending(true);
    try {
      const position = await getCurrentPosition();
      const photo = await takePhoto();
      const result = await createCapture({ uri: photo.uri, ...position });
      setOutcome({ result });
    } catch (error) {
      setOutcome({ error });
    } finally {
      setSending(false);
    }
  }

  if (outcome) {
    return <CaptureResultScreen {...outcome} onBack={() => { setOutcome(null); setReady(false); }} />;
  }

  if (!permission) {
    return <View style={styles.content}><ActivityIndicator accessibilityLabel="Cargando cámara" color={colors.accent} /></View>;
  }

  // Se explica para qué se usa la cámara antes de pedir el permiso
  if (!permission.granted) {
    return (
      <View style={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>CÁMARA</Text>
        <Text style={styles.message}>
          {permission.canAskAgain
            ? 'Para capturar un animal necesitamos usar la cámara y tu ubicación en el momento de sacar la foto.'
            : 'El permiso de cámara está desactivado. Habilitalo en los ajustes del teléfono para capturar.'}
        </Text>
        <View style={local.actions}>
          <AuthButton label={permission.canAskAgain ? 'PERMITIR CÁMARA' : 'ABRIR AJUSTES'} onPress={askPermission} />
        </View>
      </View>
    );
  }

  return (
    <View style={local.container}>
      <CameraView ref={cameraRef} style={local.camera} facing="back" onCameraReady={() => setReady(true)} />
      <View style={local.controls}>
        {sending ? <Text style={local.status}>ENVIANDO...</Text> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sacar foto"
          accessibilityState={{ disabled: sending || !ready, busy: sending }}
          disabled={sending || !ready}
          onPress={capture}
        >
          {({ pressed }) => (
            <ImageBackground
              source={buttons.circle.verde[sending || !ready ? 'disabled' : pressed ? 'pressed' : 'normal']}
              resizeMode="stretch"
              style={local.shutter}
            >
              {sending ? <ActivityIndicator color={palette.tinta} /> : null}
            </ImageBackground>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const local = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.tinta },
  camera: { flex: 1 },
  controls: { position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center' },
  status: { fontFamily: fonts.display, fontSize: 11, color: palette.blanco, marginBottom: 12 },
  shutter: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center' },
  actions: { width: '100%', marginTop: 32 },
});
