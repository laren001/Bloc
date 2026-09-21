import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Image, FlatList, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import { typography } from '../theme/tokens';
import LoadingBricks from '../components/LoadingBricks';
import Avatar from '../components/Avatar';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const GRID_GAP = 2;
const GRID_COLUMNS = 3;

export default function ProfileScreen() {
  const { theme, scaleFont } = useTheme();
  const { user, profile: ownProfile } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const { width } = useWindowDimensions();

  const paramUserId = route.params?.userId;
  const isOwnProfile = !paramUserId;
  const targetUserId = paramUserId ?? user?.id;

  const [profile, setProfile] = useState(isOwnProfile ? ownProfile : null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const cellSize = (width - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

  const load = useCallback(async () => {
    if (!targetUserId) return;
    try {
      if (isOwnProfile) {
        setProfile(ownProfile);
      } else {
        const viewerParam = user?.id ? `?viewer_id=${user.id}` : '';
        const profileRes = await fetch(`${API_URL}/users/${targetUserId}${viewerParam}`);
        const profileData = await profileRes.json();
        setProfile(profileData);
        setIsFollowing(!!profileData?.is_following_viewer_target);
      }

      const postsRes = await fetch(`${API_URL}/users/${targetUserId}/posts`);
      const postsData = await postsRes.json();
      setPosts(postsData);
    } catch (err) {
      console.error('Failed to load profile', err);
    } finally {
      setLoading(false);
    }
  }, [targetUserId, isOwnProfile, ownProfile, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const toggleFollow = async () => {
    if (!user?.id || !targetUserId || isOwnProfile) return;
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setFollowBusy(true);
    try {
      await fetch(`${API_URL}/users/${targetUserId}/follow`, {
        method: wasFollowing ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ follower_id: user.id }),
      });
    } catch (err) {
      console.error('Failed to toggle follow', err);
      setIsFollowing(wasFollowing);
    } finally {
      setFollowBusy(false);
    }
  };

  const goToChat = () => {
    if (!targetUserId) return;
    navigation.navigate('DM', {
      screen: 'Chat',
      params: {
        otherUserId: targetUserId,
        otherUsername: profile?.username,
        otherDisplayName: profile?.display_name,
        otherAvatarUrl: profile?.avatar_url,
      },
    });
  };

  if (loading) {
    return <LoadingBricks />;
  }

  const displayUsername = profile?.username ?? route.params?.username ?? 'unknown';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
        {isOwnProfile ? (
          <View style={{ width: 24 }} />
        ) : (
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
        )}
        <Text style={[styles.topBarTitle, { color: theme.textPrimary, fontSize: scaleFont(15) }]}>
          @{displayUsername}
        </Text>
        {isOwnProfile ? (
          <TouchableOpacity onPress={() => navigation.navigate('AccountSettings')} hitSlop={12}>
            <Ionicons name="settings-outline" size={22} color={theme.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        numColumns={GRID_COLUMNS}
        ListHeaderComponent={
          <View style={styles.header}>
            <Avatar
              avatarUrl={profile?.avatar_url}
              displayName={profile?.display_name}
              username={displayUsername}
              size={84}
            />

            {profile?.display_name ? (
              <Text style={[styles.displayName, { color: theme.textPrimary, fontSize: scaleFont(typography.size.subtitle) }]}>
                {profile.display_name}
              </Text>
            ) : null}

            {profile?.bio ? (
              <Text style={[styles.bio, { color: theme.textSecondary, fontSize: scaleFont(typography.size.body) }]}>
                {profile.bio}
              </Text>
            ) : null}

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statCount, { color: theme.textPrimary, fontSize: scaleFont(15) }]}>{posts.length}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary, fontSize: scaleFont(12) }]}>Posts</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statCount, { color: theme.textPrimary, fontSize: scaleFont(15) }]}>{profile?.followers_count ?? 0}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary, fontSize: scaleFont(12) }]}>Followers</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statCount, { color: theme.textPrimary, fontSize: scaleFont(15) }]}>{profile?.following_count ?? 0}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary, fontSize: scaleFont(12) }]}>Following</Text>
              </View>
            </View>

            {!isOwnProfile && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  onPress={toggleFollow}
                  disabled={followBusy}
                  style={[
                    styles.actionButton,
                    isFollowing
                      ? { borderColor: theme.border, borderWidth: 1, backgroundColor: 'transparent' }
                      : { backgroundColor: '#CC5500' },
                  ]}
                >
                  <Text style={{ color: isFollowing ? theme.textPrimary : '#FFFFFF', fontWeight: '700', fontSize: scaleFont(14) }}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={goToChat}
                  style={[styles.actionButton, { borderColor: theme.border, borderWidth: 1, backgroundColor: 'transparent' }]}
                >
                  <Text style={{ color: theme.textPrimary, fontWeight: '700', fontSize: scaleFont(14) }}>Message</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ width: cellSize, height: cellSize, marginBottom: GRID_GAP, marginRight: GRID_GAP }}>
            <Image source={{ uri: item.image_url }} style={{ width: '100%', height: '100%', backgroundColor: theme.border }} />
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 24, fontSize: scaleFont(14) }}>
            No posts yet
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  topBarTitle: { fontWeight: '700' },
  header: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16 },
  displayName: { fontWeight: '700', marginTop: 10, marginBottom: 4 },
  bio: { textAlign: 'center', marginBottom: 14, paddingHorizontal: 24 },
  statsRow: { flexDirection: 'row', gap: 28, marginBottom: 16 },
  statItem: { alignItems: 'center' },
  statCount: { fontWeight: '700' },
  statLabel: { marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  actionButton: { paddingVertical: 8, paddingHorizontal: 24, borderRadius: 8 },
});
