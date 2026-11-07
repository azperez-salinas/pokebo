import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Image, ImageBackground, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, Polygon } from 'react-native-maps';
import AuthButton from '../components/AuthButton';
import useLocation from '../hooks/useLocation';
import { getSightings } from '../services/map.service';
import { getMyCaptures } from '../services/captures.service';
import { photoSource } from '../services/images.service';
import { H3_RESOLUTION, buildOverlay, cellOf, cellsForRegion } from '../utils/h3Overlay';
import { buttons, colors, fonts, icons, palette } from '../styles';

// Sin ubicación, el mapa arranca en Montevideo
const DEFAULT_REGION = { latitude: -34.9011, longitude: -56.1645, latitudeDelta: 0.08, longitudeDelta: 0.08 };
// ~330 m de alto: con celdas de ~28 m el overlay solo dibuja si el mapa está así de cerca
const USER_DELTA = 0.003;
// Cada cuántos metros se recalcula la celda del usuario con el mapa abierto (las celdas miden ~28 m)
const WATCH_DISTANCE_METERS = 5;

const SIGHTINGS_REFRESH_MS = 45000;
const SIGHTINGS_RADIUS_METERS = 500;

function elapsedSince(seenAt) {
  const timestamp = new Date(seenAt).getTime();
  if (!Number.isFinite(timestamp)) {
    return 'Fecha desconocida';
  }

  const minutes = Math.max(
    0,
    Math.floor((Date.now() - timestamp) / 60000)
  );
  if (minutes < 1) return 'Hace menos de 1 minuto';
  if (minutes < 60) {
    return `Hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  }

  const days = Math.floor(hours / 24);
  return `Hace ${days} ${days === 1 ? 'día' : 'días'}`;
}

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
  const userLocationRef = useRef(null);
  const fetchedCellRef = useRef(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState(null);

  // Overlay H3 (solo desarrollo)
  const [userCell, setUserCell] = useState(null);
  const [fix, setFix] = useState(null); // última lectura del GPS (solo para el panel de desarrollo)
  const [showHexes, setShowHexes] = useState(false);
  const [region, setRegion] = useState(null);
  const [sightings, setSightings] = useState([]);
  const [hexError, setHexError] = useState(null);

  // Avistamientos geográficos visibles en el mapa.
  const [mapSightings, setMapSightings] = useState([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState(null);

  // Avistamiento seleccionado y fotografía propia.
  const [selectedSighting, setSelectedSighting] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState(null);

  // Control de respuestas antiguas.
  const mapRequestId = useRef(0);
  const mountedRef = useRef(false);

  const refreshMapSightings = useCallback(async () => {
    const userLocation = userLocationRef.current;
    if (!userLocation) {
      mapRequestId.current += 1;
      if (mountedRef.current) {
        setMapSightings([]);
        setMapLoading(false);
        setMapError(null);
      }
      return;
    }

    const requestId = ++mapRequestId.current;

    setMapLoading(true);
    setMapError(null);

    try {
      const list = await getSightings({
        lat: userLocation.latitude,
        lng: userLocation.longitude,
        radiusMeters: SIGHTINGS_RADIUS_METERS,
      });

      if (!mountedRef.current || requestId !== mapRequestId.current) {
        return;
      }

      setMapSightings(
        Array.isArray(list)
          ? list.filter((item) =>
              item.location &&
              Number.isFinite(item.location.lat) &&
              Number.isFinite(item.location.lng)
            )
          : []
      );
    } catch (cause) {
      if (!mountedRef.current || requestId !== mapRequestId.current) {
        return;
      }

      setMapError(
        cause?.message || 'No se pudieron cargar los avistamientos.'
      );
    } finally {
      if (mountedRef.current && requestId === mapRequestId.current) {
        setMapLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // Consulta inicial al abrir el mapa.
    refreshMapSightings();

    // Actualización cada 45 segundos mientras el mapa esté montado.
    const refreshIfActive = () => {
      if (AppState.currentState === 'active') refreshMapSightings();
    };
    const intervalId = setInterval(refreshIfActive, SIGHTINGS_REFRESH_MS);
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshMapSightings();
    });

    return () => {
      mountedRef.current = false;

      clearInterval(intervalId);
      appStateSubscription.remove();
      // Invalida cualquier respuesta que todavía esté pendiente.
      mapRequestId.current += 1;
    };
  }, [refreshMapSightings]);

  const centerOnUser = useCallback(async () => {
    setLocating(true);
    setError(null);
    try {
      const { lat, lng } = await getCurrentPosition();
      userLocationRef.current = { latitude: lat, longitude: lng };
      setUserCell(cellOf(lat, lng));
      mapRef.current?.animateToRegion({ latitude: lat, longitude: lng, latitudeDelta: USER_DELTA, longitudeDelta: USER_DELTA }, 600);
      await refreshMapSightings();
    } catch (cause) {
      setError(cause);
    } finally {
      setLocating(false);
    }
  }, [getCurrentPosition, refreshMapSightings]);

  // Si el permiso ya estaba dado, se centra solo al abrir. Si no, primero se explica para qué se usa.
  useEffect(() => {
    if (permission?.granted) centerOnUser();
    else if (permission && !permission.granted) {
      userLocationRef.current = null;
      setMapSightings([]);
    }
  }, [permission?.granted, centerOnUser]);

  // Mientras el mapa está abierto, la celda del usuario sigue sus movimientos (sin mover la cámara del mapa).
  useEffect(() => {
    if (!permission?.granted) return undefined;
    let subscription = null;
    let cancelled = false;
    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: WATCH_DISTANCE_METERS },
      ({ coords }) => {
        userLocationRef.current = { latitude: coords.latitude, longitude: coords.longitude };
        setUserCell(cellOf(coords.latitude, coords.longitude));
        setFix((prev) => ({ accuracy: Math.round(coords.accuracy ?? 0), count: (prev?.count ?? 0) + 1 }));
      },
    )
      .then((sub) => {
        if (cancelled) sub.remove();
        else subscription = sub;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [permission?.granted]);

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

  useEffect(() => {
    if (!selectedSighting) {
      setSelectedPhoto(null);
      setPhotoError(null);
      setPhotoLoading(false);
      return;
    }

    let active = true;

    setSelectedPhoto(null);
    setPhotoError(null);
    setPhotoLoading(false);

    const speciesId = selectedSighting.species?.id;

    if (!speciesId) {
      return;
    }

    setPhotoLoading(true);

    getMyCaptures({
      speciesId,
      limit: 1,
    })
      .then((response) => {
        if (!active) return;

        const capture = response?.captures?.[0];

        // Solamente se utiliza una fotografía del usuario autenticado.
        setSelectedPhoto(capture?.photoUrl ?? null);
      })
      .catch((cause) => {
        if (!active) return;

        setPhotoError(
          cause?.message || 'No se pudo consultar tu colección.'
        );
      })
      .finally(() => {
        if (active) {
          setPhotoLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedSighting]);

  const toggleHexes = useCallback(() => {
    setShowHexes((on) => !on);
    setRegion(regionRef.current);
  }, []);

  const hexes = useMemo(() => {
    if (!overlayOn || !region) return null;
    const cells = cellsForRegion(region);
    return cells ? buildOverlay({ cells, userCell, sightings }) : null;
  }, [overlayOn, region, userCell, sightings]);

  // El overlay de desarrollo también se limita a la ubicación propia, nunca al centro explorado del mapa.
  const centerCell = overlayOn ? userCell : null;
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
        {mapSightings.map((sighting) => (
          <Marker
            key={sighting.id}
            coordinate={{
              latitude: sighting.location.lat,
              longitude: sighting.location.lng,
            }}
            title={sighting.species?.commonName ?? 'Especie desconocida'}
            onPress={() => setSelectedSighting(sighting)}
            tracksViewChanges={false}
          >
            <View style={local.sightingMarker}>
              <Text style={local.sightingMarkerText}>!</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Actualizar avistamientos"
        accessibilityState={{ busy: mapLoading }}
        onPress={refreshMapSightings}
        disabled={mapLoading}
        style={({ pressed }) => [
          local.refreshButton,
          pressed && local.refreshPressed,
        ]}
      >
        {mapLoading ? (
          <ActivityIndicator color={palette.azul} />
        ) : (
          <Text style={local.refreshText}>↻</Text>
        )}
      </Pressable>

      {mapError ? (
        <View style={local.mapErrorBox}>
          <Text accessibilityRole="alert" style={local.mapErrorText}>
            {mapError}
          </Text>
        </View>
      ) : null}

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
              <Text style={local.devText}>{fix ? `GPS: lectura #${fix.count} · ±${fix.accuracy} m` : 'GPS: sin lecturas todavía'}</Text>
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

      {selectedSighting ? (
        <View style={local.sightingCard}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar información del avistamiento"
            onPress={() => setSelectedSighting(null)}
            style={local.closeButton}
          >
            <Text style={local.closeText}>X</Text>
          </Pressable>

          <Text style={local.sightingTitle}>
            {selectedSighting.species?.commonName ?? 'Especie desconocida'}
          </Text>

          <Text style={local.sightingTime}>
            {elapsedSince(selectedSighting.seenAt)}
          </Text>

          <View style={local.sightingPhotoFrame}>
            {photoLoading ? (
              <ActivityIndicator color={palette.azul} />
            ) : selectedPhoto ? (
              <Image
                source={photoSource(selectedPhoto)}
                style={local.sightingPhoto}
                resizeMode="cover"
              />
            ) : (
              <Text style={local.unknownSpecies}>?</Text>
            )}
          </View>

          {photoError ? (
            <Text style={local.sightingInfo} accessibilityRole="alert">
              {photoError}
            </Text>
          ) : (
            <Text style={local.sightingInfo}>
              {photoLoading
                ? 'Buscando en tu colección...'
                : selectedPhoto
                  ? 'Especie registrada en tu colección'
                  : 'Todavía no capturaste esta especie'}
            </Text>
          )}
        </View>
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

  sightingMarker: {
    width: 36,
    height: 36,
    backgroundColor: palette.amarillo,
    borderWidth: 3,
    borderColor: palette.tinta,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 6,
  },

  sightingMarkerText: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: palette.tinta,
  },

  refreshButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 48,
    height: 48,
    backgroundColor: palette.blanco,
    borderWidth: 3,
    borderBottomWidth: 6,
    borderColor: palette.tinta,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },

  refreshPressed: {
    transform: [{ translateY: 4 }],
    borderBottomWidth: 3,
  },

  refreshText: {
    fontFamily: fonts.body,
    fontSize: 36,
    color: palette.azul,
    lineHeight: 40,
  },

  mapErrorBox: {
    position: 'absolute',
    top: 72,
    left: 16,
    right: 16,
    backgroundColor: palette.blanco,
    borderWidth: 3,
    borderColor: palette.rosa,
    borderRadius: 4,
    padding: 8,
  },

  mapErrorText: {
    fontFamily: fonts.body,
    fontSize: 18,
    color: palette.rosa,
    textAlign: 'center',
  },

  sightingCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 150,
    backgroundColor: palette.fondo,
    borderWidth: 4,
    borderBottomWidth: 8,
    borderColor: palette.tinta,
    borderRadius: 4,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },

  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    backgroundColor: palette.rosa,
    borderWidth: 2,
    borderColor: palette.tinta,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },

  closeText: {
    fontFamily: fonts.display,
    fontSize: 12,
    color: palette.blanco,
  },

  sightingTitle: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: palette.tinta,
    textAlign: 'center',
    marginRight: 20,
    marginLeft: 20,
    marginTop: 8,
  },

  sightingTime: {
    fontFamily: fonts.body,
    fontSize: 22,
    color: palette.azul,
  },

  sightingPhotoFrame: {
    width: 110,
    height: 110,
    backgroundColor: palette.blanco,
    borderWidth: 3,
    borderColor: palette.tinta,
    borderRadius: 4,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sightingPhoto: {
    width: '100%',
    height: '100%',
  },

  unknownSpecies: {
    fontFamily: fonts.display,
    fontSize: 48,
    color: palette.tinta,
  },

  sightingInfo: {
    fontFamily: fonts.body,
    fontSize: 18,
    color: palette.tinta,
    textAlign: 'center',
  },
});
