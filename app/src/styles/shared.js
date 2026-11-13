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
  tabBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.blanco, borderTopWidth: border.width, borderColor: colors.ink, paddingHorizontal: spacing.xs, paddingVertical: spacing.sm, gap: spacing.xs },
  tab: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, borderWidth: border.width, borderColor: 'transparent', borderRadius: 0 },
  selectedTab: { backgroundColor: palette.amarillo, borderColor: colors.ink },
  tabLabel: { fontFamily: fonts.body, fontSize: fontSize.body.tab, color: colors.accent, marginTop: 5, textAlign: 'center' },
  selectedLabel: { color: colors.ink },
  cameraTab: { flex: 1, minHeight: 64, alignItems: 'center', justifyContent: 'center' },
  cameraButton: { width: 60, height: 56, marginTop: -22, alignItems: 'center', justifyContent: 'center' },
  selectedCamera: { borderColor: colors.accent },
  pressed: { opacity: 0.65 },
  iconRow: { flexDirection: 'row' },
  pixel: { width: 3, height: 3 },
});
