import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from '../components/Button';
import Icon from '../components/Icon';
import Panel from '../components/Panel';
import PixelSpinner from '../components/PixelSpinner';
import ProgressBar from '../components/ProgressBar';
import ScreenHeader from '../components/ScreenHeader';
import { getAchievements } from '../services/achievements.service';
import { border, icons, palette, spacing, type } from '../styles';

function AchievementProgress({ progress, threshold, unlocked }) {
  const shown = Math.min(progress, threshold);
  return (
    <View style={local.barRow} accessible accessibilityLabel={`Progreso ${progress} de ${threshold}`}>
      <ProgressBar style={local.bar} height={18} value={shown} max={threshold} color={unlocked ? 'verde' : 'cielo'} />
      <Text style={local.count}>{shown}/{threshold}</Text>
    </View>
  );
}

function AchievementRow({ achievement }) {
  const { name, description, progress, threshold, unlocked } = achievement;
  return (
    <View style={[local.row, !unlocked && local.rowLocked]}>
      <View style={[local.medal, unlocked && local.medalDone]}>
        <Icon source={unlocked ? icons.extras.star : icons.extras.question} size={24} />
      </View>
      <View style={local.rowBody}>
        <Text style={local.name}>{name}</Text>
        <Text style={local.description}>{description}</Text>
        <AchievementProgress progress={progress} threshold={threshold} unlocked={unlocked} />
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
    return <View style={local.center}><PixelSpinner accessibilityLabel="Cargando logros" /></View>;
  }
  if (state === 'error') {
    return (
      <View style={local.center}>
        <Text accessibilityRole="alert" style={local.message}>No pudimos cargar tus logros.</Text>
        <Button label="REINTENTAR" color="amarillo" onPress={load} style={local.retry} />
      </View>
    );
  }

  return (
    <ScrollView style={local.container} contentContainerStyle={local.content}>
      <ScreenHeader title="LOGROS" subtitle={`${data.summary.unlocked} de ${data.summary.total} desbloqueados`} />

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
  content: { padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xl * 1.5 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: palette.fondo },
  message: { ...type.subtitle, color: palette.tinta, textAlign: 'center' },
  retry: { marginTop: spacing.lg },
  group: { marginTop: spacing.md },
  groupTitle: { ...type.labelLg, color: palette.azul, marginBottom: spacing.sm },
  separator: { borderTopWidth: 2, borderColor: palette.linea, marginTop: spacing.md, paddingTop: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  rowLocked: { opacity: 0.85 },
  medal: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.linea, borderWidth: border.width, borderColor: border.color, borderRadius: 0 },
  medalDone: { backgroundColor: palette.amarillo },
  rowBody: { flex: 1 },
  name: { ...type.subtitle, color: palette.tinta },
  description: { ...type.caption, color: palette.azul },
  barRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: spacing.sm },
  bar: { flex: 1 },
  count: { ...type.body, color: palette.tinta, minWidth: 48, textAlign: 'right' },
});
