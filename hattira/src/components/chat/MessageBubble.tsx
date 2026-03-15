// src/components/chat/MessageBubble.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Message } from '@/config/supabase';
import { Colors } from '@/theme/colors';
import { Typography } from '@/theme/typography';
import { Spacing } from '@/theme/spacing';
import { Theme } from '@/theme';

interface Props {
  message: Message;
  isMine: boolean;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function MessageBubble({ message, isMine }: Props) {
  return (
    <View style={[styles.row, isMine ? styles.rowRight : styles.rowLeft]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
        <Text style={[styles.content, isMine ? styles.contentMine : styles.contentOther]}>
          {message.content}
        </Text>
        <View style={styles.meta}>
          <Text style={[styles.time, isMine ? styles.timeMine : styles.timeOther]}>
            {formatTime(message.created_at)}
          </Text>
          {isMine && (
            <Text style={styles.seenIcon}>{message.is_seen ? '✓✓' : '✓'}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginVertical: 2, paddingHorizontal: Spacing.md },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '78%',
    borderRadius: Theme.borderRadius.lg,
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  bubbleMine: {
    backgroundColor: Colors.chatBubbleSent,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: Colors.chatBubbleReceived,
    borderBottomLeftRadius: 4,
  },
  content: { fontSize: Typography.fontSize.base, lineHeight: 20 },
  contentMine: { color: Colors.chatBubbleSentText },
  contentOther: { color: Colors.chatBubbleReceivedText },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 },
  time: { fontSize: Typography.fontSize.xs },
  timeMine: { color: 'rgba(255,255,255,0.7)' },
  timeOther: { color: Colors.textMuted },
  seenIcon: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.9)' },
});