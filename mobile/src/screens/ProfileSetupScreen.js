import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Image, KeyboardAvoidingView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import { TextField, PrimaryButton } from '../components/FormFields';

export default function ProfileSetupScreen() {
  const { theme } = useTheme();
  const { updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUri, setAvatarUri] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setAvatarUri(result.assets[0].uri);
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      // Avatar upload to Cloudinary is wired in Phase 3 alongside post uploads —
      // for now this saves display name and bio, which is enough to unlock the app.
      await updateProfile({ display_name: displayName, bio });
      // No manual navigation needed — App.js already shows the main app
      // once a session exists.
    } catch (err) {
      Alert.alert('Could not save profile', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <Text style={[styles.heading, { color: theme.textPrimary }]}>Set up your profile</Text>
      <Text style={[styles.subheading, { color: theme.textSecondary }]}>
        This is what people will see on Bloc.
      </Text>

      <TouchableOpacity onPress={pickImage} style={styles.avatarPicker}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
        ) : (
          <View style={[styles.avatarPlaceholder, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <Text style={{ color: theme.textSecondary, fontSize: 11, textAlign: 'center' }}>Add photo</Text>
          </View>
        )}
      </TouchableOpacity>

      <TextField label="Display name" value={displayName} onChangeText={setDisplayName} placeholder="Your name" />
      <TextField label="Bio" value={bio} onChangeText={setBio} placeholder="Tell people about yourself" />

      <PrimaryButton label="Finish setup" onPress={handleFinish} disabled={!displayName} loading={loading} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 70 },
  heading: { fontSize: 22, fontWeight: '800', marginBottom: 6 },
  subheading: { fontSize: 13, marginBottom: 26 },
  avatarPicker: { alignSelf: 'center', marginBottom: 24 },
  avatarImage: { width: 84, height: 84, borderRadius: 42 },
  avatarPlaceholder: {
    width: 84, height: 84, borderRadius: 42, borderWidth: 2, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
});
