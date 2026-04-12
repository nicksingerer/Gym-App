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
  interpolateColor,
  Extrapolation,
} from 'react-native-reanimated';
import { Exercise } from '@/types/api';
import { Zap, Clock, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Dumbbell } from 'lucide-react-native';
import { colors, muscleColors, radii } from '@/constants/theme';
import { formatDaysSinceLastDone } from '@/utils/formatTime';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 32, 460);
const CARD_HEIGHT = Math.min(SCREEN_HEIGHT * 0.62, 540);
const SWIPE_Y_THRESHOLD = SCREEN_HEIGHT * 0.12;
const SWIPE_X_THRESHOLD = SCREEN_WIDTH * 0.22;

const SNAP_SPRING = { damping: 26, stiffness: 500, mass: 0.45 };

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
  onSwipeLeft,
  onSwipeRight,
  showCycleControls,
  isTop,
  index,
}: SwipeCardProps) {
  const scaleForIndex = index === 0 ? 1 : 0.94;
  const translateYForIndex = index === 0 ? 0 : 16;
  const opacityForIndex = index === 0 ? 1 : 0.45;

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
      pressed.value = withSpring(0.97, { damping: 20, stiffness: 600 });
    })
    .onUpdate((event) => {
      const absX = Math.abs(event.translationX);
      const absY = Math.abs(event.translationY);

      if (absY > absX) {
        translateY.value = event.translationY * 0.82;
        translateX.value = 0;
      } else if (showCycleControls) {
        translateX.value = event.translationX * 0.55;
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
    const rotate = interpolate(
      translateY.value,
      [-SCREEN_HEIGHT * 0.3, 0, SCREEN_HEIGHT * 0.3],
      [-2.5, 0, 2.5],
      Extrapolation.CLAMP
    );
    const rotateX = interpolate(
      translateX.value,
      [-SCREEN_WIDTH * 0.3, 0, SCREEN_WIDTH * 0.3],
      [1.5, 0, -1.5],
      Extrapolation.CLAMP
    );
    return {
      opacity: cardOpacity.value,
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value + stackOffset.value },
        { rotate: `${rotate + rotateX}deg` },
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

  const leftOverlayOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_X_THRESHOLD, -40], [1, 0], Extrapolation.CLAMP),
  }));

  const rightOverlayOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [40, SWIPE_X_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));

  const primaryMuscles = exercise.muscles.filter((m) => m.impact >= 0.7);
  const secondaryMuscles = exercise.muscles.filter((m) => m.impact < 0.7 && m.impact >= 0.3);
  const topMuscles = [...primaryMuscles, ...secondaryMuscles].slice(0, 5);
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
          <View style={styles.topBar}>
            <View style={styles.topBarLeft}>
              <View style={styles.iconWrap}>
                <Dumbbell size={14} color={colors.accent} />
              </View>
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

            <View style={styles.swipeHints}>
              {showCycleControls ? (
                <View style={styles.hintRow}>
                  <View style={styles.hintItem}>
                    <ChevronLeft size={12} color={colors.textMuted} strokeWidth={2.5} />
                    <ChevronRight size={12} color={colors.textMuted} strokeWidth={2.5} />
                    <Text style={styles.hintText}>wechseln</Text>
                  </View>
                  <View style={styles.hintDot} />
                  <View style={styles.hintItem}>
                    <ArrowUp size={12} color={colors.accent} strokeWidth={2.5} />
                    <Text style={[styles.hintText, { color: colors.accent }]}>starten</Text>
                  </View>
                  <View style={styles.hintDot} />
                  <View style={styles.hintItem}>
                    <ArrowDown size={12} color={colors.danger} strokeWidth={2.5} />
                    <Text style={[styles.hintText, { color: colors.danger }]}>snooze</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.hintRow}>
                  <View style={styles.hintItem}>
                    <ArrowUp size={12} color={colors.accent} strokeWidth={2.5} />
                    <Text style={[styles.hintText, { color: colors.accent }]}>starten</Text>
                  </View>
                  <View style={styles.hintDot} />
                  <View style={styles.hintItem}>
                    <ArrowDown size={12} color={colors.danger} strokeWidth={2.5} />
                    <Text style={[styles.hintText, { color: colors.danger }]}>snooze</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>

        <Animated.View style={[styles.overlay, styles.overlayUp, upOverlayOpacity]} pointerEvents="none">
          <View style={styles.overlayBadge}>
            <ArrowUp size={28} color="#000" strokeWidth={3} />
            <Text style={styles.overlayBadgeText}>START</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.overlay, styles.overlayDown, downOverlayOpacity]} pointerEvents="none">
          <View style={[styles.overlayBadge, styles.overlayBadgeRed]}>
            <ArrowDown size={28} color="#fff" strokeWidth={3} />
            <Text style={[styles.overlayBadgeText, styles.overlayBadgeTextRed]}>SNOOZE</Text>
          </View>
        </Animated.View>

        {showCycleControls && (
          <>
            <Animated.View style={[styles.overlay, styles.overlaySide, leftOverlayOpacity]} pointerEvents="none">
              <View style={styles.overlayBadgeSide}>
                <ChevronLeft size={28} color={colors.info} strokeWidth={2.5} />
              </View>
            </Animated.View>
            <Animated.View style={[styles.overlay, styles.overlaySide, rightOverlayOpacity]} pointerEvents="none">
              <View style={styles.overlayBadgeSide}>
                <ChevronRight size={28} color={colors.info} strokeWidth={2.5} />
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
    gap: 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  bottomSection: {
    gap: 16,
  },
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
  swipeHints: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  hintItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hintText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  hintDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.textMuted,
    opacity: 0.4,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radii.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayUp: {
    backgroundColor: 'rgba(34, 197, 94, 0.92)',
  },
  overlayDown: {
    backgroundColor: 'rgba(20, 20, 22, 0.94)',
    borderWidth: 2,
    borderColor: colors.danger,
  },
  overlaySide: {
    backgroundColor: 'rgba(15, 20, 30, 0.88)',
    borderWidth: 2,
    borderColor: colors.info,
  },
  overlayBadge: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: radii.xl,
  },
  overlayBadgeRed: {
    backgroundColor: colors.danger,
  },
  overlayBadgeText: {
    fontSize: 22,
    fontFamily: 'Inter-ExtraBold',
    color: '#000',
    letterSpacing: 4,
  },
  overlayBadgeTextRed: {
    color: '#fff',
  },
  overlayBadgeSide: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.infoMuted,
    borderWidth: 1,
    borderColor: colors.info,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
