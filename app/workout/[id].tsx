import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  SlideInLeft,
} from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { api } from '@/services/api';
import { HistoryEntry, HistorySet, TrainingSession, Exercise } from '@/types/api';
import { SetInputScreen } from '@/components/workout/SetInputScreen';
import { RpeScreen } from '@/components/workout/RpeScreen';
import { TimerScreen } from '@/components/workout/TimerScreen';
import { SummaryScreen } from '@/components/workout/SummaryScreen';
import { colors, radii } from '@/constants/theme';

type WorkoutScreen = 'input' | 'rpe' | 'timer' | 'summary';

export default function WorkoutSessionScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const exerciseId = Number(params.id);

  const [screen, setScreen] = useState<WorkoutScreen>('input');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [lastSession, setLastSession] = useState<HistoryEntry | null>(null);
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [completedSets, setCompletedSets] = useState<HistorySet[]>([]);

  const [pendingWeight, setPendingWeight] = useState(0);
  const [pendingReps, setPendingReps] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    initSession();
  }, [exerciseId]);

  const initSession = async () => {
    setLoading(true);
    setError(null);
    try {
      const [exerciseData, historyData, sessionData] = await Promise.all([
        api.getExercise(exerciseId),
        api.getExerciseHistory(exerciseId, 1),
        api.createSession({ exerciseId }),
      ]);
      setExercise(exerciseData);
      setLastSession(historyData.length > 0 ? historyData[0] : null);
      setSession(sessionData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Starten');
    } finally {
      setLoading(false);
    }
  };

  const handleSetInput = useCallback((weightKg: number, reps: number) => {
    setPendingWeight(weightKg);
    setPendingReps(reps);
    setScreen('rpe');
  }, []);

  const handleRpeSelect = useCallback(async (rpe: number) => {
    if (!session || saving) return;
    setSaving(true);
    try {
      const newSet = await api.addSet(session.id, {
        weightKg: pendingWeight,
        reps: pendingReps,
        rpe,
      });
      setCompletedSets((prev) => [...prev, newSet]);
      setScreen('timer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
      setScreen('input');
    } finally {
      setSaving(false);
    }
  }, [session, pendingWeight, pendingReps, saving]);

  const handleNewSet = useCallback(() => {
    setScreen('input');
  }, []);

  const handleFinish = useCallback(() => {
    if (completedSets.length > 0) {
      setScreen('summary');
    } else {
      router.replace('/');
    }
  }, [router, completedSets]);

  const handleSummaryDone = useCallback(() => {
    router.replace('/');
  }, [router]);

  const handleBack = () => {
    if (completedSets.length > 0) {
      setShowExitConfirm(true);
    } else {
      router.back();
    }
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Session wird erstellt...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.screen}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => router.back()} style={styles.errorButton}>
            <Text style={styles.errorButtonText}>Zurück</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.backIcon, pressed && styles.backIconPressed]}
        >
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {exercise?.name || 'Training'}
          </Text>
          {screen !== 'summary' && (
            <Text style={styles.headerSubtitle}>
              Satz {completedSets.length + (screen === 'timer' ? 0 : 1)}
            </Text>
          )}
          {screen === 'summary' && (
            <Text style={styles.headerSubtitle}>
              {completedSets.length} {completedSets.length === 1 ? 'Satz' : 'Satze'}
            </Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {saving && (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.savingBanner}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.savingText}>Speichern...</Text>
        </Animated.View>
      )}

      <View style={styles.content}>
        {screen === 'input' && (
          <Animated.View
            key="input"
            entering={completedSets.length > 0 ? SlideInLeft.duration(300) : FadeIn.duration(300)}
            exiting={SlideOutLeft.duration(250)}
            style={styles.screenWrap}
          >
            <SetInputScreen
              exerciseName={exercise?.name || ''}
              lastSession={lastSession}
              completedSets={completedSets}
              onNext={handleSetInput}
            />
          </Animated.View>
        )}

        {screen === 'rpe' && (
          <Animated.View
            key="rpe"
            entering={SlideInRight.duration(300)}
            exiting={SlideOutLeft.duration(250)}
            style={styles.screenWrap}
          >
            <RpeScreen
              weightKg={pendingWeight}
              reps={pendingReps}
              onSelect={handleRpeSelect}
            />
          </Animated.View>
        )}

        {screen === 'timer' && (
          <Animated.View
            key="timer"
            entering={SlideInRight.duration(300)}
            style={styles.screenWrap}
          >
            <TimerScreen
              completedSets={completedSets}
              onNewSet={handleNewSet}
              onFinish={handleFinish}
            />
          </Animated.View>
        )}

        {screen === 'summary' && (
          <Animated.View
            key="summary"
            entering={SlideInRight.duration(350)}
            style={styles.screenWrap}
          >
            <SummaryScreen
              exerciseName={exercise?.name || ''}
              completedSets={completedSets}
              lastSession={lastSession}
              onDone={handleSummaryDone}
            />
          </Animated.View>
        )}
      </View>

      {showExitConfirm && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.overlay}>
          <Animated.View entering={FadeIn.duration(300)} style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Training verlassen?</Text>
            <Text style={styles.confirmText}>
              Du hast {completedSets.length} Satz/Sätze gespeichert. Willst du wirklich zurück?
            </Text>
            <View style={styles.confirmButtons}>
              <Pressable
                style={({ pressed }) => [styles.confirmCancel, pressed && { opacity: 0.7 }]}
                onPress={() => setShowExitConfirm(false)}
              >
                <Text style={styles.confirmCancelText}>Weiter trainieren</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.confirmExit, pressed && { opacity: 0.7 }]}
                onPress={() => {
                  setShowExitConfirm(false);
                  router.back();
                }}
              >
                <Text style={styles.confirmExitText}>Verlassen</Text>
              </Pressable>
            </View>
          </Animated.View>
        </Animated.View>
      )}
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
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: colors.accent,
    marginTop: 2,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: colors.textSecondary,
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  errorButton: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: radii.md,
  },
  errorButtonText: {
    color: '#000',
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
  savingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    backgroundColor: colors.accentMuted,
  },
  savingText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: colors.accent,
  },
  content: {
    flex: 1,
  },
  screenWrap: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  confirmCard: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  confirmButtons: {
    gap: 10,
  },
  confirmCancel: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.accent,
  },
  confirmCancelText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#000',
  },
  confirmExit: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.dangerMuted,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  confirmExitText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: colors.danger,
  },
});
