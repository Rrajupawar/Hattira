// src/components/chat/TypingIndicator.tsx
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Colors } from '@/theme/colors';
import { Spacing } from '@/theme/spacing';
import { Theme } from '@/theme';

export function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ])
      );

    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 200);
    const a3 = animate(dot3, 400);

    a1.start(); a2.start(); a3.start();

    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  const makeDot = (anim: Animated.Value) => (
    <Animated.View
      style={[
        styles.dot,
        {
          transform: [{
            translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }),
          }],
          opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
        },
      ]}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        {makeDot(dot1)}
        {makeDot(dot2)}
        {makeDot(dot3)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: Spacing.md, paddingVertical: 4, alignItems: 'flex-start' },
  bubble: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: Colors.chatBubbleReceived,
    borderRadius: Theme.borderRadius.lg,
    borderBottomLeftRadius: 4,
    padding: Spacing.md,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textSecondary,
  },
});