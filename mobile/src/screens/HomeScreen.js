import React, { useState, useCallback } from 'react';
import { View, Modal, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import StoriesBar, { groupStoriesByUser } from '../components/StoriesBar';
import StoryViewer from '../components/StoryViewer';
import CreateStoryScreen from '../components/CreateStoryScreen';
import FeedScreen from './FeedScreen';
import TopBar from '../components/TopBar';
import { useTheme } from '../theme/ThemeContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function HomeScreen() {
  const { theme } = useTheme();
  const [stories, setStories] = useState([]);
  // Story "seen" state is tracked client-side for v1 — resets on app restart.
  // A persisted story_views table can be added later if cross-device seen-state matters.
  const [seenIds, setSeenIds] = useState(new Set());
  const [viewingUserIndex, setViewingUserIndex] = useState(null);
  const [creatingStory, setCreatingStory] = useState(false);

  const loadStories = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/stories`);
      const data = await res.json();
      setStories(data);
    } catch (err) {
      console.error('Failed to load stories', err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStories();
    }, [loadStories])
  );

  const groupedStories = groupStoriesByUser(stories);

  const openUserStories = (userId) => {
    const idx = groupedStories.findIndex((g) => g.user_id === userId);
    if (idx !== -1) setViewingUserIndex(idx);
  };

  const markSeen = (storyId) => {
    setSeenIds((prev) => new Set(prev).add(storyId));
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TopBar />
      <StoriesBar
        groupedStories={groupedStories}
        seenIds={seenIds}
        onOpenUser={openUserStories}
        onCreate={() => setCreatingStory(true)}
      />
      <FeedScreen />

      <Modal
        visible={viewingUserIndex !== null}
        animationType="fade"
        onRequestClose={() => setViewingUserIndex(null)}
      >
        {viewingUserIndex !== null && (
          <StoryViewer
            groupedStories={groupedStories}
            startIndex={viewingUserIndex}
            onClose={() => setViewingUserIndex(null)}
            onMarkSeen={markSeen}
          />
        )}
      </Modal>

      <Modal
        visible={creatingStory}
        animationType="slide"
        onRequestClose={() => setCreatingStory(false)}
      >
        <CreateStoryScreen
          onClose={() => {
            setCreatingStory(false);
            loadStories();
          }}
          onPublished={loadStories}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
