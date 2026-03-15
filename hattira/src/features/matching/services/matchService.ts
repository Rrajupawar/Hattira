// src/features/matching/services/matchService.ts
import { supabase, Match, Profile } from '@/config/supabase';

export const matchService = {

  sendRequest: async (requesterId: string, receiverId: string): Promise<void> => {
    const { error } = await supabase
      .from('matches')
      .insert({ requester_id: requesterId, receiver_id: receiverId, status: 'pending' });
    if (error) throw error;
  },

  acceptRequest: async (matchId: string): Promise<void> => {
    const { error } = await supabase
      .from('matches')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', matchId);
    if (error) throw error;
  },

  rejectRequest: async (matchId: string): Promise<void> => {
    const { error } = await supabase
      .from('matches')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', matchId);
    if (error) throw error;
  },

  // Delete match + all its messages
  deleteMatch: async (matchId: string): Promise<void> => {
    // Delete messages first (foreign key)
    const { error: msgError } = await supabase
      .from('messages')
      .delete()
      .eq('match_id', matchId);
    if (msgError) throw new Error(`Delete messages failed: ${msgError.message}`);

    // Delete typing indicators
    await supabase
      .from('typing_indicators')
      .delete()
      .eq('match_id', matchId);

    // Delete the match
    const { error: matchError } = await supabase
      .from('matches')
      .delete()
      .eq('id', matchId);
    if (matchError) throw new Error(`Delete match failed: ${matchError.message}`);
  },

  // Delete only messages (clear chat but keep match)
  clearChat: async (matchId: string): Promise<void> => {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('match_id', matchId);
    if (error) throw new Error(`Clear chat failed: ${error.message}`);
  },

  getMatches: async (userId: string): Promise<Match[]> => {
    const { data, error } = await supabase
      .from('matches')
      .select('*, profiles!matches_receiver_id_fkey(*)')
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq('status', 'accepted')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Match[];
  },

  getPendingRequests: async (userId: string): Promise<Match[]> => {
    const { data, error } = await supabase
      .from('matches')
      .select('*, profiles!matches_requester_id_fkey(*)')
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Match[];
  },
};