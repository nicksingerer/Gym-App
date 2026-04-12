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
import { Zap, Clock, ArrowUp, ArrowDown, Dumbbell } from 'lucide-react-native';
import { colors, muscleColors, radii } from '@/constants/theme';
import { formatDaysSinceLastDone } from '@/utils/formatTime';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 32, 460);
const CARD_HEIGHT = Math.min(SCREEN_HEIGHT * 0.62, 540);
const SWIPE_Y_THRESHOLD = SCREEN_HEIGHT * 0.12;

const SNAP_SPRING = { damping: 26, stiffness: 500, mass: 0.45 };

interface SwipeCardProps {
  exercise: Exercise;
  onSwipeUp: () => void;
  onSwipeDown: () => void;
  isTop: boolean;
  index: number;
}

function ImpactBar({ value }: { value: number }) {
  return (
    <View style={barStyles.track}>
      <View style={[barStyles.fill, { width: `${value * 100}%` as any }]} />
    </View>
  );
}

const barStyles = StyleSheet.create({
  track: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
});

export function SwipeCard({
  exercise,
  onSwipeUp,
  onSwipeDown,
  isTop,
  index,
}: SwipeCardProps) {
  const scaleForIndex = index === 0 ? 1 : 0.94;
  const translateYForIndex = index === 0 ? 0 : 16;
  const opacityForIndex = index === 0 ? 1 : 0.45;

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

  const panGesture = Gesture.Pan()
    .enabled(isTop)
    .minDistance(5)
    .onStart(() => {
      pressed.value = withSpring(0.97, { damping: 20, stiffness: 600 });
    })
    .onUpdate((event) => {
      const absX = Math.abs(event.translationX);
      const absY = Math.abs(event.translationY);
      if (absY > absX) {
        translateY.value = event.translationY * 0.82;
      }
    })
    .onEnd((event) => {
      pressed.value = withSpring(1, SNAP_SPRING);

      const absX = Math.abs(event.translationX);
      const absY = Math.abs(event.translationY);
      const velY = Math.abs(event.velocityY);

      if (absY > absX) {
        if (event.translationY < -SWIPE_Y_THRESHOLD || (event.translationY < -40 && velY > 800)) {
          translateY.value = withTiming(-SCREEN_HEIGHT, { duration: 260 }, () => {
            runOnJS(handleSwipeUp)();
          });
        } else if (event.translationY > SWIPE_Y_THRESHOLD || (event.translationY > 40 && velY > 800)) {
          translateY.value = withTiming(SCREEN_HEIGHT, { duration: 260 }, () => {
            runOnJS(handleSwipeDown)();
          });
        } else {
          translateY.value = withSpring(0, SNAP_SPRING);
        }
      } else {
        translateY.value = withSpring(0, SNAP_SPRING);
      }
    });

  const animatedCardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateY.value,
      [-SCREEN_HEIGHT * 0.3, 0, SCREEN_HEIGHT * 0.3],
      [-2.5, 0, 2.5],
      Extrapolation.CLAMP
    );
    return {
      opacity: cardOpacity.value,
      transform: [
        { translateY: translateY.value + stackOffset.value },
        { rotate: `${rotate}deg` },
        { scale: cardScale.value * pressed.value },
      ],
    };
  });

  const upOverlayOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [-SWIPE_Y_THRESHOLD, -30], [1, 0], Extrapolation.CLAMP),
  }));

  const downOverlayOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [30, SWIPE_Y_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));

  const primaryMuscles = exercise.muscles.filter((m) => m.impact >= 0.7);
  const secondaryMuscles = exercise.muscles.filter((m) => m.impact < 0.7 && m.impact >= 0.3);
  const topMuscles = [...primaryMuscles, ...secondaryMuscles].slice(0, 5);
  const lastDoneText = formatDaysSinceLastDone(exercise.daysSinceLastDone ?? null);

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.card, animatedCardStyle, { zIndex: isTop ? 10 : 10 - index }]}>
        <View style={styles.cardInner}>
          <View style={styles.topBar}>
            <View style={styles.iconWrap}>
              <Dumbbell size={14} color={colors.accent} />
            </View>
            {lastDoneText && (
              <View style={styles.lastDonePill}>
                <Clock size={11} color={colors.textTertiary} />
                <Text style={styles.lastDoneText}>{lastDoneText}</Text>
              </View>
            )}
          </View>

          <View style={styles.mainContent}>
            <Text style={styles.exerciseName} numberOfLines={3}>
              {exercise.name}
            </Text>
            {exercise.description ? (
              <Text style={styles.exerciseDescription} numberOfLines={2}>
                {exercise.description}
              </Text>
            ) : null}
          </View>

          <View style={styles.bottomSection}>
            {topMuscles.length > 0 && (
              <View style={styles.muscleList}>
                {topMuscles.map((em, i) => {
                  const mc = muscleColors[i % muscleColors.length];
                  return (
                    <View key={em.muscle.id} style={styles.muscleRow}>
                      <View style={[styles.muscleDot, { backgroundColor: mc.text }]} />
                      <Text style={[styles.muscleLabel, { color: mc.text }]} numberOfLines={1}>
                        {em.muscle.name}
                      </Text>
                      <ImpactBar value={em.impact} />
                      {em.impact >= 0.7 && (
                        <Zap size={10} color={mc.text} fill={mc.text} />
                      )}
                    </View>
                  );
                })}
                {exercise.muscles.length > 5 && (
                  <Text style={styles.moreText}>+{exercise.muscles.length - 5} weitere</Text>
                )}
              </View>
            )}
          </View>
        </View>

        <Animated.View style={[styles.overlay, styles.overlayUp, upOverlayOpacity]} pointerEvents="none">
          <View style={styles.overlayBadgeGreen}>
            <ArrowUp size={36} color="#000" strokeWidth={2.5} />
          </View>
        </Animated.View>

        <Animated.View style={[styles.overlay, styles.overlayDown, downOverlayOpacity]} pointerEvents="none">
          <View style={styles.overlayBadgeRed}>
            <ArrowDown size={36} color="#fff" strokeWidth={2.5} />
          </View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: radii.xxl,
    backgroundColor: colors.card,
    overflow: 'visible',
    borderWidth: 1,
    borderColor: colors.border,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 4px 16px rgba(0,0,0,0.4)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 20 },
          shadowOpacity: 0.65,
          shadowRadius: 48,
          elevation: 28,
        }),
  },
  cardInner: {
    flex: 1,
    padding: 24,
    borderRadius: radii.xxl,
    overflow: 'hidden',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.accentMuted,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastDonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lastDoneText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: colors.textTertiary,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 12,
  },
  exerciseName: {
    fontSize: 32,
    fontFamily: 'Inter-ExtraBold',
    color: colors.text,
    letterSpacing: -1,
    lineHeight: 38,
    marginBottom: 10,
  },
  exerciseDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.textSecondary,
    lineHeight: 21,
  },
  bottomSection: {},
  muscleList: {
    gap: 8,
  },
  muscleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  muscleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.8,
  },
  muscleLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    width: 110,
  },
  moreText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: colors.textMuted,
    marginTop: 2,
    marginLeft: 14,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radii.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayUp: {
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
  },
  overlayDown: {
    backgroundColor: 'rgba(10, 10, 12, 0.92)',
    borderWidth: 2,
    borderColor: colors.danger,
  },
  overlayBadgeGreen: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayBadgeRed: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
