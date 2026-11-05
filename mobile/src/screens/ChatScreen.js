import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Image, Alert } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';
import { authFetch } from '../lib/authFetch';
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
  const [pendingMedia, setPendingMedia] = useState(null);

  const loadMessages = useCallback(async () => {
    if (!user?.id || !otherUserId) return;
    try {
      const res = await authFetch(`${API_URL}/messages/${user.id}/${otherUserId}`);
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);

      authFetch(`${API_URL}/messages/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ other_user_id: otherUserId }),
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

  useEffect(() => {
    if (!user?.id || !otherUserId) return;

    const channel = supabase
      .channel(`chat:${[user.id, otherUserId].sort().join(':')}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new;
          const isThisConversation =
            (msg.sender_id === user.id && msg.recipient_id === otherUserId) ||
            (msg.sender_id === otherUserId && msg.recipient_id === user.id);
          if (!isThisConversation) return;

          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));

          if (msg.sender_id === otherUserId) {
            authFetch(`${API_URL}/messages/read`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ other_user_id: otherUserId }),
            }).catch((err) => console.error('Failed to mark message read', err));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, otherUserId]);

  const handleSend = async () => {
    if (!text.trim() || !user?.id || !otherUserId) return;
    setSending(true);
    const content = text.trim();
    setText('');
    try {
      const res = await authFetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_id: otherUserId, content }),
      });
      const newMessage = await res.json();
      setMessages((prev) => (prev.some((m) => m.id === newMessage.id) ? prev : [...prev, newMessage]));
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setSending(false);
    }
  };

  // Picking media just stages it for preview - nothing is sent yet.
  const pickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Bloc needs access to your photos to send media.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.85,
      videoMaxDuration: 60,
    });

    if (result.canceled) return;
    setPendingMedia(result.assets[0]);
  };

  const cancelPendingMedia = () => {
    setPendingMedia(null);
  };

  // Sends the staged media (plus whatever is in the text box as an
  // optional caption), then clears both.
  const confirmSendMedia = async () => {
    if (!pendingMedia || !user?.id || !otherUserId) return;
    setSending(true);
    const isVideo = pendingMedia.type === 'video';
    const caption = text.trim();

    try {
      const formData = new FormData();
      formData.append('recipient_id', otherUserId);
      if (caption) formData.append('content', caption);
      formData.append('media', {
        uri: pendingMedia.uri,
        name: pendingMedia.fileName || (isVideo ? 'media.mp4' : 'media.jpg'),
        type: pendingMedia.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg'),
      });

      const res = await authFetch(`${API_URL}/messages`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to send media');
      }

      const newMessage = await res.json();
      setMessages((prev) => (prev.some((m) => m.id === newMessage.id) ? prev : [...prev, newMessage]));
      setPendingMedia(null);
      setText('');
    } catch (err) {
      console.error('Failed to send media', err);
      Alert.alert('Could not send', err.message);
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
            {'Say hello \uD83D\uDC4B'}
          </Text>
        }
        renderItem={({ item }) => {
          const isMine = item.sender_id === user?.id;
          const hasMedia = !!item.media_url;

          return (
            <View style={[styles.bubbleRow, { justifyContent: isMine ? 'flex-end' : 'flex-start' }]}>
              <View
                style={[
                  styles.bubble,
                  hasMedia && styles.mediaBubble,
                  isMine
                    ? { backgroundColor: hasMedia ? 'transparent' : '#CC5500', borderBottomRightRadius: 4 }
                    : {
                        backgroundColor: hasMedia ? 'transparent' : theme.surface,
                        borderColor: hasMedia ? 'transparent' : theme.border,
                        borderWidth: hasMedia ? 0 : 1,
                        borderBottomLeftRadius: 4,
                      },
                ]}
              >
                {hasMedia && item.media_type === 'video' && (
                  <Video
                    source={{ uri: item.media_url }}
                    posterSource={item.thumbnail_url ? { uri: item.thumbnail_url } : undefined}
                    usePoster={!!item.thumbnail_url}
                    style={styles.mediaContent}
                    resizeMode={ResizeMode.COVER}
                    useNativeControls
                  />
                )}
                {hasMedia && item.media_type === 'photo' && (
                  <Image source={{ uri: item.media_url }} style={styles.mediaContent} />
                )}
                {item.content ? (
                  <Text
                    style={{
                      color: isMine ? '#FFFFFF' : theme.textPrimary,
                      fontSize: scaleFont(14),
                      marginTop: hasMedia ? 6 : 0,
                      paddingHorizontal: hasMedia ? 10 : 0,
                      paddingBottom: hasMedia ? 8 : 0,
                    }}
                  >
                    {item.content}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        }}
      />

      {pendingMedia ? (
        <View style={[styles.previewBar, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
          <View style={styles.previewThumbWrapper}>
            {pendingMedia.type === 'video' ? (
              <Video
                source={{ uri: pendingMedia.uri }}
                style={styles.previewThumb}
                resizeMode={ResizeMode.COVER}
                isMuted
              />
            ) : (
              <Image source={{ uri: pendingMedia.uri }} style={styles.previewThumb} />
            )}
            <TouchableOpacity onPress={cancelPendingMedia} style={styles.previewCancel} hitSlop={8}>
              <Ionicons name="close" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Add a caption..."
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary, fontSize: scaleFont(14) }]}
          />

          <TouchableOpacity onPress={confirmSendMedia} disabled={sending} hitSlop={10}>
            <Ionicons name="send" size={20} color={sending ? theme.textSecondary : theme.accent} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.inputRow, { borderTopColor: theme.border }]}>
          <TouchableOpacity onPress={pickMedia} disabled={sending} hitSlop={10}>
            <Ionicons name="add-circle-outline" size={26} color={theme.textSecondary} />
          </TouchableOpacity>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message..."
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary, fontSize: scaleFont(14) }]}
          />
          <TouchableOpacity onPress={handleSend} disabled={!text.trim() || sending}>
            <Ionicons name="send" size={20} color={text.trim() && !sending ? theme.accent : theme.textSecondary} />
          </TouchableOpacity>
        </View>
      )}
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
  mediaBubble: { padding: 0, overflow: 'hidden', borderRadius: 16 },
  mediaContent: { width: 220, height: 260, borderRadius: 16, backgroundColor: '#000' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderTopWidth: 1 },
  input: { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  previewBar: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderTopWidth: 1 },
  previewThumbWrapper: { position: 'relative' },
  previewThumb: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#000' },
  previewCancel: {
    position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center',
  },
});