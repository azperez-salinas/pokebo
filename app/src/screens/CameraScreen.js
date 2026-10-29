import React, { useState } from 'react';
import { ActivityIndicator, Image, ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView } from 'expo-camera';
import AuthButton from '../components/AuthButton';
import Panel from '../components/Panel';
import CaptureResultScreen from './CaptureResultScreen';
import useCamera from '../hooks/useCamera';
import useLocation from '../hooks/useLocation';
import { createCapture } from '../services/captures.service';
import styles, { buttons, colors, fonts, icons, palette } from '../styles';

// La imagen del botón incluye la sombra de abajo: su cara queda ~6% más arriba del centro, y el ícono se sube lo mismo
const ICON_OFFSET = 0.06;

// Botón del boceto (circular o cuadrado) con un ícono encima
function ControlButton({ background, icon, size, label, disabled, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
    >
      {({ pressed }) => (
        <ImageBackground
          source={background[disabled ? 'disabled' : pressed ? 'pressed' : 'normal']}
          resizeMode="stretch"
          style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
        >
          <Image source={icon} style={{ width: size * 0.55, height: size * 0.55, marginTop: -size * ICON_OFFSET }} resizeMode="contain" />
        </ImageBackground>
      )}
    </Pressable>
  );
}

// Flujo: Pantalla → hooks (cámara, ubicación) → captures.service → Edge API
// onNavigate cambia de tab (lo recibe de la navegación principal).
export default function CameraScreen({ onNavigate }) {
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
    return (
      <CaptureResultScreen
        {...outcome}
        onBack={() => { setOutcome(null); setReady(false); }}
        onNext={() => onNavigate('collection')}
      />
    );
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
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" onCameraReady={() => setReady(true)} />

      <View style={local.hint} pointerEvents="none">
        <Panel>
          <Text style={local.hintTitle}>APUNTÁ AL ANIMAL</Text>
          <Text style={local.hintText}>Foto real, no de pantalla: la IA lo revisa.</Text>
        </Panel>
      </View>

      <View style={local.frame} pointerEvents="none">
        <View style={[local.corner, local.topLeft]} />
        <View style={[local.corner, local.topRight]} />
        <View style={[local.corner, local.bottomLeft]} />
        <View style={[local.corner, local.bottomRight]} />
      </View>
      <Text style={local.frameText} pointerEvents="none">Mantené al animal dentro del marco</Text>

      {sending ? (
        <View style={local.loader} pointerEvents="none">
          <ActivityIndicator accessibilityLabel="Identificando animal" size="large" color={palette.blanco} />
        </View>
      ) : null}

      <View style={local.controls}>
        <ControlButton background={buttons.circle.rosa} icon={icons.arrows.arrowLeft} size={60} label="Ir al mapa" onPress={() => onNavigate('map')} />
        <ControlButton background={buttons.circle.amarillo} icon={icons.pokeballs.pokebolaSinSombra} size={84} label="Sacar foto" disabled={sending || !ready} onPress={capture} />
        <ControlButton background={buttons.square.azul} icon={icons.panel.paw} size={60} label="Ir a la colección" onPress={() => onNavigate('collection')} />
      </View>
    </View>
  );
}

const CORNER = { width: 36, height: 36, borderColor: palette.azul, position: 'absolute' };

const local = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.tinta },
  hint: { position: 'absolute', top: 16, left: 16, right: 16 },
  hintTitle: { fontFamily: fonts.display, fontSize: 10, color: palette.azul },
  hintText: { fontFamily: fonts.body, fontSize: 24, lineHeight: 26, color: palette.tinta, marginTop: 6 },
  frame: { position: 'absolute', top: '28%', bottom: '28%', left: 32, right: 32 },
  corner: CORNER,
  topLeft: { top: 0, left: 0, borderTopWidth: 6, borderLeftWidth: 6 },
  topRight: { top: 0, right: 0, borderTopWidth: 6, borderRightWidth: 6 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 6, borderLeftWidth: 6 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 6, borderRightWidth: 6 },
  frameText: { position: 'absolute', bottom: '22%', left: 0, right: 0, textAlign: 'center', fontFamily: fonts.body, fontSize: 24, color: palette.blanco, textShadowColor: palette.tinta, textShadowRadius: 4 },
  loader: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  controls: { position: 'absolute', bottom: 24, left: 24, right: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { width: '100%', marginTop: 32 },
});
