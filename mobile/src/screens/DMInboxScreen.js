import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
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

export default function DMInboxScreen() {
  const { theme, scaleFont } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadInbox = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${API_URL}/messages/${user.id}`);
      const data = await res.json();
      setConversations(data);
    } catch (err) {
      console.error('Failed to load inbox', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadInbox();
    }, [loadInbox])
  );

  const openChat = (convo) => {
    navigation.navigate('Chat', {
      otherUserId: convo.other_user_id,
      otherUsername: convo.profile?.username,
      otherDisplayName: convo.profile?.display_name,
      otherAvatarUrl: convo.profile?.avatar_url,
    });
  };

  if (loading) {
    return <LoadingBricks />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
        <Text style={[styles.topBarTitle, { color: theme.textPrimary, fontSize: scaleFont(18) }]}>Messages</Text>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.other_user_id}
        contentContainerStyle={{ flexGrow: 1 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={{ color: theme.textSecondary, fontSize: scaleFont(14) }}>
              No conversations yet. Message someone from their profile to start one.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: theme.border }]}
            onPress={() => openChat(item)}
          >
            <Avatar
              avatarUrl={item.profile?.avatar_url}
              displayName={item.profile?.display_name}
              username={item.profile?.username}
              size={48}
            />
            <View style={styles.rowContent}>
              <Text
                style={[styles.rowName, { color: theme.textPrimary, fontSize: scaleFont(15) }]}
                numberOfLines={1}
              >
                {item.profile?.display_name || `@${item.profile?.username ?? 'user'}`}
              </Text>
              <Text
                style={[
                  styles.rowPreview,
                  { color: item.unread_count > 0 ? theme.textPrimary : theme.textSecondary, fontSize: scaleFont(13) },
                ]}
                numberOfLines={1}
              >
                {item.last_message}
              </Text>
            </View>
            <View style={styles.rowMeta}>
              <Text style={{ color: theme.textSecondary, fontSize: scaleFont(11) }}>
                {timeAgo(item.last_message_at)}
              </Text>
              {item.unread_count > 0 && (
                <View style={[styles.unreadBadge, { backgroundColor: '#CC5500' }]}>
                  <Text style={styles.unreadBadgeText}>{item.unread_count}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingHorizontal: 20, paddingTop: 54, paddingBottom: 14, borderBottomWidth: 1 },
  topBarTitle: { fontWeight: '700' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 60 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  rowContent: { flex: 1 },
  rowName: { fontWeight: '700', marginBottom: 2 },
  rowPreview: {},
  rowMeta: { alignItems: 'flex-end', gap: 4 },
  unreadBadge: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  unreadBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
});
