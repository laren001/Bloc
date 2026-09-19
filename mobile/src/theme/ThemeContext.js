import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resolveTheme, FONT_SCALES } from './tokens';

const THEME_STORAGE_KEY = 'bloc_theme_preference';
const FONT_STORAGE_KEY = 'bloc_font_scale';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState('light');
  const [fontScaleKey, setFontScaleKey] = useState('medium');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(THEME_STORAGE_KEY),
      AsyncStorage.getItem(FONT_STORAGE_KEY),
    ]).then(([savedTheme, savedFont]) => {
      if (savedTheme) setPreference(savedTheme);
      if (savedFont && FONT_SCALES[savedFont]) setFontScaleKey(savedFont);
      setLoaded(true);
    });
  }, []);

  const updatePreference = async (next) => {
    setPreference(next);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, next);
  };

  const updateFontScale = async (next) => {
    if (!FONT_SCALES[next]) return;
    setFontScaleKey(next);
    await AsyncStorage.setItem(FONT_STORAGE_KEY, next);
  };

  const theme = resolveTheme(preference, systemScheme);
  const multiplier = FONT_SCALES[fontScaleKey].multiplier;

  const scaleFont = (baseSize) => Math.round(baseSize * multiplier);

  if (!loaded) return null;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        preference,
        setPreference: updatePreference,
        fontScaleKey,
        setFontScale: updateFontScale,
        scaleFont,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
