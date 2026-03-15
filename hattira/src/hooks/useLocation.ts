// src/hooks/useLocation.ts
import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { useAuthStore } from '@/stores/authStore';
import { useLocationStore } from '@/stores/locationStore';
import { locationService } from '@/features/nearby/services/locationService';

export function useLocation() {
  const { user } = useAuthStore();
  const {
    setOnline,
    setOffline,
    setCurrentLocation,
    setLoading,
    setLocationError,
  } = useLocationStore();

  const watchRef = useRef<Location.LocationSubscription | null>(null);

  const goOnline = async () => {
    if (!user) {
      console.warn('goOnline: no user logged in');
      return;
    }

    setLoading(true);
    setLocationError(null);
    console.log('🚀 Going online for user:', user.id);

    try {
      // 1. Permission
      const granted = await locationService.requestPermissions();
      if (!granted) {
        Alert.alert(
          'Location Permission Required',
          'Please allow location access:\nSettings → Apps → Hattira → Permissions → Location → Allow all the time',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      // 2. Get location
      console.log('📍 Getting current location...');
      const coords = await locationService.getCurrentLocation();
      console.log('📍 Location:', coords.latitude, coords.longitude);
      setCurrentLocation(coords);

      // 3. Save location FIRST
      await locationService.updateLocation(
        user.id,
        coords.latitude,
        coords.longitude,
        coords.accuracy ?? null
      );

      // 4. Set online status
      await locationService.setOnlineStatus(user.id, true);

      // 5. Mark online in store
      setOnline();
      console.log('✅ Now online!');

      // 6. Start watching
      watchRef.current?.remove();
      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 15000,
          distanceInterval: 20,
        },
        async (loc) => {
          setCurrentLocation(loc.coords);
          await locationService.updateLocation(
            user.id,
            loc.coords.latitude,
            loc.coords.longitude,
            loc.coords.accuracy ?? null
          ).catch(console.warn);
        }
      );
    } catch (error: any) {
      console.error('❌ goOnline error:', error);
      const msg = error?.message ?? 'Failed to go online';
      setLocationError(msg);
      Alert.alert('Could not go online', msg);
    } finally {
      setLoading(false);
    }
  };

  const goOffline = async () => {
    if (!user) return;
    console.log('Going offline...');
    try {
      watchRef.current?.remove();
      watchRef.current = null;
      await locationService.setOnlineStatus(user.id, false);
      await locationService.deleteLocation(user.id);
      setOffline();
      console.log('✅ Now offline');
    } catch (error: any) {
      console.error('goOffline error:', error);
      setOffline(); // force offline locally
    }
  };

  useEffect(() => {
    return () => {
      watchRef.current?.remove();
    };
  }, []);

  return { goOnline, goOffline };
}