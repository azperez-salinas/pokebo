import palette from './palette.json';
import { fonts } from './fonts';

// Escala de espaciado (múltiplos de 4). Padding horizontal de pantalla = spacing.lg.
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

// Estética pixel: esquinas rectas, un solo grosor de borde.
export const radius = 0;
export const border = { width: 3, color: palette.tinta };

// Sombra dura: un bloque de tinta desplazado hacia abajo-derecha.
// Al presionar, el elemento se desplaza `offset` y la sombra desaparece.
export const shadow = { offset: 4, color: palette.tinta };

// Tamaños de fuente permitidos. PressStart2P (display) y VT323 (body) tienen escalas propias.
export const fontSize = {
  display: { xs: 8, sm: 10, md: 12, lg: 16, xl: 24 },
  body: { caption: 18, body: 20, bodyLg: 24 },
};

// Roles tipográficos: usar `...type.title` en vez de fontFamily/fontSize sueltos.
export const type = {
  title: { fontFamily: fonts.display, fontSize: fontSize.display.lg, lineHeight: 24 },
  subtitle: { fontFamily: fonts.body, fontSize: fontSize.body.bodyLg, lineHeight: 26 },
  label: { fontFamily: fonts.display, fontSize: fontSize.display.xs, lineHeight: 12 },
  button: { fontFamily: fonts.display, fontSize: fontSize.display.sm, lineHeight: 14 },
  input: { fontFamily: fonts.body, fontSize: fontSize.body.bodyLg, lineHeight: 26 },
  body: { fontFamily: fonts.body, fontSize: fontSize.body.body, lineHeight: 22 },
  caption: { fontFamily: fonts.body, fontSize: fontSize.body.caption, lineHeight: 20 },
  error: { fontFamily: fonts.body, fontSize: fontSize.body.body, lineHeight: 22, color: palette.rosa },
};
