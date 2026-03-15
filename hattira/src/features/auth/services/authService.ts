// src/features/auth/services/authService.ts
import { supabase } from '@/config/supabase';

export interface SignupPayload {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authService = {
  signup: async ({ email, password, fullName }: SignupPayload) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          username: email.split('@')[0],
        },
      },
    });
    if (error) throw error;
    return data;
  },

  login: async ({ email, password }: LoginPayload) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
};