// src/navigation/AppNavigator.tsx
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NearbyScreen } from '@/features/nearby/screens/NearbyScreen';
import { MatchesScreen } from '@/features/matching/screens/MatchesScreen';
import { ChatListScreen } from '@/features/chat/screens/ChatListScreen';
import { ChatScreen } from '@/features/chat/screens/ChatScreen';
import { ProfileScreen } from '@/features/profile/screens/ProfileScreen';
import { EditProfileScreen } from '@/features/profile/screens/EditProfileScreen';
import { SettingsScreen } from '@/features/settings/screens/SettingsScreen';

import { AppStackParamList, AppTabParamList } from './types';
import { useMatchStore } from '@/stores/matchStore';
import { useAuthStore } from '@/stores/authStore';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const NAV = {
  bg:          '#FFFFFF',
  pill:        '#F4F6F9',
  activeTab:   '#FFFFFF',
  activeTint:  '#6C63FF',
  inactiveTint:'#9CA3AF',
  border:      '#EDEFF2',
  badge:       '#6C63FF',
  headerBg:    '#FFFFFF',
  headerText:  '#1A1A2E',
  headerTint:  '#6C63FF',
  shadow:      '#6C63FF',
};

// ─── Tab config ───────────────────────────────────────────────────────────────
const TABS: Record<string, { label: string; icon: string; activeIcon: string }> = {
  Nearby:   { label: 'Nearby',   icon: '🧭', activeIcon: '🧭' },
  Matches:  { label: 'Matches',  icon: '🤍', activeIcon: '❤️' },
  ChatList: { label: 'Chats',    icon: '💬', activeIcon: '💬' },
  Profile:  { label: 'Profile',  icon: '👤', activeIcon: '👤' },
};

// ─── Custom Tab Bar ───────────────────────────────────────────────────────────
function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { pendingRequests } = useMatchStore();
  const { profile } = useAuthStore();

  const getBadge = (name: string) => {
    if (name === 'Matches') return pendingRequests.length;
    return 0;
  };

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom || 12 }]}>
      {/* Top border line */}
      <View style={styles.topBorder} />

      <View style={styles.pill}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const tab = TABS[route.name];
          const badge = getBadge(route.name);

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.7}
              style={[styles.tab, focused && styles.tabActive]}
            >
              {/* Icon container */}
              <View style={styles.iconWrap}>
                <Text style={[styles.icon, focused && styles.iconActive]}>
                  {focused ? tab?.activeIcon : tab?.icon}
                </Text>

                {/* Badge */}
                {badge > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {badge > 99 ? '99+' : badge}
                    </Text>
                  </View>
                )}
              </View>

              {/* Label */}
              <Text style={[styles.label, focused && styles.labelActive]}>
                {tab?.label}
              </Text>

              {/* Active underline dot */}
              {focused && <View style={styles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Navigators ───────────────────────────────────────────────────────────────
const Tab = createBottomTabNavigator<AppTabParamList>();
const Stack = createNativeStackNavigator<AppStackParamList>();

const HEADER_OPTIONS = {
  headerStyle: {
    backgroundColor: NAV.headerBg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
    }),
  },
  headerTitleStyle: {
    color: NAV.headerText,
    fontWeight: '700' as const,
    fontSize: 18,
  },
  headerTintColor: NAV.headerTint,
  headerShadowVisible: true,
};

function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={HEADER_OPTIONS}
    >
      <Tab.Screen name="Nearby"   component={NearbyScreen}   options={{ title: 'Nearby' }} />
      <Tab.Screen name="Matches"  component={MatchesScreen}  options={{ title: 'Matches' }} />
      <Tab.Screen name="ChatList" component={ChatListScreen} options={{ title: 'Chats' }} />
      <Tab.Screen name="Profile"  component={ProfileScreen}  options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Tabs"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }) => ({
          ...HEADER_OPTIONS,
          title: route.params.userName,
        })}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ ...HEADER_OPTIONS, title: 'Edit Profile' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ ...HEADER_OPTIONS, title: 'Settings' }}
      />
    </Stack.Navigator>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: NAV.bg,
    paddingTop: 0,
    paddingHorizontal: 16,
  },
  topBorder: {
    height: 1,
    backgroundColor: NAV.border,
    marginBottom: 8,
  },
  pill: {
    flexDirection: 'row',
    backgroundColor: NAV.pill,
    borderRadius: 20,
    padding: 5,
    gap: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 15,
    gap: 2,
    position: 'relative',
  },
  tabActive: {
    backgroundColor: NAV.activeTab,
    ...Platform.select({
      ios: {
        shadowColor: NAV.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
    }),
  },
  iconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 22,
    opacity: 0.45,
  },
  iconActive: {
    opacity: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: NAV.inactiveTint,
    letterSpacing: 0.1,
  },
  labelActive: {
    color: NAV.activeTint,
    fontWeight: '700',
  },
  activeDot: {
    position: 'absolute',
    bottom: -3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: NAV.activeTint,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -9,
    backgroundColor: NAV.badge,
    borderRadius: 9,
    minWidth: 17,
    height: 17,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: NAV.pill,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
});