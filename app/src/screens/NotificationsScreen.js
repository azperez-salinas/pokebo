import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import useNotifications from '../hooks/useNotifications';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../services/notifications.service';
import { fonts, palette } from '../styles';
import { timeAgo } from '../utils/timeAgo';

const FILTERS = [
  { value: undefined, label: 'Todos' },
  { value: 'achievement', label: 'Logros' },
  { value: 'nearby', label: 'Cercanos' },
  { value: 'capture', label: 'Capturas' },
];

// A qué pestaña lleva tocar cada tipo de aviso
const DESTINATION = { achievement: 'achievements', nearby: 'map', capture: 'collection' };
const MARK = { achievement: '★', nearby: '●', capture: '+' };
const MARK_COLOR = { achievement: palette.amarillo, nearby: palette.naranja, capture: palette.verde };

// Buzón de la app: historial de logros, avistamientos cercanos y capturas.
// onBack cierra el buzón; onNavigate(tab) cambia de pestaña (lo recibe de la navegación principal).
export default function NotificationsScreen({ onBack, onNavigate }) {
  const { setUnreadCount, refresh } = useNotifications();
  const [type, setType] = useState(undefined);
  const [items, setItems] = useState([]);
  const [nextBefore, setNextBefore] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | error
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const response = await getNotifications({ type });
      setItems(response.notifications);
      setNextBefore(response.nextBefore);
      setUnreadCount(response.unreadCount);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [type, setUnreadCount]);

  useEffect(() => { load(); }, [load]);

  async function loadMore() {
    if (!nextBefore || loadingMore) return;
    setLoadingMore(true);
    try {
      const response = await getNotifications({ type, before: nextBefore });
      setItems((current) => [...current, ...response.notifications]);
      setNextBefore(response.nextBefore);
    } catch {
      // se reintenta al volver a llegar al final
    } finally {
      setLoadingMore(false);
    }
  }

  async function open(item) {
    if (!item.read) {
      setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, read: true } : entry)));
      markNotificationRead(item.id).then(refresh).catch(() => {});
    }
    onNavigate?.(DESTINATION[item.type] || 'map');
  }

  async function markAll() {
    setItems((current) => current.map((entry) => ({ ...entry, read: true })));
    try {
      await markAllNotificationsRead(type);
    } finally {
      refresh();
    }
  }

  const hasUnread = items.some((item) => !item.read);

  return (
    <View style={local.container}>
      <View style={local.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver" hitSlop={10} onPress={onBack} style={local.back}>
          <Text style={local.backText}>{'<'}</Text>
        </Pressable>
        <Text accessibilityRole="header" style={local.title}>AVISOS</Text>
        <Pressable accessibilityRole="button" disabled={!hasUnread} onPress={markAll} style={[local.markAll, !hasUnread && local.disabled]}>
          <Text style={local.markAllText}>LEER{'\n'}TODOS</Text>
        </Pressable>
      </View>

      <View style={local.filters}>
        {FILTERS.map((filter) => (
          <Pressable
            key={filter.label}
            accessibilityRole="button"
            accessibilityState={{ selected: filter.value === type }}
            onPress={() => setType(filter.value)}
            style={[local.chip, filter.value === type && local.chipActive]}
          >
            <Text style={local.chipText}>{filter.label}</Text>
          </Pressable>
        ))}
      </View>

      {state === 'loading' ? (
        <View style={local.center}><ActivityIndicator accessibilityLabel="Cargando avisos" color={palette.azul} /></View>
      ) : state === 'error' ? (
        <View style={local.center}>
          <Text accessibilityRole="alert" style={local.emptyText}>No pudimos cargar los avisos.</Text>
          <Pressable accessibilityRole="button" onPress={load} style={local.retry}><Text style={local.retryText}>REINTENTAR</Text></Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshing={false}
          onRefresh={load}
          contentContainerStyle={items.length === 0 && local.centerList}
          ListEmptyComponent={<Text style={local.emptyText}>Todavía no tenés avisos.</Text>}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={palette.azul} /> : null}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.title}. ${item.body || ''}${item.read ? '' : '. Sin leer'}`}
              onPress={() => open(item)}
              style={[local.item, !item.read && local.itemUnread]}
            >
              <View style={[local.mark, { backgroundColor: MARK_COLOR[item.type] || palette.linea }]}>
                <Text style={local.markText}>{MARK[item.type] || '•'}</Text>
              </View>
              <View style={local.itemBody}>
                <Text style={local.itemTitle}>{item.title}</Text>
                {item.body ? <Text style={local.itemText}>{item.body}</Text> : null}
                <Text style={local.itemTime}>{timeAgo(item.createdAt)}</Text>
              </View>
              {!item.read ? <View style={local.dot} /> : null}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const local = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.fondo },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.blanco, borderWidth: 3, borderColor: palette.tinta, borderRadius: 4 },
  backText: { fontFamily: fonts.display, fontSize: 14, color: palette.tinta },
  title: { fontFamily: fonts.display, fontSize: 16, color: palette.tinta },
  markAll: { width: 64, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.verde, borderWidth: 3, borderColor: palette.tinta, borderRadius: 4 },
  markAllText: { fontFamily: fonts.display, fontSize: 7, lineHeight: 10, color: palette.tinta, textAlign: 'center' },
  disabled: { opacity: 0.4 },
  filters: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingBottom: 10 },
  chip: { flex: 1, paddingVertical: 6, alignItems: 'center', backgroundColor: palette.blanco, borderWidth: 3, borderColor: palette.tinta, borderRadius: 4 },
  chipActive: { backgroundColor: palette.amarillo },
  chipText: { fontFamily: fonts.body, fontSize: 18, color: palette.tinta },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  centerList: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { fontFamily: fonts.body, fontSize: 22, color: palette.tinta, textAlign: 'center' },
  retry: { marginTop: 16, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: palette.amarillo, borderWidth: 3, borderColor: palette.tinta, borderRadius: 4 },
  retryText: { fontFamily: fonts.display, fontSize: 10, color: palette.tinta },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginBottom: 8, padding: 10, backgroundColor: palette.blanco, borderWidth: 3, borderColor: palette.linea, borderRadius: 4 },
  itemUnread: { borderColor: palette.tinta },
  mark: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: palette.tinta, borderRadius: 18 },
  markText: { fontFamily: fonts.display, fontSize: 12, color: palette.tinta },
  itemBody: { flex: 1 },
  itemTitle: { fontFamily: fonts.body, fontSize: 22, lineHeight: 24, color: palette.tinta },
  itemText: { fontFamily: fonts.body, fontSize: 18, lineHeight: 20, color: palette.azul },
  itemTime: { fontFamily: fonts.body, fontSize: 16, color: palette.tinta, opacity: 0.6, marginTop: 2 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: palette.rosa, borderWidth: 2, borderColor: palette.tinta },
});
