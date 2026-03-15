// src/features/chat/services/chatService.ts
import { supabase } from '@/config/supabase';

export const chatService = {

  getMessages: async (matchId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('getMessages error:', error.message);
      throw error;
    }
    return data ?? [];
  },

  sendMessage: async (matchId: string, senderId: string, content: string) => {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        match_id: matchId,
        sender_id: senderId,
        content: content.trim(),
        is_read: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('sendMessage error:', error.message);
      throw error;
    }
    return data;
  },

  markAsRead: async (matchId: string, userId: string) => {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('match_id', matchId)
      .neq('sender_id', userId)
      .eq('is_read', false);

    if (error) {
      console.warn('markAsRead error:', error.message);
    }
  },

  subscribeToMessages: (
    matchId: string,
    onMessage: (message: any) => void
  ) => {
    const channel = supabase
      .channel(`chat:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          console.log('New message received:', payload.new);
          onMessage(payload.new);
        }
      )
      .subscribe((status) => {
        console.log('Chat subscription status:', status);
      });

    return channel;
  },

  getChatList: async (userId: string) => {
    // Get all accepted matches
    const { data: matches, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq('status', 'accepted')
      .order('updated_at', { ascending: false });

    if (matchError) {
      console.error('getChatList error:', matchError.message);
      return [];
    }

    if (!matches || matches.length === 0) return [];

    // Get other user IDs
    const otherUserIds = matches.map((m) =>
      m.requester_id === userId ? m.receiver_id : m.requester_id
    );

    // Get their profiles
    const { data: profiles, error: profError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', otherUserIds);

    if (profError) {
      console.error('getChatList profiles error:', profError.message);
      return [];
    }

    // Get last message for each match
    const chatList = await Promise.all(
      matches.map(async (match) => {
        const otherId =
          match.requester_id === userId
            ? match.receiver_id
            : match.requester_id;

        const otherProfile = (profiles ?? []).find((p) => p.id === otherId);

        const { data: lastMsgData } = await supabase
          .from('messages')
          .select('content, created_at, sender_id, is_read')
          .eq('match_id', match.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Count unread messages
        const { count: unreadCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('match_id', match.id)
          .eq('is_read', false)
          .neq('sender_id', userId);

        return {
          matchId: match.id,
          profile: otherProfile,
          lastMessage: lastMsgData ?? null,
          unreadCount: unreadCount ?? 0,
          updatedAt: match.updated_at,
        };
      })
    );

    return chatList;
  },
};