import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, Image, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, Modal, FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import Avatar from '../components/Avatar';
import LoadingBricks from '../components/LoadingBricks';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const MIN_VIDEO_SECONDS = 15;
const MAX_VIDEO_SECONDS = 60;
const SEARCH_DEBOUNCE_MS = 300;

export default function PostScreen({ navigation }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [mediaAsset, setMediaAsset] = useState(null);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [uploading, setUploading] = useState(false);

  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [taggedUsers, setTaggedUsers] = useState([]); // [{ id, username, display_name, avatar_url }]
  const [tagQuery, setTagQuery] = useState('');
  const [tagResults, setTagResults] = useState([]);
  const [tagSearching, setTagSearching] = useState(false);
  const searchDebounceRef = useRef(null);

  const pickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Bloc needs access to your photos to create a post.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.85,
      videoMaxDuration: MAX_VIDEO_SECONDS,
    });

    if (result.canceled) return;

    const asset = result.assets[0];

    if (asset.type === 'video') {
      const durationSeconds = (asset.duration ?? 0) / 1000;
      if (durationSeconds < MIN_VIDEO_SECONDS) {
        Alert.alert('Video too short', `Videos need to be at least ${MIN_VIDEO_SECONDS} seconds.`);
        return;
      }
      if (durationSeconds > MAX_VIDEO_SECONDS) {
        Alert.alert('Video too long', `Videos can be up to ${MAX_VIDEO_SECONDS} seconds.`);
        return;
      }
    }

    setMediaAsset(asset);
  };

  const runTagSearch = (query) => {
    setTagQuery(query);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (!query.trim()) {
      setTagResults([]);
      return;
    }

    setTagSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_URL}/users/search?q=${encodeURIComponent(query.trim())}&viewer_id=${user?.id ?? ''}`
        );
        const data = await res.json();
        setTagResults(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to search users', err);
      } finally {
        setTagSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
  };

  const toggleTaggedUser = (person) => {
    setTaggedUsers((prev) =>
      prev.some((p) => p.id === person.id)
        ? prev.filter((p) => p.id !== person.id)
        : [...prev, person]
    );
  };

  const removeTaggedUser = (id) => {
    setTaggedUsers((prev) => prev.filter((p) => p.id !== id));
  };

  const closeTagModal = () => {
    setTagModalVisible(false);
    setTagQuery('');
    setTagResults([]);
  };

  const handlePost = async () => {
    if (!mediaAsset || !user) return;
    setUploading(true);

    const isVideo = mediaAsset.type === 'video';

    try {
      const formData = new FormData();
      formData.append('user_id', user.id);
      formData.append('caption', caption);
      formData.append('location', location);
      formData.append('tagged_user_ids', JSON.stringify(taggedUsers.map((p) => p.id)));
      formData.append('image', {
        uri: mediaAsset.uri,
        name: mediaAsset.fileName || (isVideo ? 'post.mp4' : 'post.jpg'),
        type: mediaAsset.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg'),
      });

      const res = await fetch(`${API_URL}/posts`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }

      setMediaAsset(null);
      setCaption('');
      setLocation('');
      setTaggedUsers([]);
      navigation.navigate('Home');
    } catch (err) {
      Alert.alert('Could not post', err.message);
    } finally {
      setUploading(false);
    }
  };

  if (uploading) {
    return <LoadingBricks />;
  }

  const isVideoAsset = mediaAsset?.type === 'video';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
        <Text style={[styles.topBarTitle, { color: theme.textPrimary }]}>New Post</Text>
        <TouchableOpacity onPress={handlePost} disabled={!mediaAsset}>
          <Text style={{ color: mediaAsset ? theme.accent : theme.textSecondary, fontWeight: '700', fontSize: 14 }}>
            Post
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {mediaAsset ? (
          <View style={styles.imageWrapper}>
            {isVideoAsset ? (
              <Video
                source={{ uri: mediaAsset.uri }}
                style={styles.previewImage}
                resizeMode={ResizeMode.COVER}
                useNativeControls
                isLooping
              />
            ) : (
              <Image source={{ uri: mediaAsset.uri }} style={styles.previewImage} />
            )}
            <TouchableOpacity onPress={() => setMediaAsset(null)} style={styles.removeButton}>
              <Ionicons name="close" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={pickMedia}
            style={[styles.picker, { borderColor: theme.border, backgroundColor: theme.surface }]}
          >
            <Ionicons name="image-outline" size={30} color={theme.textSecondary} />
            <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '600', marginTop: 8 }}>
              Choose a photo or video
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 2 }}>
              Videos: {MIN_VIDEO_SECONDS}–{MAX_VIDEO_SECONDS}s
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => setTagModalVisible(true)}
          style={[styles.tagRow, { borderColor: theme.border }]}
        >
          <Ionicons name="person-add-outline" size={18} color={theme.textSecondary} />
          <Text style={{ color: theme.textPrimary, fontSize: 13.5, flex: 1 }}>
            {taggedUsers.length === 0
              ? 'Tag people'
              : taggedUsers.map((p) => `@${p.username}`).join(', ')}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
        </TouchableOpacity>

        <TextInput
          value={caption}
          onChangeText={setCaption}
          placeholder="Write a caption…"
          placeholderTextColor={theme.textSecondary}
          multiline
          style={[
            styles.captionInput,
            { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary },
          ]}
        />

        <View style={[styles.locationRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="location-outline" size={16} color={theme.textSecondary} />
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder="Add location (optional)"
            placeholderTextColor={theme.textSecondary}
            style={[styles.locationInput, { color: theme.textPrimary }]}
          />
        </View>
      </ScrollView>

      <Modal visible={tagModalVisible} animationType="slide" onRequestClose={closeTagModal}>
        <View style={[styles.tagModalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.tagModalTopBar, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={closeTagModal} hitSlop={10}>
              <Text style={{ color: theme.textSecondary, fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={{ color: theme.textPrimary, fontWeight: '700', fontSize: 15 }}>Tag people</Text>
            <TouchableOpacity onPress={closeTagModal} hitSlop={10}>
              <Text style={{ color: theme.accent, fontWeight: '700', fontSize: 14 }}>Done</Text>
            </TouchableOpacity>
          </View>

          {taggedUsers.length > 0 && (
            <View style={styles.selectedChipsRow}>
              {taggedUsers.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => removeTaggedUser(p.id)}
                  style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.border }]}
                >
                  <Text style={{ color: theme.textPrimary, fontSize: 12.5 }}>@{p.username}</Text>
                  <Ionicons name="close" size={12} color={theme.textSecondary} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TextInput
            value={tagQuery}
            onChangeText={runTagSearch}
            placeholder="Search by username or name"
            placeholderTextColor={theme.textSecondary}
            style={[styles.tagSearchInput, { borderColor: theme.border, color: theme.textPrimary, backgroundColor: theme.surface }]}
            autoFocus
          />

          <FlatList
            data={tagResults}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              !tagSearching && tagQuery.trim() ? (
                <Text style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 24, fontSize: 13 }}>
                  No one found
                </Text>
              ) : null
            }
            renderItem={({ item }) => {
              const isSelected = taggedUsers.some((p) => p.id === item.id);
              return (
                <TouchableOpacity
                  style={[styles.resultRow, { borderBottomColor: theme.border }]}
                  onPress={() => toggleTaggedUser(item)}
                >
                  <Avatar avatarUrl={item.avatar_url} displayName={item.display_name} username={item.username} size={40} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ color: theme.textPrimary, fontWeight: '600', fontSize: 14 }}>
                      {item.display_name || `@${item.username}`}
                    </Text>
                    {item.display_name ? (
                      <Text style={{ color: theme.textSecondary, fontSize: 12 }}>@{item.username}</Text>
                    ) : null}
                  </View>
                  <Ionicons
                    name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={isSelected ? theme.accent : theme.textSecondary}
                  />
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
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
  scrollContent: { padding: 16 },
  imageWrapper: { position: 'relative', marginBottom: 16 },
  previewImage: { width: '100%', aspectRatio: 4 / 5, borderRadius: 14, backgroundColor: '#000' },
  removeButton: {
    position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  picker: {
    aspectRatio: 4 / 5, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  tagRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12,
  },
  captionInput: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, minHeight: 80, textAlignVertical: 'top', marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  locationInput: { flex: 1, fontSize: 13.5 },
  tagModalContainer: { flex: 1 },
  tagModalTopBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12, borderBottomWidth: 1,
  },
  selectedChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  tagSearchInput: { margin: 16, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  resultRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
});