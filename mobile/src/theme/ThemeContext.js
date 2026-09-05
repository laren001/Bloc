import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resolveTheme } from './tokens';

const STORAGE_KEY = 'bloc_theme_preference'; // 'light' | 'dark' | 'system'

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const [preference, setPreference] = useState('light'); // off-white is the default
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved) setPreference(saved);
      setLoaded(true);
    });
  }, []);

  const updatePreference = async (next) => {
    setPreference(next);
    await AsyncStorage.setItem(STORAGE_KEY, next);
  };

  const theme = resolveTheme(preference, systemScheme);

  if (!loaded) return null; // avoid a flash of the wrong theme on launch

  return (
    <ThemeContext.Provider value={{ theme, preference, setPreference: updatePreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
