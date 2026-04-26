import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { Colors } from '@/constants/colors';
import type { Badge } from '@/types/fitness';

function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30);
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');
}

interface HexBadgeProps {
  badge: Badge;
  size?: number;
}

export function HexBadge({ badge, size = 80 }: HexBadgeProps) {
  const unlocked = !!badge.unlockedAt;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;
  const fillColor = unlocked ? Colors.primaryDeep : '#374151';
  const iconColor = unlocked ? Colors.primaryBright : Colors.textMuted;

  return (
    <View style={styles.wrap}>
      <View style={[{ width: size, height: size }, unlocked && styles.unlocked]}>
        <Svg width={size} height={size}>
          {unlocked && (
            <Polygon
              points={hexPoints(cx, cy, r + 4)}
              fill={Colors.primaryGlow}
            />
          )}
          <Polygon
            points={hexPoints(cx, cy, r)}
            fill={fillColor}
          />
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Ionicons name={badge.icon as any} size={size * 0.32} color={iconColor} />
          {!unlocked && (
            <View style={styles.lockOverlay}>
              <Ionicons name="lock-closed" size={14} color={Colors.textMuted} />
            </View>
          )}
        </View>
      </View>
      <Text style={[styles.label, !unlocked && styles.labelLocked]}>{badge.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 6,
  },
  unlocked: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  labelLocked: {
    color: Colors.textMuted,
  },
});
