// src/features/nearby/services/locationService.ts
import * as Location from 'expo-location';
import { supabase } from '@/config/supabase';

export const locationService = {

  requestPermissions: async (): Promise<boolean> => {
    try {
      const { status: existing } = await Location.getForegroundPermissionsAsync();
      if (existing === 'granted') return true;
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('Location permission status:', status);
      return status === 'granted';
    } catch (e) {
      console.error('Permission error:', e);
      return false;
    }
  },

  getCurrentLocation: async (): Promise<Location.LocationObjectCoords> => {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    console.log('Got location:', location.coords.latitude, location.coords.longitude);
    return location.coords;
  },

  updateLocation: async (
    userId: string,
    latitude: number,
    longitude: number,
    accuracy: number | null
  ): Promise<void> => {
    console.log('Saving location:', { userId, latitude, longitude });
    const { error } = await supabase
      .from('user_locations')
      .upsert(
        {
          user_id: userId,
          latitude,
          longitude,
          accuracy,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    if (error) {
      console.error('❌ Location upsert error:', error.message, error.code);
      throw new Error(`Location save failed: ${error.message}`);
    }
    console.log('✅ Location saved');
  },

  setOnlineStatus: async (userId: string, isOnline: boolean): Promise<void> => {
    console.log('Setting online status:', isOnline, 'for', userId);
    const { error } = await supabase
      .from('profiles')
      .update({
        is_online: isOnline,
        last_active: new Date().toISOString(),
      })
      .eq('id', userId);
    if (error) {
      console.error('❌ Online status error:', error.message);
      throw new Error(`Status update failed: ${error.message}`);
    }
    console.log('✅ Online status set to', isOnline);
  },

  deleteLocation: async (userId: string): Promise<void> => {
    const { error } = await supabase
      .from('user_locations')
      .delete()
      .eq('user_id', userId);
    if (error) {
      console.warn('Delete location warning:', error.message);
    } else {
      console.log('✅ Location deleted');
    }
  },

  fetchNearbyUsers: async (
    currentUserId: string,
    latitude: number,
    longitude: number,
    radiusKm: number
  ): Promise<any[]> => {
    console.log('🔍 Fetching nearby...', { latitude, longitude, radiusKm });

    // Only get locations updated in the last 10 minutes (fresh/active users)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data: locations, error: locError } = await supabase
      .from('user_locations')
      .select('*')
      .neq('user_id', currentUserId)
      .gte('updated_at', tenMinutesAgo);

    if (locError) {
      console.error('❌ Fetch locations error:', locError.message, locError.code);
      return [];
    }

    console.log('📍 Fresh locations in DB (excl. self):', locations?.length ?? 0);

    if (!locations || locations.length === 0) {
      console.log('No fresh locations found');
      return [];
    }

    // Calculate distances and filter by radius
    const nearbyUserIds: string[] = [];
    const distanceMap: Record<string, number> = {};

    for (const loc of locations) {
      const dist = haversineKm(latitude, longitude, loc.latitude, loc.longitude);
      console.log(`👤 User ${loc.user_id.slice(0, 8)}: ${(dist * 1000).toFixed(0)}m away`);
      if (dist <= radiusKm) {
        nearbyUserIds.push(loc.user_id);
        distanceMap[loc.user_id] = dist;
      }
    }

    console.log('📏 Users within radius:', nearbyUserIds.length);

    if (nearbyUserIds.length === 0) {
      console.log('No users within radius');
      return [];
    }

    // Get profiles — only is_online: true users
    const { data: profiles, error: profError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', nearbyUserIds)
      .eq('is_online', true);

    if (profError) {
      console.error('❌ Fetch profiles error:', profError.message);
      return [];
    }

    console.log('👥 Online profiles nearby:', profiles?.length ?? 0);

    return (profiles ?? [])
      .map((p) => ({ ...p, distance: distanceMap[p.id] ?? 999 }))
      .sort((a, b) => a.distance - b.distance);
  },
};

// Haversine formula — returns distance in km
function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}