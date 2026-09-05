import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function TextField({ label, value, onChangeText, placeholder, secureTextEntry, autoCapitalize = 'none', keyboardType = 'default' }) {
  const { theme } = useTheme();
  return (
    <View style={styles.fieldContainer}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        style={[
          styles.input,
          { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary },
        ]}
      />
    </View>
  );
}

export function PrimaryButton({ label, onPress, disabled, loading }) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        { backgroundColor: disabled || loading ? theme.border : theme.accent },
      ]}
    >
      <Text style={[styles.buttonLabel, { color: disabled || loading ? theme.textSecondary : '#FFFFFF' }]}>
        {loading ? 'Please wait…' : label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fieldContainer: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, letterSpacing: 0.3 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  button: { borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  buttonLabel: { fontSize: 14.5, fontWeight: '700' },
});
