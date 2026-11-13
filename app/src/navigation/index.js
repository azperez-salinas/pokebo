import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapScreen from '../screens/MapScreen';
import EncyclopediaScreen from '../screens/EncyclopediaScreen';
import CameraScreen from '../screens/CameraScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PixelIcon from '../components/PixelIcon';
import NotificationBell from '../components/NotificationBell';
import NotificationsScreen from '../screens/NotificationsScreen';
import { NotificationsProvider } from '../store/notificationsStore';
import PixelBox from '../components/PixelBox';
import styles, { colors } from '../styles';

const tabs = [
  { id: 'map', label: 'Mapa', Screen: MapScreen },
  { id: 'collection', label: 'Enciclopedia', Screen: EncyclopediaScreen },
  { id: 'camera', label: 'Cámara', Screen: CameraScreen },
  { id: 'achievements', label: 'Logros', Screen: AchievementsScreen },
  { id: 'settings', label: 'Ajustes', Screen: SettingsScreen },
];

// Pantalla principal para montar cuando exista una sesión autenticada.
export default function MainNavigation({ session, onUserUpdated, onLogout }) {
  const [activeTab, setActiveTab] = useState('map');
  const [inboxOpen, setInboxOpen] = useState(false); // buzón de avisos encima de la pestaña actual
  const { Screen } = tabs.find((tab) => tab.id === activeTab);
  // El mapa se mantiene montado (solo se oculta) para conservar su cámara, zoom y ubicación al volver a la pestaña
  const mapVisible = activeTab === 'map' && !inboxOpen;

  const goToTab = (id) => {
    setInboxOpen(false);
    setActiveTab(id);
  };

  return (
    <NotificationsProvider>
      <SafeAreaView style={styles.screen}>
        <View style={mapVisible ? local.mapShown : local.mapHidden}>
          <MapScreen active={mapVisible} />
        </View>
        {inboxOpen ? (
          <NotificationsScreen onBack={() => setInboxOpen(false)} onNavigate={goToTab} />
        ) : (
          <>
            {activeTab !== 'map' ? (
              <Screen session={session} onUserUpdated={onUserUpdated} onLogout={onLogout} onNavigate={goToTab} />
            ) : null}
            <View pointerEvents="box-none" style={local.bell}>
              <NotificationBell onPress={() => setInboxOpen(true)} />
            </View>
          </>
        )}
        <View style={styles.tabBar}>
          {tabs.map(({ id, label }) => {
            const selected = id === activeTab;
            const camera = id === 'camera';
            return (
              <Pressable
                key={id}
                accessibilityRole="tab"
                accessibilityLabel={label}
                accessibilityState={{ selected }}
                onPress={() => goToTab(id)}
                style={camera ? styles.cameraTab : [styles.tab, selected && styles.selectedTab]}
              >
                {({ pressed }) => (
                  <>
                    {camera ? (
                      <PixelBox pressed={pressed} backgroundColor={colors.camera} style={[styles.cameraButton, selected && styles.selectedCamera]}>
                        <PixelIcon name={id} />
                      </PixelBox>
                    ) : (
                      <PixelIcon name={id} />
                    )}
                    {!camera && <Text style={[styles.tabLabel, selected && styles.selectedLabel]}>{label.toUpperCase()}</Text>}
                  </>
                )}
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </NotificationsProvider>
  );
}

const local = StyleSheet.create({
  bell: { position: 'absolute', top: 12, right: 16 },
  mapShown: { flex: 1 },
  mapHidden: { display: 'none' },
});
