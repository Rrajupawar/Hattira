// src/components/common/Avatar.tsx
import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/theme/colors';
import { Typography } from '@/theme/typography';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
  showOnline?: boolean;
  isOnline?: boolean;
  style?: ViewStyle;
}

export function Avatar({ uri, name, size = 44, showOnline = false, isOnline = false, style }: AvatarProps) {
  const initials = name
    ? name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  const fontSize = size * 0.35;
  const badgeSize = size * 0.28;
  const badgeOffset = size * 0.04;

  return (
    <View style={[{ width: size, height: size }, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: Colors.primary,
            },
          ]}
        >
          <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
        </View>
      )}
      {showOnline && (
        <View
          style={[
            styles.badge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              backgroundColor: isOnline ? Colors.online : Colors.offline,
              bottom: badgeOffset,
              right: badgeOffset,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: Colors.white,
    fontWeight: Typography.fontWeight.bold,
  },
  badge: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: Colors.white,
  },
});