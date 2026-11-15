import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Button from '../components/Button';
import Icon from '../components/Icon';
import PixelBox from '../components/PixelBox';
import PixelSpinner from '../components/PixelSpinner';
import CaptureTile from '../components/CaptureTile';
import FilterBar from '../components/FilterBar';
import SpeciesDetailScreen from './SpeciesDetailScreen';
import { getMyCaptures } from '../services/captures.service';
import { icons, palette, spacing, type } from '../styles';

const PAGE_SIZE = 20;
const FIRST_YEAR = 2026;

const CLASS_OPTIONS = [
  { value: 'Aves', label: 'Aves' },
  { value: 'Mammalia', label: 'Mamíferos' },
  { value: 'Reptilia', label: 'Reptiles' },
  { value: 'Amphibia', label: 'Anfibios' },
];
const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MONTH_OPTIONS = MONTH_NAMES.map((label, index) => ({ value: index + 1, label }));
const currentYear = new Date().getUTCFullYear();
const YEAR_OPTIONS = Array.from({ length: Math.max(currentYear - FIRST_YEAR + 1, 1) }, (_, index) => {
  const year = FIRST_YEAR + index;
  return { value: year, label: String(year) };
});

// Galería de capturas del usuario (tab Colección). Al tocar una captura se abre la ficha de su especie.
export default function EncyclopediaScreen() {
  const [filters, setFilters] = useState({});
  const [captures, setCaptures] = useState([]);
  const [meta, setMeta] = useState(null);
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSpeciesId, setSelectedSpeciesId] = useState(null);
  const requestId = useRef(0);

  // Las familias disponibles salen de las capturas ya cargadas; se acumulan para que no desaparezcan al filtrar.
  const rememberFamilies = useCallback((items) => {
    setFamilies((current) => {
      const next = new Set(current);
      items.forEach((item) => item.species?.family && next.add(item.species.family));
      return next.size === current.length ? current : [...next].sort();
    });
  }, []);

  const load = useCallback(async (page) => {
    const id = ++requestId.current;
    if (page === 1) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      const data = await getMyCaptures({ ...filters, page, limit: PAGE_SIZE });
      if (id !== requestId.current) return; // respuesta vieja: ya cambió el filtro
      setCaptures((current) => (page === 1 ? data.captures : [...current, ...data.captures]));
      setMeta(data.meta);
      rememberFamilies(data.captures);
    } catch (cause) {
      if (id === requestId.current) setError(cause);
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [filters, rememberFamilies]);

  useEffect(() => {
    load(1);
  }, [load]);

  if (selectedSpeciesId) {
    return <SpeciesDetailScreen speciesId={selectedSpeciesId} onBack={() => setSelectedSpeciesId(null)} />;
  }

  const filterDefs = [
    { key: 'class', label: 'CLASE', options: CLASS_OPTIONS },
    { key: 'family', label: 'FAMILIA', options: families.map((family) => ({ value: family, label: family })) },
    { key: 'year', label: 'AÑO', options: YEAR_OPTIONS },
    { key: 'month', label: 'MES', options: MONTH_OPTIONS },
  ];
  const hasMore = meta && meta.page < meta.totalPages;

  return (
    <View style={local.container}>
      <View style={local.header}>
        <Text accessibilityRole="header" style={local.title}>COLECCIÓN</Text>
        {meta ? (
          <PixelBox shadowOffset={2} style={local.counter} accessibilityLabel={`${meta.progress.captured} de ${meta.progress.total} especies capturadas`}>
            <Icon source={icons.panel.paw} size={24} />
            <Text style={local.counterText}>{meta.progress.captured}/{meta.progress.total}</Text>
          </PixelBox>
        ) : null}
      </View>

      <FilterBar
        filters={filterDefs}
        values={filters}
        onChange={(key, value) => setFilters((current) => {
          const next = { ...current };
          if (value === undefined) delete next[key];
          else next[key] = value;
          return next;
        })}
      />

      {loading ? (
        <PixelSpinner accessibilityLabel="Cargando capturas" style={local.loader} />
      ) : error && captures.length === 0 ? (
        <View style={local.empty}>
          <Text accessibilityRole="alert" style={local.message}>{error.message}</Text>
          <Button label="REINTENTAR" onPress={() => load(1)} />
        </View>
      ) : (
        <FlatList
          data={captures}
          keyExtractor={(item) => String(item.id)}
          numColumns={3}
          renderItem={({ item }) => (
            <CaptureTile capture={item} onPress={() => item.species?.id && setSelectedSpeciesId(item.species.id)} />
          )}
          onEndReachedThreshold={0.4}
          onEndReached={() => hasMore && !loadingMore && load(meta.page + 1)}
          ListEmptyComponent={<Text style={local.message}>No hay capturas con estos filtros.</Text>}
          ListFooterComponent={loadingMore ? <PixelSpinner accessibilityLabel="Cargando más capturas" /> : null}
          contentContainerStyle={local.grid}
        />
      )}
    </View>
  );
}

const local = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.fondo, padding: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  title: { ...type.title, color: palette.tinta },
  counter: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  counterText: { ...type.labelLg, color: palette.tinta },
  grid: { paddingTop: spacing.sm, paddingBottom: spacing.md },
  loader: { marginTop: spacing.xl * 1.5 },
  empty: { flex: 1, justifyContent: 'center', gap: spacing.md },
  message: { ...type.body, lineHeight: 26, color: palette.azul, textAlign: 'center', marginTop: spacing.lg },
});
