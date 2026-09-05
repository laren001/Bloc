// Bloc theme tokens — light, dark, and system-match support.
// Off-white is the default. Burnt orange stays the single accent across both modes.

export const lightTheme = {
  mode: 'light',
  background: '#F5F3EF',
  surface: '#FFFFFF',
  border: '#E4E0D8',

  textPrimary: '#14251C',
  textSecondary: '#6B7A70',

  accent: '#C9622A',      // burnt orange — stories ring, likes, hover states
  accentSoft: '#E8B39A',  // lighter tint, for pressed/hover backgrounds
};

export const darkTheme = {
  mode: 'dark',
  background: '#0A0A0A',
  surface: '#161616',
  border: '#262626',

  textPrimary: '#F5F3EF',
  textSecondary: '#8A8A8A',

  accent: '#C9622A',
  accentSoft: '#7A3E1F',
};

// Returns the correct token set for a given mode preference.
// 'system' resolves using the device's current color scheme.
export function resolveTheme(preference, systemScheme) {
  if (preference === 'system') {
    return systemScheme === 'dark' ? darkTheme : lightTheme;
  }
  return preference === 'dark' ? darkTheme : lightTheme;
}
