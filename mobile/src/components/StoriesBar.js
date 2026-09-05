import React from 'react';
import { View, Text, Image, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

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
      contentContainerStyle={[styles.container, { borderBottomColor: theme.border }]}
      ListHeaderComponent={
        <TouchableOpacity onPress={onCreate} style={styles.item}>
          <View style={[styles.addRing, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <Ionicons name="add" size={24} color={theme.textSecondary} />
          </View>
          <Text style={[styles.username, { color: theme.textSecondary }]} numberOfLines={1}>
            Your story
          </Text>
        </TouchableOpacity>
      }
      renderItem={({ item }) => {
        const seen = isUserFullySeen(item);
        const preview = item.stories[0];
        return (
          <TouchableOpacity onPress={() => onOpenUser(item.user_id)} style={styles.item}>
            <View style={[styles.ring, { borderColor: seen ? theme.border : theme.accent }]}>
              <Image source={{ uri: preview.image_url }} style={styles.avatar} />
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
  container: { paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  item: { alignItems: 'center', marginRight: 14, width: 64 },
  ring: {
    width: 60, height: 60, borderRadius: 30, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', padding: 2,
  },
  addRing: {
    width: 60, height: 60, borderRadius: 30, borderWidth: 1.5, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  avatar: { width: '100%', height: '100%', borderRadius: 27 },
  username: { fontSize: 11, marginTop: 4, maxWidth: 62 },
});
