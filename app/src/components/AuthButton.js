import React from 'react';
import Button from './Button';

// Compatibilidad: AuthButton ahora es `Button`. `color` acepta 'green' y 'yellow' además de los nombres de la paleta.
export default function AuthButton(props) {
  return <Button {...props} />;
}
