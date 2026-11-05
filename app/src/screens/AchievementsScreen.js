import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Panel from '../components/Panel';
import { getAchievements } from '../services/achievements.service';
import { fonts, palette } from '../styles';

const SEGMENTS = 10;

function ProgressBar({ progress, threshold, unlocked }) {
  const filled = Math.round((Math.min(progress, threshold) / threshold) * SEGMENTS);
  return (
    <View style={local.barRow} accessible accessibilityLabel={`Progreso ${progress} de ${threshold}`}>
      <View style={local.bar}>
        {Array.from({ length: SEGMENTS }, (_, index) => (
          <View key={index} style={[local.segment, index < filled && (unlocked ? local.segmentDone : local.segmentFilled)]} />
        ))}
      </View>
      <Text style={local.count}>{Math.min(progress, threshold)}/{threshold}</Text>
    </View>
  );
}

function AchievementRow({ achievement }) {
  const { name, description, progress, threshold, unlocked } = achievement;
  return (
    <View style={[local.row, !unlocked && local.rowLocked]}>
      <View style={[local.medal, unlocked && local.medalDone]}>
        <Text style={local.medalText}>{unlocked ? '★' : '?'}</Text>
      </View>
      <View style={local.rowBody}>
        <Text style={local.name}>{name}</Text>
        <Text style={local.description}>{description}</Text>
        <ProgressBar progress={progress} threshold={threshold} unlocked={unlocked} />
      </View>
    </View>
  );
}

// Logros agrupados por sección (Aves, Mamíferos, Acuáticos...), con el progreso del usuario en cada uno.
export default function AchievementsScreen() {
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | error

  const load = useCallback(async () => {
    setState('loading');
    try {
      setData(await getAchievements());
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (state === 'loading') {
    return <View style={local.center}><ActivityIndicator accessibilityLabel="Cargando logros" color={palette.azul} /></View>;
  }
  if (state === 'error') {
    return (
      <View style={local.center}>
        <Text accessibilityRole="alert" style={local.message}>No pudimos cargar tus logros.</Text>
        <Pressable accessibilityRole="button" onPress={load} style={local.retry}><Text style={local.retryText}>REINTENTAR</Text></Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={local.container} contentContainerStyle={local.content}>
      <Text accessibilityRole="header" style={local.title}>LOGROS</Text>
      <Text style={local.summary}>{data.summary.unlocked} de {data.summary.total} desbloqueados</Text>

      {data.groups.map((group) => (
        <View key={group.id} style={local.group}>
          <Text accessibilityRole="header" style={local.groupTitle}>{group.name.toUpperCase()}</Text>
          <Panel>
            {group.achievements.map((achievement, index) => (
              <View key={achievement.code} style={index > 0 && local.separator}>
                <AchievementRow achievement={achievement} />
              </View>
            ))}
          </Panel>
        </View>
      ))}
    </ScrollView>
  );
}

const local = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.fondo },
  content: { padding: 16, paddingTop: 20, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: palette.fondo },
  message: { fontFamily: fonts.body, fontSize: 22, color: palette.tinta, textAlign: 'center' },
  retry: { marginTop: 16, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: palette.amarillo, borderWidth: 3, borderColor: palette.tinta, borderRadius: 4 },
  retryText: { fontFamily: fonts.display, fontSize: 10, color: palette.tinta },
  title: { fontFamily: fonts.display, fontSize: 16, lineHeight: 24, color: palette.tinta, textAlign: 'center' },
  summary: { fontFamily: fonts.body, fontSize: 22, color: palette.azul, textAlign: 'center', marginTop: 4, marginBottom: 12 },
  group: { marginTop: 12 },
  groupTitle: { fontFamily: fonts.display, fontSize: 10, color: palette.azul, marginBottom: 8 },
  separator: { borderTopWidth: 2, borderColor: palette.linea, marginTop: 10, paddingTop: 10 },
  row: { flexDirection: 'row', gap: 12 },
  rowLocked: { opacity: 0.85 },
  medal: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.linea, borderWidth: 3, borderColor: palette.tinta, borderRadius: 20 },
  medalDone: { backgroundColor: palette.amarillo },
  medalText: { fontFamily: fonts.display, fontSize: 14, color: palette.tinta },
  rowBody: { flex: 1 },
  name: { fontFamily: fonts.body, fontSize: 24, lineHeight: 26, color: palette.tinta },
  description: { fontFamily: fonts.body, fontSize: 18, lineHeight: 20, color: palette.azul },
  barRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  bar: { flex: 1, flexDirection: 'row', height: 18, padding: 2, backgroundColor: palette.linea, borderWidth: 3, borderColor: palette.tinta, borderRadius: 4 },
  segment: { flex: 1, marginHorizontal: 1, backgroundColor: palette.linea },
  segmentFilled: { backgroundColor: palette.cielo },
  segmentDone: { backgroundColor: palette.verde },
  count: { fontFamily: fonts.body, fontSize: 20, color: palette.tinta, minWidth: 48, textAlign: 'right' },
});
