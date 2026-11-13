import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Image, ImageBackground, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, Polygon, PROVIDER_GOOGLE } from 'react-native-maps';
import AuthButton from '../components/AuthButton';
import useLocation from '../hooks/useLocation';
import { getSightings } from '../services/map.service';
import { getMyCaptures } from '../services/captures.service';
import AuthImage from '../components/AuthImage';
import { photoSource } from '../services/images.service';
import { H3_RESOLUTION, buildOverlay, cellOf, cellsForRegion } from '../utils/h3Overlay';
import { boundsOf, cameraDistanceForLongitudeSpan, clampToBounds, regionFitting, ringOf, zoomForLongitudeSpan } from '../utils/mapView';
import {
  FALLBACK_REGION,
  FOLLOW_ANIMATION_MS,
  HEX_FIT_FACTOR,
  IOS_CAMERA_FOV_DEGREES,
  LOCK_MAP_MOVEMENT,
  MAP_PADDING,
  MAP_STYLE,
  RECENTER_ANIMATION_MS,
  RING_FIT_FACTOR,
  RING_K,
  SIGHTINGS_REFRESH_MS,
  WATCH_DISTANCE_METERS,
} from '../config/map';
import { buttons, colors, fonts, icons, palette } from '../styles';

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
// La navegación mantiene esta pantalla montada al cambiar de pestaña (active=false solo la oculta), así el mapa
// conserva su cámara, zoom y ubicación sin recargarse. Con active=false se pausan el GPS y los refrescos.
export default function MapScreen({ active = true }) {
  const { permission, requestPermission, getCurrentPosition } = useLocation();
  const mapRef = useRef(null);
  const regionRef = useRef(FALLBACK_REGION);
  const userLocationRef = useRef(null);
  const fetchedCellRef = useRef(null);
  const userCellRef = useRef(null);
  const usedFallbackRef = useRef(false); // el mapa arrancó en la región por defecto (sin permiso o sin GPS)
  const locatingInitialRef = useRef(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState(null);

  // Encuadre: el mapa se crea recién cuando se conoce el tamaño de la pantalla y la ubicación inicial,
  // así arranca directo en el hexágono del usuario (sin pasar por otra región ni animar el acercamiento).
  const [layout, setLayout] = useState(null); // { width, height } en dp
  const [initialRegion, setInitialRegion] = useState(null);
  const [mapReady, setMapReady] = useState(false);

  // Hexágono del usuario (y overlay H3 de desarrollo)
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
  const mapFetchingRef = useRef(false);

  const refreshMapSightings = useCallback(async () => {
    // Evitar consultas simultáneas.
    if (mapFetchingRef.current) return;

    mapFetchingRef.current = true;
    const requestId = ++mapRequestId.current;


    setMapLoading(true);
    setMapError(null);

    try {
      // Hexágono real del usuario (GPS), nunca el centro del mapa. El alcance es su hexágono + RING_K anillos.
      let cell = userCellRef.current;
      if (!cell) {
        const { lat, lng } = await getCurrentPosition();
        cell = cellOf(lat, lng);
      }

      if (!mountedRef.current || requestId !== mapRequestId.current) {
        return;
      }

      const list = await getSightings({ h3Index: cell, k: RING_K });

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
      if (mountedRef.current && requestId === mapRequestId.current) {
        setMapError(
          cause?.message || 'No se pudieron cargar los avistamientos.'
        );
      }

    } finally {
      mapFetchingRef.current = false;

      if (mountedRef.current && requestId === mapRequestId.current) {
        setMapLoading(false);
      }
    }
  }, [getCurrentPosition]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Avistamientos: consulta al activarse y cada SIGHTINGS_REFRESH_MS mientras el mapa está a la vista.
  useEffect(() => {
    if (!permission?.granted || !active) return undefined;

    refreshMapSightings();

    const refreshIfActive = () => {
      if (AppState.currentState === 'active') refreshMapSightings();
    };
    const intervalId = setInterval(refreshIfActive, SIGHTINGS_REFRESH_MS);
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshMapSightings();
    });

    return () => {
      clearInterval(intervalId);
      appStateSubscription.remove();

      // Invalida cualquier respuesta que todavía esté pendiente.
      mapRequestId.current += 1;
    };
  }, [permission?.granted, active, refreshMapSightings]);

  // Guarda la posición del usuario y su hexágono. Devuelve el punto.
  const applyPosition = useCallback((lat, lng) => {
    const point = { latitude: lat, longitude: lng };
    userLocationRef.current = point;
    userCellRef.current = cellOf(lat, lng);
    setUserCell(userCellRef.current);
    return point;
  }, []);

  // Región que muestra el hexágono del usuario completo, centrada en su ubicación
  const hexRegion = useCallback((point, size) => {
    const bounds = boundsOf([cellOf(point.latitude, point.longitude)]);
    return regionFitting(bounds, point, size.height / size.width, HEX_FIT_FACTOR);
  }, []);

  const centerOnUser = useCallback(async () => {
    setLocating(true);
    setError(null);
    try {
      const { lat, lng } = await getCurrentPosition();
      const point = applyPosition(lat, lng);
      if (layout) mapRef.current?.animateToRegion(hexRegion(point, layout), RECENTER_ANIMATION_MS);
      await refreshMapSightings();
    } catch (cause) {
      setError(cause);
    } finally {
      setLocating(false);
    }
  }, [getCurrentPosition, applyPosition, hexRegion, layout, refreshMapSightings]);

  // Encuadre inicial: con permiso, directo en el hexágono del usuario; sin permiso (o sin GPS), en la región por defecto.
  // Si el permiso se concede después, se centra en el usuario.
  useEffect(() => {
    if (!layout || !permission) return;

    if (!permission.granted) {
      userCellRef.current = null;
      userLocationRef.current = null;
      setUserCell(null);
      setMapSightings([]);
      if (!initialRegion) {
        usedFallbackRef.current = true;
        setInitialRegion(FALLBACK_REGION);
      }
      return;
    }

    if (initialRegion) {
      if (usedFallbackRef.current) {
        usedFallbackRef.current = false;
        centerOnUser();
      }
      return;
    }
    if (locatingInitialRef.current) return;
    locatingInitialRef.current = true;
    getCurrentPosition()
      .then(({ lat, lng }) => setInitialRegion(hexRegion(applyPosition(lat, lng), layout)))
      .catch((cause) => {
        usedFallbackRef.current = true;
        setError(cause);
        setInitialRegion(FALLBACK_REGION);
      })
      .finally(() => {
        locatingInitialRef.current = false;
      });
  }, [layout, permission, initialRegion, getCurrentPosition, applyPosition, hexRegion, centerOnUser]);

  // Mientras el mapa está a la vista, el hexágono del usuario sigue sus movimientos (sin mover la cámara del mapa).
  useEffect(() => {
    if (!permission?.granted || !active) return undefined;
    let subscription = null;
    let cancelled = false;
    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: WATCH_DISTANCE_METERS },
      ({ coords }) => {
        const point = applyPosition(coords.latitude, coords.longitude);
        // Con el mapa bloqueado, la cámara acompaña al usuario (mantiene el zoom)
        if (LOCK_MAP_MOVEMENT) mapRef.current?.animateCamera({ center: point }, { duration: FOLLOW_ANIMATION_MS });
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
  }, [permission?.granted, active, applyPosition]);

  // Zona permitida: hexágono del usuario + vecinos. Sigue al usuario si cambia de hexágono.
  const zone = useMemo(() => {
    if (!userCell) return null;
    const cells = ringOf(userCell, RING_K);
    const bounds = boundsOf(cells);
    return { bounds };
  }, [userCell]);

  // Alejamiento máximo: la zona permitida ocupa el ancho de la pantalla
  const minZoomLevel = zone && layout
    ? zoomForLongitudeSpan((zone.bounds.east - zone.bounds.west) * RING_FIT_FACTOR, layout.width)
    : undefined;

  // iOS (Apple Maps): el alejamiento máximo se define como distancia de cámara en metros
  const iosZoomRange = zone && layout
    ? {
        maxCenterCoordinateDistance: cameraDistanceForLongitudeSpan(
          (zone.bounds.east - zone.bounds.west) * RING_FIT_FACTOR,
          (zone.bounds.north + zone.bounds.south) / 2,
          layout.height / layout.width,
          IOS_CAMERA_FOV_DEGREES,
        ),
      }
    : undefined;

  // Desplazamiento máximo: la cámara no sale de la zona permitida (Android: setMapBoundaries)
  useEffect(() => {
    if (!zone || !mapReady) return;
    try {
      mapRef.current?.setMapBoundaries(
        { latitude: zone.bounds.north, longitude: zone.bounds.east },
        { latitude: zone.bounds.south, longitude: zone.bounds.west },
      );
    } catch {
      // iOS no tiene setMapBoundaries: ahí el límite lo aplica handleRegionChanging
    }
  }, [zone, mapReady]);

  async function enableLocation() {
    if (permission && !permission.canAskAgain) return Linking.openSettings();
    const response = await requestPermission();
    if (!response.granted) setError({ code: 'LOCATION_DENIED' });
  }

  const overlayOn = __DEV__ && showHexes;

  const handleRegionChange = useCallback((next) => {
    regionRef.current = next;
    if (showHexes) {
      setRegion(next);
    }
  }, [showHexes]);

  // iOS: mientras el usuario arrastra, si el centro sale de la zona se lo devuelve al borde (igual que setMapBoundaries)
  const handleRegionChanging = useCallback((next) => {
    if (Platform.OS !== 'ios' || LOCK_MAP_MOVEMENT || !zone) return;
    const center = { latitude: next.latitude, longitude: next.longitude };
    const clamped = clampToBounds(center, zone.bounds);
    if (clamped.latitude !== center.latitude || clamped.longitude !== center.longitude) {
      mapRef.current?.setCamera({ center: clamped });
    }
  }, [zone]);

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
    getSightings({ h3Index: centerCell, k: RING_K })
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
    <View
      style={local.container}
      onLayout={({ nativeEvent: { layout: size } }) => {
        if (size.width > 0 && size.height > 0) {
          setLayout((current) => (current && current.width === size.width && current.height === size.height ? current : { width: size.width, height: size.height }));
        }
      }}
    >
      {initialRegion ? (
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        minZoomLevel={Platform.OS === 'android' ? minZoomLevel : undefined}
        cameraZoomRange={Platform.OS === 'ios' ? iosZoomRange : undefined}
        scrollEnabled={!LOCK_MAP_MOVEMENT}
        customMapStyle={MAP_STYLE}
        mapPadding={MAP_PADDING}
        legalLabelInsets={MAP_PADDING}
        rotateEnabled={false}
        pitchEnabled={false}
        onMapReady={() => setMapReady(true)}
        showsUserLocation={granted}
        showsMyLocationButton={false}
        showsPointsOfInterest={false}
        toolbarEnabled={false}
        onRegionChange={handleRegionChanging}
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
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <Image
              source={require('../assets/markers/avistamiento.png')}
              style={local.sightingMarkerImage}
              resizeMode="contain"
              fadeDuration={0}
            />
          </Marker>
        ))}
      </MapView>
      ) : (
        <View style={local.mapLoading} pointerEvents="none">
          <ActivityIndicator accessibilityLabel="Cargando mapa" color={palette.azul} />
        </View>
      )}

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
              <AuthImage
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
  mapLoading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
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

  refreshButton: {
    position: 'absolute',
    top: 72,
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
    top: 128,
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

  sightingMarkerImage: {
    width: 50,
    height: 50,
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
