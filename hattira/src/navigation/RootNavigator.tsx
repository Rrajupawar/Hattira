// src/navigation/RootNavigator.tsx
// ─────────────────────────────────────────────────────────────────────────────
// KEY FIX: No screen renders until isInitialized = true.
// onAuthStateChange no longer sets isInitialized (that caused the race).
// initialize() is the only thing that sets isInitialized.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  View, ActivityIndicator, StyleSheet,
  Text, AppState, AppStateStatus,
} from 'react-native';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { getSupabase } from '@/config/supabase';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { RootStackParamList } from './types';
import { Colors } from '@/theme/colors';

const Root = createNativeStackNavigator<RootStackParamList>();

// Hard timeout — if init takes longer than this, unblock anyway
const INIT_TIMEOUT_MS = 8000;

export function RootNavigator() {
  const { session, isInitialized, initialize, setSession, setProfile } = useAuthStore();
  const { loadSettings } = useSettingsStore();
  const appState = useRef(AppState.currentState);
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    // Failsafe: if initialize() hangs, unblock after timeout
    const timeout = setTimeout(() => {
      if (!useAuthStore.getState().isInitialized) {
        console.warn('⚠️ Init timeout — forcing isInitialized = true');
        useAuthStore.setState({ isInitialized: true, isLoading: false });
      }
    }, INIT_TIMEOUT_MS);

    // Load settings in background
    loadSettings().catch(() => {});

    // THE main initialization — sets isInitialized when done
    initialize().finally(() => clearTimeout(timeout));

    // Auth state listener — only updates session/profile, never isInitialized
    // Letting this set isInitialized caused race conditions on app reopen
    const { data: { subscription } } = getSupabase().auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('🔐 Auth event:', event);

        if (event === 'SIGNED_OUT') {
          setSession(null);
          setProfile(null);
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(newSession);
          if (newSession?.user) {
            try {
              const { data } = await getSupabase()
                .from('profiles')
                .select('*')
                .eq('id', newSession.user.id)
                .single();
              if (data) {
                setProfile(data);
                console.log('✅ Profile updated via auth listener');
              }
            } catch (e: any) {
              console.warn('Auth listener profile fetch:', e.message);
            }
          }
        }
      }
    );

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  // Re-fetch on foreground — handles token refresh after long background
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        console.log('📱 Foregrounded — refreshing session');
        try {
          const { data: { session: s } } = await getSupabase().auth.getSession();
          if (s) {
            setSession(s);
            const { data } = await getSupabase()
              .from('profiles')
              .select('*')
              .eq('id', s.user.id)
              .single();
            if (data) setProfile(data);
          }
        } catch (e: any) {
          console.warn('Foreground refresh error:', e.message);
        }
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, []);

  // ── Block ALL rendering until initialized ────────────────────────────────
  if (!isInitialized) {
    return (
      <View style={styles.splash}>
        <Text style={styles.logo}>🗺️</Text>
        <Text style={styles.title}>Hattira</Text>
        <ActivityIndicator size="large" color={Colors.primary} style={styles.spinner} />
        <Text style={styles.sub}> Loading.....</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Root.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <Root.Screen name="App" component={AppNavigator} />
        ) : (
          <Root.Screen name="Auth" component={AuthNavigator} />
        )}
      </Root.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.background, gap: 8,
  },
  logo: { fontSize: 64 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.primary, letterSpacing: 1 },
  spinner: { marginTop: 24 },
  sub: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
});