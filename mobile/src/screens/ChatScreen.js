import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import Avatar from '../components/Avatar';
import LoadingBricks from '../components/LoadingBricks';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function ChatScreen() {
  const { theme, scaleFont } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const { otherUserId, otherUsername, otherDisplayName, otherAvatarUrl } = route.params ?? {};

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const loadMessages = useCallback(async () => {
    if (!user?.id || !otherUserId) return;
    try {
      const res = await fetch(`${API_URL}/messages/${user.id}/${otherUserId}`);
      const data = await res.json();
      setMessages(data);

      // Mark incoming messages as read now that the chat is open.
      fetch(`${API_URL}/messages/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, other_user_id: otherUserId }),
      }).catch((err) => console.error('Failed to mark messages read', err));
    } catch (err) {
      console.error('Failed to load conversation', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, otherUserId]);

  useFocusEffect(
    useCallback(() => {
      loadMessages();
    }, [loadMessages])
  );

  const handleSend = async () => {
    if (!text.trim() || !user?.id || !otherUserId) return;
    setSending(true);
    const content = text.trim();
    setText('');
    try {
      const res = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_id: user.id, recipient_id: otherUserId, content }),
      });
      const newMessage = await res.json();
      setMessages((prev) => [...prev, newMessage]);
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setSending(false);
    }
  };

  const goToProfile = () => {
    navigation.navigate('UserProfile', { userId: otherUserId, username: otherUsername });
  };

  if (loading) {
    return <LoadingBricks />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.topBarIdentity} onPress={goToProfile}>
          <Avatar avatarUrl={otherAvatarUrl} displayName={otherDisplayName} username={otherUsername} size={32} />
          <Text style={[styles.topBarName, { color: theme.textPrimary, fontSize: scaleFont(15) }]} numberOfLines={1}>
            {otherDisplayName || `@${otherUsername ?? 'user'}`}
          </Text>
        </TouchableOpacity>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={{ color: theme.textSecondary, fontSize: scaleFont(13), textAlign: 'center', marginTop: 24 }}>
            Say hello 👋
          </Text>
        }
        renderItem={({ item }) => {
          const isMine = item.sender_id === user?.id;
          return (
            <View style={[styles.bubbleRow, { justifyContent: isMine ? 'flex-end' : 'flex-start' }]}>
              <View
                style={[
                  styles.bubble,
                  isMine
                    ? { backgroundColor: '#CC5500', borderBottomRightRadius: 4 }
                    : { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderBottomLeftRadius: 4 },
                ]}
              >
                <Text style={{ color: isMine ? '#FFFFFF' : theme.textPrimary, fontSize: scaleFont(14) }}>
                  {item.content}
                </Text>
              </View>
            </View>
          );
        }}
      />

      <View style={[styles.inputRow, { borderTopColor: theme.border }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Message…"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary, fontSize: scaleFont(14) }]}
        />
        <TouchableOpacity onPress={handleSend} disabled={!text.trim() || sending}>
          <Ionicons name="send" size={20} color={text.trim() && !sending ? theme.accent : theme.textSecondary} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12, borderBottomWidth: 1, gap: 10,
  },
  topBarIdentity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  topBarName: { fontWeight: '700', flexShrink: 1 },
  listContent: { padding: 16, flexGrow: 1 },
  bubbleRow: { flexDirection: 'row', marginBottom: 8 },
  bubble: { maxWidth: '75%', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderTopWidth: 1 },
  input: { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
});