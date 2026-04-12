import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, AppState, AppStateStatus } from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeInDown,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { Plus, Square, ChevronRight } from 'lucide-react-native';
import { colors, radii } from '@/constants/theme';
import { HistorySet } from '@/types/api';
import { scheduleTimerNotification, cancelTimerNotification } from '@/services/notifications';

const TOTAL_SECONDS = 180;
const CIRCLE_SIZE = 220;
const STROKE_WIDTH = 8;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface TimerScreenProps {
  completedSets: HistorySet[];
  onNewSet: () => void;
  onFinish: () => void;
}

export function TimerScreen({ completedSets, onNewSet: onNewSetProp, onFinish: onFinishProp }: TimerScreenProps) {
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const [finished, setFinished] = useState(false);

  const startTimeRef = useRef<number>(Date.now());
  const backgroundTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishedRef = useRef(false);

  const pulseScale = useSharedValue(1);

  const isLast10 = secondsLeft <= 10 && secondsLeft > 0 && !finished;

  const onNewSet = useCallback(() => {
    cancelTimerNotification();
    onNewSetProp();
  }, [onNewSetProp]);

  const onFinish = useCallback(() => {
    cancelTimerNotification();
    onFinishProp();
  }, [onFinishProp]);

  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      try {
        const Haptics = require('expo-haptics');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }
  }, []);

  const startInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = Math.max(0, TOTAL_SECONDS - elapsed);

      setSecondsLeft(remaining);

      if (remaining <= 0 && !finishedRef.current) {
        finishedRef.current = true;
        setFinished(true);
        triggerHaptic();
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, 250);
  }, [triggerHaptic]);

  useEffect(() => {
    startTimeRef.current = Date.now();
    finishedRef.current = false;
    startInterval();
    scheduleTimerNotification(TOTAL_SECONDS);

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundTimeRef.current = Date.now();
        if (intervalRef.current) clearInterval(intervalRef.current);
      } else if (nextState === 'active') {
        startInterval();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      subscription.remove();
      cancelTimerNotification();
    };
  }, []);

  useEffect(() => {
    if (isLast10) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 400, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(pulseScale);
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [isLast10]);

  const animatedPulse = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const progress = secondsLeft / TOTAL_SECONDS;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  const timerColor = finished
    ? colors.accent
    : secondsLeft <= 10
      ? colors.danger
      : secondsLeft <= 30
        ? colors.warning
        : colors.accent;

  const trackColor = finished
    ? 'rgba(34,197,94,0.12)'
    : secondsLeft <= 10
      ? 'rgba(239,68,68,0.1)'
      : secondsLeft <= 30
        ? 'rgba(245,158,11,0.1)'
        : 'rgba(255,255,255,0.06)';

  return (
    <View style={styles.container}>
      {finished && (
        <Animated.View entering={SlideInDown.duration(400).springify()} style={styles.notifBanner}>
          <View style={styles.notifContent}>
            <View style={styles.notifDot} />
            <Text style={styles.notifTitle}>Pause vorbei!</Text>
            <Text style={styles.notifSub}>Bereit fur den nachsten Satz?</Text>
          </View>
          <View style={styles.notifActions}>
            <Pressable
              style={({ pressed }) => [styles.notifBtn, styles.notifBtnPrimary, pressed && styles.notifBtnPressed]}
              onPress={onNewSet}
            >
              <Text style={styles.notifBtnPrimaryText}>Nachster Satz</Text>
              <ChevronRight size={14} color="#000" />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.notifBtn, styles.notifBtnSecondary, pressed && styles.notifBtnPressed]}
              onPress={onFinish}
            >
              <Text style={styles.notifBtnSecondaryText}>Beenden</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

      <View style={styles.timerSection}>
        <Animated.View style={[styles.circleWrap, animatedPulse]}>
          {Platform.OS === 'web' ? (
            <svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx={CIRCLE_SIZE / 2}
                cy={CIRCLE_SIZE / 2}
                r={RADIUS}
                stroke={trackColor}
                strokeWidth={STROKE_WIDTH}
                fill="none"
              />
              <circle
                cx={CIRCLE_SIZE / 2}
                cy={CIRCLE_SIZE / 2}
                r={RADIUS}
                stroke={timerColor}
                strokeWidth={STROKE_WIDTH}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: 'stroke-dashoffset 0.25s linear, stroke 0.5s ease' } as any}
              />
            </svg>
          ) : (
            <View style={[styles.fallbackCircle, { borderColor: timerColor }]} />
          )}
          <View style={styles.timerTextWrap}>
            <Text style={[styles.timerText, { color: timerColor }]}>{timeString}</Text>
            {finished ? (
              <Animated.Text entering={FadeIn.duration(300)} style={[styles.timerSubText, { color: colors.accent }]}>
                Fertig
              </Animated.Text>
            ) : (
              <Text style={styles.timerSubText}>Pause</Text>
            )}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(150)} style={styles.setsInfo}>
          <Text style={styles.setsInfoText}>
            {completedSets.length} {completedSets.length === 1 ? 'Satz' : 'Satze'} abgeschlossen
          </Text>
        </Animated.View>
      </View>

      {!finished && (
        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.footer}>
          <Pressable
            style={({ pressed }) => [styles.newSetButton, pressed && styles.newSetButtonPressed]}
            onPress={onNewSet}
          >
            <Plus size={18} color="#000" />
            <Text style={styles.newSetButtonText}>Nachster Satz</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.finishButton, pressed && styles.finishButtonPressed]}
            onPress={onFinish}
          >
            <Square size={14} color={colors.textSecondary} />
            <Text style={styles.finishButtonText}>Beenden</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  notifBanner: {
    backgroundColor: colors.cardElevated,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  notifContent: {
    gap: 3,
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginBottom: 6,
  },
  notifTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: colors.text,
  },
  notifSub: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: colors.textSecondary,
  },
  notifActions: {
    flexDirection: 'row',
    gap: 8,
  },
  notifBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    borderRadius: radii.md,
  },
  notifBtnPrimary: {
    backgroundColor: colors.accent,
  },
  notifBtnSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notifBtnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  notifBtnPrimaryText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#000',
  },
  notifBtnSecondaryText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: colors.textSecondary,
  },
  timerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  circleWrap: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerTextWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  timerText: {
    fontSize: 52,
    fontFamily: 'Inter-ExtraBold',
    letterSpacing: -2,
  },
  timerSubText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  fallbackCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: STROKE_WIDTH,
  },
  setsInfo: {
    alignItems: 'center',
  },
  setsInfoText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: colors.textTertiary,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
  },
  newSetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: radii.lg,
  },
  newSetButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  newSetButtonText: {
    color: '#000',
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  finishButtonPressed: {
    backgroundColor: colors.cardHover,
  },
  finishButtonText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
});
