import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
  interpolate,
  interpolateColor,
  Extrapolation,
  Easing,
} from 'react-native-reanimated';
import { Exercise } from '@/types/api';
import { Zap, Clock, ChevronUp, ChevronDown } from 'lucide-react-native';
import { colors, muscleColors, radii } from '@/constants/theme';
import { formatDaysSinceLastDone } from '@/utils/formatTime';
import { triggerHaptic } from '@/utils/haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_Y_THRESHOLD = SCREEN_HEIGHT * 0.12;
const SWIPE_X_THRESHOLD = SCREEN_WIDTH * 0.25;
const RUBBER_BAND_MAX = 15;

const SNAP_SPRING = {
  damping: 28,
  stiffness: 600,
  mass: 0.4,
};

interface SwipeCardProps {
  exercise: Exercise;
  clusterName?: string;
  onSwipeUp: () => void;
  onSwipeDown: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  showCycleControls: boolean;
  isTop: boolean;
  index: number;
  topTranslateX?: Animated.SharedValue<number>;
  topTranslateY?: Animated.SharedValue<number>;
  showHint?: boolean;
  enterFrom?: 'left' | 'right' | null;
  onEntranceDone?: () => void;
}

export function SwipeCard({
  exercise,
  clusterName,
  onSwipeUp,
  onSwipeDown,
  onSwipeLeft,
  onSwipeRight,
  showCycleControls,
  isTop,
  index,
  topTranslateX,
  topTranslateY,
  showHint,
  enterFrom,
  onEntranceDone,
}: SwipeCardProps) {
  const scaleForIndex = index === 0 ? 1 : 0.95;
  const translateYForIndex = index === 0 ? 0 : 14;
  const opacityForIndex = index === 0 ? 1 : 0.5;

  const entranceStart = enterFrom === 'left' ? -SCREEN_WIDTH * 1.2 : enterFrom === 'right' ? SCREEN_WIDTH * 1.2 : 0;
  const translateX = useSharedValue(entranceStart);
  const translateY = useSharedValue(0);
  const cardScale = useSharedValue(scaleForIndex);
  const stackOffset = useSharedValue(translateYForIndex);
  const cardOpacity = useSharedValue(opacityForIndex);
  const pressed = useSharedValue(1);
  const hasPassedThreshold = useSharedValue(0);
  const isAnimatingOut = useSharedValue(false);

  const handleEntranceDone = useCallback(() => onEntranceDone?.(), [onEntranceDone]);

  useEffect(() => {
    if (enterFrom && isTop) {
      translateX.value = withSpring(0, { damping: 22, stiffness: 280, mass: 0.5 }, () => {
        runOnJS(handleEntranceDone)();
      });
    }
  }, [enterFrom, isTop]);

  useEffect(() => {
    if (isTop && showHint && !enterFrom) {
      translateY.value = withDelay(
        600,
        withSequence(
          withTiming(-18, { duration: 500, easing: Easing.out(Easing.cubic) }),
          withSpring(0, { damping: 12, stiffness: 200, mass: 0.6 })
        )
      );
    }
  }, [showHint, isTop, enterFrom]);

  React.useEffect(() => {
    cardScale.value = withSpring(scaleForIndex, SNAP_SPRING);
    stackOffset.value = withSpring(translateYForIndex, SNAP_SPRING);
    cardOpacity.value = withTiming(opacityForIndex, { duration: 200 });
  }, [index]);

  const handleSwipeUp = useCallback(() => onSwipeUp(), [onSwipeUp]);
  const handleSwipeDown = useCallback(() => onSwipeDown(), [onSwipeDown]);
  const handleSwipeLeft = useCallback(() => onSwipeLeft?.(), [onSwipeLeft]);
  const handleSwipeRight = useCallback(() => onSwipeRight?.(), [onSwipeRight]);

  const fireThresholdHaptic = useCallback(() => {
    triggerHaptic('light');
  }, []);

  const fireCommitHaptic = useCallback(() => {
    triggerHaptic('medium');
  }, []);

  const panGesture = Gesture.Pan()
    .enabled(isTop)
    .minDistance(5)
    .onStart(() => {
      pressed.value = withSpring(0.98, { damping: 20, stiffness: 600 });
      hasPassedThreshold.value = 0;
    })
    .onUpdate((event) => {
      const absX = Math.abs(event.translationX);
      const absY = Math.abs(event.translationY);

      if (absY > absX) {
        translateY.value = event.translationY * 0.85;
        translateX.value = 0;
        if (topTranslateY) topTranslateY.value = translateY.value;
        if (topTranslateX) topTranslateX.value = 0;

        const pastThreshold =
          Math.abs(event.translationY * 0.85) >= SWIPE_Y_THRESHOLD ? 1 : 0;
        if (pastThreshold === 1 && hasPassedThreshold.value === 0) {
          hasPassedThreshold.value = 1;
          runOnJS(fireThresholdHaptic)();
        } else if (pastThreshold === 0 && hasPassedThreshold.value === 1) {
          hasPassedThreshold.value = 0;
        }
      } else if (showCycleControls) {
        translateX.value = event.translationX * 0.6;
        translateY.value = 0;
        if (topTranslateX) topTranslateX.value = translateX.value;
        if (topTranslateY) topTranslateY.value = 0;

        const pastThreshold =
          Math.abs(event.translationX * 0.6) >= SWIPE_X_THRESHOLD ? 1 : 0;
        if (pastThreshold === 1 && hasPassedThreshold.value === 0) {
          hasPassedThreshold.value = 1;
          runOnJS(fireThresholdHaptic)();
        } else if (pastThreshold === 0 && hasPassedThreshold.value === 1) {
          hasPassedThreshold.value = 0;
        }
      } else {
        const rubberBand =
          event.translationX *
          (RUBBER_BAND_MAX / (Math.abs(event.translationX) + RUBBER_BAND_MAX));
        translateX.value = rubberBand;
        translateY.value = 0;
        if (topTranslateX) topTranslateX.value = rubberBand;
        if (topTranslateY) topTranslateY.value = 0;
      }
    })
    .onEnd((event) => {
      pressed.value = withSpring(1, SNAP_SPRING);

      const absX = Math.abs(event.translationX);
      const absY = Math.abs(event.translationY);
      const velY = Math.abs(event.velocityY);
      const velX = Math.abs(event.velocityX);

      const resetParent = () => {
        'worklet';
        if (topTranslateX) topTranslateX.value = withSpring(0, SNAP_SPRING);
        if (topTranslateY) topTranslateY.value = withSpring(0, SNAP_SPRING);
      };

      if (absY > absX) {
        if (
          event.translationY < -SWIPE_Y_THRESHOLD ||
          (event.translationY < -40 && velY > 800)
        ) {
          const speed = Math.max(velY, 600);
          const dist = SCREEN_HEIGHT - Math.abs(translateY.value);
          const duration = Math.min(Math.max((dist / speed) * 1000, 150), 350);

          runOnJS(fireCommitHaptic)();
          cardScale.value = withTiming(0.85, { duration });
          translateY.value = withTiming(-SCREEN_HEIGHT, { duration }, () => {
            runOnJS(handleSwipeUp)();
          });
          if (topTranslateY) topTranslateY.value = withTiming(-SCREEN_HEIGHT, { duration });
        } else if (
          event.translationY > SWIPE_Y_THRESHOLD ||
          (event.translationY > 40 && velY > 800)
        ) {
          const speed = Math.max(velY, 600);
          const dist = SCREEN_HEIGHT - Math.abs(translateY.value);
          const duration = Math.min(Math.max((dist / speed) * 1000, 150), 350);

          runOnJS(fireCommitHaptic)();
          cardScale.value = withTiming(0.85, { duration });
          translateY.value = withTiming(SCREEN_HEIGHT, { duration }, () => {
            runOnJS(handleSwipeDown)();
          });
          if (topTranslateY) topTranslateY.value = withTiming(SCREEN_HEIGHT, { duration });
        } else {
          translateY.value = withSpring(0, SNAP_SPRING);
          resetParent();
        }
      } else if (showCycleControls) {
        if (
          event.translationX < -SWIPE_X_THRESHOLD ||
          (event.translationX < -60 && velX > 600)
        ) {
          isAnimatingOut.value = true;
          const speed = Math.max(velX, 800);
          const dist = SCREEN_WIDTH * 1.2 - Math.abs(translateX.value);
          const duration = Math.min(Math.max((dist / speed) * 1000, 120), 280);

          runOnJS(fireCommitHaptic)();
          cardScale.value = withTiming(0.92, { duration });
          translateX.value = withTiming(-SCREEN_WIDTH * 1.2, { duration }, () => {
            runOnJS(handleSwipeLeft)();
          });
        } else if (
          event.translationX > SWIPE_X_THRESHOLD ||
          (event.translationX > 60 && velX > 600)
        ) {
          isAnimatingOut.value = true;
          const speed = Math.max(velX, 800);
          const dist = SCREEN_WIDTH * 1.2 - Math.abs(translateX.value);
          const duration = Math.min(Math.max((dist / speed) * 1000, 120), 280);

          runOnJS(fireCommitHaptic)();
          cardScale.value = withTiming(0.92, { duration });
          translateX.value = withTiming(SCREEN_WIDTH * 1.2, { duration }, () => {
            runOnJS(handleSwipeRight)();
          });
        } else {
          translateX.value = withSpring(0, SNAP_SPRING);
        }
        resetParent();
      } else {
        translateX.value = withSpring(0, SNAP_SPRING);
        resetParent();
      }
    });

  const animatedCardStyle = useAnimatedStyle(() => {
    const rotateZ = interpolate(
      translateY.value,
      [-SCREEN_HEIGHT * 0.3, 0, SCREEN_HEIGHT * 0.3],
      [-6, 0, 6],
      Extrapolation.CLAMP
    );

    const rotateZHoriz = interpolate(
      translateX.value,
      [-SCREEN_WIDTH * 0.3, 0, SCREEN_WIDTH * 0.3],
      [4, 0, -4],
      Extrapolation.CLAMP
    );

    const tiltX = interpolate(
      translateY.value,
      [-SCREEN_HEIGHT * 0.3, 0, SCREEN_HEIGHT * 0.3],
      [4, 0, -4],
      Extrapolation.CLAMP
    );

    return {
      opacity: cardOpacity.value,
      transform: [
        { perspective: 1200 },
        { translateX: translateX.value },
        { translateY: translateY.value + stackOffset.value },
        { rotateZ: `${rotateZ + rotateZHoriz}deg` },
        { rotateX: `${tiltX}deg` },
        { scale: cardScale.value * pressed.value },
      ],
    };
  });

  const animatedBorderStyle = useAnimatedStyle(() => {
    const upProgress = interpolate(
      translateY.value,
      [-SWIPE_Y_THRESHOLD, 0],
      [1, 0],
      Extrapolation.CLAMP
    );
    const downProgress = interpolate(
      translateY.value,
      [0, SWIPE_Y_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    );

    const maxProgress = Math.max(upProgress, downProgress);

    let borderColor: string;
    if (upProgress >= downProgress && upProgress > 0) {
      borderColor = interpolateColor(
        upProgress,
        [0, 1],
        ['rgba(255,255,255,0.06)', 'rgba(34, 197, 94, 0.6)']
      );
    } else if (downProgress > 0) {
      borderColor = interpolateColor(
        downProgress,
        [0, 1],
        ['rgba(255,255,255,0.06)', 'rgba(239, 68, 68, 0.6)']
      );
    } else {
      borderColor = 'rgba(255,255,255,0.06)';
    }

    return {
      borderColor,
      borderWidth: interpolate(maxProgress, [0, 1], [1, 1.5], Extrapolation.CLAMP),
    };
  });

  const backgroundCardStyle = useAnimatedStyle(() => {
    if (isTop || !topTranslateY || !topTranslateX) {
      return {};
    }

    const dragProgress = interpolate(
      Math.abs(topTranslateY.value),
      [0, SWIPE_Y_THRESHOLD * 1.5],
      [0, 1],
      Extrapolation.CLAMP
    );

    const dynamicScale = interpolate(dragProgress, [0, 1], [0.95, 1], Extrapolation.CLAMP);
    const dynamicOffset = interpolate(dragProgress, [0, 1], [14, 0], Extrapolation.CLAMP);
    const dynamicOpacity = interpolate(dragProgress, [0, 1], [0.5, 1], Extrapolation.CLAMP);

    return {
      opacity: dynamicOpacity,
      transform: [
        { perspective: 1200 },
        { translateY: dynamicOffset },
        { scale: dynamicScale },
      ],
    };
  });

  const upOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [-SWIPE_Y_THRESHOLD, -25],
      [1, 0],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      translateY.value,
      [-SWIPE_Y_THRESHOLD, -25],
      [1, 0.8],
      Extrapolation.CLAMP
    );
    return { opacity, transform: [{ scale }] };
  });

  const downOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [25, SWIPE_Y_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      translateY.value,
      [25, SWIPE_Y_THRESHOLD],
      [0.8, 1],
      Extrapolation.CLAMP
    );
    return { opacity, transform: [{ scale }] };
  });

  const primaryMuscles = exercise.muscles
    .filter((m) => m.impact >= 0.7)
    .map((m) => m.muscle.name);
  const secondaryMuscles = exercise.muscles
    .filter((m) => m.impact < 0.7 && m.impact >= 0.3)
    .map((m) => m.muscle.name);
  const allMuscles = [...primaryMuscles, ...secondaryMuscles];
  const lastDoneText = formatDaysSinceLastDone(exercise.daysSinceLastDone ?? null);

  const useBackgroundParallax = !isTop && topTranslateY && topTranslateX;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.card,
          isTop ? animatedCardStyle : (useBackgroundParallax ? backgroundCardStyle : animatedCardStyle),
          animatedBorderStyle,
          { zIndex: isTop ? 10 : 10 - index },
        ]}
      >
        <View style={styles.cardInner}>
          <View style={styles.topRow}>
            {clusterName ? (
              <View style={styles.categoryTag}>
                <Text style={styles.categoryTagText}>{clusterName}</Text>
              </View>
            ) : <View />}
            {lastDoneText ? (
              <View style={styles.lastDoneRow}>
                <Clock size={12} color={colors.textTertiary} />
                <Text style={styles.lastDoneText}>{lastDoneText}</Text>
              </View>
            ) : <View />}
          </View>

          <View style={styles.centerSection}>
            <Text style={styles.exerciseName} numberOfLines={3}>
              {exercise.name}
            </Text>
            {exercise.description ? (
              <Text style={styles.exerciseDescription} numberOfLines={3}>
                {exercise.description}
              </Text>
            ) : null}
          </View>

          <View style={styles.bottomSection}>
            <View style={styles.muscleGrid}>
              {allMuscles.slice(0, 6).map((muscle, i) => {
                const mc = muscleColors[i % muscleColors.length];
                const isPrimary = i < primaryMuscles.length;
                return (
                  <View
                    key={muscle}
                    style={[styles.muscleChip, { backgroundColor: mc.bg, borderColor: mc.border, borderWidth: 1 }]}
                  >
                    {isPrimary && <Zap size={11} color={mc.text} />}
                    <Text style={[styles.muscleChipText, { color: mc.text }]}>
                      {muscle}
                    </Text>
                  </View>
                );
              })}
              {allMuscles.length > 6 && (
                <View style={styles.muscleMore}>
                  <Text style={styles.muscleMoreText}>+{allMuscles.length - 6}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <Animated.View
          style={[styles.overlay, styles.overlayUp, upOverlayStyle]}
          pointerEvents="none"
        >
          <View style={styles.overlayContent}>
            <ChevronUp size={44} color="#FFF" strokeWidth={1.5} />
            <Text style={styles.overlayText}>GO!</Text>
          </View>
        </Animated.View>

        <Animated.View
          style={[styles.overlay, styles.overlayDown, downOverlayStyle]}
          pointerEvents="none"
        >
          <View style={styles.overlayContent}>
            <ChevronDown size={44} color="#FFF" strokeWidth={1.5} />
            <Text style={styles.overlayText}>LATER</Text>
          </View>
        </Animated.View>

      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: SCREEN_WIDTH - 40,
    maxWidth: 440,
    alignSelf: 'center',
    height: SCREEN_HEIGHT * 0.58,
    maxHeight: 520,
    borderRadius: radii.xxl,
    backgroundColor: colors.card,
    overflow: 'visible',
    borderWidth: 1,
    borderColor: colors.border,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.3)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 24 },
          shadowOpacity: 0.6,
          shadowRadius: 40,
          elevation: 24,
        }),
  },
  cardInner: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
    overflow: 'hidden',
    borderRadius: radii.xxl,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryTag: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  categoryTagText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  lastDoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  lastDoneText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: colors.textTertiary,
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 16,
  },
  exerciseName: {
    fontSize: 30,
    fontFamily: 'Inter-ExtraBold',
    color: colors.text,
    letterSpacing: -0.8,
    lineHeight: 36,
    marginBottom: 10,
  },
  exerciseDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.textSecondary,
    lineHeight: 21,
  },
  bottomSection: {
    gap: 12,
  },
  muscleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  muscleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  muscleChipText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  muscleMore: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  muscleMoreText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: colors.textTertiary,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radii.xxl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayUp: {
    backgroundColor: 'rgba(34, 197, 94, 0.92)',
  },
  overlayDown: {
    backgroundColor: 'rgba(239, 68, 68, 0.92)',
  },
  overlayContent: {
    alignItems: 'center',
    gap: 12,
  },
  overlayText: {
    color: '#FFF',
    fontSize: 28,
    fontFamily: 'Inter-ExtraBold',
    letterSpacing: 6,
  },
});
