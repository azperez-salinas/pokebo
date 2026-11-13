# Recursos visuales

Importá los recursos desde `src/styles` (por ejemplo, `../styles` desde una pantalla).
Los PNG y TTF viven en `../assets`; las rutas para cargarlos se definen aquí.

```jsx
import { icons, images, palette, spacing, type } from '../styles';

<Image source={icons.pokeballs.pokebolaConSombra} />
<Image source={icons.extras.star} />
<ImageBackground source={images.fondoBrillos} />
<Text style={{ ...type.body, color: palette.azul, marginTop: spacing.sm }}>Hola</Text>
```

Para botones, tarjetas, campos, íconos y demás piezas usá los componentes de `src/components` (`Button`, `Panel`, `TextField`, `Icon`, `ProgressBar`, `Chip`, `Section`, `ScreenHeader`, `PixelSpinner`), que ya aplican estos tokens.

- `buttons/`: `rect`, `square` y `circle`; cada color tiene `normal`, `pressed` y `disabled`. **Hoy ninguna pantalla los usa**: `Button` dibuja el botón con bordes y color de la paleta. Se conservan como recurso.
- `icons/`: `arrows`, `panel`, `extras` (todos de 48x48) y `pokeballs`. Los nombres de archivo se expresan en camelCase: `arrow-left` → `arrowLeft`, `pin_red` → `pinRed`.
- `images/`: fondos y otras imágenes.
- `fonts/`: nombres para `fontFamily` y el mapa `fontSources` que recibe `useFonts` al iniciar la app.
- `palette.json`: valores de los colores. `colors.js` asigna roles como `background` y `accent` a esos colores.
- `theme.js`: tokens de la estética pixel.
  - `spacing`: escala de 4 (`xs` 4, `sm` 8, `md` 12, `lg` 16, `xl` 24).
  - `radius` (0: esquinas rectas) y `border` (un solo grosor, 3 px, color tinta).
  - `shadow`: sombra dura. Está **apagada** (`enabled: false`) porque se veía gruesa y desigual; en `true` vuelve en toda la app. Sin sombra, el presionado se marca con opacidad.
  - `fontSize`: escala fija. PressStart2P (`display`): 8, 10, 12, 16, 24. VT323 (`body`): 16 (solo etiquetas del tab bar), 18, 20, 24.
  - `type`: roles tipográficos `display`, `title`, `heading`, `subtitle`, `label`, `labelLg`, `button`, `input`, `body`, `caption` y `error`. Usá `...type.title` en vez de `fontFamily`/`fontSize` sueltos, y `spacing.*` en vez de números.
- `shared.js`: estilos compartidos, disponibles como la exportación por defecto.

**Tamaño de los PNG pixel.** Exportalos a su resolución real y mostralos a múltiplos de sus celdas; un PNG enorme reducido se ve borroso. Los íconos son de 48x48: `Icon` los muestra a 48, 24 o 16 (y avisa en desarrollo si el tamaño no es una escala entera). Las pokébolas son de 32 celdas exportadas a 8x (256 px): mostralas a 32, 64, 128 o 192 dp. El marcador del mapa es de 32x19 celdas (se muestra a 40x24). Los avatares son de 300x300 con texto fino: no los reduzcas a una grilla menor.

Para agregar un recurso, guardá el archivo en `assets` y agregá un `require` con ruta literal al módulo de su categoría. Expo necesita rutas estáticas para empaquetar los archivos. Los estilos específicos de cada pantalla permanecen junto a su componente, pero los valores de tipografía, espaciado, borde y color deben salir de `theme.js` y `palette.json`, no de números o hex sueltos.
