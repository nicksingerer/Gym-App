import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Minus, Plus, ChevronRight } from 'lucide-react-native';
import { colors, radii } from '@/constants/theme';
import { HistoryEntry, HistorySet } from '@/types/api';

interface SetInputScreenProps {
  exerciseName: string;
  lastSession: HistoryEntry | null;
  completedSets: HistorySet[];
  onNext: (weightKg: number, reps: number) => void;
}

export function SetInputScreen({
  exerciseName,
  lastSession,
  completedSets,
  onNext,
}: SetInputScreenProps) {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [error, setError] = useState<string | null>(null);

  const buttonScale = useSharedValue(1);
  const animatedButton = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const adjustWeight = (delta: number) => {
    const current = parseFloat(weight) || 0;
    const next = Math.max(0, Math.min(300, current + delta));
    setWeight(next.toString());
  };

  const adjustReps = (delta: number) => {
    const current = parseInt(reps, 10) || 0;
    const next = Math.max(1, Math.min(50, current + delta));
    setReps(next.toString());
  };

  const prefillFromSet = (set: { weightKg: number; reps: number }) => {
    setWeight(set.weightKg.toString());
    setReps(set.reps.toString());
  };

  const handleNext = () => {
    const w = parseFloat(weight);
    const r = parseInt(reps, 10);

    if (isNaN(w) || w < 0) {
      setError('Gewicht eingeben');
      return;
    }
    if (isNaN(r) || r < 1) {
      setError('Wiederholungen eingeben');
      return;
    }

    setError(null);
    buttonScale.value = withSpring(0.93, { damping: 15, stiffness: 400 });
    setTimeout(() => {
      buttonScale.value = withSpring(1);
      onNext(w, r);
    }, 100);
  };

  const lastSetDetails = lastSession?.setDetails || [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <Animated.View entering={FadeInUp.duration(500).delay(100).springify()} style={styles.inputSection}>
        <View style={styles.inputRow}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Gewicht</Text>
            <View style={styles.stepperRow}>
              <Pressable
                style={({ pressed }) => [styles.stepperBtn, pressed && styles.stepperBtnPressed]}
                onPress={() => adjustWeight(-2.5)}
              >
                <Minus size={20} color={colors.text} strokeWidth={2.5} />
              </Pressable>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.numericInput}
                  value={weight}
                  onChangeText={(t) => {
                    setError(null);
                    setWeight(t.replace(/[^0-9.]/g, ''));
                  }}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  selectTextOnFocus
                />
                <Text style={styles.unitLabel}>kg</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.stepperBtn, pressed && styles.stepperBtnPressed]}
                onPress={() => adjustWeight(2.5)}
              >
                <Plus size={20} color={colors.text} strokeWidth={2.5} />
              </Pressable>
            </View>
          </View>

          <View style={styles.inputDivider} />

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Reps</Text>
            <View style={styles.stepperRow}>
              <Pressable
                style={({ pressed }) => [styles.stepperBtn, pressed && styles.stepperBtnPressed]}
                onPress={() => adjustReps(-1)}
              >
                <Minus size={20} color={colors.text} strokeWidth={2.5} />
              </Pressable>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.numericInput}
                  value={reps}
                  onChangeText={(t) => {
                    setError(null);
                    setReps(t.replace(/[^0-9]/g, ''));
                  }}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  selectTextOnFocus
                />
              </View>
              <Pressable
                style={({ pressed }) => [styles.stepperBtn, pressed && styles.stepperBtnPressed]}
                onPress={() => adjustReps(1)}
              >
                <Plus size={20} color={colors.text} strokeWidth={2.5} />
              </Pressable>
            </View>
          </View>
        </View>
      </Animated.View>

      {error && (
        <Animated.Text entering={FadeIn.duration(200)} style={styles.errorText}>
          {error}
        </Animated.Text>
      )}

      <Animated.View style={[styles.nextButtonWrap, animatedButton]}>
        <Pressable
          style={({ pressed }) => [styles.nextButton, pressed && styles.nextButtonPressed]}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>Weiter</Text>
          <ChevronRight size={18} color="#000" />
        </Pressable>
      </Animated.View>

      {completedSets.length > 0 && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.setsSection}>
          <Text style={styles.sectionTitle}>Heutige Satze</Text>
          <View style={styles.setsTable}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colSet]}>Satz</Text>
              <Text style={[styles.tableHeaderText, styles.colWeight]}>kg</Text>
              <Text style={[styles.tableHeaderText, styles.colReps]}>Reps</Text>
              <Text style={[styles.tableHeaderText, styles.colRpe]}>RPE</Text>
            </View>
            {completedSets.map((set) => (
              <Pressable
                key={set.id}
                style={({ pressed }) => [styles.tableRow, styles.tableRowCompleted, pressed && styles.tableRowPressed]}
                onPress={() => prefillFromSet(set)}
              >
                <Text style={[styles.tableCell, styles.colSet, styles.tableCellCompleted]}>{set.setIndex + 1}</Text>
                <Text style={[styles.tableCell, styles.colWeight, styles.tableCellCompleted]}>{set.weightKg}</Text>
                <Text style={[styles.tableCell, styles.colReps, styles.tableCellCompleted]}>{set.reps}</Text>
                <Text style={[styles.tableCell, styles.colRpe, styles.tableCellCompleted]}>{set.rpe}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      )}

      {lastSession && lastSetDetails.length > 0 && (
        <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.setsSection}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Letzte Session</Text>
            <Text style={styles.sectionMeta}>RPE {lastSession.rpe}</Text>
          </View>
          <View style={styles.setsTable}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colSet]}>Satz</Text>
              <Text style={[styles.tableHeaderText, styles.colWeight]}>kg</Text>
              <Text style={[styles.tableHeaderText, styles.colReps]}>Reps</Text>
              <Text style={[styles.tableHeaderText, styles.colRpe]}>RPE</Text>
            </View>
            {lastSetDetails.map((set, idx) => (
              <Pressable
                key={idx}
                style={({ pressed }) => [styles.tableRow, pressed && styles.tableRowPressed]}
                onPress={() => prefillFromSet(set)}
              >
                <Text style={[styles.tableCell, styles.colSet]}>{set.setIndex + 1}</Text>
                <Text style={[styles.tableCell, styles.colWeight]}>{set.weightKg}</Text>
                <Text style={[styles.tableCell, styles.colReps]}>{set.reps}</Text>
                <Text style={[styles.tableCell, styles.colRpe]}>{set.rpe}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.tapHint}>Tippe eine Zeile zum Ubernehmen</Text>
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  inputSection: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputGroup: {
    flex: 1,
    alignItems: 'center',
  },
  inputDivider: {
    width: 1,
    backgroundColor: colors.border,
    height: 90,
    marginHorizontal: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: colors.textTertiary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnPressed: {
    backgroundColor: colors.cardHover,
    transform: [{ scale: 0.92 }],
  },
  inputWrap: {
    alignItems: 'center',
  },
  numericInput: {
    width: 90,
    height: 56,
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    textAlign: 'center',
    fontSize: 30,
    fontFamily: 'Inter-ExtraBold',
    color: colors.text,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },
  unitLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: colors.textTertiary,
    marginTop: 4,
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: colors.danger,
    textAlign: 'center',
    marginBottom: 12,
  },
  nextButtonWrap: {
    marginBottom: 24,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: radii.lg,
  },
  nextButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  nextButtonText: {
    color: '#000',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  setsSection: {
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: colors.textSecondary,
    marginBottom: 10,
  },
  sectionMeta: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: colors.textTertiary,
    marginBottom: 10,
  },
  setsTable: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeaderText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  tableRowCompleted: {
    backgroundColor: 'rgba(34, 197, 94, 0.04)',
  },
  tableRowPressed: {
    backgroundColor: colors.surface,
  },
  tableCell: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: colors.textSecondary,
  },
  tableCellCompleted: {
    color: colors.text,
    fontFamily: 'Inter-SemiBold',
  },
  colSet: {
    width: 48,
    textAlign: 'center',
  },
  colWeight: {
    flex: 1,
    textAlign: 'center',
  },
  colReps: {
    flex: 1,
    textAlign: 'center',
  },
  colRpe: {
    width: 48,
    textAlign: 'center',
  },
  tapHint: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 8,
  },
});
