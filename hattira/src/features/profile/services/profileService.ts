// src/features/profile/services/profileService.ts
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';import { supabase, Profile } from '@/config/supabase';
import { CONSTANTS } from '@/config/constants';

// Manually decode base64 to ArrayBuffer (avoids base64-arraybuffer dependency)
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export const profileService = {
  getProfile: async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) return null;
    return data as Profile;
  },

  updateProfile: async (userId: string, updates: Partial<Profile>): Promise<Profile> => {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data as Profile;
  },

  pickAndUploadAvatar: async (userId: string): Promise<string> => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets[0]) {
      throw new Error('Cancelled');
    }

    const asset = result.assets[0];
    const fileExt = asset.uri.split('.').pop() ?? 'jpg';
    const fileName = `${userId}/avatar.${fileExt}`;
    const contentType = `image/${fileExt}`;

    // FIX: Use string literal 'base64' instead of FileSystem.EncodingType.Base64
    const base64 = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: 'base64',
    });

    // FIX: Use local decoder instead of base64-arraybuffer package
    const arrayBuffer = base64ToArrayBuffer(base64);

    const { error: uploadError } = await supabase.storage
      .from(CONSTANTS.AVATAR_BUCKET)
      .upload(fileName, arrayBuffer, { contentType, upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from(CONSTANTS.AVATAR_BUCKET)
      .getPublicUrl(fileName);

    return urlData.publicUrl + `?t=${Date.now()}`;
  },
};