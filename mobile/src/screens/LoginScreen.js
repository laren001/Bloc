import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import { TextField, PrimaryButton } from '../components/FormFields';

function BrickMark({ size = 44, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 300 300">
      <Rect x="0" y="0" width="130" height="60" rx="10" fill={color} />
      <Rect x="150" y="0" width="130" height="60" rx="10" fill={color} />
      <Rect x="-65" y="75" width="130" height="60" rx="10" fill={color} />
      <Rect x="85" y="75" width="130" height="60" rx="10" fill={color} />
      <Rect x="235" y="75" width="65" height="60" rx="10" fill={color} />
      <Rect x="0" y="150" width="130" height="60" rx="10" fill={color} />
      <Rect x="150" y="150" width="130" height="60" rx="10" fill={color} />
      <Rect x="-65" y="225" width="130" height="60" rx="10" fill={color} opacity={0.55} />
      <Rect x="85" y="225" width="130" height="60" rx="10" fill={color} />
      <Rect x="235" y="225" width="65" height="60" rx="10" fill={color} opacity={0.55} />
    </Svg>
  );
}

export default function LoginScreen({ navigation }) {
  const { theme } = useTheme();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await signIn({ email, password });
      // On success, AuthContext's session state updates and App.js
      // automatically swaps to the main app — no manual navigation needed.
    } catch (err) {
      Alert.alert('Login failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.logoBlock}>
        <BrickMark size={44} color={theme.textPrimary} />
        <Text style={[styles.wordmark, { color: theme.textPrimary }]}>BLOC</Text>
      </View>

      <TextField label="Email" value={email} onChangeText={setEmail} placeholder="you@email.com" keyboardType="email-address" />
      <TextField label="Password" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />

      <PrimaryButton label="Log In" onPress={handleLogin} disabled={!email || !password} loading={loading} />

      <View style={styles.footer}>
        <Text style={{ color: theme.textSecondary, fontSize: 13 }}>New to Bloc? </Text>
        <Text
          onPress={() => navigation.navigate('Signup')}
          style={{ color: theme.accent, fontSize: 13, fontWeight: '700' }}
        >
          Sign up
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 80 },
  logoBlock: { alignItems: 'center', marginBottom: 40 },
  wordmark: { fontWeight: '800', fontSize: 24, letterSpacing: 2, marginTop: 14 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
});
