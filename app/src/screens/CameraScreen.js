import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView } from 'expo-camera';
import Button from '../components/Button';
import Icon from '../components/Icon';
import Panel from '../components/Panel';
import PixelBox from '../components/PixelBox';
import PixelSpinner from '../components/PixelSpinner';
import CaptureResultScreen from './CaptureResultScreen';
import { notifyUnlockedAchievements } from '../services/achievementAlerts';
import { notifyInboxChanged } from '../store/notificationsStore';
import useCamera from '../hooks/useCamera';
import useLocation from '../hooks/useLocation';
import { createCapture } from '../services/captures.service';
import styles, { icons, palette, spacing, type } from '../styles';

// Botón de captura: cuadrado con sombra dura (como el resto de los botones) y un ícono centrado
function ControlButton({ icon, size, label, disabled, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
    >
      {({ pressed }) => (
        <PixelBox
          pressed={pressed && !disabled}
          backgroundColor={disabled ? palette.linea : palette.amarillo}
          style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon source={icon} size={48} />
        </PixelBox>
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
  const [frozenUri, setFrozenUri] = useState(null); // la foto recién sacada, se muestra encima de la cámara mientras se identifica
  const [outcome, setOutcome] = useState(null); // { result } o { error }

  async function capture() {
    if (sending || !ready) return; // evita envíos dobles
    setSending(true);
    try {
      // La ubicación se pide en paralelo: antes se esperaba el GPS antes de sacar la foto y el botón parecía colgado.
      const [photo, position] = await Promise.all([takePhoto(setFrozenUri), getCurrentPosition()]);
      const result = await createCapture({ uri: photo.uri, ...position });
      setOutcome({ result });
      // La captura puede haber creado avisos en el buzón y desbloqueado logros
      notifyInboxChanged();
      notifyUnlockedAchievements(result?.data?.unlockedAchievements);
    } catch (error) {
      setOutcome({ error });
    } finally {
      setSending(false);
      setFrozenUri(null);
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
    return <View style={styles.content}><PixelSpinner accessibilityLabel="Cargando cámara" /></View>;
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
          <Button label={permission.canAskAgain ? 'PERMITIR CÁMARA' : 'ABRIR AJUSTES'} onPress={askPermission} />
        </View>
      </View>
    );
  }

  return (
    <View style={local.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" onCameraReady={() => setReady(true)} />
      {frozenUri ? (
        <Image source={{ uri: frozenUri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel="Foto sacada" />
      ) : null}

      <View style={local.hint} pointerEvents="none">
        <Panel>
          <Text style={local.hintTitle}>APUNTÁ AL ANIMAL</Text>
          <Text style={local.hintText}>Centra al animal lo mejor que puedas y capturalo.</Text>
        </Panel>
      </View>

      <View style={local.frame} pointerEvents="none">
        <View style={[local.corner, local.topLeft]} />
        <View style={[local.corner, local.topRight]} />
        <View style={[local.corner, local.bottomLeft]} />
        <View style={[local.corner, local.bottomRight]} />
      </View>


      {sending ? (
        <View style={local.loader} pointerEvents="none">
          <PixelSpinner accessibilityLabel="Identificando animal" size={16} />
        </View>
      ) : null}

      <View style={local.controls}>
        <ControlButton icon={icons.pokeballs.pokebolaSinSombra} size={80} label="Sacar foto" disabled={sending || !ready} onPress={capture} />
      </View>
    </View>
  );
}

const CORNER = { width: 36, height: 36, borderColor: palette.azul, position: 'absolute' };

const local = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.tinta },
  hint: { position: 'absolute', top: spacing.lg, left: spacing.lg, right: spacing.lg },
  hintTitle: { ...type.labelLg, color: palette.azul },
  hintText: { ...type.subtitle, color: palette.tinta, marginTop: spacing.sm },
  frame: { position: 'absolute', top: '28%', bottom: '28%', left: 32, right: 32 },
  corner: CORNER,
  topLeft: { top: 0, left: 0, borderTopWidth: 6, borderLeftWidth: 6 },
  topRight: { top: 0, right: 0, borderTopWidth: 6, borderRightWidth: 6 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 6, borderLeftWidth: 6 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 6, borderRightWidth: 6 },
  loader: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20, 16, 10, 0.4)' },
  controls: { position: 'absolute', bottom: spacing.xl, left: spacing.xl, right: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  actions: { width: '100%', marginTop: spacing.xl },
});
