// src/stores/locationStore.ts
import { create } from 'zustand';

interface Coords {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
}

interface LocationState {
  isOnline: boolean;
  isLoadingLocation: boolean;
  currentLocation: Coords | null;
  locationError: string | null;
  setOnline: () => void;
  setOffline: () => void;
  setLoading: (loading: boolean) => void;
  setCurrentLocation: (coords: Coords) => void;
  setLocationError: (error: string | null) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  isOnline: false,
  isLoadingLocation: false,
  currentLocation: null,
  locationError: null,

  setOnline: () => set({ isOnline: true, locationError: null }),
  setOffline: () => set({ isOnline: false, currentLocation: null }),
  setLoading: (loading) => set({ isLoadingLocation: loading }),
  setCurrentLocation: (coords) => set({ currentLocation: coords }),
  setLocationError: (error) => set({ locationError: error }),
}));