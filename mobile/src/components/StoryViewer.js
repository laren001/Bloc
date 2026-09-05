import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, Pressable, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

const DURATION = 6000; // 5-7s range, 6s picked as the default

export default function StoryViewer({ groupedStories, startIndex, onClose, onMarkSeen }) {
  const { theme } = useTheme();
  const [userIndex, setUserIndex] = useState(startIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const progressAnims = useRef([]).current;
  const timerRef = useRef(null);

  const currentUserStories = groupedStories[userIndex]?.stories ?? [];
  const current = currentUserStories[storyIndex];

  // Rebuild one Animated.Value per story whenever the active user changes.
  useEffect(() => {
    progressAnims.length = 0;
    currentUserStories.forEach(() => progressAnims.push(new Animated.Value(0)));
  }, [userIndex]);

  const goNextStory = () => {
    if (storyIndex < currentUserStories.length - 1) {
      setStoryIndex((i) => i + 1);
    } else if (userIndex < groupedStories.length - 1) {
      setUserIndex((u) => u + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  };

  const goPrevStory = () => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
    } else if (userIndex > 0) {
      const prevStories = groupedStories[userIndex - 1].stories;
      setUserIndex((u) => u - 1);
      setStoryIndex(prevStories.length - 1);
    }
  };

  useEffect(() => {
    if (current) onMarkSeen(current.id);
  }, [current?.id]);

  useEffect(() => {
    if (!current || paused || !progressAnims[storyIndex]) return;

    const anim = progressAnims[storyIndex];
    const remaining = DURATION * (1 - (anim._value || 0));

    timerRef.current = Animated.timing(anim, {
      toValue: 1,
      duration: remaining,
      useNativeDriver: false,
    });

    timerRef.current.start(({ finished }) => {
      if (finished) goNextStory();
    });

    return () => timerRef.current?.stop();
  }, [userIndex, storyIndex, paused]);

  // Mark earlier segments full, later segments empty, whenever the active story changes.
  useEffect(() => {
    progressAnims.forEach((anim, i) => {
      if (i < storyIndex) anim.setValue(1);
      else if (i > storyIndex) anim.setValue(0);
    });
  }, [storyIndex, userIndex]);

  if (!current) return null;

  return (
    <View style={styles.container}>
      <View style={styles.progressRow}>
        {currentUserStories.map((_, i) => (
          <View key={i} style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnims[i]
                    ? progressAnims[i].interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                    : '0%',
                },
              ]}
            />
          </View>
        ))}
      </View>

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={{ uri: current.image_url }} style={styles.avatar} />
          <Text style={styles.username}>{groupedStories[userIndex]?.username}</Text>
          {paused && <Text style={styles.pausedLabel}>· paused</Text>}
        </View>
        <Pressable onPress={onClose} hitSlop={12}>
          <Ionicons name="close" size={24} color="#F5F3EF" />
        </Pressable>
      </View>

      <View style={styles.imageWrapper}>
        <Image source={{ uri: current.image_url }} style={styles.image} resizeMode="cover" />

        {(current.location || current.event_tag) && (
          <View style={styles.tagRow}>
            {current.location ? (
              <View style={styles.tagPill}>
                <Ionicons name="location-outline" size={12} color="#F5F3EF" />
                <Text style={styles.tagText}>{current.location}</Text>
              </View>
            ) : null}
            {current.event_tag ? (
              <View style={[styles.tagPill, { backgroundColor: theme.accent }]}>
                <Ionicons name="pricetag-outline" size={12} color="#FFFFFF" />
                <Text style={[styles.tagText, { color: '#FFFFFF' }]}>{current.event_tag}</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>

      {/* Left/right zones: quick tap navigates, press-and-hold pauses */}
      <View style={styles.tapZones}>
        <Pressable
          style={{ flex: 1 }}
          onPress={goPrevStory}
          onLongPress={() => setPaused(true)}
          onPressOut={() => setPaused(false)}
          delayLongPress={180}
        />
        <Pressable
          style={{ flex: 1 }}
          onPress={goNextStory}
          onLongPress={() => setPaused(true)}
          onPressOut={() => setPaused(false)}
          delayLongPress={180}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  progressRow: { flexDirection: 'row', gap: 4, paddingHorizontal: 12, paddingTop: 54 },
  progressTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#F5F3EF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 28, height: 28, borderRadius: 14 },
  username: { color: '#F5F3EF', fontSize: 13, fontWeight: '600' },
  pausedLabel: { color: '#8A8A8A', fontSize: 11 },
  imageWrapper: { flex: 1, marginHorizontal: 10, marginBottom: 10, borderRadius: 14, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  tagRow: { position: 'absolute', bottom: 20, left: 16, flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tagPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  tagText: { color: '#F5F3EF', fontSize: 11.5, fontWeight: '600' },
  tapZones: { position: 'absolute', top: 90, left: 0, right: 0, bottom: 0, flexDirection: 'row' },
});
