import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import AuthButton from '../components/AuthButton';
import AuthImage from '../components/AuthImage';
import { getSpecies } from '../services/species.service';
import { getMyCaptures } from '../services/captures.service';
import { photoSource, speciesImageSource } from '../services/images.service';
import { colors, fonts, palette } from '../styles';

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
      <AuthButton label="ATRÁS" onPress={onBack} />

      {error ? (
        <View style={local.block}>
          <Text accessibilityRole="alert" style={local.text}>{error.message}</Text>
          <AuthButton label="REINTENTAR" onPress={() => setAttempt((current) => current + 1)} />
        </View>
      ) : !species ? (
        <ActivityIndicator accessibilityLabel="Cargando especie" color={colors.accent} style={local.loader} />
      ) : (
        <>
          {photos.length > 0 ? (
            <PhotoCarousel photos={photos} />
          ) : species.imagesIds?.[0] ? (
            <AuthImage source={speciesImageSource(species.imagesIds[0])} style={local.photo} resizeMode="cover" />
          ) : null}
          <View style={local.block}>
            <Text accessibilityRole="header" style={local.name}>{species.commonName}</Text>
            <Text style={local.scientific}>{species.scientificName}</Text>
            <Text style={local.text}>{species.family} · {species.class}</Text>
            <Text style={local.text}>Capturas tuyas: {species.progress.captures}</Text>
          </View>
          {species.description ? (
            <View style={local.block}>
              <Text style={local.label}>DESCRIPCIÓN</Text>
              <Text style={local.text}>{species.description}</Text>
            </View>
          ) : null}
          {FIELDS.filter(([, key]) => species[key]).map(([label, key]) => (
            <View key={key} style={local.block}>
              <Text style={local.label}>{label}</Text>
              <Text style={local.text}>{species[key]}</Text>
            </View>
          ))}
          {species.funFacts?.length ? (
            <View style={local.block}>
              <Text style={local.label}>CURIOSIDADES</Text>
              {species.funFacts.map((fact) => <Text key={fact} style={local.text}>▸ {fact}</Text>)}
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const local = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.fondo },
  content: { padding: 16, gap: 12 },
  loader: { marginTop: 32 },
  counter: { fontFamily: fonts.display, fontSize: 10, color: palette.tinta, textAlign: 'center', marginTop: 8 },
  photo: { width: '100%', aspectRatio: 1, borderWidth: 3, borderColor: palette.tinta, borderRadius: 4, backgroundColor: palette.linea },
  block: { backgroundColor: palette.blanco, borderWidth: 3, borderColor: palette.tinta, borderRadius: 4, padding: 12, gap: 6 },
  name: { fontFamily: fonts.display, fontSize: 16, lineHeight: 24, color: palette.tinta },
  scientific: { fontFamily: fonts.body, fontSize: 22, fontStyle: 'italic', color: palette.azul },
  label: { fontFamily: fonts.display, fontSize: 10, color: palette.azul },
  text: { fontFamily: fonts.body, fontSize: 20, lineHeight: 22, color: palette.tinta },
});
