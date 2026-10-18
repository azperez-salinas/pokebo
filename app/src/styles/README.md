# Recursos visuales

Importá los recursos desde `src/styles` (por ejemplo, `../styles` desde una pantalla).
Los PNG y TTF viven en `../assets`; las rutas para cargarlos se definen aquí.

```jsx
import { buttons, icons, images, palette, fonts } from '../styles';

<Image source={icons.pokeballs.pokebolaConSombra} />
<Image source={icons.extras.pinRed} />
<ImageBackground source={buttons.rect.verde.normal} />
<ImageBackground source={images.fondoBrillos} />
<Text style={{ color: palette.azul, fontFamily: fonts.body }}>Hola</Text>
```

- `buttons/`: `rect`, `square` y `circle`; cada color tiene `normal`, `pressed` y `disabled`.
- `icons/`: `arrows`, `panel`, `extras` y `pokeballs`. Los nombres de archivo se expresan en camelCase: `arrow-left` → `arrowLeft`, `pin_red` → `pinRed`.
- `images/`: fondos y otras imágenes.
- `fonts/`: nombres para `fontFamily` y el mapa `fontSources` que recibe `useFonts` al iniciar la app.
- `palette.json`: valores de los colores. `colors.js` asigna roles como `background` y `accent` a esos colores.
- `shared.js`: estilos compartidos, disponibles como la exportación por defecto.

Para agregar un recurso, guardá el archivo en `assets` y agregá un `require` con ruta literal al módulo de su categoría. Expo necesita rutas estáticas para empaquetar los archivos. Los estilos específicos de cada pantalla permanecen junto a su componente.
