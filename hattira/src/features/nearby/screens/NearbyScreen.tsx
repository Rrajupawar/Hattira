// src/features/nearby/screens/NearbyScreen.tsx
import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '@/stores/authStore';
import { useMatchStore } from '@/stores/matchStore';
import { useLocationStore } from '@/stores/locationStore';
import { useLocation } from '@/hooks/useLocation';
import { supabase } from '@/config/supabase';
import { matchService } from '@/features/matching/services/matchService';
import { Avatar } from '@/components/common/Avatar';
import { Colors } from '@/theme/colors';
import { Typography } from '@/theme/typography';
import { Spacing } from '@/theme/spacing';
import { Theme } from '@/theme';
import { locationService } from '../services/locationService';

const RADIUS_OPTIONS = [
  { label: '100 m', value: 0.1 },
  { label: '200 m', value: 0.2 },
];

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function NearbyScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { radiusKm, setRadiusKm } = useMatchStore();
  const { isOnline, isLoadingLocation, currentLocation, locationError } = useLocationStore();
  const { goOnline, goOffline } = useLocation();

  const [nearbyUsers, setNearbyUsers] = useState<any[]>([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Show location error
  useEffect(() => {
    if (locationError) {
      Alert.alert('Location Error', locationError);
    }
  }, [locationError]);

  // Fetch nearby when online or radius changes
  useEffect(() => {
    if (isOnline && currentLocation) {
      fetchNearby();
      // Auto-refresh every 30 seconds
      refreshTimer.current = setInterval(fetchNearby, 30000);
    } else {
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current);
        refreshTimer.current = null;
      }
      if (!isOnline) setNearbyUsers([]);
    }
    return () => {
      if (refreshTimer.current) clearInterval(refreshTimer.current);
    };
  }, [isOnline, radiusKm, currentLocation]);

  const fetchNearby = useCallback(async () => {
    if (!user || !currentLocation) return;
    setIsLoadingNearby(true);
    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

      const { data: locations, error: locErr } = await supabase
        .from('user_locations')
        .select('*')
        .neq('user_id', user.id)
        .gte('updated_at', tenMinutesAgo);

      if (locErr || !locations?.length) {
        setNearbyUsers([]);
        return;
      }

      const nearbyIds: string[] = [];
      const distMap: Record<string, number> = {};

      for (const loc of locations) {
        const dist = haversineKm(
          currentLocation.latitude, currentLocation.longitude,
          loc.latitude, loc.longitude
        );
        if (dist <= radiusKm) {
          nearbyIds.push(loc.user_id);
          distMap[loc.user_id] = dist;
        }
      }

      if (!nearbyIds.length) {
        setNearbyUsers([]);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', nearbyIds)
        .eq('is_online', true);

      const users = (profiles ?? [])
        .map((p: any) => ({ ...p, distance: distMap[p.id] ?? 999 }))
        .sort((a: any, b: any) => a.distance - b.distance);

      setNearbyUsers(users);
    } catch (e: any) {
      console.error('fetchNearby error:', e.message);
    } finally {
      setIsLoadingNearby(false);
    }
  }, [user, currentLocation, radiusKm]);

  const handleToggle = useCallback(async () => {
    if (isToggling || isLoadingLocation) return;
    setIsToggling(true);
    try {
      if (isOnline) {
        await goOffline();
        setNearbyUsers([]);
      } else {
        await goOnline();
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong');
    } finally {
      setIsToggling(false);
    }
  }, [isOnline, isToggling, isLoadingLocation, goOnline, goOffline]);

  const handleConnect = useCallback(async (targetUser: any) => {
    if (!user || sentIds.has(targetUser.id)) return;
    try {
      await matchService.sendRequest(user.id, targetUser.id);
      setSentIds((prev) => new Set(prev).add(targetUser.id));
      Alert.alert(
        '✅ Request Sent',
        `Connection request sent to ${targetUser.full_name}`,
        [
          { text: 'View Matches', onPress: () => navigation.navigate('Matches') },
          { text: 'Stay Here', style: 'cancel' },
        ]
      );
    } catch (error: any) {
      if (error.code === '23505') {
        setSentIds((prev) => new Set(prev).add(targetUser.id));
      } else {
        Alert.alert('Error', error.message);
      }
    }
  }, [user, sentIds, navigation]);

  const handleDebug = useCallback(async () => {
    try {
      const { data: locs } = await supabase.from('user_locations').select('*');
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name, is_online');

      Alert.alert(
        '🔍 Debug',
        `📍 Locations: ${locs?.length ?? 0}\n` +
        `${(locs ?? []).map((l: any) =>
          `• ${l.user_id.slice(0, 8)}: ${Number(l.latitude).toFixed(4)}, ${Number(l.longitude).toFixed(4)}`
        ).join('\n')}\n\n` +
        `👥 Profiles: ${profs?.length ?? 0}\n` +
        `${(profs ?? []).map((p: any) =>
          `• ${p.full_name}: ${p.is_online ? '🟢' : '⚪'}`
        ).join('\n')}\n\n` +
        `📏 Radius: ${radiusKm < 1 ? `${Math.round(radiusKm * 1000)}m` : `${radiusKm}km`}\n` +
        `📌 My location: ${currentLocation ? `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}` : 'Not set'}`
      );
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }, [radiusKm, currentLocation]);

  const isDisabled = isToggling || isLoadingLocation;

  const renderUser = useCallback(({ item, index }: { item: any; index: number }) => {
    const alreadySent = sentIds.has(item.id);
    return (
      <View style={styles.userCard}>
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>{index + 1}</Text>
        </View>
        <Avatar
          uri={item.avatar_url}
          name={item.full_name}
          size={52}
          showOnline
          isOnline={item.is_online}
        />
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {item.full_name}
          </Text>
          <Text style={styles.userHandle} numberOfLines={1}>
            @{item.username}
          </Text>
          {!!item.bio && (
            <Text style={styles.userBio} numberOfLines={1}>
              {item.bio}
            </Text>
          )}
          <View style={styles.distRow}>
            <View style={styles.distDot} />
            <Text style={styles.distText}>{formatDistance(item.distance)}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.connectBtn, alreadySent && styles.connectBtnSent]}
          onPress={() => handleConnect(item)}
          disabled={alreadySent}
          activeOpacity={0.8}
        >
          <Text style={[styles.connectText, alreadySent && styles.connectTextSent]}>
            {alreadySent ? '✓ Sent' : 'Connect'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }, [sentIds, handleConnect]);

  const renderHeader = () => (
    <>
      {/* Online Toggle */}
      <View style={styles.onlineCard}>
        <View style={styles.onlineLeft}>
          <View style={[
            styles.statusCircle,
            { backgroundColor: isOnline ? '#D1FAE5' : '#F3F4F6' },
          ]}>
            {isDisabled
              ? <ActivityIndicator size="small" color={Colors.primary} />
              : <View style={[
                  styles.statusDot,
                  { backgroundColor: isOnline ? '#10B981' : '#9CA3AF' },
                ]} />
            }
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusTitle}>
              {isDisabled
                ? isOnline ? 'Going offline...' : 'Going online...'
                : isOnline ? '🟢 You are Online'
                : '⚪ You are Offline'}
            </Text>
            <Text style={styles.statusSub}>
              {isDisabled
                ? 'Getting your location...'
                : isOnline
                ? `${nearbyUsers.length} people within ${radiusKm < 1 ? `${Math.round(radiusKm * 1000)}m` : `${radiusKm}km`}`
                : 'Toggle to discover nearby people'}
            </Text>
          </View>
        </View>
        <Switch
          value={isOnline}
          onValueChange={handleToggle}
          trackColor={{ false: Colors.border, true: Colors.primary }}
          thumbColor="#FFFFFF"
          disabled={isDisabled}
        />
      </View>

      {/* Radius */}
      <View style={styles.radiusSection}>
        <Text style={styles.radiusLabel}>SEARCH RADIUS</Text>
        <View style={styles.radiusRow}>
          {RADIUS_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.radiusChip, radiusKm === opt.value && styles.radiusChipActive]}
              onPress={() => setRadiusKm(opt.value)}
            >
              <Text style={[styles.radiusChipText, radiusKm === opt.value && styles.radiusChipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>


      {/* Section header */}
      {isOnline && nearbyUsers.length > 0 && (
        <View style={styles.listHeader}>
          <Text style={styles.listHeaderText}>NEARBY PEOPLE</Text>
          <Text style={styles.listHeaderCount}>{nearbyUsers.length} found</Text>
        </View>
      )}
    </>
  );

  // OFFLINE
  if (!isOnline && !isDisabled) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📡</Text>
          <Text style={styles.emptyTitle}>You are Offline</Text>
          <Text style={styles.emptySub}>
            Toggle the switch to go online{'\n'}and discover people nearby
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleToggle}>
            <Text style={styles.primaryBtnText}>Go Online</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // TOGGLING / LOADING
  if (isDisabled) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.emptyTitle}>Getting your location...</Text>
          <Text style={styles.emptySub}>Please wait a moment</Text>
        </View>
      </View>
    );
  }

  // ONLINE
  return (
    <View style={styles.container}>
      <FlatList
        data={nearbyUsers}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingNearby}
            onRefresh={fetchNearby}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        ListEmptyComponent={
          isLoadingNearby ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.emptySub}>Searching nearby...</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🏜️</Text>
              <Text style={styles.emptyTitle}>No one nearby</Text>
              <Text style={styles.emptySub}>
                No one found within{' '}
                {radiusKm < 1 ? `${Math.round(radiusKm * 1000)}m` : `${radiusKm}km`}.{'\n'}
                Try the debug button to check DB.
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={fetchNearby}>
                <Text style={styles.primaryBtnText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          )
        }
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Online card
  onlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: Spacing.base,
    padding: Spacing.base,
    backgroundColor: Colors.surface,
    borderRadius: Theme.borderRadius.lg,
    ...Theme.shadow.sm,
  },
  onlineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  statusCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: { width: 14, height: 14, borderRadius: 7 },
  statusTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Colors.text,
  },
  statusSub: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Radius
  radiusSection: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  radiusLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  radiusRow: { flexDirection: 'row', gap: Spacing.sm },
  radiusChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  radiusChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  radiusChipText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  radiusChipTextActive: { color: '#FFFFFF' },

  // Debug
  debugBtn: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    padding: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: '#FCD34D',
    alignItems: 'center',
  },
  debugText: { fontSize: 13, color: '#92400E', fontWeight: '600' },

  // List header
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  listHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  listHeaderCount: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
  },
  sep: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.base,
  },

  // User card
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  rankBadge: { width: 20, alignItems: 'center' },
  rankText: { fontSize: 11, color: Colors.textMuted, fontWeight: '700' },
  userInfo: { flex: 1, gap: 2 },
  userName: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Colors.text,
  },
  userHandle: { fontSize: 12, color: Colors.textMuted },
  userBio: { fontSize: 12, color: Colors.textSecondary },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  distDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  distText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },

  connectBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  connectBtnSent: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  connectText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  connectTextSent: { color: Colors.textSecondary },

  // Empty
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: Spacing.md,
  },
  emptyEmoji: { fontSize: 56, marginBottom: 8 },
  emptyTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  primaryBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: Spacing.md,
    borderRadius: 24,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
  },
});