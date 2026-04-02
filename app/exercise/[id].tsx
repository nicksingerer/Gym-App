import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInRight,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { api } from '@/services/api';
import { HistoryEntry, Exercise } from '@/types/api';
import { ArrowLeft, Dumbbell } from 'lucide-react-native';
import { colors, muscleColors, radii } from '@/constants/theme';
import { formatTime } from '@/utils/formatTime';

export default function ExerciseOverviewScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const exerciseId = Number(params.id);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const buttonScale = useSharedValue(1);
  const buttonPressed = useSharedValue(0);

  useEffect(() => {
    loadData();
  }, [exerciseId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [historyData, exerciseData] = await Promise.all([
        api.getExerciseHistory(exerciseId, 5),
        api.getExercise(exerciseId),
      ]);
      setHistory(historyData);
      setExercise(exerciseData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => {
    buttonScale.value = withSpring(0.92, { damping: 15, stiffness: 400 });
    setTimeout(() => {
      router.push(`/workout/${exerciseId}`);
    }, 100);
  };

  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonScale.value }],
    };
  });

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.screen}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>Zurück</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const lastSession = history[0];

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.backIcon, pressed && styles.backIconPressed]}
        >
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>Übersicht</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {exercise && (
          <Animated.View entering={FadeInDown.duration(500).springify().damping(20)} style={styles.exerciseCard}>
            <Animated.View entering={FadeIn.duration(400).delay(200)} style={styles.exerciseIconWrap}>
              <Dumbbell size={28} color={colors.accent} />
            </Animated.View>
            <Animated.Text entering={FadeInUp.duration(400).delay(300)} style={styles.exerciseName}>
              {exercise.name}
            </Animated.Text>
            {exercise.description && (
              <Animated.Text entering={FadeIn.duration(400).delay(350)} style={styles.exerciseDescription}>
                {exercise.description}
              </Animated.Text>
            )}
            {exercise.muscles && exercise.muscles.length > 0 && (
              <Animated.View entering={FadeInUp.duration(400).delay(400)} style={styles.musclesContainer}>
                {exercise.muscles
                  .sort((a, b) => b.impact - a.impact)
                  .map((em, i) => {
                    const colorSet = muscleColors[i % muscleColors.length];
                    const isPrimary = em.impact >= 0.7;
                    return (
                      <Animated.View
                        key={em.muscleId}
                        entering={FadeIn.duration(300).delay(450 + i * 50)}
                        style={[
                          styles.musclePill,
                          { backgroundColor: colorSet.bg, borderColor: colorSet.border },
                          !isPrimary && styles.musclePillSecondary,
                        ]}
                      >
                        <Text style={[styles.musclePillText, { color: colorSet.text }]}>
                          {em.muscle.name}
                        </Text>
                      </Animated.View>
                    );
                  })}
              </Animated.View>
            )}
          </Animated.View>
        )}

        {lastSession ? (
          <Animated.View entering={SlideInRight.duration(500).delay(600).springify().damping(18)} style={styles.historySection}>
            <Animated.Text entering={FadeIn.duration(400).delay(700)} style={styles.sectionTitle}>
              Letztes Training
            </Animated.Text>
            <Animated.View entering={FadeInDown.duration(500).delay(750).springify()} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <Animated.Text entering={FadeIn.duration(400).delay(850)} style={styles.historyDate}>
                  {formatTime(lastSession.createdAt)}
                </Animated.Text>
                <Animated.View entering={FadeInUp.duration(400).delay(900)} style={styles.historyStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Sätze</Text>
                    <Text style={styles.statValue}>{lastSession.sets}</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>RPE Ø</Text>
                    <Text style={styles.statValue}>{lastSession.rpe}</Text>
                  </View>
                </Animated.View>
              </View>

              {lastSession.setDetails && lastSession.setDetails.length > 0 && (
                <View style={styles.setsContainer}>
                  <Animated.Text entering={FadeIn.duration(400).delay(950)} style={styles.setsTitle}>
                    Sätze
                  </Animated.Text>
                  {lastSession.setDetails.slice(0, 3).map((set, idx) => (
                    <Animated.View
                      key={idx}
                      entering={SlideInRight.duration(400).delay(1000 + idx * 80).springify()}
                      style={styles.setRow}
                    >
                      <View style={styles.setNumber}>
                        <Text style={styles.setNumberText}>{set.setIndex}</Text>
                      </View>
                      <View style={styles.setDetails}>
                        <Text style={styles.setDetailText}>
                          {set.weightKg} kg × {set.reps}
                        </Text>
                        <Text style={styles.setRpe}>RPE {set.rpe}</Text>
                      </View>
                    </Animated.View>
                  ))}
                </View>
              )}
            </Animated.View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.duration(500).delay(600).springify()} style={styles.noHistoryCard}>
            <Animated.Text entering={FadeIn.duration(400).delay(700)} style={styles.noHistoryTitle}>
              Noch kein Training
            </Animated.Text>
            <Animated.Text entering={FadeIn.duration(400).delay(750)} style={styles.noHistoryText}>
              Dies ist deine erste Session für diese Übung.
            </Animated.Text>
          </Animated.View>
        )}
      </ScrollView>

      <Animated.View entering={FadeInUp.duration(500).delay(1200).springify()} style={styles.footer}>
        <Animated.View style={animatedButtonStyle}>
          <Pressable
            onPress={handleStart}
            style={({ pressed }) => [styles.startButton, pressed && styles.startButtonPressed]}
          >
            <Text style={styles.startButtonText}>Übung starten</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'web' ? 48 : 64,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIconPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 0,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 16,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: radii.md,
  },
  backButtonText: {
    color: '#000',
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
  exerciseCard: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginBottom: 24,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 4,
        }),
  },
  exerciseIconWrap: {
    width: 64,
    height: 64,
    borderRadius: radii.lg,
    backgroundColor: colors.accentMuted,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  exerciseName: {
    fontSize: 24,
    fontFamily: 'Inter-ExtraBold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  exerciseDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  musclesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    marginTop: 4,
  },
  musclePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  musclePillSecondary: {
    opacity: 0.7,
  },
  musclePillText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  historySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: colors.text,
    marginBottom: 12,
  },
  historyCard: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 2,
        }),
  },
  historyHeader: {
    marginBottom: 16,
  },
  historyDate: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: colors.textTertiary,
    marginBottom: 12,
  },
  historyStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 28,
    fontFamily: 'Inter-ExtraBold',
    color: colors.text,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  setsContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  setsTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: colors.text,
    marginBottom: 12,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  setNumber: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    backgroundColor: colors.accentMuted,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNumberText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: colors.accent,
  },
  setDetails: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  setDetailText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: colors.text,
  },
  setRpe: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: colors.textSecondary,
    backgroundColor: colors.cardHover,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  previousSessions: {
    marginTop: 16,
  },
  previousTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: colors.text,
    marginBottom: 8,
  },
  previousCard: {
    backgroundColor: colors.cardHover,
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previousDate: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: colors.textTertiary,
    marginBottom: 6,
  },
  previousStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previousStat: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: colors.textSecondary,
  },
  previousStatDot: {
    fontSize: 13,
    color: colors.textTertiary,
  },
  noHistoryCard: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: 32,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  noHistoryTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: colors.text,
    marginBottom: 8,
  },
  noHistoryText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === 'web' ? 20 : 40,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  startButton: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 8px 24px rgba(234, 179, 8, 0.3)' }
      : {
          shadowColor: colors.accent,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 6,
        }),
  },
  startButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  startButtonText: {
    color: '#000',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
});
