import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Shadows } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';

const ACTIONS = [
  { icon: 'camera', label: 'AI Scan', route: '/scanner', color: Colors.primary },
  { icon: 'mic', label: 'Voice', route: '/manual-add?mode=voice', color: Colors.info },
  { icon: 'pencil', label: 'Type', route: '/manual-add?mode=text', color: Colors.fat },
  { icon: 'barcode', label: 'Barcode', route: '/barcode', color: Colors.carbs },
] as const;

export function QuickAddFAB() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const rotation = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 45}deg` }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
    pointerEvents: backdropOpacity.value > 0 ? 'auto' : 'none',
  } as any));

  const toggle = () => {
    const next = !open;
    setOpen(next);
    rotation.value = withSpring(next ? 1 : 0, { damping: 15 });
    backdropOpacity.value = withTiming(next ? 1 : 0, { duration: 200 });
  };

  const handleAction = (route: string) => {
    toggle();
    setTimeout(() => router.push(route as any), 150);
  };

  return (
    <>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={toggle} />
      </Animated.View>

      {/* Action buttons */}
      <View style={styles.actionsContainer}>
        {open &&
          ACTIONS.map((action, i) => (
            <ActionButton
              key={action.route}
              icon={action.icon}
              label={action.label}
              color={action.color}
              index={i}
              onPress={() => handleAction(action.route)}
            />
          ))}

        {/* Main FAB */}
        <TouchableOpacity
          style={[styles.fab, Shadows.neon]}
          onPress={toggle}
          activeOpacity={0.9}
        >
          <Animated.View style={fabStyle}>
            <Ionicons name="add" size={30} color={Colors.dark} />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </>
  );
}

function ActionButton({
  icon,
  label,
  color,
  index,
  onPress,
}: {
  icon: string;
  label: string;
  color: string;
  index: number;
  onPress: () => void;
}) {
  const offset = useSharedValue(0);

  React.useEffect(() => {
    offset.value = withSpring(1, { damping: 14, delay: index * 40 } as any);
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: offset.value,
    transform: [{ scale: offset.value }],
  }));

  return (
    <Animated.View style={[styles.actionRow, style]}>
      <Text style={styles.actionLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: color }]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Ionicons name={icon as any} size={20} color={Colors.dark} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 26, 15, 0.3)',
    zIndex: 10,
  },
  actionsContainer: {
    position: 'absolute',
    bottom: Spacing[8],
    right: Spacing[5],
    alignItems: 'flex-end',
    gap: Spacing[3],
    zIndex: 20,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  actionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.dark,
    backgroundColor: Colors.backgroundCard,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    ...Shadows.subtle,
  },
  actionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.subtle,
  },
});
