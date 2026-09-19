export const lightTheme = {
  mode: 'light',
  background: '#F5F3EF',
  surface: '#FFFFFF',
  border: '#E4E0D8',

  textPrimary: '#14251C',
  textSecondary: '#6B7A70',

  accent: '#C9622A',
  accentSoft: '#E8B39A',
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

export function resolveTheme(preference, systemScheme) {
  if (preference === 'system') {
    return systemScheme === 'dark' ? darkTheme : lightTheme;
  }
  return preference === 'dark' ? darkTheme : lightTheme;
}

export const typography = {
  fontFamily: {
    serif: 'Georgia',
    sans: 'System',
  },
  size: {
    display: 28,
    title: 20,
    subtitle: 16,
    body: 14,
    caption: 12.5,
    tiny: 11,
  },
  weight: {
    regular: '400',
    medium: '600',
    bold: '700',
  },
  letterSpacing: {
    heading: 0.3,
    wordmark: 1.5,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const FONT_SCALES = {
  small: { label: 'Small', multiplier: 0.9 },
  medium: { label: 'Medium', multiplier: 1.0 },
  large: { label: 'Large', multiplier: 1.15 },
  xlarge: { label: 'Extra Large', multiplier: 1.3 },
};
