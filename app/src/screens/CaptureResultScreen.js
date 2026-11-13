import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Button from '../components/Button';
import Chip from '../components/Chip';
import Icon from '../components/Icon';
import Panel from '../components/Panel';
import ProgressBar from '../components/ProgressBar';
import AuthImage from '../components/AuthImage';
import { photoSource } from '../services/images.service';
import styles, { icons, palette, spacing, type } from '../styles';

// Mensajes según el `code` de la API (tabla de errores del documento de diseño). El cliente decide por code.
const ERRORS = {
  SPECIES_NOT_RECOGNIZED: { title: 'No reconocimos la especie', message: 'Hay un animal, pero no pudimos identificarlo. Probá con otra foto.' },
  NO_ANIMAL_DETECTED: { title: 'Sin animal', message: 'No encontramos un animal en la foto.' },
  IDENTIFICATION_UNAVAILABLE: { title: 'Identificación no disponible', message: 'No pudimos identificar la foto ahora. Probá de nuevo en unos minutos.' },
  PAYLOAD_TOO_LARGE: { title: 'Foto muy pesada', message: 'La foto supera el tamaño permitido. Probá de nuevo.' },
  RATE_LIMITED: { title: 'Esperá un momento', message: 'Hiciste muchas capturas seguidas. Esperá un momento y probá de nuevo.' },
  VALIDATION_ERROR: { title: 'Datos inválidos', message: 'No pudimos enviar la foto o la ubicación. Probá de nuevo.' },
  LOCATION_DENIED: { title: 'Sin ubicación', message: 'Necesitamos tu ubicación para registrar dónde viste al animal. Habilitala para capturar.' },
  LOCATION_UNAVAILABLE: { title: 'Sin ubicación', message: 'No pudimos obtener tu ubicación. Revisá que el GPS esté activado.' },
  NETWORK_ERROR: { title: 'Sin conexión', message: 'No se pudo conectar al servidor. Revisá tu conexión.' },
  TIMEOUT: { title: 'Sin respuesta', message: 'El servidor tardó demasiado en responder. Probá de nuevo.' },
};
const GENERIC = { title: 'Algo salió mal', message: 'No se pudo completar la captura. Probá de nuevo.' };

// Barra de confianza de 10 segmentos (confidence va de 0 a 1)
function ConfidenceBar({ confidence }) {
  const percent = Math.round(Math.min(Math.max(confidence, 0), 1) * 100);
  return (
    <View style={local.confidenceRow} accessible accessibilityLabel={`Confianza ${percent}%`}>
      <Text style={local.label}>Confianza</Text>
      <ProgressBar style={local.bar} value={percent} max={100} color="verde" />
      <Text style={local.percent}>{percent}%</Text>
    </View>
  );
}

// onBack: OTRA FOTO (o REINTENTAR) vuelve a la cámara. onNext: SIGUIENTE abre la colección.
export default function CaptureResultScreen({ result, error, onBack, onNext }) {
  const capture = result?.data?.capture;
  const unlocked = result?.data?.unlockedAchievements ?? [];
  const info = error ? ERRORS[error.code] || GENERIC : null;

  if (!capture) {
    return (
      <View style={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>{(info?.title || GENERIC.title).toUpperCase()}</Text>
        <Text accessibilityRole="alert" style={[styles.message, local.error]}>{info?.message || GENERIC.message}</Text>
        <View style={local.actions}>
          <Button label="REINTENTAR" onPress={onBack} />
        </View>
      </View>
    );
  }

  return (
    <View style={local.container}>
      <View style={local.titleRow}>
        <Icon source={icons.extras.star} size={48} />
        <Text accessibilityRole="header" style={local.title}>{'¡CAPTURA\nLOGRADA!'}</Text>
        <Icon source={icons.extras.star} size={48} />
      </View>

      <Panel style={local.photoPanel}>
        <AuthImage source={photoSource(capture.photoUrl)} style={local.photo} resizeMode="cover" accessibilityLabel="Foto de la captura" />
        {capture.isNewSpecies ? (
          <View style={local.badge}>
            <Chip label="NUEVA" color={palette.rosa} />
          </View>
        ) : null}
      </Panel>

      <Panel style={local.infoPanel}>
        <Text style={local.name}>{capture.species?.commonName || 'Especie registrada'}</Text>
        {capture.species?.scientificName ? <Text style={local.scientific}>{capture.species.scientificName}</Text> : null}
        {typeof capture.confidence === 'number' ? <ConfidenceBar confidence={capture.confidence} /> : null}
      </Panel>

      {unlocked.length > 0 ? (
        <Panel style={local.achievementPanel}>
          <Text style={local.achievementTitle}>{unlocked.length === 1 ? '¡LOGRO DESBLOQUEADO!' : '¡LOGROS DESBLOQUEADOS!'}</Text>
          {unlocked.map((achievement) => (
            <View key={achievement.code} style={local.achievementRow}>
              <Icon source={icons.extras.star} size={24} />
              <Text style={local.achievementName}>{achievement.name}</Text>
            </View>
          ))}
        </Panel>
      ) : null}

      <View style={local.actions}>
        <Button label="SIGUIENTE" onPress={onNext} />
        <Button label="OTRA FOTO" color="amarillo" onPress={onBack} />
      </View>
    </View>
  );
}

const local = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.fondo, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  title: { ...type.title, color: palette.tinta, textAlign: 'center', marginHorizontal: spacing.md },
  photoPanel: { padding: 0, overflow: 'hidden', aspectRatio: 1.4, backgroundColor: palette.linea },
  photo: { width: '100%', height: '100%' },
  badge: { position: 'absolute', top: spacing.sm, left: spacing.sm },
  infoPanel: { marginTop: spacing.md, paddingVertical: spacing.md },
  name: { ...type.title, color: palette.tinta },
  scientific: { ...type.subtitle, color: palette.azul, marginTop: spacing.xs },
  confidenceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  label: { ...type.body, color: palette.tinta, width: 96 },
  bar: { flex: 1 },
  percent: { ...type.body, color: palette.tinta, width: 52, textAlign: 'right' },
  achievementPanel: { marginTop: spacing.md, paddingVertical: spacing.sm + 2, backgroundColor: palette.amarillo },
  achievementTitle: { ...type.labelLg, color: palette.tinta, marginBottom: spacing.sm },
  achievementRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  achievementName: { ...type.body, color: palette.tinta, flex: 1 },
  error: { color: palette.rosa },
  actions: { width: '100%', marginTop: 'auto', gap: spacing.md },
});
