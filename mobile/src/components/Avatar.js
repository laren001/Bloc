import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

// Consistent, deterministic color per user — same username always gets the
// same background color, so it reads as "their" avatar across the app.
const PALETTE = ['#CC5500', '#1E40AF', '#0F766E', '#7C3AED', '#B91C1C', '#166534', '#B45309'];

function colorForName(name) {
  if (!name) return PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function initialsForName(name) {
  if (!name) return '?';
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

// Renders the user's real avatar_url if set; otherwise a colored circle
// with their initials (from display_name, falling back to username).
export default function Avatar({ avatarUrl, displayName, username, size = 40, borderColor, borderWidth = 0 }) {
  const nameForFallback = displayName || username || '';
  const wrapperStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth,
    borderColor,
  };

  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} style={[styles.image, wrapperStyle]} />;
  }

  return (
    <View style={[styles.fallback, wrapperStyle, { backgroundColor: colorForName(nameForFallback) }]}>
      <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{initialsForName(nameForFallback)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { resizeMode: 'cover' },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#FFFFFF', fontWeight: '700' },
});