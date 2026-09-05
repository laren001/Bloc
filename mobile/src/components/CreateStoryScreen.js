import React, { useState } from 'react';
import {
  View, Text, Image, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import LoadingBricks from './LoadingBricks';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function CreateStoryScreen({ onClose, onPublished }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [imageAsset, setImageAsset] = useState(null);
  const [location, setLocation] = useState('');
  const [eventTag, setEventTag] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Bloc needs access to your photos to post a story.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.85,
    });

    if (!result.canceled) setImageAsset(result.assets[0]);
  };

  const handleShare = async () => {
    if (!imageAsset || !user) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('user_id', user.id);
      formData.append('location', location);
      formData.append('event_tag', eventTag);
      formData.append('image', {
        uri: imageAsset.uri,
        name: imageAsset.fileName || 'story.jpg',
        type: imageAsset.mimeType || 'image/jpeg',
      });

      const res = await fetch(`${API_URL}/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }

      // Reset the form but stay on this screen — supports posting several stories in one session.
      setImageAsset(null);
      setLocation('');
      setEventTag('');
      setSessionCount((c) => c + 1);
      onPublished?.();
    } catch (err) {
      Alert.alert('Could not post story', err.message);
    } finally {
      setUploading(false);
    }
  };

  if (uploading) {
    return <LoadingBricks />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
        <Text style={[styles.topBarTitle, { color: theme.textPrimary }]}>
          {sessionCount > 0 ? `New Story (${sessionCount} added)` : 'New Story'}
        </Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={{ color: sessionCount > 0 ? theme.accent : theme.textPrimary, fontWeight: '700', fontSize: 14 }}>
            {sessionCount > 0 ? 'Done' : 'Cancel'}
          </Text>
        </TouchableOpacity>
      </View>

      {sessionCount > 0 && (
        <View style={[styles.sessionBanner, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.dot, { backgroundColor: theme.accent }]} />
          <Text style={{ color: theme.textSecondary, fontSize: 11.5 }}>
            {sessionCount} {sessionCount === 1 ? 'story' : 'stories'} added this session — keep going or tap Done
          </Text>
        </View>
      )}

      <View style={styles.content}>
        {imageAsset ? (
          <View style={styles.imageWrapper}>
            <Image source={{ uri: imageAsset.uri }} style={styles.previewImage} />
            <TouchableOpacity onPress={() => setImageAsset(null)} style={styles.removeButton}>
              <Ionicons name="close" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={pickImage}
            style={[styles.picker, { borderColor: theme.border, backgroundColor: theme.surface }]}
          >
            <Ionicons name="image-outline" size={30} color={theme.textSecondary} />
            <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '600', marginTop: 8 }}>
              Choose a photo
            </Text>
          </TouchableOpacity>
        )}

        <View style={[styles.inputRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="location-outline" size={16} color={theme.textSecondary} />
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder="Add location (optional)"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.textPrimary }]}
          />
        </View>

        <View style={[styles.inputRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="pricetag-outline" size={16} color={theme.textSecondary} />
          <TextInput
            value={eventTag}
            onChangeText={setEventTag}
            placeholder="Tag an event (optional)"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.textPrimary }]}
          />
        </View>

        <TouchableOpacity
          onPress={handleShare}
          disabled={!imageAsset}
          style={[styles.shareButton, { backgroundColor: imageAsset ? theme.accent : theme.border }]}
        >
          <Text style={{ color: imageAsset ? '#FFFFFF' : theme.textSecondary, fontWeight: '700', fontSize: 14.5 }}>
            Share to Story
          </Text>
        </TouchableOpacity>
        <Text style={[styles.expiryNote, { color: theme.textSecondary }]}>Visible for 24 hours</Text>
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
  sessionBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6, margin: 12, padding: 10,
    borderRadius: 8, borderWidth: 1,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  content: { flex: 1, padding: 16 },
  imageWrapper: { position: 'relative', marginBottom: 16 },
  previewImage: { width: '100%', aspectRatio: 9 / 16, borderRadius: 14 },
  removeButton: {
    position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  picker: {
    aspectRatio: 9 / 16, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10,
  },
  input: { flex: 1, fontSize: 13.5 },
  shareButton: { borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  expiryNote: { textAlign: 'center', fontSize: 11, marginTop: 10 },
});
