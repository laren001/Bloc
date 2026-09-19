import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
 
  return (
    <View style={[styles.container, { borderBottomColor: theme.border, paddingTop: insets.top + 8 }]}>
      <View style={styles.left}>
        <BrickMark size={20} color={theme.textPrimary} />
        <Text style={[styles.wordmark, { color: theme.textPrimary }]}>BLOC</Text>
      </View>
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wordmark: { fontWeight: '800', fontSize: 19, letterSpacing: 1.5 },
});
 
export { BrickMark };
 