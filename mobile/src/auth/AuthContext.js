import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

const DISPLAY_NAME_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 1 day
const USERNAME_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// How long until a cooldown clears, in a short human-readable form.
function formatRemaining(msRemaining) {
  const hours = Math.ceil(msRemaining / (60 * 60 * 1000));
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.ceil(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

function msSinceOrInfinity(dateString) {
  return dateString ? Date.now() - new Date(dateString).getTime() : Infinity;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      return;
    }
    loadProfile(session.user.id);
  }, [session]);

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!error) setProfile(data);
  }

  async function signUp({ email, password, username }) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({ id: data.user.id, username });
      if (profileError) throw profileError;
    }

    return data;
  }

  async function signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async function updateProfile(updates) {
    if (!session?.user) throw new Error('No active session');
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', session.user.id)
      .select()
      .single();
    if (error) throw error;
    setProfile(data);
    return data;
  }

  // Display name: once every 24 hours.
  async function updateDisplayName(newDisplayName) {
    if (!session?.user) throw new Error('No active session');

    const elapsed = msSinceOrInfinity(profile?.display_name_updated_at);
    if (elapsed < DISPLAY_NAME_COOLDOWN_MS) {
      throw new Error(`You can change your display name again in ${formatRemaining(DISPLAY_NAME_COOLDOWN_MS - elapsed)}.`);
    }

    return updateProfile({
      display_name: newDisplayName,
      display_name_updated_at: new Date().toISOString(),
    });
  }

  // Username: once every 7 days.
  async function updateUsername(newUsername) {
    if (!session?.user) throw new Error('No active session');

    const elapsed = msSinceOrInfinity(profile?.username_updated_at);
    if (elapsed < USERNAME_COOLDOWN_MS) {
      throw new Error(`You can change your username again in ${formatRemaining(USERNAME_COOLDOWN_MS - elapsed)}.`);
    }

    return updateProfile({
      username: newUsername,
      username_updated_at: new Date().toISOString(),
    });
  }

  async function updateEmail(newEmail) {
    if (!session?.user) throw new Error('No active session');
    const { data, error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) throw error;
    return data;
  }

  async function updatePassword(newPassword) {
    if (!session?.user) throw new Error('No active session');
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return data;
  }

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    updateUsername,
    updateDisplayName,
    updateEmail,
    updatePassword,
    DISPLAY_NAME_COOLDOWN_MS,
    USERNAME_COOLDOWN_MS,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}