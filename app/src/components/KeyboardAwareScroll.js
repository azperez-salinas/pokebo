import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

// ScrollView que no deja al teclado tapar el campo que se está escribiendo (Android e iOS).
// - KeyboardAvoidingView con padding en las dos plataformas: en Android con edge-to-edge la ventana no se
//   redimensiona sola, así que antes el teclado cubría el final del formulario.
// - Mientras el teclado está abierto se agrega al final un espacio igual a su altura, para poder desplazar
//   hasta el último campo aunque la ventana no se haya achicado.
// - Al enfocar un TextField (que usa useScrollIntoView) se desplaza hasta dejarlo a la vista.
const ScrollIntoViewContext = createContext(null);

export function useScrollIntoView() {
  return useContext(ScrollIntoViewContext);
}

const FIELD_MARGIN = 96; // espacio libre sobre el campo enfocado (deja ver su etiqueta)
const SETTLE_MS = 200; // espera a que el teclado y el layout terminen de moverse

export default function KeyboardAwareScroll({ children, contentContainerStyle, style, ...props }) {
  const scrollRef = useRef(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (event) => setKeyboardHeight(event.endCoordinates.height));
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const scrollIntoView = useCallback((target) => {
    setTimeout(() => {
      const scroll = scrollRef.current;
      const inner = scroll?.getInnerViewRef?.();
      if (!scroll || !inner || !target?.measureLayout) return;
      try {
        target.measureLayout(
          inner,
          (_x, y) => scroll.scrollTo({ y: Math.max(0, y - FIELD_MARGIN), animated: true }),
          () => {},
        );
      } catch {
        // Sin medición no se desplaza; el sistema igual intenta mostrar el campo enfocado.
      }
    }, SETTLE_MS);
  }, []);

  return (
    <KeyboardAvoidingView behavior="padding" style={[local.fill, style]}>
      <ScrollIntoViewContext.Provider value={scrollIntoView}>
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[contentContainerStyle, keyboardHeight > 0 && { paddingBottom: keyboardHeight + 24 }]}
          {...props}
        >
          {children}
        </ScrollView>
      </ScrollIntoViewContext.Provider>
    </KeyboardAvoidingView>
  );
}

const local = StyleSheet.create({
  fill: { flex: 1 },
});
