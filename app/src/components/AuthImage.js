import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

// Las imágenes del backend exigen JWT. El <Image> nativo de Android recibía 401 con esos headers, pero fetch funciona:
// se descarga con fetch, se convierte a data URI y se muestra. Cache en memoria para no repetir descargas.
const cache = new Map();
const MAX_CACHED = 60;

function toDataUri(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function load(source) {
  if (cache.has(source.uri)) return cache.get(source.uri);
  const response = await fetch(source.uri, { headers: source.headers });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const uri = await toDataUri(await response.blob());
  if (cache.size >= MAX_CACHED) cache.delete(cache.keys().next().value);
  cache.set(source.uri, uri);
  return uri;
}

// Igual que <Image>, pero recibe el source de images.service (uri + headers)
export default function AuthImage({ source, style, ...props }) {
  const [uri, setUri] = useState(() => cache.get(source.uri) ?? null);
  const url = source.uri;

  useEffect(() => {
    let active = true;
    if (cache.has(url)) {
      setUri(cache.get(url));
    } else {
      setUri(null);
      load(source).then((data) => active && setUri(data)).catch(() => {});
    }
    return () => {
      active = false;
    };
    // El source se recrea en cada render: la imagen solo cambia si cambia la URL
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return (
    <View style={style}>
      {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} {...props} /> : null}
    </View>
  );
}
