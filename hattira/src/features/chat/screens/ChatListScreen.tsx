// src/features/chat/screens/ChatListScreen.tsx
import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Modal, Pressable,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '@/stores/authStore';
import { getSupabase } from '@/config/supabase';
import { Avatar } from '@/components/common/Avatar';
import { Colors } from '@/theme/colors';
import { Spacing } from '@/theme/spacing';
import { Theme } from '@/theme';

interface ChatItem {
  matchId: string;
  profile: any;
  lastMessage: any;
  unreadCount: number;
  updatedAt: string;
  blockedByMe: boolean;
  blockedByThem: boolean;
}

function OptionsSheet({ visible, chat, onClose, onBlock, onUnblock, onDelete }: {
  visible: boolean; chat: ChatItem | null;
  onClose: () => void; onBlock: () => void;
  onUnblock: () => void; onDelete: () => void;
}) {
  if (!chat) return null;
  const isBlocked = chat.blockedByMe;
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.sheetUser}>
            <Avatar
              uri={chat.profile?.avatar_url} name={chat.profile?.full_name ?? '?'}
              size={46} showOnline isOnline={!isBlocked && (chat.profile?.is_online ?? false)}
            />
            <View>
              <Text style={styles.sheetName}>{chat.profile?.full_name ?? 'User'}</Text>
              <Text style={styles.sheetHandle}>@{chat.profile?.username ?? '—'}</Text>
            </View>
          </View>
          <View style={styles.sheetDivider} />
          {isBlocked ? (
            <TouchableOpacity style={styles.sheetItem} onPress={() => { onClose(); onUnblock(); }}>
              <View style={[styles.sheetIcon, { backgroundColor: '#D1FAE5' }]}>
                <Text style={{ fontSize: 18 }}>✅</Text>
              </View>
              <View style={styles.sheetItemText}>
                <Text style={[styles.sheetItemTitle, { color: '#059669' }]}>Unblock User</Text>
                <Text style={styles.sheetItemSub}>Allow messages from this person again</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.sheetItem} onPress={() => { onClose(); onBlock(); }}>
              <View style={[styles.sheetIcon, { backgroundColor: '#FEF3C7' }]}>
                <Text style={{ fontSize: 18 }}>🚫</Text>
              </View>
              <View style={styles.sheetItemText}>
                <Text style={[styles.sheetItemTitle, { color: '#D97706' }]}>Block User</Text>
                <Text style={styles.sheetItemSub}>They won't be able to message you</Text>
              </View>
            </TouchableOpacity>
          )}
          <View style={styles.sheetDivider} />
          <TouchableOpacity style={styles.sheetItem} onPress={() => { onClose(); onDelete(); }}>
            <View style={[styles.sheetIcon, { backgroundColor: '#FEE2E2' }]}>
              <Text style={{ fontSize: 18 }}>🗑️</Text>
            </View>
            <View style={styles.sheetItemText}>
              <Text style={[styles.sheetItemTitle, { color: '#DC2626' }]}>Delete Chat</Text>
              <Text style={styles.sheetItemSub}>Permanently remove match and all messages</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function ChatListScreen() {
  const navigation = useNavigation<any>();
  const { user, isInitialized } = useAuthStore();
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedChat, setSelectedChat] = useState<ChatItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const loadChats = useCallback(async () => {
    // ── CRITICAL: don't fetch until auth is ready ────────────────────────
    if (!user || !isInitialized) return;

    try {
      const supabase = getSupabase();

      const { data: matches, error: mErr } = await supabase
        .from('matches').select('*')
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'accepted')
        .order('updated_at', { ascending: false });

      if (mErr || !matches?.length) { setChats([]); return; }

      const otherIds = matches.map((m: any) =>
        m.requester_id === user.id ? m.receiver_id : m.requester_id
      );

      const { data: profiles } = await supabase
        .from('profiles').select('*').in('id', otherIds);
      const profileMap: Record<string, any> = {};
      (profiles ?? []).forEach((p: any) => { profileMap[p.id] = p; });

      const { data: iBlockedData } = await supabase
        .from('blocked_users').select('blocked_id').eq('blocker_id', user.id);
      const iBlockedSet = new Set((iBlockedData ?? []).map((b: any) => b.blocked_id));

      const { data: theyBlockedData } = await supabase
        .from('blocked_users').select('blocker_id').eq('blocked_id', user.id);
      const theyBlockedSet = new Set((theyBlockedData ?? []).map((b: any) => b.blocker_id));

      const chatList: ChatItem[] = await Promise.all(
        matches.map(async (m: any) => {
          const otherId = m.requester_id === user.id ? m.receiver_id : m.requester_id;
          const { data: lastMsg } = await supabase
            .from('messages').select('content, created_at, sender_id, is_read')
            .eq('match_id', m.id).order('created_at', { ascending: false })
            .limit(1).maybeSingle();
          const { count: unread } = await supabase
            .from('messages').select('*', { count: 'exact', head: true })
            .eq('match_id', m.id).eq('is_read', false).neq('sender_id', user.id);
          return {
            matchId: m.id,
            profile: profileMap[otherId] ?? null,
            lastMessage: lastMsg ?? null,
            unreadCount: unread ?? 0,
            updatedAt: m.updated_at,
            blockedByMe: iBlockedSet.has(otherId),
            blockedByThem: theyBlockedSet.has(otherId),
          };
        })
      );

      chatList.sort((a, b) => {
        const tA = a.lastMessage?.created_at ?? a.updatedAt;
        const tB = b.lastMessage?.created_at ?? b.updatedAt;
        return new Date(tB).getTime() - new Date(tA).getTime();
      });

      setChats(chatList);
    } catch (e: any) {
      console.error('loadChats error:', e.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user, isInitialized]);

  // ── Only start after auth is ready ──────────────────────────────────────
  useEffect(() => {
    if (isInitialized && user) loadChats();
    else if (isInitialized && !user) setIsLoading(false);
  }, [isInitialized, user]);

  useFocusEffect(useCallback(() => {
    if (isInitialized && user) loadChats();
  }, [isInitialized, user]));

  const handleBlock = useCallback(async () => {
    if (!selectedChat || !user) return;
    const otherId = selectedChat.profile?.id;
    const name = selectedChat.profile?.full_name ?? 'this user';
    Alert.alert('🚫 Block User', `Block ${name}?\n\nThey won't be able to send you messages.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block', style: 'destructive',
        onPress: async () => {
          try {
            await getSupabase().from('blocked_users').upsert(
              { blocker_id: user.id, blocked_id: otherId, created_at: new Date().toISOString() },
              { onConflict: 'blocker_id,blocked_id' }
            );
            await loadChats();
            Alert.alert('✅ Blocked', `${name} has been blocked.`);
          } catch (e: any) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  }, [selectedChat, user, loadChats]);

  const handleUnblock = useCallback(async () => {
    if (!selectedChat || !user) return;
    const otherId = selectedChat.profile?.id;
    const name = selectedChat.profile?.full_name ?? 'this user';
    Alert.alert('✅ Unblock User', `Unblock ${name}?\n\nThey can message you again.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unblock',
        onPress: async () => {
          try {
            await getSupabase().from('blocked_users')
              .delete().eq('blocker_id', user.id).eq('blocked_id', otherId);
            await loadChats();
            Alert.alert('✅ Unblocked', `${name} has been unblocked.`);
          } catch (e: any) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  }, [selectedChat, user, loadChats]);

  const handleDelete = useCallback(async () => {
    if (!selectedChat) return;
    const name = selectedChat.profile?.full_name ?? 'this user';
    Alert.alert(
      '🗑️ Delete Chat',
      `Permanently delete chat with ${name}?\n\n• All messages will be removed\n• This cannot be undone`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '🗑️ Delete Permanently', style: 'destructive',
          onPress: async () => {
            try {
              const supabase = getSupabase();
              await supabase.from('messages').delete().eq('match_id', selectedChat.matchId);
              await supabase.from('matches').delete().eq('id', selectedChat.matchId);
              setChats(prev => prev.filter(c => c.matchId !== selectedChat.matchId));
            } catch (e: any) { Alert.alert('Delete Failed', e.message); }
          },
        },
      ]
    );
  }, [selectedChat]);

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const diffH = (Date.now() - date.getTime()) / 3600000;
    if (diffH < 1) { const m = Math.round(diffH * 60); return m < 1 ? 'now' : `${m}m ago`; }
    if (diffH < 24) return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    if (diffH < 48) return 'Yesterday';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const renderItem = ({ item }: { item: ChatItem }) => {
    const isAnyBlocked = item.blockedByMe || item.blockedByThem;
    const hasUnread = item.unreadCount > 0 && !isAnyBlocked;
    const isMyMsg = item.lastMessage?.sender_id === user?.id;
    const preview = item.blockedByMe ? '🚫 You blocked this user'
      : item.blockedByThem ? '🚫 This user blocked you'
      : item.lastMessage ? (isMyMsg ? `You: ${item.lastMessage.content}` : item.lastMessage.content)
      : 'Tap to say hello 👋';

    const openOptions = () => { setSelectedChat(item); setSheetOpen(true); };
    const openChat = () => {
      if (isAnyBlocked) { openOptions(); return; }
      navigation.navigate('Chat', {
        matchId: item.matchId, userId: item.profile?.id,
        userName: item.profile?.full_name ?? 'Chat',
      });
    };

    return (
      <TouchableOpacity
        style={[styles.chatRow, isAnyBlocked && styles.chatRowBlocked]}
        onPress={openChat} onLongPress={openOptions} activeOpacity={0.85}
      >
        <View style={styles.avatarWrap}>
          <Avatar
            uri={item.profile?.avatar_url} name={item.profile?.full_name ?? '?'}
            size={54} showOnline isOnline={!isAnyBlocked && (item.profile?.is_online ?? false)}
          />
          {item.blockedByMe && (
            <View style={styles.blockedBadge}>
              <Text style={{ fontSize: 11 }}>🚫</Text>
            </View>
          )}
        </View>
        <View style={styles.chatContent}>
          <View style={styles.topRow}>
            <Text style={[styles.chatName, hasUnread && styles.chatNameBold, isAnyBlocked && styles.chatNameMuted]} numberOfLines={1}>
              {item.profile?.full_name ?? 'Unknown'}
            </Text>
            <Text style={[styles.chatTime, hasUnread && styles.chatTimePrimary]}>
              {formatTime(item.lastMessage?.created_at ?? item.updatedAt)}
            </Text>
          </View>
          <View style={styles.bottomRow}>
            <Text style={[styles.preview, hasUnread && styles.previewBold, isAnyBlocked && styles.previewMuted]} numberOfLines={1}>
              {preview}
            </Text>
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity style={styles.menuBtn} onPress={openOptions} hitSlop={{ top: 12, bottom: 12, left: 12, right: 4 }}>
          <Text style={styles.menuDot}>⋮</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.matchId}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => { setIsRefreshing(true); loadChats(); }}
            tintColor={Colors.primary} colors={[Colors.primary]}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyTitle}>No chats yet</Text>
            <Text style={styles.emptySub}>Match with people nearby{'\n'}to start chatting</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('Nearby')}>
              <Text style={styles.primaryBtnText}>Find People</Text>
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      />
      <OptionsSheet
        visible={sheetOpen} chat={selectedChat}
        onClose={() => { setSheetOpen(false); setSelectedChat(null); }}
        onBlock={handleBlock} onUnblock={handleUnblock} onDelete={handleDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  chatRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.base, paddingVertical: 14, gap: 12,
  },
  chatRowBlocked: { opacity: 0.6 },
  avatarWrap: { position: 'relative' },
  blockedBadge: {
    position: 'absolute', bottom: -2, right: -4, backgroundColor: '#FFF',
    borderRadius: 9, padding: 1, borderWidth: 1, borderColor: Colors.border,
  },
  chatContent: { flex: 1, gap: 5 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chatName: { fontSize: 15, fontWeight: '500', color: Colors.text, flex: 1, marginRight: 8 },
  chatNameBold: { fontWeight: '700' },
  chatNameMuted: { color: Colors.textMuted },
  chatTime: { fontSize: 12, color: Colors.textMuted },
  chatTimePrimary: { color: Colors.primary, fontWeight: '600' },
  preview: { fontSize: 13, color: Colors.textSecondary, flex: 1, marginRight: 8 },
  previewBold: { color: Colors.text, fontWeight: '600' },
  previewMuted: { color: Colors.textMuted, fontStyle: 'italic' },
  unreadBadge: {
    backgroundColor: Colors.primary, borderRadius: 10, minWidth: 20, height: 20,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  unreadText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  menuBtn: { paddingLeft: 8, paddingVertical: 4 },
  menuDot: { fontSize: 22, color: Colors.textMuted },
  sep: { height: 1, backgroundColor: Colors.border, marginLeft: Spacing.base + 54 + 12 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12,
  },
  handle: {
    width: 36, height: 4, backgroundColor: Colors.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  sheetUser: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  sheetName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  sheetHandle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  sheetDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 8 },
  sheetItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  sheetIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sheetItemText: { flex: 1 },
  sheetItemTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  sheetItemSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  cancelBtn: { marginTop: 8, backgroundColor: Colors.background, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: Colors.text },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 32, gap: 12 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  primaryBtn: { marginTop: 8, backgroundColor: Colors.primary, paddingHorizontal: 32, paddingVertical: 13, borderRadius: 24 },
  primaryBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});