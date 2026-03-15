// src/hooks/useNearbyUsers.ts
import { useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useLocationStore } from '@/stores/locationStore';
import { useMatchStore } from '@/stores/matchStore';
import { locationService } from '@/features/nearby/services/locationService';

export function useNearbyUsers() {
  const { user } = useAuthStore();
  const { currentLocation } = useLocationStore();
  const { radiusKm, setNearbyUsers, setLoadingNearby } = useMatchStore();

  const fetchNearby = useCallback(async () => {
    if (!user || !currentLocation) {
      console.warn('Cannot fetch nearby: no user or location');
      return;
    }

    setLoadingNearby(true);
    try {
      const users = await locationService.fetchNearbyUsers(
        user.id,
        currentLocation.latitude,
        currentLocation.longitude,
        radiusKm
      );
      console.log(`Found ${users.length} nearby users within ${radiusKm}km`);
      setNearbyUsers(users);
    } catch (error) {
      console.error('Fetch nearby error:', error);
    } finally {
      setLoadingNearby(false);
    }
  }, [user, currentLocation, radiusKm]);

  return { fetchNearby };
}