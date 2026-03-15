// src/config/supabase.ts
// ─────────────────────────────────────────────────────────────────────────────
// ROOT CAUSE FIX:
//
// The original `supabase = new Proxy(...)` caused a timing bug on app reopen:
//   - Proxy calls getSupabase() lazily on first property access
//   - On reopen, this happened BEFORE AsyncStorage returned the persisted session
//   - So auth.getSession() returned null even though user was logged in
//   - Result: every screen stuck on "Loading..."
//
// Fix: eagerly create the client at import time (not lazily).
// AsyncStorage is always ready before JS executes imports.
// ─────────────────────────────────────────────────────────────────────────────
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// URL polyfill must run before createClient
if (typeof global.URL === 'undefined') {
  const { URL, URLSearchParams } = require('react-native-url-polyfill');
  global.URL = URL;
  global.URLSearchParams = URLSearchParams;
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (__DEV__ && (!SUPABASE_URL || !SUPABASE_ANON_KEY)) {
  console.error(
    '❌ Missing Supabase env vars!\n' +
    'Make sure .env has:\n' +
    'EXPO_PUBLIC_SUPABASE_URL=...\n' +
    'EXPO_PUBLIC_SUPABASE_ANON_KEY=...\n'
  );
}

// ── Create client ONCE at module load time ────────────────────────────────────
// This ensures AsyncStorage is passed in before any auth calls are made
const _client: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

// ── Single export — use this everywhere ──────────────────────────────────────
export const supabase = _client;

// ── Alias for backwards compat (some files use getSupabase()) ─────────────────
export function getSupabase(): SupabaseClient {
  return _client;
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface Profile {
  id: string;
  username: string;
  full_name: string;
  bio: string;
  avatar_url: string;
  is_online: boolean;
  last_active: string;
  push_token: string | null;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserLocation {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  updated_at: string;
}

export interface Match {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface NearbyUser extends Profile {
  distance: number;
  location: UserLocation;
}