import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '@/constants/colors';

const ECG_PATH = 'M 0,15 L 8,15 L 12,4 L 16,26 L 20,15 L 28,15 L 32,9 L 36,21 L 40,15 L 48,15';

interface HeartRateOverlayProps {
  bpm: number;
}

export function HeartRateOverlay({ bpm }: HeartRateOverlayProps) {
  return (
    <BlurView intensity={60} tint="dark" style={styles.container}>
      <Ionicons name="heart" size={18} color="#EF4444" />
      <Svg width={52} height={30} style={styles.ecg}>
        <Path d={ECG_PATH} stroke={Colors.primaryBright} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <Text style={styles.bpm}>{bpm} <Text style={styles.bpmUnit}>bpm</Text></Text>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ecg: {
    marginTop: 2,
  },
  bpm: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  bpmUnit: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.textSecondary,
  },
});
