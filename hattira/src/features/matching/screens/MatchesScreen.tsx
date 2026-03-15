// src/features/matching/screens/MatchesScreen.tsx
import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, Animated, PanResponder, RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '@/stores/authStore';
import { getSupabase } from '@/config/supabase';
import { Avatar } from '@/components/common/Avatar';
import { Colors } from '@/theme/colors';
import { Spacing } from '@/theme/spacing';
import { Theme } from '@/theme';

// ─── Swipeable Row ─────────────────────────────────────────────────────────
function SwipeRow({ item, onPress, onDelete }: {
  item: any; onPress: () => void; onDelete: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;

  const pan = PanResponder.create({
    onMoveShouldSetPanResponder: (_, { dx, dy }) =>
      Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8,
    onPanResponderMove: (_, { dx }) => {
      if (dx < 0) translateX.setValue(Math.max(dx, -90));
    },
    onPanResponderRelease: (_, { dx }) => {
      Animated.spring(translateX, {
        toValue: dx < -50 ? -80 : 0,
        useNativeDriver: true, tension: 80, friction: 8,
      }).start();
    },
  });

  const close = () =>
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();

  const p = item.otherProfile;

  return (
    <View style={styles.swipeWrap}>
      <View style={styles.deleteBg}>
        <TouchableOpacity style={styles.deleteAction} onPress={() => { close(); onDelete(); }}>
          <Text style={styles.deleteIcon}>🗑️</Text>
          <Text style={styles.deleteLabel}>Delete</Text>
        </TouchableOpacity>
      </View>
      <Animated.View style={{ transform: [{ translateX }] }} {...pan.panHandlers}>
        <TouchableOpacity style={styles.matchRow} onPress={onPress} activeOpacity={0.85}>
          <Avatar
            uri={p?.avatar_url} name={p?.full_name ?? '?'}
            size={52} showOnline isOnline={p?.is_online ?? false}
          />
          <View style={styles.matchInfo}>
            <Text style={styles.matchName} numberOfLines={1}>{p?.full_name ?? 'Unknown'}</Text>
            <Text style={styles.matchHandle} numberOfLines={1}>@{p?.username ?? '—'}</Text>
            {!!p?.bio && <Text style={styles.matchBio} numberOfLines={1}>{p.bio}</Text>}
          </View>
          <View style={styles.matchRight}>
            <Text style={{ fontSize: 22 }}>💬</Text>
            <Text style={styles.swipeHint}>swipe ←</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────
export function MatchesScreen() {
  const navigation = useNavigation<any>();
  const { user, isInitialized } = useAuthStore();
  const [matches, setMatches] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    // ── CRITICAL: don't fetch until auth is ready ────────────────────────
    if (!user || !isInitialized) return;

    try {
      const supabase = getSupabase();

      const { data: matchData, error: mErr } = await supabase
        .from('matches')
        .select('*')
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'accepted')
        .order('updated_at', { ascending: false });

      if (mErr) throw mErr;

      const otherIds = (matchData ?? []).map((m: any) =>
        m.requester_id === user.id ? m.receiver_id : m.requester_id
      );

      const profileMap: Record<string, any> = {};
      if (otherIds.length > 0) {
        const { data: pData } = await supabase
          .from('profiles').select('*').in('id', otherIds);
        (pData ?? []).forEach((p: any) => { profileMap[p.id] = p; });
      }

      setMatches((matchData ?? []).map((m: any) => ({
        ...m,
        otherProfile: profileMap[
          m.requester_id === user.id ? m.receiver_id : m.requester_id
        ] ?? null,
      })));

      const { data: pendingData, error: pErr } = await supabase
        .from('matches')
        .select('*, profiles!matches_requester_id_fkey(*)')
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (pErr) throw pErr;
      setPending(pendingData ?? []);
    } catch (e: any) {
      console.error('MatchesScreen fetchAll error:', e.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user, isInitialized]);

  // ── Only start fetching AFTER auth is initialized ────────────────────────
  useEffect(() => {
    if (isInitialized && user) fetchAll();
    else if (isInitialized && !user) setIsLoading(false);
  }, [isInitialized, user]);

  useFocusEffect(useCallback(() => {
    if (isInitialized && user) fetchAll();
  }, [isInitialized, user]));

  const handleAccept = async (matchId: string) => {
    try {
      await getSupabase().from('matches')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', matchId);
      fetchAll();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleReject = async (matchId: string) => {
    try {
      await getSupabase().from('matches')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', matchId);
      fetchAll();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleDelete = useCallback((match: any) => {
    const name = match.otherProfile?.full_name ?? 'this user';
    Alert.alert(
      '🗑️ Delete Match',
      `Permanently delete ${name}?\n\n• All messages will be removed\n• This cannot be undone`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '🗑️ Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(match.id);
            try {
              const supabase = getSupabase();
              await supabase.from('messages').delete().eq('match_id', match.id);
              const { error } = await supabase.from('matches').delete().eq('id', match.id);
              if (error) throw new Error(error.message);
              setMatches(prev => prev.filter(m => m.id !== match.id));
            } catch (e: any) {
              Alert.alert('Delete Failed', e.message);
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  }, []);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading matches... {"\n"} is still loading close the app and reopen</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => { setIsRefreshing(true); fetchAll(); }}
            tintColor={Colors.primary} colors={[Colors.primary]}
          />
        }
        ListHeaderComponent={() => (
          <>
            {pending.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>CONNECTION REQUESTS</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{pending.length}</Text>
                  </View>
                </View>
                {pending.map((item: any) => {
                  const requester = item.profiles;
                  return (
                    <View key={item.id} style={styles.pendingCard}>
                      <Avatar
                        uri={requester?.avatar_url} name={requester?.full_name ?? '?'}
                        size={48} showOnline isOnline={requester?.is_online ?? false}
                      />
                      <View style={styles.pendingInfo}>
                        <Text style={styles.matchName} numberOfLines={1}>
                          {requester?.full_name ?? 'Someone'}
                        </Text>
                        <Text style={styles.pendingSub}>wants to connect with you</Text>
                      </View>
                      <View style={styles.pendingBtns}>
                        <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(item.id)}>
                          <Text style={styles.acceptText}>✓</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item.id)}>
                          <Text style={styles.rejectText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
            {matches.length > 0 && (
              <View style={styles.matchesHeader}>
                <Text style={styles.sectionTitle}>MY MATCHES ({matches.length})</Text>
                <Text style={styles.swipeTip}>← swipe to delete</Text>
              </View>
            )}
          </>
        )}
        renderItem={({ item }) => {
          if (deletingId === item.id) {
            return (
              <View style={styles.deletingRow}>
                <ActivityIndicator size="small" color="#EF4444" />
                <Text style={styles.deletingText}>Deleting permanently...</Text>
              </View>
            );
          }
          return (
            <SwipeRow
              item={item}
              onPress={() => navigation.navigate('Chat', {
                matchId: item.id,
                userId: item.otherProfile?.id,
                userName: item.otherProfile?.full_name ?? 'Chat',
              })}
              onDelete={() => handleDelete(item)}
            />
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🤝</Text>
            <Text style={styles.emptyTitle}>No matches yet</Text>
            <Text style={styles.emptySub}>Go online and connect with people nearby</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('Nearby')}>
              <Text style={styles.primaryBtnText}>Find People</Text>
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: Colors.textSecondary },
  section: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.base, marginTop: Spacing.base,
    borderRadius: Theme.borderRadius.lg, overflow: 'hidden',
    marginBottom: Spacing.base, ...Theme.shadow.sm,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: Spacing.md, paddingBottom: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 1 },
  badge: {
    backgroundColor: Colors.primary, borderRadius: 9,
    minWidth: 20, height: 20, alignItems: 'center',
    justifyContent: 'center', paddingHorizontal: 5,
  },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  matchesHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
  },
  swipeTip: { fontSize: 11, color: Colors.textMuted },
  sep: { height: 1, backgroundColor: Colors.border, marginLeft: Spacing.base + 52 + Spacing.md },
  pendingCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.md, gap: Spacing.md, backgroundColor: Colors.surface,
  },
  pendingInfo: { flex: 1 },
  pendingSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  pendingBtns: { flexDirection: 'row', gap: 8 },
  acceptBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center',
  },
  acceptText: { color: '#065F46', fontSize: 18, fontWeight: '700' },
  rejectBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center',
  },
  rejectText: { color: '#991B1B', fontSize: 18, fontWeight: '700' },
  swipeWrap: { position: 'relative', backgroundColor: Colors.background },
  deleteBg: {
    position: 'absolute', right: 0, top: 0, bottom: 0, width: 80,
    backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center',
  },
  deleteAction: { alignItems: 'center', gap: 2 },
  deleteIcon: { fontSize: 20 },
  deleteLabel: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  matchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, gap: Spacing.md,
  },
  matchInfo: { flex: 1 },
  matchName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  matchHandle: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  matchBio: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  matchRight: { alignItems: 'center', gap: 4 },
  swipeHint: { fontSize: 9, color: Colors.textMuted },
  deletingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FEF2F2', paddingVertical: 18, gap: 10,
  },
  deletingText: { fontSize: 14, color: '#EF4444', fontWeight: '600' },
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingTop: 80, paddingHorizontal: 32, gap: 12,
  },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  primaryBtn: {
    marginTop: 8, backgroundColor: Colors.primary,
    paddingHorizontal: 32, paddingVertical: 13, borderRadius: 24,
  },
  primaryBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});