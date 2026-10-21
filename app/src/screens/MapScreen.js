import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, ImageBackground, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView from 'react-native-maps';
import AuthButton from '../components/AuthButton';
import useLocation from '../hooks/useLocation';
import { buttons, colors, fonts, icons, palette } from '../styles';

// Sin ubicación, el mapa arranca en Montevideo
const DEFAULT_REGION = { latitude: -34.9011, longitude: -56.1645, latitudeDelta: 0.08, longitudeDelta: 0.08 };
const USER_DELTA = 0.01;

// Mapa base centrado en el usuario. Los avistamientos (GET /map/sightings) se suman cuando exista la captura real.
export default function MapScreen() {
  const { permission, requestPermission, getCurrentPosition } = useLocation();
  const mapRef = useRef(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState(null);

  const centerOnUser = useCallback(async () => {
    setLocating(true);
    setError(null);
    try {
      const { lat, lng } = await getCurrentPosition();
      mapRef.current?.animateToRegion({ latitude: lat, longitude: lng, latitudeDelta: USER_DELTA, longitudeDelta: USER_DELTA }, 600);
    } catch (cause) {
      setError(cause);
    } finally {
      setLocating(false);
    }
  }, [getCurrentPosition]);

  // Si el permiso ya estaba dado, se centra solo al abrir. Si no, primero se explica para qué se usa.
  useEffect(() => {
    if (permission?.granted) centerOnUser();
  }, [permission?.granted, centerOnUser]);

  async function enableLocation() {
    if (permission && !permission.canAskAgain) return Linking.openSettings();
    const response = await requestPermission();
    if (!response.granted) setError({ code: 'LOCATION_DENIED' });
  }

  const granted = !!permission?.granted;
  const needsPermission = permission && !granted;

  return (
    <View style={local.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={DEFAULT_REGION}
        showsUserLocation={granted}
        showsMyLocationButton={false}
        showsPointsOfInterest={false}
        toolbarEnabled={false}
        accessibilityLabel="Mapa"
      />

      {needsPermission ? (
        <View style={local.card}>
          <Text style={local.cardText}>
            {permission.canAskAgain
              ? 'Activá tu ubicación para ver el mapa centrado donde estás.'
              : 'El permiso de ubicación está desactivado. Habilitalo en los ajustes del teléfono.'}
          </Text>
          <AuthButton label={permission.canAskAgain ? 'USAR MI UBICACIÓN' : 'ABRIR AJUSTES'} onPress={enableLocation} />
        </View>
      ) : null}

      {granted && error?.code === 'LOCATION_UNAVAILABLE' ? (
        <View style={local.card}>
          <Text accessibilityRole="alert" style={local.cardText}>No pudimos obtener tu ubicación. Revisá que el GPS esté activado.</Text>
        </View>
      ) : null}

      {granted ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Centrar el mapa en mi ubicación"
          accessibilityState={{ busy: locating }}
          disabled={locating}
          onPress={centerOnUser}
          style={local.recenter}
        >
          {({ pressed }) => (
            <ImageBackground
              source={buttons.circle.blanco[locating ? 'disabled' : pressed ? 'pressed' : 'normal']}
              resizeMode="stretch"
              style={local.recenterImage}
            >
              {locating
                ? <ActivityIndicator color={colors.accent} />
                : <Image source={icons.extras.gps} style={local.recenterIcon} resizeMode="contain" />}
            </ImageBackground>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const local = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.fondo },
  card: {
    position: 'absolute', top: 16, left: 16, right: 16, padding: 16, gap: 12,
    backgroundColor: palette.fondo, borderWidth: 3, borderColor: palette.tinta, borderRadius: 4,
  },
  cardText: { fontFamily: fonts.body, fontSize: 20, lineHeight: 22, color: palette.tinta, textAlign: 'center' },
  recenter: { position: 'absolute', right: 16, bottom: 16 },
  recenterImage: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', paddingBottom: 3 },
  recenterIcon: { width: 24, height: 24 },
});
