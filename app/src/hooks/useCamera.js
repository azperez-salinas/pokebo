import { useCallback, useRef } from 'react';
import { Linking } from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';

// Formato que pide la API para POST /captures: JPEG de 5 MB como máximo. La app comprime antes de subir.
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_SIDE_PX = 1600;
const QUALITY_STEPS = [0.8, 0.6, 0.4, 0.25];

// Convierte la foto a JPEG redimensionado y baja la calidad hasta que entre en el límite
async function toJpeg(photo) {
  const landscape = photo.width >= photo.height;
  const resize = Math.max(photo.width, photo.height) > MAX_SIDE_PX
    ? (landscape ? { width: MAX_SIDE_PX } : { height: MAX_SIDE_PX })
    : null;

  const context = ImageManipulator.manipulate(photo.uri);
  if (resize) context.resize(resize);
  const image = await context.renderAsync();

  for (const compress of QUALITY_STEPS) {
    const result = await image.saveAsync({ format: SaveFormat.JPEG, compress });
    const size = new File(result.uri).size;
    if (size > 0 && size <= MAX_IMAGE_BYTES) return { uri: result.uri, width: result.width, height: result.height, size };
  }
  throw Object.assign(new Error('La foto es demasiado pesada. Probá de nuevo.'), { code: 'IMAGE_TOO_LARGE' });
}

// Permisos de cámara y captura de la foto ya lista para subir
export default function useCamera() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  // Si el usuario negó el permiso y el sistema ya no deja volver a preguntar, se lo manda a Ajustes
  const askPermission = useCallback(async () => {
    if (permission && !permission.granted && !permission.canAskAgain) return Linking.openSettings();
    return requestPermission();
  }, [permission, requestPermission]);

  // Saca la foto en el momento (no desde la galería) y la devuelve en JPEG de <= 5 MB
  const takePhoto = useCallback(async () => {
    if (!cameraRef.current) throw new Error('La cámara todavía no está lista.');
    const photo = await cameraRef.current.takePictureAsync({ quality: 1, exif: false });
    return toJpeg(photo);
  }, []);

  return { permission, askPermission, cameraRef, takePhoto };
}
