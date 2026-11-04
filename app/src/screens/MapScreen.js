import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, ImageBackground, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Polygon } from 'react-native-maps';
import AuthButton from '../components/AuthButton';
import useLocation from '../hooks/useLocation';
import { getSightings } from '../services/map.service';
import { H3_RESOLUTION, buildOverlay, cellOf, cellsForRegion } from '../utils/h3Overlay';
import { buttons, colors, fonts, icons, palette } from '../styles';

// Sin ubicación, el mapa arranca en Montevideo
const DEFAULT_REGION = { latitude: -34.9011, longitude: -56.1645, latitudeDelta: 0.08, longitudeDelta: 0.08 };
const USER_DELTA = 0.01;

// Estilo de cada hexágono del overlay de desarrollo
function hexStyle(hex) {
  if (hex.sightings > 0) {
    return {
      fillColor: 'rgba(255, 140, 0, 0.40)',
      strokeColor: hex.isUserCell ? '#0057FF' : '#FF8C00',
      strokeWidth: hex.isUserCell ? 4 : 2,
    };
  }
  if (hex.isUserCell) return { fillColor: 'rgba(0, 87, 255, 0.25)', strokeColor: '#0057FF', strokeWidth: 4 };
  if (hex.inUserRing) return { fillColor: 'rgba(0, 160, 255, 0.12)', strokeColor: '#0099FF', strokeWidth: 2 };
  return { fillColor: 'rgba(0, 0, 0, 0)', strokeColor: 'rgba(60, 60, 60, 0.55)', strokeWidth: 1 };
}

// Mapa base centrado en el usuario. Solo en desarrollo (__DEV__) hay un botón "H3" que dibuja los hexágonos del
// sistema: tu celda, sus vecinas y las celdas con avistamientos (GET /map/sightings).
export default function MapScreen() {
  const { permission, requestPermission, getCurrentPosition } = useLocation();
  const mapRef = useRef(null);
  const regionRef = useRef(DEFAULT_REGION);
  const fetchedCellRef = useRef(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState(null);

  // Overlay H3 (solo desarrollo)
  const [userCell, setUserCell] = useState(null);
  const [showHexes, setShowHexes] = useState(false);
  const [region, setRegion] = useState(null);
  const [sightings, setSightings] = useState([]);
  const [hexError, setHexError] = useState(null);

  const centerOnUser = useCallback(async () => {
    setLocating(true);
    setError(null);
    try {
      const { lat, lng } = await getCurrentPosition();
      setUserCell(cellOf(lat, lng));
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

  const overlayOn = __DEV__ && showHexes;

  const handleRegionChange = useCallback((next) => {
    regionRef.current = next;
    if (showHexes) setRegion(next);
  }, [showHexes]);

  const toggleHexes = useCallback(() => {
    setShowHexes((on) => !on);
    setRegion(regionRef.current);
  }, []);

  const hexes = useMemo(() => {
    if (!overlayOn || !region) return null;
    const cells = cellsForRegion(region);
    return cells ? buildOverlay({ cells, userCell, sightings }) : null;
  }, [overlayOn, region, userCell, sightings]);

  // Avistamientos alrededor del centro del mapa (k=2). Se piden de nuevo solo cuando cambia la celda del centro.
  const centerCell = overlayOn && region ? cellOf(region.latitude, region.longitude) : null;
  useEffect(() => {
    if (!centerCell) {
      fetchedCellRef.current = null;
      return undefined;
    }
    if (fetchedCellRef.current === centerCell) return undefined;
    fetchedCellRef.current = centerCell;
    let cancelled = false;
    getSightings({ h3Index: centerCell, k: 2 })
      .then((list) => {
        if (cancelled) return;
        setSightings(list);
        setHexError(null);
      })
      .catch((cause) => {
        if (cancelled) return;
        fetchedCellRef.current = null;
        setHexError(cause?.message || 'No se pudieron traer los avistamientos.');
      });
    return () => {
      cancelled = true;
    };
  }, [centerCell]);

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
        onRegionChangeComplete={handleRegionChange}
        accessibilityLabel="Mapa"
      >
        {hexes?.map((hex) => (
          <Polygon key={hex.id} coordinates={hex.coordinates} tappable={false} {...hexStyle(hex)} />
        ))}
      </MapView>

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

      {__DEV__ ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mostrar u ocultar los hexágonos H3 (solo desarrollo)"
            accessibilityState={{ selected: showHexes }}
            onPress={toggleHexes}
            style={[local.devToggle, showHexes && local.devToggleOn]}
          >
            <Text style={[local.devToggleText, showHexes && local.devToggleTextOn]}>H3</Text>
          </Pressable>

          {showHexes ? (
            <View style={local.devPanel}>
              <Text style={local.devText}>{`DEV · H3 resolución ${H3_RESOLUTION}`}</Text>
              <Text style={local.devText}>{`Tu celda: ${userCell ?? 'tocá el botón de GPS'}`}</Text>
              <Text style={local.devText}>
                {hexes
                  ? `En vista: ${hexes.length} celdas · ${hexes.filter((hex) => hex.sightings > 0).length} con avistamientos (${sightings.length} en total)`
                  : 'Acercá el mapa para ver los hexágonos'}
              </Text>
              <Text style={local.devText}>Azul: tu celda · Celeste: vecinas · Naranja: avistamientos</Text>
              {hexError ? <Text style={local.devError}>{`Error: ${hexError}`}</Text> : null}
            </View>
          ) : null}
        </>
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
  devToggle: {
    position: 'absolute', right: 16, bottom: 84, width: 56, height: 56, alignItems: 'center', justifyContent: 'center',
    backgroundColor: palette.fondo, borderWidth: 3, borderColor: palette.tinta, borderRadius: 4,
  },
  devToggleOn: { backgroundColor: palette.tinta },
  devToggleText: { fontFamily: fonts.body, fontSize: 24, color: palette.tinta },
  devToggleTextOn: { color: palette.fondo },
  devPanel: {
    position: 'absolute', left: 16, right: 84, bottom: 16, padding: 8, gap: 2,
    backgroundColor: palette.fondo, borderWidth: 3, borderColor: palette.tinta, borderRadius: 4,
  },
  devText: { fontFamily: fonts.body, fontSize: 16, lineHeight: 18, color: palette.tinta },
  devError: { fontFamily: fonts.body, fontSize: 16, lineHeight: 18, color: '#B00020' },
});
