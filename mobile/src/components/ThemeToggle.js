import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

const OPTIONS = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'System' },
];

export default function ThemeToggle() {
  const { theme, preference, setPreference } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {OPTIONS.map((opt) => {
        const active = preference === opt.id;
        return (
          <TouchableOpacity
            key={opt.id}
            onPress={() => setPreference(opt.id)}
            style={[
              styles.option,
              active && { backgroundColor: theme.accent },
            ]}
          >
            <Text style={[
              styles.label,
              { color: active ? '#FFFFFF' : theme.textSecondary },
            ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  option: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
