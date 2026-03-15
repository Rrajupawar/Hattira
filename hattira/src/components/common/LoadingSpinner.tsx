// src/components/common/LoadingSpinner.tsx
import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Colors } from '@/theme/colors';
import { Typography } from '@/theme/typography';

interface Props {
  size?: 'small' | 'large';
  label?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ size = 'large', label, fullScreen = false }: Props) {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size={size} color={Colors.primary} />
      {label && <Text style={styles.label}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
  },
});