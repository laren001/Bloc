import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, RefreshControl, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import CommentSheet from '../components/CommentSheet';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function FeedScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeComments, setActiveComments] = useState(null); // post object or null

  const loadFeed = useCallback(async () => {
    try {
      const viewerParam = user?.id ? `?viewer_id=${user.id}` : '';
      const res = await fetch(`${API_URL}/posts${viewerParam}`);
      const data = await res.json();
      setPosts(data);
    } catch (err) {
      console.error('Failed to load feed', err);
    }
  }, [user?.id]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  // Reload whenever this screen regains focus — e.g. after posting and
  // navigating back from the Post tab, so the new post shows up immediately.
  useFocusEffect(
    useCallback(() => {
      loadFeed();
    }, [loadFeed])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  };

  const toggleLike = async (post) => {
    if (!user) return;

    // Optimistic update — flip the UI immediately, roll back if the request fails.
    const wasLiked = post.liked_by_viewer;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, liked_by_viewer: !wasLiked, like_count: p.like_count + (wasLiked ? -1 : 1) }
          : p
      )
    );

    try {
      await fetch(`${API_URL}/posts/${post.id}/like`, {
        method: wasLiked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
    } catch (err) {
      console.error('Failed to toggle like', err);
      // Roll back on failure
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, liked_by_viewer: wasLiked, like_count: p.like_count + (wasLiked ? 1 : -1) }
            : p
        )
      );
    }
  };

  const handleCommentAdded = (postId) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p))
    );
  };

  const renderPost = ({ item }) => (
    <View style={[styles.postCard, { backgroundColor: theme.surface }]}>
      <View style={styles.postHeader}>
        <Text style={[styles.username, { color: theme.textPrimary }]}>
          @{item.profiles?.username ?? 'unknown'}
        </Text>
        {item.location ? (
          <Text style={[styles.location, { color: theme.textSecondary }]}>{item.location}</Text>
        ) : null}
      </View>

      <Image source={{ uri: item.image_url }} style={[styles.postImage, { backgroundColor: theme.border }]} />

      <View style={styles.actionRow}>
        <TouchableOpacity onPress={() => toggleLike(item)} style={{ marginRight: 16 }}>
          <Ionicons
            name={item.liked_by_viewer ? 'heart' : 'heart-outline'}
            size={22}
            color={item.liked_by_viewer ? theme.accent : theme.textPrimary}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveComments(item)}>
          <Ionicons name="chatbubble-outline" size={21} color={theme.textPrimary} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.likeCount, { color: theme.textPrimary }]}>
        {item.like_count} like{item.like_count !== 1 ? 's' : ''}
      </Text>

      {item.caption ? (
        <Text style={[styles.caption, { color: theme.textPrimary }]}>
          <Text style={{ fontWeight: '700' }}>@{item.profiles?.username ?? 'unknown'} </Text>
          {item.caption}
        </Text>
      ) : null}

      {item.comment_count > 0 && (
        <TouchableOpacity onPress={() => setActiveComments(item)}>
          <Text style={[styles.viewComments, { color: theme.textSecondary }]}>
            View all {item.comment_count} comment{item.comment_count !== 1 ? 's' : ''}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.textPrimary} />
        }
        contentContainerStyle={{ paddingBottom: 24, paddingTop: 4 }}
      />

      <Modal visible={!!activeComments} animationType="slide" onRequestClose={() => setActiveComments(null)}>
        {activeComments && (
          <CommentSheet
            post={activeComments}
            onClose={() => setActiveComments(null)}
            onCommentAdded={handleCommentAdded}
          />
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  postCard: { marginBottom: 16 },
  postHeader: { paddingHorizontal: 12, paddingVertical: 8 },
  username: { fontWeight: '600', fontSize: 14 },
  location: { fontSize: 11, marginTop: 1 },
  postImage: { width: '100%', aspectRatio: 4 / 5 },
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 2 },
  likeCount: { fontWeight: '600', fontSize: 13, paddingHorizontal: 12, paddingTop: 2 },
  caption: { paddingHorizontal: 12, paddingTop: 4, fontSize: 13 },
  viewComments: { paddingHorizontal: 12, paddingTop: 4, fontSize: 12 },
});
