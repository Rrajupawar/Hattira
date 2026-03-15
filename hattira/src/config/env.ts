// src/config/env.ts
const SUPABASE_URL = process.env.jwahqcaombfwxjsanzxf.supabase.co;
const SUPABASE_ANON_KEY = process.env.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3YWhxY2FvbWJmd3hqc2FuenhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTU4NTAsImV4cCI6MjA4NzQzMTg1MH0.i8za91oK9UVf8I_me53Iha20iH3FQFBNmlMd45hbwv8;

if (__DEV__) {
  if (!SUPABASE_URL) {
    console.error('❌ EXPO_PUBLIC_SUPABASE_URL is not set in .env');
  }
  if (!SUPABASE_ANON_KEY) {
    console.error('❌ EXPO_PUBLIC_SUPABASE_ANON_KEY is not set in .env');
  }
}

export const ENV = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  IS_DEV: __DEV__,
} as const;
