import React, { useEffect, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from '../components/Button';
import AuthImage from '../components/AuthImage';
import Panel from '../components/Panel';
import PixelSpinner from '../components/PixelSpinner';
import { BackButton } from '../components/ScreenHeader';
import { getSpecies } from '../services/species.service';
import { getMyCaptures } from '../services/captures.service';
import { photoSource, speciesImageSource } from '../services/images.service';
import { border, palette, spacing, type } from '../styles';

const FIELDS = [
  ['HÁBITAT', 'habitat'],
  ['DIETA', 'diet'],
  ['DISTRIBUCIÓN', 'distribution'],
  ['CONSERVACIÓN', 'conservationStatus'],
];

// Carrusel horizontal paginado con todas las fotos que el usuario sacó de la especie
function PhotoCarousel({ photos }) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 ? (
        <FlatList
          data={photos}
          keyExtractor={(item) => String(item.id)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          renderItem={({ item }) => (
            <AuthImage source={photoSource(item.photoUrl)} style={[local.photo, { width }]} resizeMode="cover" />
          )}
        />
      ) : null}
      {photos.length > 1 ? <Text style={local.counter}>{index + 1} / {photos.length}</Text> : null}
    </View>
  );
}

// Ficha completa de la especie (GET /species/:id) con la cantidad de capturas del usuario.
export default function SpeciesDetailScreen({ speciesId, onBack }) {
  const [species, setSpecies] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setError(null);
    getSpecies(speciesId)
      .then((data) => active && setSpecies(data.species))
      .catch((cause) => active && setError(cause));
    // Fotos del usuario de esta especie, para el carrusel (si falla, se muestra la imagen del catálogo)
    getMyCaptures({ speciesId, limit: 50 })
      .then((data) => active && setPhotos(data.captures))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [speciesId, attempt]);

  return (
    <ScrollView style={local.container} contentContainerStyle={local.content}>
      <BackButton label="ATRÁS" onPress={onBack} />

      {error ? (
        <Panel style={local.block}>
          <Text accessibilityRole="alert" style={local.text}>{error.message}</Text>
          <Button label="REINTENTAR" onPress={() => setAttempt((current) => current + 1)} />
        </Panel>
      ) : !species ? (
        <PixelSpinner accessibilityLabel="Cargando especie" style={local.loader} />
      ) : (
        <>
          {photos.length > 0 ? (
            <PhotoCarousel photos={photos} />
          ) : species.imagesIds?.[0] ? (
            <AuthImage source={speciesImageSource(species.imagesIds[0])} style={local.photo} resizeMode="cover" />
          ) : null}
          <Panel style={local.block}>
            <Text accessibilityRole="header" style={local.name}>{species.commonName}</Text>
            <Text style={local.scientific}>{species.scientificName}</Text>
            <Text style={local.text}>{species.family} · {species.class}</Text>
            <Text style={local.text}>Capturas tuyas: {species.progress.captures}</Text>
          </Panel>
          {species.description ? (
            <Panel style={local.block}>
              <Text style={local.label}>DESCRIPCIÓN</Text>
              <Text style={local.text}>{species.description}</Text>
            </Panel>
          ) : null}
          {FIELDS.filter(([, key]) => species[key]).map(([label, key]) => (
            <Panel key={key} style={local.block}>
              <Text style={local.label}>{label}</Text>
              <Text style={local.text}>{species[key]}</Text>
            </Panel>
          ))}
          {species.funFacts?.length ? (
            <Panel style={local.block}>
              <Text style={local.label}>CURIOSIDADES</Text>
              {species.funFacts.map((fact) => (
                <View key={fact} style={local.fact}>
                  <View style={local.bullet} />
                  <Text style={[local.text, local.factText]}>{fact}</Text>
                </View>
              ))}
            </Panel>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const local = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.fondo },
  content: { padding: spacing.lg, gap: spacing.md },
  loader: { marginTop: spacing.xl * 1.5 },
  counter: { ...type.labelLg, color: palette.tinta, textAlign: 'center', marginTop: spacing.sm },
  photo: { width: '100%', aspectRatio: 1, borderWidth: border.width, borderColor: border.color, borderRadius: 0, backgroundColor: palette.linea },
  block: { gap: spacing.sm },
  name: { ...type.title, color: palette.tinta },
  scientific: { ...type.subtitle, color: palette.azul },
  label: { ...type.labelLg, color: palette.azul },
  text: { ...type.body, color: palette.tinta },
  fact: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  bullet: { width: 8, height: 8, marginTop: 8, backgroundColor: palette.azul },
  factText: { flex: 1 },
});
