import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function CommentSheet({ post, onClose, onCommentAdded }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const loadComments = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/posts/${post.id}/comments`);
      const data = await res.json();
      setComments(data);
    } catch (err) {
      console.error('Failed to load comments', err);
    } finally {
      setLoading(false);
    }
  }, [post.id]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleSend = async () => {
    if (!text.trim() || !user) return;
    setSending(true);
    try {
      const res = await fetch(`${API_URL}/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, content: text.trim() }),
      });
      const newComment = await res.json();
      setComments((prev) => [...prev, newComment]);
      setText('');
      onCommentAdded?.(post.id);
    } catch (err) {
      console.error('Failed to send comment', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="arrow-back" size={20} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: theme.textPrimary }]}>Comments</Text>
        <View style={{ width: 20 }} />
      </View>

      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? (
            <Text style={{ color: theme.textSecondary, fontSize: 13, padding: 16 }}>
              No comments yet — say something first.
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.commentRow}>
            <Text style={{ color: theme.textPrimary, fontSize: 13, fontWeight: '700' }}>
              @{item.profiles?.username ?? 'user'}{' '}
            </Text>
            <Text style={{ color: theme.textPrimary, fontSize: 13, flexShrink: 1 }}>{item.content}</Text>
          </View>
        )}
      />

      <View style={[styles.inputRow, { borderTopColor: theme.border }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Add a comment…"
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.input,
            { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary },
          ]}
        />
        <TouchableOpacity onPress={handleSend} disabled={!text.trim() || sending}>
          <Ionicons
            name="send"
            size={20}
            color={text.trim() && !sending ? theme.accent : theme.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12, borderBottomWidth: 1,
  },
  topBarTitle: { fontWeight: '700', fontSize: 15 },
  listContent: { padding: 16, flexGrow: 1 },
  commentRow: { flexDirection: 'row', marginBottom: 12, flexWrap: 'wrap' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderTopWidth: 1,
  },
  input: {
    flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13.5,
  },
});
