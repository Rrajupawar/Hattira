// src/stores/chatStore.ts
import { create } from 'zustand';
import { Message } from '@/config/supabase';

interface ChatState {
  messages: Record<string, Message[]>;
  typingUsers: Record<string, boolean>;
  isLoadingMessages: boolean;
  setMessages: (matchId: string, messages: Message[]) => void;
  addMessage: (matchId: string, message: Message) => void;
  updateMessageSeen: (matchId: string, messageId: string) => void;
  setTyping: (matchId: string, userId: string, isTyping: boolean) => void;
  setLoadingMessages: (loading: boolean) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: {},
  typingUsers: {},
  isLoadingMessages: false,

  setMessages: (matchId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [matchId]: messages },
    })),

  addMessage: (matchId, message) =>
    set((state) => {
      const existing = state.messages[matchId] ?? [];
      const alreadyExists = existing.find((m) => m.id === message.id);
      if (alreadyExists) return state;
      return {
        messages: {
          ...state.messages,
          [matchId]: [...existing, message],
        },
      };
    }),

  updateMessageSeen: (matchId, messageId) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [matchId]: (state.messages[matchId] ?? []).map((m) =>
          m.id === messageId ? { ...m, is_seen: true } : m
        ),
      },
    })),

  setTyping: (matchId, userId, isTyping) =>
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [`${matchId}_${userId}`]: isTyping,
      },
    })),

  setLoadingMessages: (isLoadingMessages) => set({ isLoadingMessages }),
}));