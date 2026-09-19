import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import { FONT_SCALES } from '../theme/tokens';

const PROFILE_BASE_URL = 'https://bloc.app/u';

function EditModal({ visible, title, fields, onCancel, onSave, saving, theme, scaleFont }) {
  const [values, setValues] = useState({});

  useEffect(() => {
    if (visible) {
      const initial = {};
      fields.forEach((f) => { initial[f.key] = f.initialValue ?? ''; });
      setValues(initial);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalBackdrop}
      >
        <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.modalTitle, { color: theme.textPrimary, fontSize: scaleFont(16) }]}>{title}</Text>

          {fields.map((f) => (
            <TextInput
              key={f.key}
              style={[styles.input, { borderColor: theme.border, color: theme.textPrimary, fontSize: scaleFont(15) }]}
              placeholder={f.placeholder}
              placeholderTextColor={theme.textSecondary}
              value={values[f.key] ?? ''}
              onChangeText={(text) => setValues((v) => ({ ...v, [f.key]: text }))}
              secureTextEntry={f.secure}
              autoCapitalize={f.autoCapitalize ?? 'none'}
              keyboardType={f.keyboardType ?? 'default'}
              multiline={f.multiline}
            />
          ))}

          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onCancel} style={styles.modalButton}>
              <Text style={{ color: theme.textSecondary, fontWeight: '600', fontSize: scaleFont(14) }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onSave(values)} style={styles.modalButton} disabled={saving}>
              <Text style={{ color: theme.accent, fontWeight: '700', fontSize: scaleFont(14) }}>
                {saving ? 'Saving…' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function FontScaleModal({ visible, current, onCancel, onSelect, theme, scaleFont }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.modalTitle, { color: theme.textPrimary, fontSize: scaleFont(16) }]}>Font size</Text>

          {Object.entries(FONT_SCALES).map(([key, { label }]) => (
            <TouchableOpacity
              key={key}
              onPress={() => onSelect(key)}
              style={[styles.fontOption, { borderColor: theme.border }]}
            >
              <Text style={{ color: theme.textPrimary, fontSize: scaleFont(15) }}>{label}</Text>
              {current === key && <Ionicons name="checkmark" size={18} color={theme.accent} />}
            </TouchableOpacity>
          ))}

          <TouchableOpacity onPress={onCancel} style={[styles.modalButton, { alignSelf: 'flex-end', marginTop: 8 }]}>
            <Text style={{ color: theme.textSecondary, fontWeight: '600', fontSize: scaleFont(14) }}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function MenuItem({ label, value, onPress, theme, danger, scaleFont }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.menuItem, { borderColor: theme.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuLabel, { color: danger ? theme.accent : theme.textPrimary, fontSize: scaleFont(15) }]}>
          {label}
        </Text>
        {value ? (
          <Text style={[styles.menuValue, { color: theme.textSecondary, fontSize: scaleFont(13) }]} numberOfLines={1}>
            {value}
          </Text>
        ) : null}
      </View>
      {!danger && <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { theme, scaleFont, fontScaleKey, setFontScale } = useTheme();
  const { signOut, profile, user, updateProfile, updateEmail, updatePassword } = useAuth();
  const navigation = useNavigation();

  const [activeModal, setActiveModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSignOut = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleCopyLink = async () => {
    if (!profile?.username) return;
    await Clipboard.setStringAsync(`${PROFILE_BASE_URL}/${profile.username}`);
    Alert.alert('Copied', 'Profile link copied to clipboard.');
  };

  const closeModal = () => setActiveModal(null);

  const saveProfileField = async (fieldLabel, updates) => {
    setSaving(true);
    try {
      await updateProfile(updates);
      closeModal();
    } catch (err) {
      console.error(`Failed to update ${fieldLabel}`, err);
      Alert.alert('Something went wrong', `Couldn't update your ${fieldLabel}. Try again.`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmail = async (values) => {
    if (!values.email?.trim()) return;
    setSaving(true);
    try {
      await updateEmail(values.email.trim());
      closeModal();
      Alert.alert('Check your inbox', 'Confirm the change from the email we just sent to finish updating your email.');
    } catch (err) {
      console.error('Failed to update email', err);
      Alert.alert('Something went wrong', err.message || "Couldn't update your email. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async (values) => {
    if (!values.newPassword || values.newPassword.length < 6) {
      Alert.alert('Password too short', 'Use at least 6 characters.');
      return;
    }
    setSaving(true);
    try {
      await updatePassword(values.newPassword);
      closeModal();
      Alert.alert('Password updated');
    } catch (err) {
      console.error('Failed to update password', err);
      Alert.alert('Something went wrong', err.message || "Couldn't update your password. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={styles.container}>
      <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: theme.textPrimary, fontSize: scaleFont(16) }]}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={[styles.label, { color: theme.textPrimary, fontSize: scaleFont(14) }]}>Account</Text>
      <View style={styles.menuGroup}>
        <MenuItem label="Username" value={profile?.username ? `@${profile.username}` : 'Not set'} onPress={() => setActiveModal('username')} theme={theme} scaleFont={scaleFont} />
        <MenuItem label="Display name" value={profile?.display_name || 'Not set'} onPress={() => setActiveModal('displayName')} theme={theme} scaleFont={scaleFont} />
        <MenuItem label="Bio" value={profile?.bio || 'Not set'} onPress={() => setActiveModal('bio')} theme={theme} scaleFont={scaleFont} />
        <MenuItem label="Email" value={user?.email || 'Not set'} onPress={() => setActiveModal('email')} theme={theme} scaleFont={scaleFont} />
        <MenuItem label="Password" value="••••••••" onPress={() => setActiveModal('password')} theme={theme} scaleFont={scaleFont} />
        <MenuItem label="Share profile link" onPress={handleCopyLink} theme={theme} scaleFont={scaleFont} />
      </View>

      <Text style={[styles.label, { color: theme.textPrimary, marginTop: 28, fontSize: scaleFont(14) }]}>Appearance</Text>
      <ThemeToggle />
      <View style={{ marginTop: 12 }}>
        <MenuItem
          label="Font size"
          value={FONT_SCALES[fontScaleKey].label}
          onPress={() => setActiveModal('fontSize')}
          theme={theme}
          scaleFont={scaleFont}
        />
      </View>

      <TouchableOpacity onPress={handleSignOut} style={[styles.signOutButton, { borderColor: theme.border }]}>
        <Text style={{ color: theme.accent, fontWeight: '700', fontSize: scaleFont(14) }}>Log out</Text>
      </TouchableOpacity>

      <EditModal
        visible={activeModal === 'username'}
        title="Edit username"
        fields={[{ key: 'username', placeholder: 'username', initialValue: profile?.username }]}
        onCancel={closeModal}
        onSave={(v) => saveProfileField('username', { username: v.username })}
        saving={saving}
        theme={theme}
        scaleFont={scaleFont}
      />
      <EditModal
        visible={activeModal === 'displayName'}
        title="Edit display name"
        fields={[{ key: 'display_name', placeholder: 'Display name', initialValue: profile?.display_name, autoCapitalize: 'words' }]}
        onCancel={closeModal}
        onSave={(v) => saveProfileField('display name', { display_name: v.display_name })}
        saving={saving}
        theme={theme}
        scaleFont={scaleFont}
      />
      <EditModal
        visible={activeModal === 'bio'}
        title="Edit bio"
        fields={[{ key: 'bio', placeholder: 'Tell people about yourself', initialValue: profile?.bio, multiline: true }]}
        onCancel={closeModal}
        onSave={(v) => saveProfileField('bio', { bio: v.bio })}
        saving={saving}
        theme={theme}
        scaleFont={scaleFont}
      />
      <EditModal
        visible={activeModal === 'email'}
        title="Edit email"
        fields={[{ key: 'email', placeholder: 'you@example.com', initialValue: user?.email, keyboardType: 'email-address' }]}
        onCancel={closeModal}
        onSave={handleSaveEmail}
        saving={saving}
        theme={theme}
        scaleFont={scaleFont}
      />
      <EditModal
        visible={activeModal === 'password'}
        title="Change password"
        fields={[
          { key: 'newPassword', placeholder: 'New password', secure: true },
        ]}
        onCancel={closeModal}
        onSave={handleSavePassword}
        saving={saving}
        theme={theme}
        scaleFont={scaleFont}
      />
      <FontScaleModal
        visible={activeModal === 'fontSize'}
        current={fontScaleKey}
        onCancel={closeModal}
        onSelect={(key) => { setFontScale(key); closeModal(); }}
        theme={theme}
        scaleFont={scaleFont}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 60 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 14,
    borderBottomWidth: 1,
    marginBottom: 20,
  },
  topBarTitle: { fontWeight: '700' },
  label: { fontWeight: '600', marginBottom: 10, paddingHorizontal: 20 },
  menuGroup: { borderRadius: 10, overflow: 'hidden', marginHorizontal: 20 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  menuLabel: { fontWeight: '600' },
  menuValue: { marginTop: 2 },
  signOutButton: { marginTop: 32, marginHorizontal: 20, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  modalCard: { width: '100%', borderRadius: 14, padding: 20 },
  modalTitle: { fontWeight: '700', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, marginTop: 4 },
  modalButton: { paddingVertical: 8, paddingHorizontal: 4 },
  fontOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
});