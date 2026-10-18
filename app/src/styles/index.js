import { StyleSheet } from 'react-native';
import palette from '../assets/palette.json';

export const colors = {
  background: palette.fondo,
  ink: palette.tinta,
  accent: palette.azul,
  muted: palette.azul,
  selected: palette.linea,
  camera: palette.verde,
};

export const fonts = {
  display: 'PressStart2P',
  body: 'VT323',
};

export default StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontFamily: fonts.display, fontSize: 16, lineHeight: 24, color: colors.ink, textAlign: 'center' },
  message: { fontFamily: fonts.body, fontSize: 22, lineHeight: 26, color: colors.muted, textAlign: 'center', marginTop: 16 },
  tabBar: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 3, borderColor: colors.ink, paddingHorizontal: 4, paddingVertical: 8 },
  tab: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, borderRadius: 4 },
  selectedTab: { backgroundColor: colors.selected },
  tabLabel: { fontFamily: fonts.body, fontSize: 16, color: colors.muted, marginTop: 5, textAlign: 'center' },
  selectedLabel: { color: colors.accent },
  cameraTab: { flex: 1, minHeight: 64, alignItems: 'center', justifyContent: 'center' },
  cameraButton: { width: 62, height: 62, marginTop: -22, borderRadius: 31, borderWidth: 3, borderColor: colors.ink, backgroundColor: colors.camera, alignItems: 'center', justifyContent: 'center' },
  selectedCamera: { borderColor: colors.accent },
  pressed: { opacity: 0.65 },
  iconRow: { flexDirection: 'row' },
  pixel: { width: 3, height: 3 },
});
