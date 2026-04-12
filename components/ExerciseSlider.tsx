import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Exercise } from '@/types/api';
import { colors, radii } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 32, 460);
const ITEM_WIDTH = 120;
const ITEM_GAP = 8;

interface ExerciseSliderProps {
  exercises: Exercise[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

function SliderItem({
  exercise,
  isActive,
  onPress,
  position,
  activeIndex,
}: {
  exercise: Exercise;
  isActive: boolean;
  onPress: () => void;
  position: number;
  activeIndex: number;
}) {
  const distance = Math.abs(position - activeIndex);
  const scale = interpolate(distance, [0, 1, 2], [1, 0.93, 0.88], Extrapolation.CLAMP);
  const opacity = interpolate(distance, [0, 1, 2], [1, 0.55, 0.3], Extrapolation.CLAMP);

  return (
    <Pressable onPress={onPress}>
      {({ pressed: p }) => (
        <View
          style={[
            sliderItemStyles.item,
            isActive && sliderItemStyles.itemActive,
            { transform: [{ scale: p ? 0.96 : scale }], opacity },
          ]}
        >
          <Text style={[sliderItemStyles.name, isActive && sliderItemStyles.nameActive]} numberOfLines={2}>
            {exercise.name}
          </Text>
          {isActive && <View style={sliderItemStyles.activeDot} />}
        </View>
      )}
    </Pressable>
  );
}

const sliderItemStyles = StyleSheet.create({
  item: {
    width: ITEM_WIDTH,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'space-between',
    minHeight: 60,
  },
  itemActive: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accentBorder,
  },
  name: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: colors.textSecondary,
    lineHeight: 16,
  },
  nameActive: {
    color: colors.text,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.accent,
    marginTop: 6,
  },
});

export function ExerciseSlider({ exercises, activeIndex, onSelect }: ExerciseSliderProps) {
  const scrollRef = useRef<ScrollView>(null);

  const scrollToIndex = useCallback(
    (index: number) => {
      const totalWidth = exercises.length * (ITEM_WIDTH + ITEM_GAP) - ITEM_GAP;
      const containerWidth = CARD_WIDTH - 32;
      const offset = index * (ITEM_WIDTH + ITEM_GAP) - containerWidth / 2 + ITEM_WIDTH / 2;
      scrollRef.current?.scrollTo({ x: Math.max(0, offset), animated: true });
    },
    [exercises.length]
  );

  React.useEffect(() => {
    scrollToIndex(activeIndex);
  }, [activeIndex]);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={ITEM_WIDTH + ITEM_GAP}
        snapToAlignment="start"
        scrollEventThrottle={16}
      >
        {exercises.map((ex, i) => (
          <SliderItem
            key={ex.id}
            exercise={ex}
            isActive={i === activeIndex}
            position={i}
            activeIndex={activeIndex}
            onPress={() => onSelect(i)}
          />
        ))}
      </ScrollView>

      <View style={styles.dotBar}>
        {exercises.map((_, i) => (
          <Pressable key={i} onPress={() => onSelect(i)}>
            <View
              style={[
                styles.dot,
                i === activeIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    gap: 10,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: ITEM_GAP,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 2,
  },
  dot: {
    height: 5,
    borderRadius: 2.5,
  },
  dotActive: {
    width: 18,
    backgroundColor: colors.accent,
  },
  dotInactive: {
    width: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
});
