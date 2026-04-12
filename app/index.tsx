import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Pressable,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  FadeInUp,
  FadeOutDown,
  FadeOutUp,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '@/services/api';
import { ExerciseGroup, Exercise } from '@/types/api';
import { SwipeCard } from '@/components/SwipeCard';
import { ExerciseSlider } from '@/components/ExerciseSlider';
import { ActionToast } from '@/components/ActionToast';
import { Dumbbell, RefreshCw } from 'lucide-react-native';
import { colors, radii } from '@/constants/theme';

const BUFFER_SIZE = 5;
const VISIBLE_CARDS = 2;

type ToastType = { type: 'snoozed' | 'started'; exerciseName: string } | null;

interface CardItem {
  key: string;
  exercise: Exercise;
  clusterName: string;
  clusterSize: number;
  clusterIndex: number;
  groupId: number;
  exercises: Exercise[];
}

function flattenGroups(groups: ExerciseGroup[]): CardItem[] {
  return groups.map((group) => ({
    key: `g-${group.id}`,
    exercise: group.exercises[0],
    clusterName: group.name,
    clusterSize: group.exercises.length,
    clusterIndex: 0,
    groupId: group.id,
    exercises: group.exercises,
  }));
}

export default function HomeScreen() {
  const router = useRouter();
  const [cards, setCards] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [bufferLoading, setBufferLoading] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastType>(null);
  const isSwiping = useRef(false);
  const [headerKey, setHeaderKey] = useState(0);

  const fillBuffer = useCallback(async () => {
    if (bufferLoading || exhausted) return;
    setBufferLoading(true);
    try {
      const data = await api.getQueue(BUFFER_SIZE);
      if (data.length === 0) {
        setExhausted(true);
      } else {
        setCards((prev) => [...prev, ...flattenGroups(data)]);
      }
    } catch (err) {
      console.error('Buffer fill error:', err);
    } finally {
      setBufferLoading(false);
    }
  }, [bufferLoading, exhausted]);

  const initialLoad = async () => {
    setLoading(true);
    setError(null);
    setExhausted(false);
    try {
      const data = await api.getQueue(BUFFER_SIZE);
      if (data.length === 0) setExhausted(true);
      setCards(flattenGroups(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Übungen');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { initialLoad(); }, []));

  useEffect(() => {
    if (cards.length < 3 && !exhausted && !bufferLoading) fillBuffer();
  }, [cards.length, exhausted, bufferLoading, fillBuffer]);

  const showToast = (type: 'snoozed' | 'started', exerciseName: string) => {
    setToast({ type, exerciseName });
    setTimeout(() => setToast(null), 2000);
  };

  const removeCard = (key: string) => {
    setCards((prev) => prev.filter((c) => c.key !== key));
    setHeaderKey((k) => k + 1);
  };

  const selectExercise = (index: number) => {
    setCards((prev) =>
      prev.map((card, idx) => {
        if (idx !== 0) return card;
        return { ...card, clusterIndex: index, exercise: card.exercises[index] };
      })
    );
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={styles.centerContainer}>
          <View style={styles.loadingIcon}>
            <Dumbbell size={32} color={colors.accent} />
          </View>
          <ActivityIndicator size="small" color={colors.textTertiary} style={{ marginTop: 16 }} />
          <Text style={styles.loadingText}>Lade Übungen...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.screen}>
        <View style={styles.centerContainer}>
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Verbindungsfehler</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
              onPress={initialLoad}
            >
              <RefreshCw size={16} color="#000" />
              <Text style={styles.retryButtonText}>Erneut versuchen</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  if (exhausted && cards.length === 0) {
    return (
      <View style={styles.screen}>
        <View style={styles.centerContainer}>
          <Animated.View entering={FadeIn.duration(400)} style={styles.doneCard}>
            <View style={styles.doneIcon}>
              <Dumbbell size={32} color={colors.accent} />
            </View>
            <Text style={styles.doneTitle}>Alles erledigt!</Text>
            <Text style={styles.doneText}>Du hast alle verfügbaren Übungen durchgearbeitet.</Text>
          </Animated.View>
        </View>
      </View>
    );
  }

  const visibleCards = cards.slice(0, VISIBLE_CARDS);
  const topCard = cards[0] ?? null;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Training</Text>
      </View>

      {topCard && (
        <Animated.View
          key={`header-${topCard.key}-${headerKey}`}
          entering={SlideInDown.duration(300).springify().damping(20).stiffness(200)}
          exiting={FadeOutUp.duration(150)}
          style={styles.clusterHeader}
        >
          <Text style={styles.clusterName}>{topCard.clusterName}</Text>
          {topCard.clusterSize > 1 && (
            <View style={styles.clusterCount}>
              <Text style={styles.clusterCountText}>
                {topCard.clusterIndex + 1}/{topCard.clusterSize}
              </Text>
            </View>
          )}
        </Animated.View>
      )}

      <View style={styles.cardContainer}>
        {visibleCards.map((card, index) => {
          const handleSwipeUp = () => {
            if (isSwiping.current) return;
            isSwiping.current = true;
            removeCard(card.key);
            showToast('started', card.exercise.name);
            router.push(`/exercise/${card.exercise.id}`);
            isSwiping.current = false;
          };

          const handleSwipeDown = async () => {
            if (isSwiping.current) return;
            isSwiping.current = true;
            removeCard(card.key);
            showToast('snoozed', card.clusterName);
            try {
              await api.snoozeExercise({ exerciseId: card.exercise.id });
            } catch (err) {
              console.error('Snooze error:', err);
            } finally {
              isSwiping.current = false;
            }
          };

          return (
            <SwipeCard
              key={card.key}
              exercise={card.exercise}
              onSwipeUp={handleSwipeUp}
              onSwipeDown={handleSwipeDown}
              isTop={index === 0}
              index={index}
            />
          );
        })}

        {bufferLoading && cards.length > 0 && (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.bufferIndicator}>
            <ActivityIndicator size="small" color={colors.textTertiary} />
            <Text style={styles.bufferText}>Lade nächste Übung...</Text>
          </Animated.View>
        )}
      </View>

      {topCard && topCard.clusterSize > 1 && (
        <Animated.View
          key={`slider-${topCard.key}`}
          entering={FadeInUp.duration(300)}
          exiting={FadeOutDown.duration(150)}
          style={styles.sliderContainer}
        >
          <ExerciseSlider
            exercises={topCard.exercises}
            activeIndex={topCard.clusterIndex}
            onSelect={selectExercise}
          />
        </Animated.View>
      )}

      {toast && <ActionToast type={toast.type} exerciseName={toast.exerciseName} />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingTop: Platform.OS === 'web' ? 48 : 64,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Inter-ExtraBold',
    color: colors.text,
    letterSpacing: -0.5,
  },
  clusterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingBottom: 14,
  },
  clusterName: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  clusterCount: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  clusterCountText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: colors.textTertiary,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingIcon: {
    width: 72,
    height: 72,
    borderRadius: radii.xl,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginTop: 8,
  },
  errorCard: {
    backgroundColor: colors.card,
    borderRadius: radii.xxl,
    padding: 32,
    maxWidth: 360,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: colors.text,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: radii.md,
  },
  retryButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  retryButtonText: {
    color: '#000',
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
  doneCard: {
    alignItems: 'center',
  },
  doneIcon: {
    width: 72,
    height: 72,
    borderRadius: radii.xl,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  doneTitle: {
    fontSize: 24,
    fontFamily: 'Inter-ExtraBold',
    color: colors.text,
    marginBottom: 8,
  },
  doneText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  sliderContainer: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: Platform.OS === 'web' ? 32 : 48,
  },
  bufferIndicator: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bufferText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
});
