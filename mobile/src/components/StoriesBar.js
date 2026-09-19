import React from 'react';
import { View, Text, Image, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { typography, spacing } from '../theme/tokens';

// Groups flat story rows into one entry per user, preserving the order
// they were returned in (most recent user activity first, from the backend).
export function groupStoriesByUser(stories) {
  const map = new Map();
  stories.forEach((s) => {
    const key = s.user_id;
    if (!map.has(key)) {
      map.set(key, { user_id: key, username: s.profiles?.username ?? 'user', stories: [] });
    }
    map.get(key).stories.push(s);
  });
  return Array.from(map.values());
}

export default function StoriesBar({ groupedStories, seenIds, onOpenUser, onCreate }) {
  const { theme } = useTheme();

  const isUserFullySeen = (group) => group.stories.every((s) => seenIds.has(s.id));

  return (
    <FlatList
      horizontal
      data={groupedStories}
      keyExtractor={(item) => item.user_id}
      showsHorizontalScrollIndicator={false}
      style={styles.list}
      contentContainerStyle={[styles.container, { borderBottomColor: theme.border }]}
      ListHeaderComponent={
        <TouchableOpacity onPress={onCreate} style={styles.item}>
          <View style={[styles.thumb, styles.addThumb, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <Ionicons name="add" size={20} color={theme.textSecondary} />
          </View>
          <Text style={[styles.username, { color: theme.textSecondary }]} numberOfLines={1}>
            You
          </Text>
        </TouchableOpacity>
      }
      renderItem={({ item }) => {
        const seen = isUserFullySeen(item);
        const preview = item.stories[0];
        return (
          <TouchableOpacity onPress={() => onOpenUser(item.user_id)} style={styles.item}>
            <View style={styles.thumb}>
              <Image source={{ uri: preview.image_url }} style={styles.avatar} />
              {!seen && <View style={[styles.dot, { backgroundColor: theme.accent }]} />}
            </View>
            <Text style={[styles.username, { color: theme.textSecondary }]} numberOfLines={1}>
              {item.username}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { flexGrow: 0, flexShrink: 0 },
  container: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1 },
  item: { alignItems: 'flex-start', marginRight: spacing.md, width: 56 },
  thumb: {
    width: 56, height: 84, borderRadius: 6, overflow: 'hidden', position: 'relative',
  },
  addThumb: {
    borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center',
  },
  avatar: { width: '100%', height: '100%' },
  dot: {
    position: 'absolute', top: 5, right: 5, width: 7, height: 7, borderRadius: 3.5,
  },
  username: {
    fontSize: typography.size.tiny, marginTop: spacing.xs, maxWidth: 56,
  },
});