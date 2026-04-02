import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { Play, Pause, SkipForward, Plus, Square } from 'lucide-react-native';
import { colors, radii } from '@/constants/theme';
import { HistorySet } from '@/types/api';

const TOTAL_SECONDS = 180;
const CIRCLE_SIZE = 200;
const STROKE_WIDTH = 6;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface TimerScreenProps {
  completedSets: HistorySet[];
  onNewSet: () => void;
  onFinish: () => void;
}

export function TimerScreen({ completedSets, onNewSet, onFinish }: TimerScreenProps) {
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pulseScale = useSharedValue(1);

  const isLast10 = secondsLeft <= 10 && secondsLeft > 0 && !paused && !finished;

  useEffect(() => {
    if (isLast10) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.04, { duration: 400, easing: Easing.inOut(Easing.ease) }),
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

  useEffect(() => {
    if (paused || finished) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setFinished(true);
          if (Platform.OS !== 'web') {
            try {
              const Haptics = require('expo-haptics');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {}
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused, finished]);

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

  const handleSkip = () => {
    setFinished(true);
    setSecondsLeft(0);
  };

  return (
    <View style={styles.container}>
      <View style={styles.timerSection}>
        <Animated.View style={[styles.circleWrap, animatedPulse]}>
          {Platform.OS === 'web' ? (
            <svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx={CIRCLE_SIZE / 2}
                cy={CIRCLE_SIZE / 2}
                r={RADIUS}
                stroke="rgba(255,255,255,0.06)"
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
                style={{ transition: 'stroke-dashoffset 0.3s ease, stroke 0.3s ease' } as any}
              />
            </svg>
          ) : (
            <View style={[styles.fallbackCircle, { borderColor: timerColor }]} />
          )}
          <View style={styles.timerTextWrap}>
            <Text style={[styles.timerText, { color: timerColor }]}>{timeString}</Text>
            {finished && (
              <Animated.Text entering={FadeIn.duration(300)} style={styles.timerDoneText}>
                Pause vorbei
              </Animated.Text>
            )}
          </View>
        </Animated.View>
      </View>

      {!finished && (
        <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.timerControls}>
          <Pressable
            style={({ pressed }) => [styles.controlBtn, pressed && styles.controlBtnPressed]}
            onPress={() => setPaused((p) => !p)}
          >
            {paused ? (
              <Play size={22} color={colors.text} />
            ) : (
              <Pause size={22} color={colors.text} />
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.controlBtn, pressed && styles.controlBtnPressed]}
            onPress={handleSkip}
          >
            <SkipForward size={22} color={colors.text} />
          </Pressable>
        </Animated.View>
      )}

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.newSetButton, pressed && styles.newSetButtonPressed]}
          onPress={onNewSet}
        >
          <Plus size={18} color="#000" />
          <Text style={styles.newSetButtonText}>Neuer Satz</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.finishButton, pressed && styles.finishButtonPressed]}
          onPress={onFinish}
        >
          <Square size={14} color={colors.textSecondary} />
          <Text style={styles.finishButtonText}>Beenden</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  timerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  timerText: {
    fontSize: 48,
    fontFamily: 'Inter-ExtraBold',
    letterSpacing: -1,
  },
  timerDoneText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: colors.accent,
    marginTop: 2,
  },
  fallbackCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: STROKE_WIDTH,
  },
  timerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 32,
  },
  controlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnPressed: {
    backgroundColor: colors.cardHover,
    transform: [{ scale: 0.93 }],
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
