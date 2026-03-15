// src/stores/profileStore.ts
// ─────────────────────────────────────────────────────────────────────────────
// This store was empty — that's why ProfileScreen never loaded on reopen.
// ProfileScreen depends on this store to cache the fetched profile so it
// doesn't need to re-fetch every time the tab is focused.
// ─────────────────────────────────────────────────────────────────────────────
import { create } from 'zustand';
import { getSupabase } from '@/config/supabase';

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  bio: string | null;
  avatar_url: string | null;
  is_online: boolean;
  last_active: string | null;
  push_token: string | null;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface ProfileState {
  // ── State ──────────────────────────────────────────────────────────────────
  profile: Profile | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // ── Actions ────────────────────────────────────────────────────────────────
  setProfile: (profile: Profile | null) => void;
  clearProfile: () => void;

  // ── Async ──────────────────────────────────────────────────────────────────

  /** Fetch profile for any userId (or current user if not provided) */
  fetchProfile: (userId: string) => Promise<Profile | null>;

  /** Update current user's profile fields */
  updateProfile: (userId: string, updates: Partial<Profile>) => Promise<boolean>;

  /** Upload avatar and update avatar_url */
  uploadAvatar: (userId: string, uri: string) => Promise<string | null>;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  isLoading: false,
  isSaving: false,
  error: null,

  setProfile: (profile) => set({ profile, error: null }),

  clearProfile: () => set({ profile: null, error: null }),

  // ── Fetch ──────────────────────────────────────────────────────────────────
  fetchProfile: async (userId: string) => {
    if (!userId) return null;
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await getSupabase()
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') {
          // PGRST116 = row not found — not an error for new users
          console.error('fetchProfile error:', error.message);
          set({ error: error.message });
        }
        return null;
      }

      set({ profile: data as Profile });
      return data as Profile;
    } catch (e: any) {
      console.error('fetchProfile exception:', e.message);
      set({ error: e.message });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Update ─────────────────────────────────────────────────────────────────
  updateProfile: async (userId: string, updates: Partial<Profile>) => {
    if (!userId) return false;
    set({ isSaving: true, error: null });
    try {
      const now = new Date().toISOString();
      const { data, error } = await getSupabase()
        .from('profiles')
        .update({ ...updates, updated_at: now })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('updateProfile error:', error.message);
        set({ error: error.message });
        return false;
      }

      // Merge update into local state
      set((state) => ({
        profile: state.profile
          ? { ...state.profile, ...data }
          : data as Profile,
      }));
      return true;
    } catch (e: any) {
      console.error('updateProfile exception:', e.message);
      set({ error: e.message });
      return false;
    } finally {
      set({ isSaving: false });
    }
  },

  // ── Upload Avatar ──────────────────────────────────────────────────────────
  uploadAvatar: async (userId: string, uri: string) => {
    if (!userId || !uri) return null;
    set({ isSaving: true, error: null });
    try {
      const supabase = getSupabase();

      // Read the file
      const response = await fetch(uri);
      const blob = await response.blob();
      const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const fileName = `${userId}/avatar_${Date.now()}.${ext}`;
      const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        console.error('uploadAvatar storage error:', uploadError.message);
        set({ error: uploadError.message });
        return null;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const updated = await get().updateProfile(userId, { avatar_url: publicUrl });
      if (!updated) return null;

      return publicUrl;
    } catch (e: any) {
      console.error('uploadAvatar exception:', e.message);
      set({ error: e.message });
      return null;
    } finally {
      set({ isSaving: false });
    }
  },
}));