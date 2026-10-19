// ============================================================
// ProgressBar — Attendance progress bar with semantic color
// ============================================================
import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { AttendanceStatusLevel } from '@/types';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  percentage: number;       // 0–100
  status?: AttendanceStatusLevel;
  height?: number;
  showRequirementLine?: boolean;
  requirement?: number;     // 0–100, draws a marker line
}

export function ProgressBar({
  percentage,
  status = 'safe',
  height = 8,
  showRequirementLine = false,
  requirement = 60,
}: Props) {
  const theme = useTheme();

  const fillColor =
    status === 'safe'
      ? theme.semantic.safe
      : status === 'warning'
      ? theme.semantic.warning
      : theme.semantic.critical;

  const clampedPct = Math.min(100, Math.max(0, percentage));

  return (
    <View style={[styles.track, { height, backgroundColor: theme.colors.border }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${clampedPct}%`,
            backgroundColor: fillColor,
            height,
          },
        ]}
      />
      {showRequirementLine && (
        <View
          style={[
            styles.requirementLine,
            {
              left: `${requirement}%`,
              height: height + 6,
              top: -3,
              backgroundColor: theme.colors.textTertiary,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    borderRadius: 999,
    overflow: 'visible',
    position: 'relative',
  },
  fill: {
    borderRadius: 999,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  requirementLine: {
    position: 'absolute',
    width: 2,
    borderRadius: 1,
  },
});
