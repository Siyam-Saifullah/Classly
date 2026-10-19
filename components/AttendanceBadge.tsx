// ============================================================
// AttendanceBadge — Visual attendance status indicator
// Shows color + icon + text (never just color alone).
// ============================================================
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { AttendanceStatusLevel } from '@/types';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  status: AttendanceStatusLevel;
  percentage: number;
  size?: 'sm' | 'md' | 'lg';
}

const STATUS_CONFIG: Record<
  AttendanceStatusLevel,
  { label: string; emoji: string }
> = {
  safe: { label: 'Safe', emoji: '🟢' },
  warning: { label: 'Warning', emoji: '🟡' },
  critical: { label: 'Critical', emoji: '🔴' },
};

export function AttendanceBadge({ status, percentage, size = 'md' }: Props) {
  const theme = useTheme();
  const config = STATUS_CONFIG[status];

  const bgColor =
    status === 'safe'
      ? theme.semantic.safeLight
      : status === 'warning'
      ? theme.semantic.warningLight
      : theme.semantic.criticalLight;

  const textColor =
    status === 'safe'
      ? theme.semantic.safe
      : status === 'warning'
      ? theme.semantic.warning
      : theme.semantic.critical;

  const fontSize =
    size === 'sm' ? 11 : size === 'md' ? 13 : 15;

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <Text style={{ fontSize: fontSize + 2 }}>{config.emoji}</Text>
      <Text style={[styles.pct, { color: textColor, fontSize }]}>
        {percentage.toFixed(1)}%
      </Text>
      <Text style={[styles.label, { color: textColor, fontSize: fontSize - 1 }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 4,
  },
  pct: {
    fontWeight: '700',
  },
  label: {
    fontWeight: '500',
    opacity: 0.85,
  },
});
