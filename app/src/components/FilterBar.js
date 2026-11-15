import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { palette, border, spacing, type } from '../styles';

// Una fila de desplegables (uno por filtro). Al tocar uno, su lista se abre debajo; elegir una opción la cierra.
// filters: [{ key, label, options: [{ value, label }] }]; values: { [key]: valor elegido o undefined }
export default function FilterBar({ filters, values, onChange }) {
  const [openKey, setOpenKey] = useState(null);
  const open = filters.find((filter) => filter.key === openKey);

  return (
    <View>
      <View style={local.row}>
        {filters.map(({ key, label, options }) => {
          const selected = options.find((option) => option.value === values[key]);
          const isOpen = key === openKey;
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={`Filtro ${label}`}
              accessibilityState={{ expanded: isOpen }}
              onPress={() => setOpenKey(isOpen ? null : key)}
              style={[local.select, selected && local.selectActive, isOpen && local.selectOpen]}
            >
              <Text style={local.selectLabel}>{label}</Text>
              <Text numberOfLines={1} style={local.selectValue}>{selected ? selected.label : 'Todos'}</Text>
            </Pressable>
          );
        })}
      </View>

      {open ? (
        <View style={local.list}>
          {[{ value: undefined, label: 'Todos' }, ...open.options].map((option) => (
            <Pressable
              key={String(option.value)}
              accessibilityRole="menuitem"
              onPress={() => {
                onChange(open.key, option.value);
                setOpenKey(null);
              }}
              style={[local.option, option.value === values[open.key] && local.optionActive]}
            >
              <Text style={local.optionText}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const local = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs },
  select: { flex: 1, backgroundColor: palette.blanco, borderWidth: border.width, borderColor: border.color, borderRadius: 0, paddingHorizontal: spacing.xs + 2, paddingVertical: spacing.xs },
  selectActive: { backgroundColor: palette.amarillo },
  selectOpen: { backgroundColor: palette.linea },
  selectLabel: { ...type.label, color: palette.azul },
  selectValue: { ...type.caption, color: palette.tinta },
  list: { marginTop: spacing.sm, backgroundColor: palette.blanco, borderWidth: border.width, borderColor: border.color, borderRadius: 0, flexDirection: 'row', flexWrap: 'wrap', padding: spacing.xs, gap: spacing.xs },
  option: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderWidth: 2, borderColor: palette.linea, borderRadius: 0 },
  optionActive: { backgroundColor: palette.amarillo, borderColor: palette.tinta },
  optionText: { ...type.caption, color: palette.tinta },
});
