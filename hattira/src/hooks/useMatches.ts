// src/hooks/useMatches.ts
import { useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useMatchStore } from '@/stores/matchStore';
import { matchService } from '@/features/matching/services/matchService';

export function useMatches() {
  const { user } = useAuthStore();
  const { setMatches, setPendingRequests, setLoadingMatches } = useMatchStore();

  const fetchMatches = useCallback(async () => {
    if (!user) return;
    setLoadingMatches(true);
    try {
      const data = await matchService.getMatches(user.id);
      setMatches(data);
    } catch (e: any) {
      console.error('fetchMatches error:', e.message);
    } finally {
      setLoadingMatches(false);
    }
  }, [user]);

  const fetchPending = useCallback(async () => {
    if (!user) return;
    try {
      const data = await matchService.getPendingRequests(user.id);
      setPendingRequests(data);
    } catch (e: any) {
      console.error('fetchPending error:', e.message);
    }
  }, [user]);

  return { fetchMatches, fetchPending };
}