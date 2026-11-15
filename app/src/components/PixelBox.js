import React from 'react';
import { StyleSheet, View } from 'react-native';
import { palette, border, shadow } from '../styles';

// Caja base de la estética pixel: esquinas rectas, borde de tinta y, si `shadow.enabled`, sombra dura abajo-derecha.
// Con `pressed` la cara se desplaza sobre la sombra (efecto "botón que se hunde"); sin sombra se vuelve translúcida.
// `style` se aplica a la cara; `outerStyle` al contenedor (ancho, márgenes, alineación).
export default function PixelBox({ children, style, outerStyle, pressed = false, shadowOffset = shadow.offset, backgroundColor = palette.blanco, accessibilityLabel }) {
  const offset = shadow.enabled ? shadowOffset : 0;
  return (
    <View accessible={Boolean(accessibilityLabel)} accessibilityLabel={accessibilityLabel} style={[{ paddingRight: offset, paddingBottom: offset }, outerStyle]}>
      {offset > 0 ? <View pointerEvents="none" style={[local.shadow, { top: offset, left: offset }]} /> : null}
      <View
        style={[
          local.face,
          { backgroundColor },
          style,
          pressed && (offset > 0 ? { transform: [{ translateX: offset }, { translateY: offset }] } : local.flatPressed),
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const local = StyleSheet.create({
  shadow: { position: 'absolute', right: 0, bottom: 0, backgroundColor: shadow.color },
  flatPressed: { opacity: 0.7 },
  face: { borderWidth: border.width, borderColor: border.color, borderRadius: 0 },
});
