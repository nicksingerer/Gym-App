import React, { useCallback } from 'react';
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
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Exercise } from '@/types/api';
import { Zap, Clock, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { colors, muscleColors, radii } from '@/constants/theme';
import { formatDaysSinceLastDone } from '@/utils/formatTime';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_Y_THRESHOLD = SCREEN_HEIGHT * 0.12;
const SWIPE_X_THRESHOLD = SCREEN_WIDTH * 0.25;

const SNAP_SPRING = {
  damping: 28,
  stiffness: 600,
  mass: 0.4,
};

interface SwipeCardProps {
  exercise: Exercise;
  onSwipeUp: () => void;
  onSwipeDown: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  showCycleControls: boolean;
  isTop: boolean;
  index: number;
}

export function SwipeCard({
  exercise,
  onSwipeUp,
  onSwipeDown,
  onSwipeLeft,
  onSwipeRight,
  showCycleControls,
  isTop,
  index,
}: SwipeCardProps) {
  const scaleForIndex = index === 0 ? 1 : 0.95;
  const translateYForIndex = index === 0 ? 0 : 14;
  const opacityForIndex = index === 0 ? 1 : 0.5;

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const cardScale = useSharedValue(scaleForIndex);
  const stackOffset = useSharedValue(translateYForIndex);
  const cardOpacity = useSharedValue(opacityForIndex);
  const pressed = useSharedValue(1);

  React.useEffect(() => {
    cardScale.value = withSpring(scaleForIndex, SNAP_SPRING);
    stackOffset.value = withSpring(translateYForIndex, SNAP_SPRING);
    cardOpacity.value = withTiming(opacityForIndex, { duration: 200 });
  }, [index]);

  const handleSwipeUp = useCallback(() => onSwipeUp(), [onSwipeUp]);
  const handleSwipeDown = useCallback(() => onSwipeDown(), [onSwipeDown]);
  const handleSwipeLeft = useCallback(() => onSwipeLeft?.(), [onSwipeLeft]);
  const handleSwipeRight = useCallback(() => onSwipeRight?.(), [onSwipeRight]);

  const panGesture = Gesture.Pan()
    .enabled(isTop)
    .minDistance(5)
    .onStart(() => {
      pressed.value = withSpring(0.98, { damping: 20, stiffness: 600 });
    })
    .onUpdate((event) => {
      const absX = Math.abs(event.translationX);
      const absY = Math.abs(event.translationY);

      if (absY > absX) {
        translateY.value = event.translationY * 0.85;
        translateX.value = 0;
      } else if (showCycleControls) {
        translateX.value = event.translationX * 0.6;
        translateY.value = 0;
      }
    })
    .onEnd((event) => {
      pressed.value = withSpring(1, SNAP_SPRING);

      const absX = Math.abs(event.translationX);
      const absY = Math.abs(event.translationY);
      const velX = Math.abs(event.velocityX);
      const velY = Math.abs(event.velocityY);

      if (absY > absX) {
        if (event.translationY < -SWIPE_Y_THRESHOLD || (event.translationY < -40 && velY > 800)) {
          translateY.value = withTiming(-SCREEN_HEIGHT, { duration: 250 }, () => {
            runOnJS(handleSwipeUp)();
          });
        } else if (event.translationY > SWIPE_Y_THRESHOLD || (event.translationY > 40 && velY > 800)) {
          translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 }, () => {
            runOnJS(handleSwipeDown)();
          });
        } else {
          translateY.value = withSpring(0, SNAP_SPRING);
        }
      } else if (showCycleControls) {
        if (event.translationX < -SWIPE_X_THRESHOLD || (event.translationX < -60 && velX > 600)) {
          runOnJS(handleSwipeLeft)();
          translateX.value = withSpring(0, SNAP_SPRING);
        } else if (event.translationX > SWIPE_X_THRESHOLD || (event.translationX > 60 && velX > 600)) {
          runOnJS(handleSwipeRight)();
          translateX.value = withSpring(0, SNAP_SPRING);
        } else {
          translateX.value = withSpring(0, SNAP_SPRING);
        }
      }
    });

  const animatedCardStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(
      translateY.value,
      [-SCREEN_HEIGHT * 0.3, 0, SCREEN_HEIGHT * 0.3],
      [-2, 0, 2],
      Extrapolation.CLAMP
    );
    return {
      opacity: cardOpacity.value,
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value + stackOffset.value },
        { rotate: `${rotateY}deg` },
        { scale: cardScale.value * pressed.value },
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
    return { opacity };
  });

  const downOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [25, SWIPE_Y_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const leftOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-SWIPE_X_THRESHOLD, -40],
      [1, 0],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const rightOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [40, SWIPE_X_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const primaryMuscles = exercise.muscles
    .filter((m) => m.impact >= 0.7)
    .map((m) => m.muscle.name);
  const secondaryMuscles = exercise.muscles
    .filter((m) => m.impact < 0.7 && m.impact >= 0.3)
    .map((m) => m.muscle.name);
  const allMuscles = [...primaryMuscles, ...secondaryMuscles];
  const lastDoneText = formatDaysSinceLastDone(exercise.daysSinceLastDone ?? null);

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.card,
          animatedCardStyle,
          { zIndex: isTop ? 10 : 10 - index },
        ]}
      >
        <View style={styles.cardInner}>
          {lastDoneText && (
            <View style={styles.topRow}>
              <View style={styles.lastDoneRow}>
                <Clock size={12} color={colors.textTertiary} />
                <Text style={styles.lastDoneText}>{lastDoneText}</Text>
              </View>
            </View>
          )}

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

        {showCycleControls && (
          <>
            <Animated.View
              style={[styles.overlay, styles.overlayLeft, leftOverlayStyle]}
              pointerEvents="none"
            >
              <View style={styles.overlayContent}>
                <ChevronLeft size={44} color="#FFF" strokeWidth={1.5} />
              </View>
            </Animated.View>

            <Animated.View
              style={[styles.overlay, styles.overlayRight, rightOverlayStyle]}
              pointerEvents="none"
            >
              <View style={styles.overlayContent}>
                <ChevronRight size={44} color="#FFF" strokeWidth={1.5} />
              </View>
            </Animated.View>
          </>
        )}
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
    justifyContent: 'flex-end',
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
  overlayLeft: {
    backgroundColor: 'rgba(59, 130, 246, 0.92)',
  },
  overlayRight: {
    backgroundColor: 'rgba(59, 130, 246, 0.92)',
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
