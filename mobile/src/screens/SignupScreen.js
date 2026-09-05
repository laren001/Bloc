import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import { TextField, PrimaryButton } from '../components/FormFields';

export default function SignupScreen({ navigation }) {
  const { theme } = useTheme();
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const filled = email && password && username;

  const handleSignup = async () => {
    setLoading(true);
    try {
      await signUp({ email, password, username });
      navigation.navigate('ProfileSetup');
    } catch (err) {
      Alert.alert('Signup failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={18} color={theme.textSecondary} />
        <Text style={{ color: theme.textSecondary, fontSize: 13, marginLeft: 6 }}>Back</Text>
      </TouchableOpacity>

      <Text style={[styles.heading, { color: theme.textPrimary }]}>Create your account</Text>
      <Text style={[styles.subheading, { color: theme.textSecondary }]}>
        Join Bloc — starting at FUT Minna, open to anyone.
      </Text>

      <TextField label="Username" value={username} onChangeText={setUsername} placeholder="username" />
      <TextField label="Email" value={email} onChangeText={setEmail} placeholder="you@email.com" keyboardType="email-address" />
      <TextField label="Password" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />

      <PrimaryButton label="Continue" onPress={handleSignup} disabled={!filled} loading={loading} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 70 },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  heading: { fontSize: 22, fontWeight: '800', marginBottom: 6 },
  subheading: { fontSize: 13, marginBottom: 26 },
});
