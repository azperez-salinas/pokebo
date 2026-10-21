import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AuthButton from '../components/AuthButton';
import styles, { palette, fonts } from '../styles';

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

export default function CaptureResultScreen({ result, error, onBack }) {
  const capture = result?.data?.capture;
  const info = error ? ERRORS[error.code] || GENERIC : null;

  return (
    <View style={styles.content}>
      {capture ? (
        <>
          <Text accessibilityRole="header" style={styles.title}>¡CAPTURA!</Text>
          <Text style={styles.message}>{capture.species?.commonName || 'Especie registrada'}</Text>
        </>
      ) : (
        <>
          <Text accessibilityRole="header" style={styles.title}>{(info?.title || GENERIC.title).toUpperCase()}</Text>
          <Text accessibilityRole="alert" style={[styles.message, local.error]}>{info?.message || GENERIC.message}</Text>
        </>
      )}
      <View style={local.actions}>
        <AuthButton label={capture ? 'VOLVER A LA CÁMARA' : 'REINTENTAR'} onPress={onBack} />
      </View>
    </View>
  );
}

const local = StyleSheet.create({
  error: { color: palette.rosa, fontFamily: fonts.body },
  actions: { width: '100%', marginTop: 32 },
});
