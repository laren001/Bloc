import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

function BrickMark({ size = 22, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 300 300">
      <Rect x="0" y="0" width="130" height="60" rx="10" fill={color} />
      <Rect x="150" y="0" width="130" height="60" rx="10" fill={color} />
      <Rect x="-65" y="75" width="130" height="60" rx="10" fill={color} />
      <Rect x="85" y="75" width="130" height="60" rx="10" fill={color} />
      <Rect x="235" y="75" width="65" height="60" rx="10" fill={color} />
      <Rect x="0" y="150" width="130" height="60" rx="10" fill={color} />
      <Rect x="150" y="150" width="130" height="60" rx="10" fill={color} />
      <Rect x="-65" y="225" width="130" height="60" rx="10" fill={color} opacity={0.55} />
      <Rect x="85" y="225" width="130" height="60" rx="10" fill={color} />
      <Rect x="235" y="225" width="65" height="60" rx="10" fill={color} opacity={0.55} />
    </Svg>
  );
}

export default function TopBar() {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { borderBottomColor: theme.border }]}>
      <View style={styles.left}>
        <BrickMark size={20} color={theme.textPrimary} />
        <Text style={[styles.wordmark, { color: theme.textPrimary }]}>BLOC</Text>
      </View>
      <Ionicons name="notifications-outline" size={22} color={theme.textPrimary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wordmark: { fontWeight: '800', fontSize: 19, letterSpacing: 1.5 },
});

export { BrickMark };
