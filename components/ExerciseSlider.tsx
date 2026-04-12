import React, { useCallback, useMemo } from 'react';
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
  runOnJS,
} from 'react-native-reanimated';
import { Exercise } from '@/types/api';
import { colors, radii } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TRACK_WIDTH = Math.min(SCREEN_WIDTH - 64, 400);
const THUMB_SIZE = 28;
const TRACK_HEIGHT = 6;

const SPRING_CONFIG = { damping: 22, stiffness: 400, mass: 0.4 };

interface ExerciseSliderProps {
  exercises: Exercise[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export function ExerciseSlider({ exercises, activeIndex, onSelect }: ExerciseSliderProps) {
  const count = exercises.length;
  const maxIndex = count - 1;

  const usableWidth = TRACK_WIDTH - THUMB_SIZE;
  const stepWidth = maxIndex > 0 ? usableWidth / maxIndex : 0;

  const getPositionForIndex = useCallback(
    (idx: number) => idx * stepWidth,
    [stepWidth]
  );

  const thumbX = useSharedValue(getPositionForIndex(activeIndex));
  const isDragging = useSharedValue(false);
  const startX = useSharedValue(0);

  React.useEffect(() => {
    if (!isDragging.value) {
      thumbX.value = withSpring(getPositionForIndex(activeIndex), SPRING_CONFIG);
    }
  }, [activeIndex, getPositionForIndex]);

  const snapPositions = useMemo(
    () => Array.from({ length: count }, (_, i) => getPositionForIndex(i)),
    [count, getPositionForIndex]
  );

  const emitSelect = useCallback(
    (idx: number) => {
      if (idx !== activeIndex) onSelect(idx);
    },
    [activeIndex, onSelect]
  );

  const panGesture = Gesture.Pan()
    .minDistance(1)
    .onStart(() => {
      isDragging.value = true;
      startX.value = thumbX.value;
    })
    .onUpdate((e) => {
      const raw = startX.value + e.translationX;
      thumbX.value = Math.max(0, Math.min(usableWidth, raw));
    })
    .onEnd(() => {
      isDragging.value = false;
      let closest = 0;
      let minDist = Infinity;
      for (let i = 0; i < snapPositions.length; i++) {
        const d = Math.abs(thumbX.value - snapPositions[i]);
        if (d < minDist) {
          minDist = d;
          closest = i;
        }
      }
      thumbX.value = withSpring(snapPositions[closest], SPRING_CONFIG);
      runOnJS(emitSelect)(closest);
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: thumbX.value + THUMB_SIZE / 2,
  }));

  const tickElements = useMemo(() => {
    return exercises.map((ex, i) => {
      const left = getPositionForIndex(i) + THUMB_SIZE / 2;
      return (
        <View key={ex.id} style={[styles.tickContainer, { left }]}>
          <View
            style={[
              styles.tick,
              i === activeIndex ? styles.tickActive : styles.tickInactive,
            ]}
          />
        </View>
      );
    });
  }, [exercises, activeIndex, getPositionForIndex]);

  const labelElements = useMemo(() => {
    if (count <= 1) return null;

    const labels: { index: number; name: string }[] = [];
    labels.push({ index: 0, name: exercises[0].name });
    if (maxIndex > 0) labels.push({ index: maxIndex, name: exercises[maxIndex].name });

    if (count > 2) {
      const mid = Math.floor(count / 2);
      if (mid !== 0 && mid !== maxIndex) {
        labels.push({ index: mid, name: exercises[mid].name });
      }
    }

    return labels.map(({ index, name }) => {
      const left = getPositionForIndex(index) + THUMB_SIZE / 2;
      return (
        <View key={index} style={[styles.labelWrap, { left }]}>
          <Text
            style={[
              styles.labelText,
              index === activeIndex && styles.labelTextActive,
            ]}
            numberOfLines={1}
          >
            {name}
          </Text>
        </View>
      );
    });
  }, [exercises, count, maxIndex, activeIndex, getPositionForIndex]);

  if (count <= 1) return null;

  return (
    <View style={styles.container}>
      <View style={styles.activeNameRow}>
        <Text style={styles.activeIndex}>{activeIndex + 1}/{count}</Text>
        <Text style={styles.activeName} numberOfLines={1}>
          {exercises[activeIndex].name}
        </Text>
      </View>

      <GestureDetector gesture={panGesture}>
        <View style={[styles.trackOuter, { width: TRACK_WIDTH }]}>
          <View style={styles.track}>
            <Animated.View style={[styles.trackFill, fillStyle]} />
          </View>

          {tickElements}

          <Animated.View style={[styles.thumb, thumbStyle]}>
            <View style={styles.thumbInner} />
          </Animated.View>
        </View>
      </GestureDetector>

      <View style={[styles.labelsRow, { width: TRACK_WIDTH }]}>
        {labelElements}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
  },
  activeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activeIndex: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: colors.accent,
    backgroundColor: colors.accentMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  activeName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: colors.text,
    maxWidth: TRACK_WIDTH - 60,
  },
  trackOuter: {
    height: 44,
    justifyContent: 'center',
    position: 'relative',
    ...(Platform.OS === 'web' ? { cursor: 'grab' as any } : {}),
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: TRACK_HEIGHT / 2,
    opacity: 0.5,
  },
  tickContainer: {
    position: 'absolute',
    top: '50%',
    marginTop: -5,
    marginLeft: -2.5,
    width: 5,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  tickActive: {
    backgroundColor: colors.accent,
  },
  tickInactive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  thumb: {
    position: 'absolute',
    top: '50%',
    marginTop: -THUMB_SIZE / 2,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 8px rgba(34, 197, 94, 0.4), 0 0 0 4px rgba(34, 197, 94, 0.15)' }
      : {
          shadowColor: colors.accent,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
          elevation: 6,
        }),
  },
  thumbInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#000',
    opacity: 0.3,
  },
  labelsRow: {
    position: 'relative',
    height: 18,
  },
  labelWrap: {
    position: 'absolute',
    transform: [{ translateX: -40 }],
    width: 80,
    alignItems: 'center',
  },
  labelText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: colors.textTertiary,
  },
  labelTextActive: {
    color: colors.accent,
    fontFamily: 'Inter-Bold',
  },
});
