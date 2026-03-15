// src/stores/matchStore.ts
import { create } from 'zustand';
import { Match } from '@/config/supabase';

interface NearbyUser {
  id: string;
  full_name: string;
  username: string;
  avatar_url?: string | null;
  bio?: string | null;
  is_online: boolean;
  distance: number;
}

interface MatchState {
  matches: Match[];
  pendingRequests: Match[];
  nearbyUsers: NearbyUser[];
  radiusKm: number;
  isLoadingMatches: boolean;
  isLoadingNearby: boolean;

  setMatches: (matches: Match[]) => void;
  setPendingRequests: (requests: Match[]) => void;
  setNearbyUsers: (users: NearbyUser[]) => void;
  setRadiusKm: (radius: number) => void;
  setLoadingMatches: (loading: boolean) => void;
  setLoadingNearby: (loading: boolean) => void;
  removeMatch: (matchId: string) => void;
}

export const useMatchStore = create<MatchState>((set) => ({
  matches: [],
  pendingRequests: [],
  nearbyUsers: [],
  radiusKm: 0.1,
  isLoadingMatches: false,
  isLoadingNearby: false,

  setMatches: (matches) => set({ matches }),
  setPendingRequests: (pendingRequests) => set({ pendingRequests }),
  setNearbyUsers: (nearbyUsers) => set({ nearbyUsers }),
  setRadiusKm: (radiusKm) => set({ radiusKm }),
  setLoadingMatches: (isLoadingMatches) => set({ isLoadingMatches }),
  setLoadingNearby: (isLoadingNearby) => set({ isLoadingNearby }),
  removeMatch: (matchId) =>
    set((state) => ({
      matches: state.matches.filter((m) => m.id !== matchId),
    })),
}));