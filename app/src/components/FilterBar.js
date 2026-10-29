import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, palette } from '../styles';

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
  row: { flexDirection: 'row', gap: 6 },
  select: { flex: 1, backgroundColor: palette.blanco, borderWidth: 3, borderColor: palette.tinta, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 4 },
  selectActive: { backgroundColor: palette.amarillo },
  selectOpen: { backgroundColor: palette.linea },
  selectLabel: { fontFamily: fonts.display, fontSize: 8, color: palette.azul },
  selectValue: { fontFamily: fonts.body, fontSize: 18, color: palette.tinta },
  list: { marginTop: 6, backgroundColor: palette.blanco, borderWidth: 3, borderColor: palette.tinta, borderRadius: 4, flexDirection: 'row', flexWrap: 'wrap', padding: 4, gap: 4 },
  option: { paddingHorizontal: 10, paddingVertical: 4, borderWidth: 2, borderColor: palette.linea, borderRadius: 4 },
  optionActive: { backgroundColor: palette.amarillo, borderColor: palette.tinta },
  optionText: { fontFamily: fonts.body, fontSize: 18, color: palette.tinta },
});
