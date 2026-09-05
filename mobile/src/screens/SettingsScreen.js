import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';

export default function SettingsScreen() {
  const { theme } = useTheme();
  const { signOut, profile } = useAuth();

  const handleSignOut = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {profile?.username ? (
        <Text style={[styles.username, { color: theme.textPrimary }]}>@{profile.username}</Text>
      ) : null}

      <Text style={[styles.label, { color: theme.textPrimary }]}>Appearance</Text>
      <ThemeToggle />

      <TouchableOpacity onPress={handleSignOut} style={[styles.signOutButton, { borderColor: theme.border }]}>
        <Text style={{ color: theme.accent, fontWeight: '700', fontSize: 14 }}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  username: { fontSize: 16, fontWeight: '700', marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 10 },
  signOutButton: {
    marginTop: 32, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center',
  },
});
