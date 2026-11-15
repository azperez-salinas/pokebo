import { StyleSheet } from 'react-native';
import palette from './palette.json';
import { colors } from './colors';
import { fonts } from './fonts';
import { border, fontSize, spacing, type } from './theme';

export default StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  title: { ...type.title, color: colors.ink, textAlign: 'center' },
  message: { ...type.body, color: colors.accent, textAlign: 'center', marginTop: spacing.lg },
  tabBar: { flexDirection: 'row', alignItems: 'stretch', backgroundColor: palette.blanco, borderTopWidth: border.width, borderColor: colors.ink, paddingHorizontal: spacing.xs, paddingVertical: spacing.sm, gap: spacing.xs },
  // Todas las pestañas tienen la misma estructura (borde, padding y franja de ícono), así los íconos quedan en el mismo eje.
  tab: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'flex-start', paddingVertical: 6, borderWidth: border.width, borderColor: 'transparent', borderRadius: 0 },
  iconSlot: { height: 28, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  selectedTab: { backgroundColor: palette.amarillo, borderColor: colors.ink },
  tabLabel: { fontFamily: fonts.body, fontSize: fontSize.body.tab, color: colors.accent, marginTop: 5, textAlign: 'center' },
  selectedLabel: { color: colors.ink },
  // El botón es más alto que la franja de ícono: se posiciona en absoluto, centrado sobre ella.
  cameraButtonOuter: { position: 'absolute', top: -12 },
  cameraButton: { width: 60, height: 52, alignItems: 'center', justifyContent: 'center' },
  selectedCamera: { borderColor: colors.accent },
  pressed: { opacity: 0.65 },
  iconRow: { flexDirection: 'row' },
  pixel: { width: 3, height: 3 },
});
