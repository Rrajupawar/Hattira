// src/features/profile/screens/ProfileScreen.tsx
import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { Avatar } from '@/components/common/Avatar';
import { Colors } from '@/theme/colors';
import { Spacing } from '@/theme/spacing';
import { Theme } from '@/theme';

export function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuthStore();
  const { profile, isLoading, fetchProfile } = useProfileStore();

  // Fetch on focus — uses profileStore so it doesn't re-fetch if already loaded
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchProfile(user.id);
      }
    }, [user?.id])
  );

  const handleRefresh = useCallback(() => {
    if (user?.id) fetchProfile(user.id);
  }, [user?.id]);

  const handleLogout = useCallback(() => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive',
        onPress: async () => {
          try { await logout(); } catch (e: any) { console.error(e.message); }
        },
      },
    ]);
  }, [logout]);

  // Loading state
  if (isLoading && !profile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading profile...{"\n"} is still loading close the app and reopen</Text>
      </View>
    );
  }

  // No profile
  if (!profile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorEmoji}>😕</Text>
        <Text style={styles.errorTitle}>Profile not found</Text>
        <Text style={styles.errorSub}>Check your internet connection</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => user?.id && fetchProfile(user.id)}
        >
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutSmall} onPress={handleLogout}>
          <Text style={styles.logoutSmallText}>Logout</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={handleRefresh}
          tintColor={Colors.primary}
          colors={[Colors.primary]}
        />
      }
    >
      {/* Header card */}
      <View style={styles.headerCard}>
        <Avatar
          uri={profile.avatar_url}
          name={profile.full_name}
          size={96}
          showOnline
          isOnline={profile.is_online}
        />
        <Text style={styles.name}>{profile.full_name}</Text>
        <Text style={styles.username}>@{profile.username}</Text>
        {!!profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
        <View style={[
          styles.statusBadge,
          { backgroundColor: profile.is_online ? '#D1FAE5' : '#F3F4F6' },
        ]}>
          <View style={[
            styles.statusDot,
            { backgroundColor: profile.is_online ? '#10B981' : '#9CA3AF' },
          ]} />
          <Text style={[
            styles.statusText,
            { color: profile.is_online ? '#065F46' : '#6B7280' },
          ]}>
            {profile.is_online ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate('EditProfile')}
          activeOpacity={0.85}
        >
          <Text style={styles.editBtnText}>✏️  Edit Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.85}
        >
          <Text style={styles.settingsBtnText}>⚙️  Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Info card */}
      <View style={styles.infoCard}>
        <InfoRow label="Email" value={user?.email ?? '—'} />
        <View style={styles.divider} />
        <InfoRow
          label="Member since"
          value={profile.created_at
            ? new Date(profile.created_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric',
              })
            : '—'}
        />
        <View style={styles.divider} />
        <InfoRow
          label="Last active"
          value={profile.last_active
            ? new Date(profile.last_active).toLocaleString('en-IN', {
                day: 'numeric', month: 'short',
                hour: '2-digit', minute: '2-digit',
              })
            : 'Just now'}
        />
      </View>

      {/* Logout */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleLogout}
        activeOpacity={0.85}
      >
        <Text style={styles.logoutText}>🚪  Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.background, padding: 32, gap: 12,
  },
  loadingText: { fontSize: 14, color: Colors.textSecondary, marginTop: 8 },
  errorEmoji: { fontSize: 52 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  errorSub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 36, paddingVertical: 13,
    borderRadius: 24, marginTop: 8,
  },
  retryText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  logoutSmall: { marginTop: 8, padding: 10 },
  logoutSmallText: { color: '#EF4444', fontSize: 14, fontWeight: '600' },

  headerCard: {
    alignItems: 'center', padding: 28,
    backgroundColor: Colors.surface,
    margin: Spacing.base,
    borderRadius: Theme.borderRadius.xl,
    ...Theme.shadow.sm, gap: 8,
  },
  name: { fontSize: 22, fontWeight: '700', color: Colors.text, marginTop: 6 },
  username: { fontSize: 14, color: Colors.textSecondary },
  bio: {
    fontSize: 14, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 20, paddingHorizontal: 16,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, marginTop: 4,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },

  actions: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: Spacing.base, marginBottom: Spacing.base,
  },
  editBtn: {
    flex: 1, backgroundColor: Colors.primary,
    paddingVertical: 14, borderRadius: 12, alignItems: 'center',
  },
  editBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  settingsBtn: {
    flex: 1, backgroundColor: Colors.surface,
    paddingVertical: 14, borderRadius: 12, alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border,
  },
  settingsBtnText: { color: Colors.text, fontSize: 15, fontWeight: '600' },

  infoCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.base, marginBottom: Spacing.base,
    borderRadius: 12, ...Theme.shadow.sm, overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
  },
  infoLabel: { fontSize: 14, color: Colors.textSecondary },
  infoValue: {
    fontSize: 14, color: Colors.text, fontWeight: '600',
    maxWidth: '60%', textAlign: 'right',
  },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 16 },

  logoutBtn: {
    marginHorizontal: Spacing.base, marginBottom: Spacing.base,
    backgroundColor: '#FEF2F2', paddingVertical: 14,
    borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#FECACA',
  },
  logoutText: { color: '#DC2626', fontSize: 15, fontWeight: '600' },
});