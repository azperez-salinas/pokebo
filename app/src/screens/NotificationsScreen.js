import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Button from '../components/Button';
import Chip from '../components/Chip';
import Icon from '../components/Icon';
import PixelBox from '../components/PixelBox';
import PixelSpinner from '../components/PixelSpinner';
import { BackButton } from '../components/ScreenHeader';
import useNotifications from '../hooks/useNotifications';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../services/notifications.service';
import { border, icons, palette, spacing, type as font } from '../styles';
import { timeAgo } from '../utils/timeAgo';

const FILTERS = [
  { value: undefined, label: 'Todos' },
  { value: 'achievement', label: 'Logros' },
  { value: 'nearby', label: 'Cercanos' },
  { value: 'capture', label: 'Capturas' },
];

// A qué pestaña lleva tocar cada tipo de aviso
const DESTINATION = { achievement: 'achievements', nearby: 'map', capture: 'collection' };
const MARK_ICON = { achievement: icons.extras.star, nearby: icons.extras.gps, capture: icons.panel.camera };
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
        <View style={local.side}><BackButton onPress={onBack} /></View>
        <Text accessibilityRole="header" style={local.title}>AVISOS</Text>
        <View style={[local.side, local.sideEnd]}>
          <Button size="small" label="LEER TODO" accessibilityLabel="Marcar todos como leídos" disabled={!hasUnread} onPress={markAll} />
        </View>
      </View>

      <View style={local.filters}>
        {FILTERS.map((filter) => (
          <Chip key={filter.label} label={filter.label} selected={filter.value === type} onPress={() => setType(filter.value)} />
        ))}
      </View>

      {state === 'loading' ? (
        <View style={local.center}><PixelSpinner accessibilityLabel="Cargando avisos" /></View>
      ) : state === 'error' ? (
        <View style={local.center}>
          <Text accessibilityRole="alert" style={local.emptyText}>No pudimos cargar los avisos.</Text>
          <Button label="REINTENTAR" color="amarillo" onPress={load} style={local.retry} />
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
          ListFooterComponent={loadingMore ? <PixelSpinner accessibilityLabel="Cargando más avisos" /> : null}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.title}. ${item.body || ''}${item.read ? '' : '. Sin leer'}`}
              onPress={() => open(item)}
              style={local.itemOuter}
            >
              {({ pressed }) => (
                <PixelBox pressed={pressed} shadowOffset={item.read ? 0 : 2} backgroundColor={item.read ? palette.fondo : palette.blanco} style={local.item}>
                  <View style={[local.mark, { backgroundColor: MARK_COLOR[item.type] || palette.linea }]}>
                    <Icon source={MARK_ICON[item.type] || icons.extras.question} size={24} />
                  </View>
                  <View style={local.itemBody}>
                    <Text style={local.itemTitle}>{item.title}</Text>
                    {item.body ? <Text style={local.itemText}>{item.body}</Text> : null}
                    <Text style={local.itemTime}>{timeAgo(item.createdAt)}</Text>
                  </View>
                  {!item.read ? <View style={local.dot} /> : null}
                </PixelBox>
              )}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const local = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.fondo },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  side: { flex: 1 },
  sideEnd: { alignItems: 'flex-end' },
  title: { ...font.title, color: palette.tinta },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  centerList: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyText: { ...font.subtitle, color: palette.tinta, textAlign: 'center' },
  retry: { marginTop: spacing.lg },
  itemOuter: { marginHorizontal: spacing.lg, marginBottom: spacing.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.sm + 2 },
  mark: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: border.width, borderColor: border.color, borderRadius: 0 },
  itemBody: { flex: 1 },
  itemTitle: { ...font.subtitle, color: palette.tinta },
  itemText: { ...font.caption, color: palette.azul },
  itemTime: { ...font.caption, color: palette.tinta, opacity: 0.6, marginTop: 2 },
  dot: { width: 12, height: 12, backgroundColor: palette.rosa, borderWidth: 2, borderColor: palette.tinta },
});
