// src/hooks/useChat.ts
import { useCallback, useEffect, useRef } from 'react';
import { supabase, Message } from '@/config/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { chatService } from '@/features/chat/services/chatService';
import { CONSTANTS } from '@/config/constants';

export function useChat(matchId: string) {
  const { user } = useAuthStore();
  const {
    messages,
    typingUsers,
    addMessage,
    setMessages,
    setTyping,
    setLoadingMessages,
    isLoadingMessages,
  } = useChatStore();

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const matchMessages = messages[matchId] ?? [];
  const otherUserTyping =
    Object.entries(typingUsers).filter(
      ([key, val]) =>
        key.startsWith(matchId) && !key.includes(user?.id ?? '') && val
    ).length > 0;

  const loadMessages = useCallback(async () => {
    if (!user) return;
    setLoadingMessages(true);
    try {
      const msgs = await chatService.fetchMessages(matchId);
      setMessages(matchId, msgs);
      await chatService.markAsSeen(matchId, user.id);
    } catch (error) {
      console.error('Load messages error:', error);
    } finally {
      setLoadingMessages(false);
    }
  }, [matchId, user]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!user || !content.trim()) return;
      try {
        await chatService.sendMessage(matchId, user.id, content);
        handleStopTyping();
      } catch (error) {
        console.error('Send message error:', error);
        throw error;
      }
    },
    [matchId, user]
  );

  const handleStartTyping = useCallback(async () => {
    if (!user) return;
    await chatService.setTyping(matchId, user.id, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(handleStopTyping, CONSTANTS.TYPING_TIMEOUT_MS);
  }, [matchId, user]);

  const handleStopTyping = useCallback(async () => {
    if (!user) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    await chatService.setTyping(matchId, user.id, false);
  }, [matchId, user]);

  useEffect(() => {
    if (!user) return;
    loadMessages();

    // FIX: explicit type annotation on callback parameter
    const msgChannel = chatService.subscribeToMessages(
      matchId,
      (message: Message) => {
        addMessage(matchId, message);
        if (message.sender_id !== user.id) {
          chatService.markAsSeen(matchId, user.id);
        }
      }
    );

    // FIX: explicit type annotation on callback parameter
    const typingChannel = chatService.subscribeToTyping(
      matchId,
      user.id,
      (isTyping: boolean) => {
        setTyping(matchId, 'other', isTyping);
      }
    );

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(typingChannel);
      handleStopTyping();
    };
  }, [matchId, user]);

  return {
    messages: matchMessages,
    isLoadingMessages,
    isOtherTyping: otherUserTyping,
    sendMessage,
    handleStartTyping,
    handleStopTyping,
  };
}