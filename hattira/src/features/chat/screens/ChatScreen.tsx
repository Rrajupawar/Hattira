// src/features/chat/screens/ChatScreen.tsx
import React, {
  useEffect, useRef, useCallback, useState, useMemo,
} from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/config/supabase';
import { matchService } from '@/features/matching/services/matchService';
import { Colors } from '@/theme/colors';
import { Typography } from '@/theme/typography';
import { Spacing } from '@/theme/spacing';
import { AppStackParamList } from '@/navigation/types';

type ChatRouteProp = RouteProp<AppStackParamList, 'Chat'>;

interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  _tempId?: string;   // client-only: temp id for optimistic msg
  _pending?: boolean; // client-only: waiting for server
  _failed?: boolean;  // client-only: failed to send
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isSameDay(a: string, b: string) {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const diff = (Date.now() - d.getTime()) / 86400000;
  if (diff < 1) return 'Today';
  if (diff < 2) return 'Yesterday';
  return d.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

// ─── Bubble ───────────────────────────────────────────────────────────────────
const Bubble = React.memo(({
  msg, isMe, isLastInGroup, showSeen,
}: {
  msg: Message;
  isMe: boolean;
  isLastInGroup: boolean;
  showSeen: boolean;
}) => {
  const tick = msg._pending
    ? '🕐'
    : msg._failed
    ? '❌'
    : msg.is_read
    ? '✓✓'
    : '✓';

  const tickColor = msg.is_read ? '#60A5FA' : 'rgba(255,255,255,0.6)';

  return (
    <View style={[styles.bubbleWrap, isMe ? styles.bubbleWrapMe : styles.bubbleWrapOther]}>
      <View style={[
        styles.bubble,
        isMe ? styles.bubbleMe : styles.bubbleOther,
        !isLastInGroup && isMe && styles.bubbleMeNoTail,
        !isLastInGroup && !isMe && styles.bubbleOtherNoTail,
        msg._failed && styles.bubbleFailed,
      ]}>
        <Text style={[styles.bubbleText, isMe ? styles.textMe : styles.textOther]}>
          {msg.content}
        </Text>

        {/* Time + tick row */}
        <View style={styles.metaRow}>
          <Text style={[styles.timeText, isMe ? styles.timeMe : styles.timeOther]}>
            {formatTime(msg.created_at)}
          </Text>
          {isMe && (
            <Text style={[
              styles.tick,
              { color: msg._failed ? '#EF4444' : msg._pending ? 'rgba(255,255,255,0.5)' : tickColor },
            ]}>
              {tick}
            </Text>
          )}
        </View>
      </View>

      {/* Seen label below last sent message */}
      {isMe && showSeen && msg.is_read && (
        <Text style={styles.seenLabel}>Seen</Text>
      )}
    </View>
  );
});

// ─── Date separator ───────────────────────────────────────────────────────────
const DateSep = ({ label }: { label: string }) => (
  <View style={styles.dateSep}>
    <View style={styles.dateSepLine} />
    <Text style={styles.dateSepText}>{label}</Text>
    <View style={styles.dateSepLine} />
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export function ChatScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<ChatRouteProp>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { matchId, userName } = route.params;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const channelRef = useRef<any>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // KEY: track IDs we inserted ourselves so we don't add duplicates from realtime
  const myInsertedIds = useRef<Set<string>>(new Set());

  // ── Header ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    navigation.setOptions({
      title: userName,
      headerRight: () => (
        <TouchableOpacity
          onPress={showOptions}
          style={{ marginRight: 16, padding: 4 }}
        >
          <Text style={{ fontSize: 22, color: Colors.primary }}>⋮</Text>
        </TouchableOpacity>
      ),
    });
  }, [userName]);

  // ── Load messages ──────────────────────────────────────────────────────────
  const loadMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data ?? []) as Message[]);
      scrollToBottom(false);

      // Mark all incoming messages as read
      markRead();
    } catch (e: any) {
      console.error('loadMessages error:', e.message);
    } finally {
      setIsLoading(false);
    }
  }, [matchId]);

  // ── Mark as read ───────────────────────────────────────────────────────────
  const markRead = useCallback(async () => {
    if (!user) return;
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('match_id', matchId)
      .neq('sender_id', user.id)
      .eq('is_read', false);

    // Update local state too
    setMessages(prev =>
      prev.map(m =>
        m.sender_id !== user.id && !m.is_read ? { ...m, is_read: true } : m
      )
    );
  }, [matchId, user]);

  // ── Subscribe to realtime ──────────────────────────────────────────────────
  const subscribe = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    channelRef.current = supabase
      .channel(`chat_room_${matchId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${matchId}`,
      }, (payload) => {
        const newMsg = payload.new as Message;

        // CRITICAL: skip if this is a message I just inserted
        // (prevents the "hi hi" duplicate bug)
        if (myInsertedIds.current.has(newMsg.id)) {
          myInsertedIds.current.delete(newMsg.id);
          return;
        }

        // It's from the other person — add it
        setMessages(prev => {
          if (prev.find(m => m.id === newMsg.id)) return prev; // safety check
          return [...prev, newMsg];
        });
        scrollToBottom(true);
        markRead(); // auto-mark as read since chat is open
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${matchId}`,
      }, (payload) => {
        const updated = payload.new as Message;
        // Update is_read status in real-time (shows seen tick)
        setMessages(prev =>
          prev.map(m => m.id === updated.id ? { ...m, is_read: updated.is_read } : m)
        );
      })
      .subscribe();
  }, [matchId]);

  useEffect(() => {
    loadMessages();
    subscribe();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [matchId]);

  // ── Scroll ─────────────────────────────────────────────────────────────────
  const scrollToBottom = useCallback((animated = true) => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated });
    }, 80);
  }, []);

  // ── Send message ───────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!user || !input.trim() || isSending) return;

    const text = input.trim();
    setInput('');

    const tempId = `temp_${Date.now()}_${Math.random()}`;

    // Add optimistic message to UI
    const optimisticMsg: Message = {
      id: tempId,
      match_id: matchId,
      sender_id: user.id,
      content: text,
      created_at: new Date().toISOString(),
      is_read: false,
      _pending: true,
      _tempId: tempId,
    };

    setMessages(prev => [...prev, optimisticMsg]);
    scrollToBottom(true);

    try {
      // Insert to Supabase
      const { data, error } = await supabase
        .from('messages')
        .insert({
          match_id: matchId,
          sender_id: user.id,
          content: text,
          is_read: false,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Register the real ID so realtime listener skips it
      if (data?.id) {
        myInsertedIds.current.add(data.id);
      }

      // Replace optimistic message with real one
      setMessages(prev =>
        prev.map(m =>
          m.id === tempId
            ? { ...data, _pending: false, _failed: false }
            : m
        )
      );
    } catch (e: any) {
      console.error('Send error:', e.message);
      // Mark as failed
      setMessages(prev =>
        prev.map(m =>
          m.id === tempId ? { ...m, _pending: false, _failed: true } : m
        )
      );
    }
  }, [user, input, isSending, matchId]);

  // ── Retry failed message ───────────────────────────────────────────────────
  const handleRetry = useCallback((msg: Message) => {
    // Remove failed message, put text back in input
    setMessages(prev => prev.filter(m => m.id !== msg.id));
    setInput(msg.content);
  }, []);

  // ── Options menu ───────────────────────────────────────────────────────────
  const showOptions = useCallback(() => {
    Alert.alert('Chat Options', '', [
      {
        text: '🗑️ Clear Messages',
        onPress: () => {
          Alert.alert('Clear Chat', 'Delete all messages? Match will remain.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Clear', style: 'destructive',
              onPress: async () => {
                await matchService.clearChat(matchId);
                setMessages([]);
              },
            },
          ]);
        },
      },
      {
        text: '❌ Delete Match',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Delete Match', `Remove ${userName} permanently?`, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete', style: 'destructive',
              onPress: async () => {
                await matchService.deleteMatch(matchId);
                navigation.goBack();
              },
            },
          ]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [matchId, userName, navigation]);

  // ── Render item ────────────────────────────────────────────────────────────
  const renderItem = useCallback(({ item, index }: { item: Message; index: number }) => {
    const isMe = item.sender_id === user?.id;
    const prevMsg = index > 0 ? messages[index - 1] : null;
    const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;

    // Show date separator
    const showDate = !prevMsg || !isSameDay(prevMsg.created_at, item.created_at);

    // Last message in a consecutive group from same sender
    const isLastInGroup = !nextMsg || nextMsg.sender_id !== item.sender_id;

    // Show "Seen" only under the last message I sent that has been read
    const myMsgs = messages.filter(m => m.sender_id === user?.id && !m._pending && !m._failed);
    const lastMyMsg = myMsgs[myMsgs.length - 1];
    const showSeen = isMe && lastMyMsg?.id === item.id && item.is_read;

    return (
      <>
        {showDate && <DateSep label={formatDateLabel(item.created_at)} />}
        <TouchableOpacity
          activeOpacity={item._failed ? 0.6 : 1}
          onPress={item._failed ? () => handleRetry(item) : undefined}
        >
          <Bubble
            msg={item}
            isMe={isMe}
            isLastInGroup={isLastInGroup}
            showSeen={showSeen}
          />
          {item._failed && (
            <Text style={styles.failedHint}>Tap to retry</Text>
          )}
        </TouchableOpacity>
      </>
    );
  }, [messages, user, handleRetry]);

  // ── Typing indicator ───────────────────────────────────────────────────────
  const TypingDots = () => (
    <View style={[styles.bubbleWrap, styles.bubbleWrapOther]}>
      <View style={[styles.bubble, styles.bubbleOther, { paddingVertical: 12 }]}>
        <Text style={{ color: Colors.textSecondary, fontSize: 18, letterSpacing: 4 }}>
          • • •
        </Text>
      </View>
    </View>
  );

  // ── Build data array (messages + typing) ───────────────────────────────────
  const listData = useMemo(() => {
    if (otherTyping) return [...messages, { id: '__typing__' } as any];
    return messages;
  }, [messages, otherTyping]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Messages list */}
      <FlatList
        ref={flatListRef}
        data={listData}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          if (item.id === '__typing__') return <TypingDots />;
          return renderItem({ item, index });
        }}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onLayout={() => scrollToBottom(false)}
        ListEmptyComponent={() => (
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatEmoji}>👋</Text>
            <Text style={styles.emptyChatTitle}>Say Hello!</Text>
            <Text style={styles.emptyChatSub}>
              Start the conversation with {userName}
            </Text>
          </View>
        )}
      />

      {/* Input bar */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom || 12 }]}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={`Message ${userName}...`}
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={1000}
          onSubmitEditing={Platform.OS === 'ios' ? undefined : handleSend}
          blurOnSubmit={false}
          returnKeyType="default"
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            (!input.trim() || isSending) && styles.sendBtnDisabled,
          ]}
          onPress={handleSend}
          disabled={!input.trim() || isSending}
          activeOpacity={0.8}
        >
          {isSending
            ? <ActivityIndicator size="small" color="#FFF" />
            : <Text style={styles.sendIcon}>➤</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const BUBBLE_RADIUS = 18;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    flexGrow: 1,
  },

  // Date separator
  dateSep: {
    flexDirection: 'row', alignItems: 'center',
    marginVertical: 16, gap: 10,
  },
  dateSepLine: { flex: 1, height: 1, backgroundColor: '#DDE1E7' },
  dateSepText: {
    fontSize: 12, fontWeight: '600', color: '#9CA3AF',
    backgroundColor: '#F0F4F8',
    paddingHorizontal: 8,
  },

  // Bubble wrapper
  bubbleWrap: { marginBottom: 2, maxWidth: '80%' },
  bubbleWrapMe: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubbleWrapOther: { alignSelf: 'flex-start', alignItems: 'flex-start' },

  // Bubble
  bubble: {
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 7,
    borderRadius: BUBBLE_RADIUS,
  },
  bubbleMe: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
    }),
  },
  bubbleMeNoTail: { borderBottomRightRadius: BUBBLE_RADIUS },
  bubbleOther: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
    }),
  },
  bubbleOtherNoTail: { borderBottomLeftRadius: BUBBLE_RADIUS },
  bubbleFailed: { opacity: 0.6 },

  // Text
  bubbleText: { fontSize: 15, lineHeight: 22 },
  textMe: { color: '#FFFFFF' },
  textOther: { color: '#1A1A2E' },

  // Meta row (time + tick)
  metaRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'flex-end', gap: 4, marginTop: 3,
  },
  timeText: { fontSize: 11 },
  timeMe: { color: 'rgba(255,255,255,0.65)' },
  timeOther: { color: '#9CA3AF' },
  tick: { fontSize: 12, fontWeight: '700' },

  // Seen label
  seenLabel: {
    fontSize: 11, color: '#60A5FA',
    fontWeight: '600', marginTop: 2,
    marginRight: 2, textAlign: 'right',
  },

  // Failed hint
  failedHint: {
    fontSize: 11, color: '#EF4444',
    textAlign: 'right', marginRight: 4,
    marginTop: 2, fontStyle: 'italic',
  },

  // Empty
  emptyChat: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingTop: 80, gap: 10,
  },
  emptyChatEmoji: { fontSize: 52 },
  emptyChatTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  emptyChatSub: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },

  // Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: '#FFFFFF', paddingHorizontal: 12,
    paddingTop: 10, gap: 8,
    borderTopWidth: 1, borderTopColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: { elevation: 8 },
    }),
  },
  input: {
    flex: 1, minHeight: 44, maxHeight: 120,
    backgroundColor: '#F3F4F6',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 15, color: '#1A1A2E',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
    }),
  },
  sendBtnDisabled: {
    backgroundColor: '#D1D5DB',
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
  },
  sendIcon: { color: '#FFFFFF', fontSize: 18, marginLeft: 2 },
});