import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Star } from 'lucide-react-native';
import { colors, radii } from '@/constants/theme';

const RPE_LABELS: Record<number, { label: string; description: string; color: string }> = {
  1: { label: 'Little Effort', description: 'Kaum Anstrengung, viele Reserven', color: '#22C55E' },
  2: { label: 'Light Effort', description: 'Leicht, noch 5+ Wiederholungen drin', color: '#84CC16' },
  3: { label: '3 RIR', description: 'Moderat, noch ca. 3 Wiederholungen drin', color: '#EAB308' },
  4: { label: 'Hard', description: 'Schwer, nur noch 1-2 Wiederholungen drin', color: '#F97316' },
  5: { label: 'Maximum Effort', description: 'Alles gegeben, nichts mehr drin', color: '#EF4444' },
};

interface RpeScreenProps {
  weightKg: number;
  reps: number;
  onSelect: (rpe: number) => void;
}

export function RpeScreen({ weightKg, reps, onSelect }: RpeScreenProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [hovering, setHovering] = useState<number | null>(null);

  const confirmScale = useSharedValue(1);
  const confirmAnimated = useAnimatedStyle(() => ({
    transform: [{ scale: confirmScale.value }],
  }));

  const activeValue = hovering ?? selected;
  const activeInfo = activeValue ? RPE_LABELS[activeValue] : null;

  const handleStarPress = (value: number) => {
    setSelected(value);
  };

  const handleConfirm = () => {
    if (!selected) return;
    confirmScale.value = withSpring(0.93, { damping: 12, stiffness: 400 });
    setTimeout(() => {
      confirmScale.value = withSpring(1);
      onSelect(selected);
    }, 120);
  };

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.summaryCard}>
        <Text style={styles.summaryValue}>
          {weightKg} kg  x  {reps}
        </Text>
      </Animated.View>

      <Animated.Text entering={FadeIn.duration(400).delay(100)} style={styles.title}>
        Wie schwer war es?
      </Animated.Text>

      <Animated.View entering={FadeInUp.duration(500).delay(200).springify()} style={styles.starsSection}>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((value) => {
            const isFilled = activeValue !== null && value <= activeValue;
            const starColor = isFilled && activeInfo ? activeInfo.color : colors.textTertiary;

            return (
              <Pressable
                key={value}
                onPress={() => handleStarPress(value)}
                onPressIn={() => setHovering(value)}
                onPressOut={() => setHovering(null)}
                style={({ pressed }) => [styles.starBtn, pressed && styles.starBtnPressed]}
              >
                <Star
                  size={40}
                  color={starColor}
                  fill={isFilled ? starColor : 'transparent'}
                  strokeWidth={1.5}
                />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.descriptionWrap}>
          {activeInfo ? (
            <Animated.View entering={FadeIn.duration(200)} key={activeValue}>
              <Text style={[styles.rpeLabel, { color: activeInfo.color }]}>{activeInfo.label}</Text>
              <Text style={styles.rpeDescription}>{activeInfo.description}</Text>
            </Animated.View>
          ) : (
            <Text style={styles.rpePlaceholder}>Wahle deine Anstrengung</Text>
          )}
        </View>
      </Animated.View>

      <View style={styles.spacer} />

      {selected && (
        <Animated.View entering={FadeInUp.duration(300).springify()} style={[confirmAnimated]}>
          <Pressable
            style={({ pressed }) => [styles.confirmButton, pressed && styles.confirmButtonPressed]}
            onPress={handleConfirm}
          >
            <Text style={styles.confirmButtonText}>Bestatigen</Text>
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
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginBottom: 32,
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: 'Inter-ExtraBold',
    color: colors.text,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  starsSection: {
    alignItems: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  starBtn: {
    padding: 4,
  },
  starBtnPressed: {
    transform: [{ scale: 1.15 }],
  },
  descriptionWrap: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rpeLabel: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  rpeDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  rpePlaceholder: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.textTertiary,
    textAlign: 'center',
  },
  spacer: {
    flex: 1,
  },
  confirmButton: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: radii.lg,
    alignItems: 'center',
  },
  confirmButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  confirmButtonText: {
    color: '#000',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
});
