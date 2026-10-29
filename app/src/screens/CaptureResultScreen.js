import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import AuthButton from '../components/AuthButton';
import Panel from '../components/Panel';
import { photoSource } from '../services/images.service';
import styles, { icons, palette, fonts } from '../styles';

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

const BAR_SEGMENTS = 10;

// Barra de confianza de 10 segmentos (confidence va de 0 a 1)
function ConfidenceBar({ confidence }) {
  const percent = Math.round(Math.min(Math.max(confidence, 0), 1) * 100);
  const filled = Math.round((percent / 100) * BAR_SEGMENTS);
  return (
    <View style={local.confidenceRow} accessible accessibilityLabel={`Confianza ${percent}%`}>
      <Text style={local.label}>Confianza</Text>
      <View style={local.bar}>
        {Array.from({ length: BAR_SEGMENTS }, (_, index) => (
          <View key={index} style={[local.segment, index < filled && local.segmentFilled]} />
        ))}
      </View>
      <Text style={local.percent}>{percent}%</Text>
    </View>
  );
}

// onBack: OTRA FOTO (o REINTENTAR) vuelve a la cámara. onNext: SIGUIENTE abre la colección.
export default function CaptureResultScreen({ result, error, onBack, onNext }) {
  const capture = result?.data?.capture;
  const info = error ? ERRORS[error.code] || GENERIC : null;

  if (!capture) {
    return (
      <View style={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>{(info?.title || GENERIC.title).toUpperCase()}</Text>
        <Text accessibilityRole="alert" style={[styles.message, local.error]}>{info?.message || GENERIC.message}</Text>
        <View style={local.actions}>
          <AuthButton label="REINTENTAR" onPress={onBack} />
        </View>
      </View>
    );
  }

  return (
    <View style={local.container}>
      <View style={local.titleRow}>
        <Image source={icons.extras.star} style={local.star} resizeMode="contain" />
        <Text accessibilityRole="header" style={local.title}>{'¡CAPTURA\nLOGRADA!'}</Text>
        <Image source={icons.extras.star} style={local.star} resizeMode="contain" />
      </View>

      <Panel style={local.photoPanel}>
        <Image source={photoSource(capture.photoUrl)} style={local.photo} resizeMode="cover" accessibilityLabel="Foto de la captura" />
        {capture.isNewSpecies ? (
          <View style={local.badge}>
            <Text style={local.badgeText}>NUEVA</Text>
          </View>
        ) : null}
      </Panel>

      <Panel style={local.infoPanel}>
        <Text style={local.name}>{capture.species?.commonName || 'Especie registrada'}</Text>
        {capture.species?.scientificName ? <Text style={local.scientific}>{capture.species.scientificName}</Text> : null}
        {typeof capture.confidence === 'number' ? <ConfidenceBar confidence={capture.confidence} /> : null}
      </Panel>

      <View style={local.actions}>
        <AuthButton label="SIGUIENTE" onPress={onNext} />
        <View style={local.gap} />
        <AuthButton label="OTRA FOTO" color="yellow" onPress={onBack} />
      </View>
    </View>
  );
}

const local = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.fondo, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  star: { width: 36, height: 36 },
  title: { fontFamily: fonts.display, fontSize: 16, lineHeight: 24, color: palette.tinta, textAlign: 'center', marginHorizontal: 12 },
  photoPanel: { padding: 0, overflow: 'hidden', aspectRatio: 1.4, backgroundColor: palette.linea },
  photo: { width: '100%', height: '100%' },
  badge: { position: 'absolute', top: 8, left: 8, backgroundColor: palette.rosa, borderWidth: 3, borderColor: palette.tinta, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontFamily: fonts.display, fontSize: 10, color: palette.tinta },
  infoPanel: { marginTop: 14, paddingVertical: 14 },
  name: { fontFamily: fonts.display, fontSize: 20, lineHeight: 28, color: palette.tinta },
  scientific: { fontFamily: fonts.body, fontSize: 24, color: palette.azul, fontStyle: 'italic', marginTop: 4 },
  confidenceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  label: { fontFamily: fonts.body, fontSize: 22, color: palette.tinta, width: 96 },
  bar: { flex: 1, flexDirection: 'row', height: 24, padding: 3, backgroundColor: palette.linea, borderWidth: 3, borderColor: palette.tinta, borderRadius: 4 },
  segment: { flex: 1, marginHorizontal: 1, backgroundColor: palette.linea },
  segmentFilled: { backgroundColor: palette.verde },
  percent: { fontFamily: fonts.body, fontSize: 22, color: palette.tinta, width: 52, textAlign: 'right' },
  error: { color: palette.rosa, fontFamily: fonts.body },
  actions: { width: '100%', marginTop: 'auto' },
  gap: { height: 12 },
});
