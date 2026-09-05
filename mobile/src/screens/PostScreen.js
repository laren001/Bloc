import React, { useState } from 'react';
import {
  View, Text, TextInput, Image, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import LoadingBricks from '../components/LoadingBricks';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function PostScreen({ navigation }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [imageAsset, setImageAsset] = useState(null); // { uri, fileName, mimeType }
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Bloc needs access to your photos to create a post.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.85,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setImageAsset(asset);
    }
  };

  const handlePost = async () => {
    if (!imageAsset || !user) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('user_id', user.id);
      formData.append('caption', caption);
      formData.append('location', location);
      formData.append('image', {
        uri: imageAsset.uri,
        name: imageAsset.fileName || 'post.jpg',
        type: imageAsset.mimeType || 'image/jpeg',
      });

      const res = await fetch(`${API_URL}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }

      // Reset the form and drop the user back on the feed, which reloads on focus.
      setImageAsset(null);
      setCaption('');
      setLocation('');
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
        <Text style={[styles.topBarTitle, { color: theme.textPrimary }]}>New Post</Text>
        <TouchableOpacity onPress={handlePost} disabled={!imageAsset}>
          <Text style={{ color: imageAsset ? theme.accent : theme.textSecondary, fontWeight: '700', fontSize: 14 }}>
            Post
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
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
  previewImage: { width: '100%', aspectRatio: 4 / 5, borderRadius: 14 },
  removeButton: {
    position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  picker: {
    aspectRatio: 4 / 5, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
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
});
