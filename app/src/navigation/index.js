import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapScreen from '../screens/MapScreen';
import EncyclopediaScreen from '../screens/EncyclopediaScreen';
import CameraScreen from '../screens/CameraScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PixelIcon from '../components/PixelIcon';
import styles from '../styles';

const tabs = [
  { id: 'map', label: 'Mapa', Screen: MapScreen },
  { id: 'collection', label: 'Colección', Screen: EncyclopediaScreen },
  { id: 'camera', label: 'Cámara', Screen: CameraScreen },
  { id: 'achievements', label: 'Logros', Screen: AchievementsScreen },
  { id: 'settings', label: 'Ajustes', Screen: SettingsScreen },
];

// Pantalla principal para montar cuando exista una sesión autenticada.
export default function MainNavigation({ session, onUserUpdated, onLogout }) {
  const [activeTab, setActiveTab] = useState('map');
  const { Screen } = tabs.find((tab) => tab.id === activeTab);

  return (
    <SafeAreaView style={styles.screen}>
      <Screen session={session} onUserUpdated={onUserUpdated} onLogout={onLogout} />
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
              onPress={() => setActiveTab(id)}
              style={({ pressed }) => [
                camera ? styles.cameraTab : styles.tab,
                selected && !camera && styles.selectedTab,
                pressed && styles.pressed,
              ]}
            >
              <View style={camera && [styles.cameraButton, selected && styles.selectedCamera]}>
                <PixelIcon name={id} />
              </View>
              {!camera && <Text style={[styles.tabLabel, selected && styles.selectedLabel]}>{label.toUpperCase()}</Text>}
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}
