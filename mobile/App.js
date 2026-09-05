import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';

import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import HomeScreen from './src/screens/HomeScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import PostScreen from './src/screens/PostScreen';
import LoadingBricks from './src/components/LoadingBricks';

const Tab = createBottomTabNavigator();

// Placeholder screens for tabs not built yet — Phase 6+ replaces these.
function PlaceholderScreen({ label }) {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: theme.textSecondary }}>{label} — coming soon</Text>
    </View>
  );
}

function MainTabs() {
  const { theme } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" children={() => <PlaceholderScreen label="Search" />} />
      <Tab.Screen name="Post" component={PostScreen} />
      <Tab.Screen name="Alerts" children={() => <PlaceholderScreen label="Notifications" />} />
      <Tab.Screen name="Profile" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { theme } = useTheme();
  const { session, loading } = useAuth();

  const navTheme = {
    ...(theme.mode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.mode === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.background,
      card: theme.surface,
      text: theme.textPrimary,
      border: theme.border,
      primary: theme.accent,
    },
  };

  if (loading) {
    return <LoadingBricks />;
  }

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      {session ? <MainTabs /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}
