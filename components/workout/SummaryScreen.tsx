import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from 'react-native-reanimated';
import { CircleCheck as CheckCircle, TrendingUp, Dumbbell, RotateCcw, ChevronRight } from 'lucide-react-native';
import { colors, radii } from '@/constants/theme';
import { HistorySet, HistoryEntry } from '@/types/api';
import { formatRelativeTime } from '@/utils/formatTime';

interface SummaryScreenProps {
  exerciseName: string;
  completedSets: HistorySet[];
  lastSession: HistoryEntry | null;
  onDone: () => void;
}

function rpeLabel(rpe: number): string {
  if (rpe <= 6) return 'Leicht';
  if (rpe <= 7) return 'Moderat';
  if (rpe <= 8) return 'Schwer';
  if (rpe <= 9) return 'Sehr schwer';
  return 'Maximal';
}

function rpeColor(rpe: number): string {
  if (rpe <= 6) return colors.accent;
  if (rpe <= 7) return colors.info;
  if (rpe <= 8) return colors.warning;
  return colors.danger;
}

export function SummaryScreen({
  exerciseName,
  completedSets,
  lastSession,
  onDone,
}: SummaryScreenProps) {
  const totalVolume = useMemo(
    () => completedSets.reduce((sum, s) => sum + s.weightKg * s.reps, 0),
    [completedSets]
  );

  const avgRpe = useMemo(() => {
    if (completedSets.length === 0) return 0;
    return completedSets.reduce((sum, s) => sum + s.rpe, 0) / completedSets.length;
  }, [completedSets]);

  const maxWeight = useMemo(
    () => Math.max(...completedSets.map((s) => s.weightKg), 0),
    [completedSets]
  );

  const lastVolume = useMemo(() => {
    if (!lastSession?.setDetails) return null;
    return lastSession.setDetails.reduce((sum, s) => sum + s.weightKg * s.reps, 0);
  }, [lastSession]);

  const volumeDiff = lastVolume != null ? totalVolume - lastVolume : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={ZoomIn.duration(500).springify()} style={styles.successIcon}>
        <CheckCircle size={56} color={colors.accent} strokeWidth={1.5} />
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(400).delay(150)} style={styles.titleSection}>
        <Text style={styles.title}>Workout abgeschlossen</Text>
        <Text style={styles.subtitle}>{exerciseName}</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(250)} style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrap, { backgroundColor: colors.accentMuted }]}>
            <Dumbbell size={18} color={colors.accent} />
          </View>
          <Text style={styles.statValue}>{completedSets.length}</Text>
          <Text style={styles.statLabel}>{completedSets.length === 1 ? 'Satz' : 'Satze'}</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statCard}>
          <View style={[styles.statIconWrap, { backgroundColor: colors.infoMuted }]}>
            <TrendingUp size={18} color={colors.info} />
          </View>
          <Text style={styles.statValue}>
            {totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}t` : `${totalVolume}kg`}
          </Text>
          <Text style={styles.statLabel}>Volumen</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statCard}>
          <View style={[styles.statIconWrap, { backgroundColor: colors.warningMuted }]}>
            <RotateCcw size={18} color={colors.warning} />
          </View>
          <Text style={styles.statValue}>{maxWeight}kg</Text>
          <Text style={styles.statLabel}>Max Gewicht</Text>
        </View>
      </Animated.View>

      {volumeDiff != null && (
        <Animated.View entering={FadeInDown.duration(350).delay(350)} style={[
          styles.comparisonBanner,
          volumeDiff >= 0 ? styles.comparisonPositive : styles.comparisonNegative,
        ]}>
          <TrendingUp
            size={16}
            color={volumeDiff >= 0 ? colors.accent : colors.danger}
            style={volumeDiff < 0 ? { transform: [{ scaleY: -1 }] } : undefined}
          />
          <Text style={[
            styles.comparisonText,
            { color: volumeDiff >= 0 ? colors.accent : colors.danger },
          ]}>
            {volumeDiff >= 0 ? '+' : ''}{volumeDiff}kg Volumen vs. letzte Session
          </Text>
        </Animated.View>
      )}

      <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.setsSection}>
        <Text style={styles.sectionTitle}>Satze</Text>
        <View style={styles.setsTable}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colSet]}>Satz</Text>
            <Text style={[styles.tableHeaderText, styles.colWeight]}>Gewicht</Text>
            <Text style={[styles.tableHeaderText, styles.colReps]}>Reps</Text>
            <Text style={[styles.tableHeaderText, styles.colRpe]}>RPE</Text>
            <Text style={[styles.tableHeaderText, styles.colVolume]}>Vol.</Text>
          </View>
          {completedSets.map((set, idx) => (
            <Animated.View
              key={set.id}
              entering={FadeIn.duration(300).delay(350 + idx * 60)}
              style={[styles.tableRow, idx < completedSets.length - 1 && styles.tableRowBorder]}
            >
              <Text style={[styles.tableCell, styles.colSet, styles.setIndexCell]}>
                {set.setIndex + 1}
              </Text>
              <Text style={[styles.tableCell, styles.colWeight]}>{set.weightKg} kg</Text>
              <Text style={[styles.tableCell, styles.colReps]}>{set.reps}</Text>
              <View style={[styles.colRpe, styles.rpeCellWrap]}>
                <View style={[styles.rpeBadge, { backgroundColor: `${rpeColor(set.rpe)}18` }]}>
                  <Text style={[styles.rpeBadgeText, { color: rpeColor(set.rpe) }]}>{set.rpe}</Text>
                </View>
              </View>
              <Text style={[styles.tableCell, styles.colVolume, styles.volumeCell]}>
                {set.weightKg * set.reps}
              </Text>
            </Animated.View>
          ))}
          <View style={styles.tableTotalsRow}>
            <Text style={[styles.tableTotalLabel, styles.colSet]} />
            <Text style={[styles.tableTotalLabel, styles.colWeight]} />
            <Text style={[styles.tableTotalLabel, styles.colReps]} />
            <View style={[styles.colRpe, styles.rpeCellWrap]}>
              <Text style={styles.tableTotalSubLabel}>Ø {avgRpe.toFixed(1)}</Text>
            </View>
            <Text style={[styles.tableTotalValue, styles.colVolume]}>{totalVolume}</Text>
          </View>
        </View>
      </Animated.View>

      {lastSession && (lastSession.setDetails?.length ?? 0) > 0 && (
        <Animated.View entering={FadeInDown.duration(400).delay(450)} style={styles.setsSection}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Letzte Session</Text>
            {lastSession.createdAt && (
              <Text style={styles.sectionMeta}>{formatRelativeTime(lastSession.createdAt)}</Text>
            )}
          </View>
          <View style={styles.setsTable}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colSet]}>Satz</Text>
              <Text style={[styles.tableHeaderText, styles.colWeight]}>Gewicht</Text>
              <Text style={[styles.tableHeaderText, styles.colReps]}>Reps</Text>
              <Text style={[styles.tableHeaderText, styles.colRpe]}>RPE</Text>
              <Text style={[styles.tableHeaderText, styles.colVolume]}>Vol.</Text>
            </View>
            {lastSession.setDetails!.map((set, idx) => (
              <View
                key={idx}
                style={[styles.tableRow, styles.tableRowMuted, idx < lastSession.setDetails!.length - 1 && styles.tableRowBorder]}
              >
                <Text style={[styles.tableCellMuted, styles.colSet]}>{set.setIndex + 1}</Text>
                <Text style={[styles.tableCellMuted, styles.colWeight]}>{set.weightKg} kg</Text>
                <Text style={[styles.tableCellMuted, styles.colReps]}>{set.reps}</Text>
                <Text style={[styles.tableCellMuted, styles.colRpe, { textAlign: 'center' }]}>{set.rpe}</Text>
                <Text style={[styles.tableCellMuted, styles.colVolume, styles.volumeCell]}>
                  {set.weightKg * set.reps}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>
      )}

      <Animated.View entering={FadeInDown.duration(400).delay(500)} style={styles.doneButtonWrap}>
        <Pressable
          style={({ pressed }) => [styles.doneButton, pressed && styles.doneButtonPressed]}
          onPress={onDone}
        >
          <Text style={styles.doneButtonText}>Fertig</Text>
          <ChevronRight size={18} color="#000" />
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
    alignItems: 'center',
  },
  successIcon: {
    marginTop: 12,
    marginBottom: 16,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    marginBottom: 12,
    paddingVertical: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter-ExtraBold',
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  comparisonBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radii.lg,
    marginBottom: 20,
    borderWidth: 1,
  },
  comparisonPositive: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accentBorder,
  },
  comparisonNegative: {
    backgroundColor: colors.dangerMuted,
    borderColor: colors.dangerBorder,
  },
  comparisonText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
  },
  setsSection: {
    width: '100%',
    marginBottom: 20,
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
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    alignItems: 'center',
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
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  tableRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  tableRowMuted: {
    opacity: 0.65,
  },
  tableTotalsRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.cardElevated,
  },
  tableCell: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: colors.text,
    textAlign: 'center',
  },
  tableCellMuted: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  setIndexCell: {
    color: colors.textTertiary,
    fontFamily: 'Inter-Medium',
  },
  volumeCell: {
    color: colors.textSecondary,
    fontFamily: 'Inter-Medium',
    fontSize: 13,
  },
  tableTotalLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: colors.textTertiary,
    textAlign: 'center',
  },
  tableTotalSubLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: colors.textTertiary,
    textAlign: 'center',
    width: '100%',
  },
  tableTotalValue: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: colors.accent,
    textAlign: 'center',
  },
  rpeCellWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rpeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
    minWidth: 32,
    alignItems: 'center',
  },
  rpeBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
  colSet: {
    width: 40,
    textAlign: 'center',
  },
  colWeight: {
    flex: 1.2,
    textAlign: 'center',
  },
  colReps: {
    flex: 0.8,
    textAlign: 'center',
  },
  colRpe: {
    width: 52,
    textAlign: 'center',
  },
  colVolume: {
    width: 48,
    textAlign: 'right',
  },
  doneButtonWrap: {
    width: '100%',
    marginTop: 4,
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: radii.lg,
  },
  doneButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  doneButtonText: {
    color: '#000',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
});
