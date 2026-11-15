import palette from './palette.json';
import { fonts } from './fonts';

// Escala de espaciado (múltiplos de 4). Padding horizontal de pantalla = spacing.lg.
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

// Estética pixel: esquinas rectas, un solo grosor de borde.
export const radius = 0;
export const border = { width: 3, color: palette.tinta };

// Sombra dura: un bloque de tinta desplazado hacia abajo-derecha. Apagada (`enabled: false`) porque se veía gruesa y
// desigual; con `enabled: true` vuelve en toda la app (al presionar, el elemento se hunde `offset` sobre la sombra).
// Sin sombra, el presionado se indica con una leve transparencia.
export const shadow = { enabled: false, offset: 4, color: palette.tinta };

// Tamaños de fuente permitidos. PressStart2P (display) y VT323 (body) tienen escalas propias.
export const fontSize = {
  display: { xs: 8, sm: 10, md: 12, lg: 16, xl: 24 },
  body: { tab: 16, caption: 18, body: 20, bodyLg: 24 }, // `tab`: etiquetas del tab bar (12 letras en ~72 px)
};

// Roles tipográficos: usar `...type.title` en vez de fontFamily/fontSize sueltos.
export const type = {
  title: { fontFamily: fonts.display, fontSize: fontSize.display.lg, lineHeight: 24 },
  subtitle: { fontFamily: fonts.body, fontSize: fontSize.body.bodyLg, lineHeight: 26 },
  display: { fontFamily: fonts.display, fontSize: fontSize.display.xl, lineHeight: 32 },
  heading: { fontFamily: fonts.display, fontSize: fontSize.display.md, lineHeight: 18 },
  label: { fontFamily: fonts.display, fontSize: fontSize.display.xs, lineHeight: 12 },
  labelLg: { fontFamily: fonts.display, fontSize: fontSize.display.sm, lineHeight: 14 },
  button: { fontFamily: fonts.display, fontSize: fontSize.display.sm, lineHeight: 14 },
  input: { fontFamily: fonts.body, fontSize: fontSize.body.bodyLg, lineHeight: 26 },
  body: { fontFamily: fonts.body, fontSize: fontSize.body.body, lineHeight: 22 },
  caption: { fontFamily: fonts.body, fontSize: fontSize.body.caption, lineHeight: 20 },
  error: { fontFamily: fonts.body, fontSize: fontSize.body.body, lineHeight: 22, color: palette.rosa },
};
