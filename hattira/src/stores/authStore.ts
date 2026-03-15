// src/stores/authStore.ts
import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/config/supabase';

type Profile = any;

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// Module-level guards prevent double initialization
let _initialized = false;
let _initializing = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: false,
  isInitialized: false,

  setSession: (session) => set({ session, user: session?.user ?? null }),
  setProfile: (profile) => set({ profile }),

  refreshProfile: async () => {
    const userId = get().user?.id;
    if (!userId) return;
    try {
      const { data } = await supabase
        .from('profiles').select('*').eq('id', userId).single();
      if (data) set({ profile: data });
    } catch (e: any) {
      console.warn('refreshProfile:', e.message);
    }
  },

  logout: async () => {
    _initialized = false;
    _initializing = false;
    try {
      const userId = get().user?.id;
      if (userId) {
        supabase.from('profiles')
          .update({ is_online: false, last_active: new Date().toISOString() })
          .eq('id', userId).then(() => {}).catch(() => {});
        supabase.from('user_locations')
          .delete().eq('user_id', userId).then(() => {}).catch(() => {});
      }
      await supabase.auth.signOut();
    } catch (e: any) {
      console.error('logout:', e.message);
    } finally {
      set({ session: null, user: null, profile: null, isInitialized: false, isLoading: false });
    }
  },

  initialize: async () => {
    if (_initialized || _initializing) return;
    _initializing = true;
    set({ isLoading: true });

    try {
      console.log('🚀 initialize() starting...');
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('getSession error:', error.message);
        return;
      }

      if (!session?.user) {
        console.log('initialize: no session → show login');
        return;
      }

      console.log('✅ Session for:', session.user.email);
      set({ session, user: session.user });

      const { data: profile, error: pErr } = await supabase
        .from('profiles').select('*').eq('id', session.user.id).single();

      if (pErr) {
        console.error('profile fetch error:', pErr.code, pErr.message);
      } else if (profile) {
        set({ profile });
        console.log('✅ Profile:', profile.full_name);
      }

    } catch (e: any) {
      console.error('initialize exception:', e.message);
    } finally {
      _initialized = true;
      _initializing = false;
      set({ isLoading: false, isInitialized: true });
      console.log('✅ isInitialized = true');
    }
  },
}));