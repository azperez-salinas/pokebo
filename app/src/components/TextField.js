import React, { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { palette, border, spacing, type } from '../styles';
import { useScrollIntoView } from './KeyboardAwareScroll';

// Campo de texto único: etiqueta en PressStart2P, entrada en VT323, borde que se vuelve azul con el foco.
// Reemplaza a los `Field` de AuthForm, ChangePasswordForm y ProfileForm. Acepta cualquier prop de TextInput.
export default function TextField({ label, value, onChangeText, error, multiline = false, counter, style, containerStyle, labelStyle, onFocus, onBlur, ...props }) {
  const [focused, setFocused] = useState(false);
  const fieldRef = useRef(null);
  const scrollIntoView = useScrollIntoView(); // dentro de KeyboardAwareScroll deja el campo a la vista al enfocarlo
  return (
    <View ref={fieldRef} collapsable={false} style={[local.field, containerStyle]}>
      {label ? <Text style={[type.label, local.label, labelStyle]}>{label}</Text> : null}
      <TextInput
        accessibilityLabel={label}
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={palette.azul}
        selectionColor={palette.azul}
        multiline={multiline}
        value={value}
        onChangeText={onChangeText}
        onFocus={(event) => { setFocused(true); scrollIntoView?.(fieldRef.current); onFocus?.(event); }}
        onBlur={(event) => { setFocused(false); onBlur?.(event); }}
        {...props}
        style={[local.input, multiline && local.multiline, focused && local.focused, error && local.invalid, style]}
      />
      {counter ? <Text style={[type.label, local.counter]}>{counter}</Text> : null}
    </View>
  );
}

const local = StyleSheet.create({
  field: { gap: spacing.sm },
  label: { color: palette.tinta },
  input: {
    ...type.input,
    minHeight: 52,
    borderWidth: border.width,
    borderColor: border.color,
    borderRadius: 0,
    backgroundColor: palette.blanco,
    color: palette.tinta,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  focused: { borderColor: palette.azul },
  invalid: { borderColor: palette.rosa },
  counter: { color: palette.azul, textAlign: 'right' },
});
