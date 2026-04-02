import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  FadeOut,
  SlideInUp,
  SlideInDown,
} from 'react-native-reanimated';
import { Check, Clock } from 'lucide-react-native';
import { colors, radii } from '@/constants/theme';

interface ActionToastProps {
  type: 'snoozed' | 'started';
  exerciseName: string;
}

export function ActionToast({ type, exerciseName }: ActionToastProps) {
  const isSnoozed = type === 'snoozed';

  const entering = isSnoozed
    ? SlideInDown.springify().damping(20).stiffness(200)
    : SlideInUp.springify().damping(20).stiffness(200);

  return (
    <Animated.View
      entering={entering}
      exiting={FadeOut.duration(200)}
      style={[styles.container, isSnoozed ? styles.containerBottom : styles.containerTop]}
    >
      <View style={[styles.toast, isSnoozed ? styles.toastSnoozed : styles.toastStarted]}>
        <View style={[styles.iconWrap, isSnoozed ? styles.iconSnoozed : styles.iconStarted]}>
          {isSnoozed ? (
            <Clock size={14} color={colors.warning} strokeWidth={2.5} />
          ) : (
            <Check size={14} color={colors.accent} strokeWidth={2.5} />
          )}
        </View>
        <Text style={styles.toastText} numberOfLines={1}>
          {isSnoozed ? `${exerciseName} verschoben` : `${exerciseName} gestartet`}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 200,
  },
  containerTop: {
    top: Platform.OS === 'web' ? 52 : 72,
  },
  containerBottom: {
    bottom: Platform.OS === 'web' ? 52 : 72,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radii.full,
    borderWidth: 1,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.5,
          shadowRadius: 16,
          elevation: 12,
        }),
  },
  toastSnoozed: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.warningBorder,
  },
  toastStarted: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.accentBorder,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSnoozed: {
    backgroundColor: colors.warningMuted,
  },
  iconStarted: {
    backgroundColor: colors.accentMuted,
  },
  toastText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
});
