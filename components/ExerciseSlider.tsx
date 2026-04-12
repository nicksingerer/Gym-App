import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Exercise } from '@/types/api';
import { colors, radii } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 32, 460);
const ITEM_WIDTH = 140;
const ITEM_GAP = 8;
const SNAP_INTERVAL = ITEM_WIDTH + ITEM_GAP;

interface ExerciseSliderProps {
  exercises: Exercise[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export function ExerciseSlider({ exercises, activeIndex, onSelect }: ExerciseSliderProps) {
  const scrollRef = useRef<ScrollView>(null);
  const isScrollingRef = useRef(false);

  React.useEffect(() => {
    if (isScrollingRef.current) return;
    const containerWidth = CARD_WIDTH - 32;
    const offset = activeIndex * SNAP_INTERVAL - containerWidth / 2 + ITEM_WIDTH / 2;
    scrollRef.current?.scrollTo({ x: Math.max(0, offset), animated: true });
  }, [activeIndex]);

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      isScrollingRef.current = false;
      const offsetX = e.nativeEvent.contentOffset.x;
      const containerWidth = CARD_WIDTH - 32;
      const adjustedOffset = offsetX + containerWidth / 2 - ITEM_WIDTH / 2;
      const index = Math.round(adjustedOffset / SNAP_INTERVAL);
      const clamped = Math.max(0, Math.min(exercises.length - 1, index));
      onSelect(clamped);
    },
    [exercises.length, onSelect]
  );

  const handleScrollBegin = useCallback(() => {
    isScrollingRef.current = true;
  }, []);

  const containerWidth = CARD_WIDTH - 32;
  const sidePadding = containerWidth / 2 - ITEM_WIDTH / 2;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: sidePadding }]}
        decelerationRate="fast"
        snapToInterval={SNAP_INTERVAL}
        snapToAlignment="center"
        scrollEventThrottle={16}
        onScrollBeginDrag={handleScrollBegin}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
      >
        {exercises.map((ex, i) => {
          const isActive = i === activeIndex;
          return (
            <View
              key={ex.id}
              style={[
                styles.item,
                isActive ? styles.itemActive : styles.itemInactive,
                i < exercises.length - 1 && { marginRight: ITEM_GAP },
              ]}
            >
              <Text
                style={[styles.name, isActive ? styles.nameActive : styles.nameInactive]}
                numberOfLines={2}
              >
                {ex.name}
              </Text>
              {isActive && <View style={styles.activeLine} />}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.dotBar}>
        {exercises.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotInactive]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    gap: 12,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  item: {
    width: ITEM_WIDTH,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
    minHeight: 64,
    justifyContent: 'space-between',
  },
  itemActive: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accentBorder,
  },
  itemInactive: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.05)',
  },
  name: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    lineHeight: 17,
  },
  nameActive: {
    color: colors.text,
  },
  nameInactive: {
    color: 'rgba(255,255,255,0.28)',
  },
  activeLine: {
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.accent,
    marginTop: 8,
  },
  dotBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
  dotActive: {
    width: 16,
    backgroundColor: colors.accent,
  },
  dotInactive: {
    width: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
});
