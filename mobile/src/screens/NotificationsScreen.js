import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';
import Avatar from '../components/Avatar';
import LoadingBricks from '../components/LoadingBricks';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

function timeAgo(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function notificationText(item) {
  const name = item.actor?.display_name || `@${item.actor?.username ?? 'someone'}`;
  if (item.type === 'follow') return `${name} started following you`;
  if (item.type === 'like') return `${name} liked your post`;
  if (item.type === 'comment') return `${name} commented: ${item.comment_preview ?? ''}`;
  return `${name} did something`;
}

export default function NotificationsScreen() {
  const { theme, scaleFont } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${API_URL}/notifications/${user.id}`);
      const data = await res.json();
      setNotifications(data);

      fetch(`${API_URL}/notifications/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      }).catch((err) => console.error('Failed to mark notifications read', err));
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  // Live updates while this screen is open.
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` },
        () => loadNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadNotifications]);

  const goToActor = (item) => {
    if (!item.actor_id) return;
    navigation.navigate('UserProfile', { userId: item.actor_id, username: item.actor?.username });
  };

  if (loading) {
    return <LoadingBricks />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
        <Text style={[styles.topBarTitle, { color: theme.textPrimary, fontSize: scaleFont(18) }]}>Notifications</Text>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={{ color: theme.textSecondary, fontSize: scaleFont(14), textAlign: 'center' }}>
              Nothing yet — likes, comments, and new followers will show up here.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const thumb = item.posts?.thumbnail_url || item.posts?.image_url;
          return (
            <TouchableOpacity
              style={[styles.row, { borderBottomColor: theme.border }]}
              onPress={() => goToActor(item)}
            >
              <Avatar
                avatarUrl={item.actor?.avatar_url}
                displayName={item.actor?.display_name}
                username={item.actor?.username}
                size={44}
              />
              <View style={styles.rowContent}>
                <Text style={{ color: theme.textPrimary, fontSize: scaleFont(13.5) }} numberOfLines={2}>
                  {notificationText(item)}
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: scaleFont(11), marginTop: 2 }}>
                  {timeAgo(item.created_at)}
                </Text>
              </View>
              {thumb ? <Image source={{ uri: thumb }} style={styles.thumb} /> : null}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingHorizontal: 20, paddingTop: 54, paddingBottom: 14, borderBottomWidth: 1 },
  topBarTitle: { fontWeight: '700' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 80 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  rowContent: { flex: 1 },
  thumb: { width: 44, height: 44, borderRadius: 6, backgroundColor: '#000' },
});