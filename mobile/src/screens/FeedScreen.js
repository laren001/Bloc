import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, RefreshControl, Modal, Animated, Pressable } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { typography, spacing } from '../theme/tokens';
import { useAuth } from '../auth/AuthContext';
import CommentSheet from '../components/CommentSheet';
import LoadingBricks from '../components/LoadingBricks';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const DOUBLE_TAP_DELAY = 280;

export default function FeedScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeComments, setActiveComments] = useState(null);

  const lastTapRef = useRef({});
  const heartAnims = useRef({});

  const getHeartAnim = (postId) => {
    if (!heartAnims.current[postId]) {
      heartAnims.current[postId] = new Animated.Value(0);
    }
    return heartAnims.current[postId];
  };

  const loadFeed = useCallback(async () => {
    try {
      const viewerParam = user?.id ? `?viewer_id=${user.id}` : '';
      const res = await fetch(`${API_URL}/posts${viewerParam}`);
      const data = await res.json();
      setPosts(data);
    } catch (err) {
      console.error('Failed to load feed', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

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
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, liked_by_viewer: wasLiked, like_count: p.like_count + (wasLiked ? 1 : -1) }
            : p
        )
      );
    }
  };

  const playHeartBurst = (postId) => {
    const anim = getHeartAnim(postId);
    anim.setValue(0);
    Animated.sequence([
      Animated.spring(anim, { toValue: 1, friction: 4, useNativeDriver: true }),
      Animated.delay(400),
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const handleImagePress = (post) => {
    const now = Date.now();
    const last = lastTapRef.current[post.id] || 0;

    if (now - last < DOUBLE_TAP_DELAY) {
      if (!post.liked_by_viewer) {
        toggleLike(post);
      }
      playHeartBurst(post.id);
      lastTapRef.current[post.id] = 0;
    } else {
      lastTapRef.current[post.id] = now;
    }
  };

  const handleCommentAdded = (postId) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p))
    );
  };

  const goToProfile = (item) => {
    const targetUserId = item.user_id ?? item.profiles?.id;
    if (!targetUserId) return;
    if (user?.id && targetUserId === user.id) {
      navigation.navigate('Profile');
      return;
    }
    navigation.navigate('UserProfile', {
      userId: targetUserId,
      username: item.profiles?.username,
    });
  };

  const renderPost = ({ item }) => {
    const heartAnim = getHeartAnim(item.id);
    const heartScale = heartAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.3] });

    return (
      <View style={[styles.postCard, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => handleImagePress(item)}>
          <Image source={{ uri: item.image_url }} style={[styles.postImage, { backgroundColor: theme.border }]} />
          <Animated.View
            pointerEvents="none"
            style={[styles.heartOverlay, { opacity: heartAnim, transform: [{ scale: heartScale }] }]}
          >
            <Ionicons name="heart" size={72} color={theme.accent} />
          </Animated.View>
        </Pressable>

        <View style={styles.metaRow}>
          <TouchableOpacity style={styles.byline} onPress={() => goToProfile(item)}>
            <Text style={[styles.username, { color: theme.textPrimary, fontFamily: typography.fontFamily.serif }]}>
              @{item.profiles?.username ?? 'unknown'}
            </Text>
            {item.location ? (
              <Text style={[styles.location, { color: theme.textSecondary }]}>{item.location}</Text>
            ) : null}
          </TouchableOpacity>

          <View style={styles.actions}>
            <TouchableOpacity onPress={() => toggleLike(item)} style={styles.actionItem}>
              <Ionicons
                name={item.liked_by_viewer ? 'heart' : 'heart-outline'}
                size={18}
                color={item.liked_by_viewer ? theme.accent : theme.textSecondary}
              />
              <Text style={[styles.actionCount, { color: theme.textSecondary }]}>{item.like_count}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveComments(item)} style={styles.actionItem}>
              <Ionicons name="chatbubble-outline" size={17} color={theme.textSecondary} />
              <Text style={[styles.actionCount, { color: theme.textSecondary }]}>{item.comment_count}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {item.caption ? (
          <Text style={[styles.caption, { color: theme.textPrimary }]}>{item.caption}</Text>
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
  };

  if (loading) {
    return <LoadingBricks />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.textPrimary} />
        }
        contentContainerStyle={{ paddingBottom: spacing.xl }}
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
  postCard: { borderBottomWidth: 1, paddingBottom: spacing.lg, marginBottom: spacing.lg },
  postImage: { width: '100%', aspectRatio: 4 / 5 },
  heartOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  byline: { flexShrink: 1, paddingRight: spacing.md },
  username: { fontSize: typography.size.subtitle, fontWeight: typography.weight.medium },
  location: { fontSize: typography.size.tiny, marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing.md },
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionCount: { fontSize: typography.size.caption },
  caption: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    fontSize: typography.size.body,
    lineHeight: 20,
  },
  viewComments: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, fontSize: typography.size.tiny },
});
