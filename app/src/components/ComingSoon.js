import React from 'react';
import { Text, View } from 'react-native';
import styles from '../styles';

export default function ComingSoon({ title }) {
  return (
    <View style={styles.content}>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      <Text style={styles.message}>Estamos trabajando en esta sección.</Text>
    </View>
  );
}
