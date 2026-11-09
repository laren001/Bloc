import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, RefreshControl, Modal, Animated, Pressable } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { useTheme } from '../theme/ThemeContext';
import { typography, spacing } from '../theme/tokens';
import { useAuth } from '../auth/AuthContext';
import { authFetch } from '../lib/authFetch';
import CommentSheet from '../components/CommentSheet';
import MentionText from '../components/MentionText';
import LoadingBricks from '../components/LoadingBricks';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const DOUBLE_TAP_DELAY = 280;

export default function FeedScreen() {
  const { theme, scaleFont } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeComments, setActiveComments] = useState(null);
  const [playingVideos, setPlayingVideos] = useState({});

  const lastTapRef = useRef({});
  const tapTimeoutRef = useRef({});
  const heartAnims = useRef({});

  const getHeartAnim = (feedKey) => {
    if (!heartAnims.current[feedKey]) {
      heartAnims.current[feedKey] = new Animated.Value(0);
    }
    return heartAnims.current[feedKey];
  };

  // The backend now identifies the viewer from the auth token, so there's
  // no viewer_id to send. A non-OK response is surfaced as an error
  // instead of being treated as a list of posts.
  const loadFeed = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/posts`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }

      setPosts(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error('Failed to load feed', err);
      setError(err.message || 'Something went wrong');
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

  // Likes act on the underlying post id, so every feed entry for the same
  // post (its own row, plus anyone's repost of it) updates together.
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
      const res = await authFetch(`${API_URL}/posts/${post.id}/like`, {
        method: wasLiked ? 'DELETE' : 'POST',
      });
      if (!res.ok) throw new Error(`Like failed (${res.status})`);
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

  const toggleRepost = async (post) => {
    if (!user) return;

    const wasReposted = post.reposted_by_viewer;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, reposted_by_viewer: !wasReposted, repost_count: p.repost_count + (wasReposted ? -1 : 1) }
          : p
      )
    );

    try {
      const res = await authFetch(`${API_URL}/posts/${post.id}/repost`, {
        method: wasReposted ? 'DELETE' : 'POST',
      });
      if (!res.ok && res.status !== 409) throw new Error('Repost failed');
      // A fresh load picks up the new repost as its own feed entry
      // (or removes it), so the timeline reflects it immediately.
      loadFeed();
    } catch (err) {
      console.error('Failed to toggle repost', err);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, reposted_by_viewer: wasReposted, repost_count: p.repost_count + (wasReposted ? 1 : -1) }
            : p
        )
      );
    }
  };

  const playHeartBurst = (feedKey) => {
    const anim = getHeartAnim(feedKey);
    anim.setValue(0);
    Animated.sequence([
      Animated.spring(anim, { toValue: 1, friction: 4, useNativeDriver: true }),
      Animated.delay(400),
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const toggleVideoPlay = (feedKey) => {
    setPlayingVideos((prev) => ({ ...prev, [feedKey]: !prev[feedKey] }));
  };

  // Single tap on a video toggles play/pause; a second tap within the
  // delay window counts as a double-tap and likes the post instead. The
  // single-tap action waits out the delay window so it doesn't fire right
  // before a double-tap arrives.
  const handleMediaPress = (item) => {
    const feedKey = item.feed_key;
    const now = Date.now();
    const last = lastTapRef.current[feedKey] || 0;

    if (now - last < DOUBLE_TAP_DELAY) {
      if (tapTimeoutRef.current[feedKey]) {
        clearTimeout(tapTimeoutRef.current[feedKey]);
        delete tapTimeoutRef.current[feedKey];
      }
      if (!item.liked_by_viewer) {
        toggleLike(item);
      }
      playHeartBurst(feedKey);
      lastTapRef.current[feedKey] = 0;
    } else {
      lastTapRef.current[feedKey] = now;
      if (item.media_type === 'video') {
        tapTimeoutRef.current[feedKey] = setTimeout(() => {
          toggleVideoPlay(feedKey);
          delete tapTimeoutRef.current[feedKey];
        }, DOUBLE_TAP_DELAY);
      }
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

  const goToUser = (targetUser) => {
    if (!targetUser?.id) return;
    if (user?.id && targetUser.id === user.id) {
      navigation.navigate('Profile');
      return;
    }
    navigation.navigate('UserProfile', { userId: targetUser.id, username: targetUser.username });
  };

  const renderPost = ({ item }) => {
    const heartAnim = getHeartAnim(item.feed_key);
    const heartScale = heartAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.3] });
    const isVideo = item.media_type === 'video';
    const isPlaying = !!playingVideos[item.feed_key];

    return (
      <View style={[styles.postCard, { borderBottomColor: theme.border }]}>
        {item.is_repost && item.reposted_by && (
          <TouchableOpacity style={styles.repostBanner} onPress={() => goToUser(item.reposted_by)}>
            <Ionicons name="repeat" size={14} color={theme.textSecondary} />
            <Text style={{ color: theme.textSecondary, fontSize: scaleFont(typography.size.tiny), marginLeft: 6 }}>
              @{item.reposted_by.username} reposted
            </Text>
          </TouchableOpacity>
        )}

        <Pressable onPress={() => handleMediaPress(item)}>
          {isVideo ? (
            <Video
              source={{ uri: item.image_url }}
              posterSource={item.thumbnail_url ? { uri: item.thumbnail_url } : undefined}
              usePoster={!!item.thumbnail_url}
              style={[styles.postImage, { backgroundColor: theme.border }]}
              resizeMode={ResizeMode.COVER}
              isLooping
              shouldPlay={isPlaying}
              isMuted={false}
            />
          ) : (
            <Image source={{ uri: item.image_url }} style={[styles.postImage, { backgroundColor: theme.border }]} />
          )}

          {isVideo && !isPlaying && (
            <View pointerEvents="none" style={styles.playIconOverlay}>
              <Ionicons name="play" size={44} color="#FFFFFF" />
            </View>
          )}

          <Animated.View
            pointerEvents="none"
            style={[styles.heartOverlay, { opacity: heartAnim, transform: [{ scale: heartScale }] }]}
          >
            <Ionicons name="heart" size={72} color={theme.accent} />
          </Animated.View>
        </Pressable>

        <View style={styles.metaRow}>
          <TouchableOpacity style={styles.byline} onPress={() => goToProfile(item)}>
            <Text style={[styles.username, { color: theme.textPrimary, fontFamily: typography.fontFamily.serif, fontSize: scaleFont(typography.size.subtitle) }]}>
              @{item.profiles?.username ?? 'unknown'}
            </Text>
            {item.location ? (
              <Text style={[styles.location, { color: theme.textSecondary, fontSize: scaleFont(typography.size.tiny) }]}>{item.location}</Text>
            ) : null}
          </TouchableOpacity>

          <View style={styles.actions}>
            <TouchableOpacity onPress={() => toggleLike(item)} style={styles.actionItem}>
              <Ionicons
                name={item.liked_by_viewer ? 'heart' : 'heart-outline'}
                size={18}
                color={item.liked_by_viewer ? theme.accent : theme.textSecondary}
              />
              <Text style={[styles.actionCount, { color: theme.textSecondary, fontSize: scaleFont(typography.size.caption) }]}>{item.like_count}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveComments(item)} style={styles.actionItem}>
              <Ionicons name="chatbubble-outline" size={17} color={theme.textSecondary} />
              <Text style={[styles.actionCount, { color: theme.textSecondary, fontSize: scaleFont(typography.size.caption) }]}>{item.comment_count}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => toggleRepost(item)} style={styles.actionItem}>
              <Ionicons
                name="repeat"
                size={19}
                color={item.reposted_by_viewer ? theme.accent : theme.textSecondary}
              />
              <Text style={[styles.actionCount, { color: theme.textSecondary, fontSize: scaleFont(typography.size.caption) }]}>{item.repost_count}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {item.caption ? (
          <View style={styles.captionWrapper}>
            <MentionText
              text={item.caption}
              mentionedUsers={item.mentioned_users}
              currentUserId={user?.id}
              style={[styles.caption, { color: theme.textPrimary, fontSize: scaleFont(typography.size.body) }]}
              linkStyle={{ color: theme.accent, fontWeight: '600' }}
            />
          </View>
        ) : null}

        {item.tagged_users?.length > 0 && (
          <View style={styles.taggedLine}>
            <Text style={{ color: theme.textSecondary, fontSize: scaleFont(typography.size.tiny) }}>with </Text>
            {item.tagged_users.map((u, i) => (
              <Text key={u.id}>
                <Text
                  onPress={() => goToUser(u)}
                  style={{ color: theme.accent, fontSize: scaleFont(typography.size.tiny), fontWeight: '600' }}
                >
                  @{u.username}
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: scaleFont(typography.size.tiny) }}>
                  {i < item.tagged_users.length - 1 ? ', ' : ''}
                </Text>
              </Text>
            ))}
          </View>
        )}

        {item.comment_count > 0 && (
          <TouchableOpacity onPress={() => setActiveComments(item)}>
            <Text style={[styles.viewComments, { color: theme.textSecondary, fontSize: scaleFont(typography.size.tiny) }]}>
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
        keyExtractor={(item) => item.feed_key}
        renderItem={renderPost}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.textPrimary} />
        }
        contentContainerStyle={{ paddingBottom: spacing.xl, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {error ? (
              <>
                <Text style={{ color: theme.textPrimary, fontSize: scaleFont(15), fontWeight: '700', textAlign: 'center' }}>
                  Couldn't load the feed
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: scaleFont(12.5), textAlign: 'center', marginTop: 6 }}>
                  {error}
                </Text>
                <TouchableOpacity
                  onPress={onRefresh}
                  style={[styles.retryButton, { borderColor: theme.border }]}
                >
                  <Text style={{ color: theme.textPrimary, fontWeight: '700', fontSize: scaleFont(13.5) }}>Try again</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={{ color: theme.textSecondary, fontSize: scaleFont(14), textAlign: 'center' }}>
                No posts yet — be the first to post.
              </Text>
            )}
          </View>
        }
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
  repostBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.xs },
  postImage: { width: '100%', aspectRatio: 4 / 5 },
  heartOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIconOverlay: {
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
  username: { fontWeight: typography.weight.medium },
  location: { marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing.md },
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionCount: {},
  captionWrapper: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  caption: { lineHeight: 20 },
  taggedLine: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, paddingTop: 2 },
  viewComments: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 80 },
  retryButton: { marginTop: 16, borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 22 },
});