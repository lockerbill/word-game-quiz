import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Share, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, GameModeConfig } from '../../src/theme/theme';
import { useGameStore } from '../../src/store/gameStore';
import { useUserStore } from '../../src/store/userStore';

function getReasonLabel(reason?: string): string {
  switch (reason) {
    case 'exact_match':
      return 'Exact match';
    case 'fuzzy_match':
      return 'Close match';
    case 'wrong_letter':
      return 'Wrong starting letter';
    case 'empty':
      return 'Skipped';
    case 'ai_validated':
      return 'AI validated';
    case 'ai_rejected':
      return 'AI rejected';
    case 'ai_error':
      return 'AI unavailable';
    default:
      return 'No match';
  }
}

function getValidationMeta(reason?: string, provider?: string | null): string {
  const label = getReasonLabel(reason);
  if (!provider || !reason?.startsWith('ai_')) {
    return label;
  }

  return `${label} (${provider})`;
}

export default function ResultsScreen() {
  const router = useRouter();
  const { session, submissionStatus, resetGame } = useGameStore();
  const { recordGame, newAchievements, clearNewAchievements } = useUserStore();
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const recorded = useRef(false);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);

  useEffect(() => {
    if (!session?.score || recorded.current) return;
    recorded.current = true;

    // Record game
    recordGame(
      {
        id: session.id,
        mode: session.mode,
        letter: session.letter,
        score: session.score.finalScore,
        correctCount: session.score.correctCount,
        totalQuestions: session.score.totalQuestions,
        xpEarned: session.score.xpEarned,
        timeUsed: session.timeUsed,
        date: new Date().toISOString(),
      },
      session.score,
      session.mode,
      session.letter
    );

    // Animate
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(scoreAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();
  }, [session]);

  const handleShare = async () => {
    if (!session?.score) return;
    try {
      await Share.share({
        message: `⚡ Alpha Bucks Challenge!\n\nLetter: ${session.letter}\nScore: ${session.score.correctCount}/${session.score.totalQuestions}\nPoints: ${session.score.finalScore}\nMode: ${GameModeConfig[session.mode].label}\n\nCan you beat my score? 🎮`,
      });
    } catch {}
  };

  const handlePlayAgain = () => {
    clearNewAchievements();
    resetGame();
    router.replace(`/game/${session?.mode || 'practice'}`);
  };

  const handleHome = () => {
    clearNewAchievements();
    resetGame();
    router.replace('/');
  };

  if (!session?.score) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Loading results...</Text>
      </SafeAreaView>
    );
  }

  const score = session.score;
  const scorePercentage = score.correctCount / score.totalQuestions;
  const resultEmoji = scorePercentage === 1 ? '🏆' : scorePercentage >= 0.7 ? '🎉' : scorePercentage >= 0.4 ? '👍' : '💪';
  const resultText = scorePercentage === 1 ? 'PERFECT!' : scorePercentage >= 0.7 ? 'Great Job!' : scorePercentage >= 0.4 ? 'Not Bad!' : 'Keep Trying!';
  const validationList = Object.values(session.validations);
  const aiValidatedCount = validationList.filter((item) => item.reason === 'ai_validated').length;
  const deterministicCount = validationList.filter((item) => item.reason === 'exact_match' || item.reason === 'fuzzy_match').length;
  const rejectedCount = validationList.filter((item) => !item.valid && item.reason !== 'empty').length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.heroSection, { opacity: fadeAnim }]}>
          {/* Result Header */}
          <Text style={styles.resultEmoji}>{resultEmoji}</Text>
          <Text style={styles.resultText}>{resultText}</Text>

          {/* Score */}
          <Animated.View style={[
            styles.scoreCircle,
            { transform: [{ scale: scoreAnim }] }
          ]}>
            <Text style={styles.scoreNumber}>{score.correctCount}</Text>
            <Text style={styles.scoreTotal}>/{score.totalQuestions}</Text>
          </Animated.View>

          {/* Points */}
          <View style={styles.pointsRow}>
            <View style={styles.pointItem}>
              <Text style={styles.pointValue}>{score.finalScore}</Text>
              <Text style={styles.pointLabel}>Points</Text>
            </View>
            <View style={styles.pointDivider} />
            <View style={styles.pointItem}>
              <Text style={styles.pointValue}>+{score.xpEarned}</Text>
              <Text style={styles.pointLabel}>XP Earned</Text>
            </View>
            <View style={styles.pointDivider} />
            <View style={styles.pointItem}>
              <Text style={styles.pointValue}>×{score.multiplier.toFixed(1)}</Text>
              <Text style={styles.pointLabel}>Multiplier</Text>
            </View>
          </View>

          {submissionStatus === 'submitting' && (
            <View style={[styles.serverStatusPill, styles.serverStatusPending]}>
              <Text style={styles.serverStatusText}>Syncing with server validation...</Text>
            </View>
          )}
          {submissionStatus === 'submitted' && (
            <View style={[styles.serverStatusPill, styles.serverStatusSuccess]}>
              <Text style={styles.serverStatusText}>Server-validated results</Text>
            </View>
          )}
          {submissionStatus === 'failed' && (
            <View style={[styles.serverStatusPill, styles.serverStatusFallback]}>
              <Text style={styles.serverStatusText}>Submission failed. Please retry from game screen.</Text>
            </View>
          )}
        </Animated.View>

        {/* New Achievements */}
        {newAchievements.length > 0 && (
          <View style={styles.achieveSection}>
            <Text style={styles.achieveTitle}>🎊 New Achievements!</Text>
            {newAchievements.map(ach => (
              <View key={ach.id} style={styles.achieveRow}>
                <Text style={styles.achieveEmoji}>{ach.emoji}</Text>
                <View>
                  <Text style={styles.achieveName}>{ach.name}</Text>
                  <Text style={styles.achieveDesc}>{ach.description}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Answer Breakdown */}
        <Text style={styles.sectionTitle}>Answer Breakdown</Text>
        <View style={styles.insightsCard}>
          <Text style={styles.insightsTitle}>Validation Insights</Text>
          <View style={styles.insightsRow}>
            <View style={styles.insightItem}>
              <Text style={styles.insightValue}>{aiValidatedCount}</Text>
              <Text style={styles.insightLabel}>AI Validated</Text>
            </View>
            <View style={styles.insightDivider} />
            <View style={styles.insightItem}>
              <Text style={styles.insightValue}>{deterministicCount}</Text>
              <Text style={styles.insightLabel}>Deterministic</Text>
            </View>
            <View style={styles.insightDivider} />
            <View style={styles.insightItem}>
              <Text style={styles.insightValue}>{rejectedCount}</Text>
              <Text style={styles.insightLabel}>Rejected</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.correctAnswersToggleBtn}
          onPress={() => setShowCorrectAnswers((prev) => !prev)}
          activeOpacity={0.8}
        >
          <Text style={styles.correctAnswersToggleText}>
            {showCorrectAnswers ? '🙈 Hide Correct Answers' : '📚 View All Correct Answers'}
          </Text>
        </TouchableOpacity>

        {showCorrectAnswers && (
          <View style={styles.correctAnswersCard}>
            <Text style={styles.correctAnswersTitle}>All Correct Answers</Text>
            {session.categories.map((cat) => {
              const validation = session.validations[cat.id];
              const correctAnswers =
                validation?.correctAnswers?.length
                  ? validation.correctAnswers
                  : validation?.matchedAnswer
                    ? [validation.matchedAnswer]
                    : [];

              return (
                <View key={`correct-${cat.id}`} style={styles.correctAnswersRow}>
                  <Text style={styles.correctAnswersCategory}>{cat.emoji} {cat.name}</Text>
                  {correctAnswers.length > 0 ? (
                    <Text style={styles.correctAnswersValue}>{correctAnswers.join(', ')}</Text>
                  ) : (
                    <Text style={styles.correctAnswersEmpty}>
                      No curated answer list available for this category yet.
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.breakdownCard}>
          <View style={styles.letterBanner}>
            <Text style={styles.letterBannerText}>Letter: {session.letter}</Text>
          </View>
          {session.categories.map((cat, i) => {
            const v = session.validations[cat.id];
            const answer = session.answers[cat.id] || '';
            const valid = v?.valid;
            return (
              <View key={cat.id} style={styles.breakdownRow}>
                <Text style={styles.brkEmoji}>{cat.emoji}</Text>
                <View style={styles.brkContent}>
                  <Text style={styles.brkCat}>{cat.name}</Text>
                  <Text style={[styles.brkAnswer, valid ? styles.brkValid : styles.brkInvalid]}>
                    {answer || '(skipped)'}
                  </Text>
                  <Text style={styles.brkMeta}>{getValidationMeta(v?.reason, v?.provider)}</Text>
                </View>
                <Text style={styles.brkStatus}>{valid ? '✅' : answer ? '❌' : '⏭️'}</Text>
              </View>
            );
          })}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
            <Text style={styles.shareBtnText}>📤 Share Results</Text>
          </TouchableOpacity>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.playAgainBtn} onPress={handlePlayAgain} activeOpacity={0.8}>
              <Text style={styles.playAgainText}>🔄 Play Again</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.homeBtn} onPress={handleHome} activeOpacity={0.8}>
            <Text style={styles.homeBtnText}>🏠 Home</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { color: Colors.textPrimary, textAlign: 'center', marginTop: 100, fontSize: 18 },
  scroll: { padding: Spacing.lg },
  heroSection: { alignItems: 'center', marginBottom: Spacing.xl },
  resultEmoji: { fontSize: 56, marginBottom: 8 },
  resultText: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.md },
  scoreCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: Colors.primary + '15', borderWidth: 4, borderColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg,
  },
  scoreNumber: { fontSize: 48, fontWeight: '800', color: Colors.primary },
  scoreTotal: { fontSize: 18, fontWeight: '600', color: Colors.textTertiary, marginTop: -4 },
  pointsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.glassBorder,
  },
  pointItem: { flex: 1, alignItems: 'center' },
  pointValue: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  pointLabel: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  pointDivider: { width: 1, height: 30, backgroundColor: Colors.glassBorder },
  serverStatusPill: {
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.round,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  serverStatusPending: {
    backgroundColor: Colors.accentOrange + '20',
    borderColor: Colors.accentOrange + '55',
  },
  serverStatusSuccess: {
    backgroundColor: Colors.accentGreen + '20',
    borderColor: Colors.accentGreen + '55',
  },
  serverStatusFallback: {
    backgroundColor: Colors.surface,
    borderColor: Colors.glassBorder,
  },
  serverStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  achieveSection: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, marginBottom: Spacing.lg,
    borderWidth: 1, borderColor: Colors.primary + '40',
  },
  achieveTitle: { fontSize: 18, fontWeight: '700', color: Colors.primary, marginBottom: Spacing.sm, textAlign: 'center' },
  achieveRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 6,
  },
  achieveEmoji: { fontSize: 28 },
  achieveName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  achieveDesc: { fontSize: 12, color: Colors.textTertiary },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  insightsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  insightsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  insightsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightItem: { flex: 1, alignItems: 'center' },
  insightValue: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  insightLabel: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  insightDivider: { width: 1, height: 28, backgroundColor: Colors.glassBorder },
  correctAnswersToggleBtn: {
    backgroundColor: Colors.primary + '15',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '55',
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  correctAnswersToggleText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  correctAnswersCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  correctAnswersTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  correctAnswersRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  correctAnswersCategory: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  correctAnswersValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  correctAnswersEmpty: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  breakdownCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    overflow: 'hidden', marginBottom: Spacing.lg,
    borderWidth: 1, borderColor: Colors.glassBorder,
  },
  letterBanner: {
    backgroundColor: Colors.primary + '15', paddingVertical: 8, alignItems: 'center',
  },
  letterBannerText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  breakdownRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.glassBorder,
  },
  brkEmoji: { fontSize: 18, marginRight: 10 },
  brkContent: { flex: 1 },
  brkCat: { fontSize: 12, color: Colors.textTertiary, fontWeight: '500' },
  brkAnswer: { fontSize: 15, fontWeight: '600', marginTop: 1 },
  brkMeta: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  brkValid: { color: Colors.correctAnswer },
  brkInvalid: { color: Colors.wrongAnswer },
  brkStatus: { fontSize: 18, marginLeft: 8 },
  actions: { gap: Spacing.sm },
  actionsRow: { flexDirection: 'row', gap: Spacing.sm },
  shareBtn: {
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg,
    paddingVertical: 14, alignItems: 'center',
  },
  shareBtnText: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  playAgainBtn: {
    flex: 1, backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    paddingVertical: 14, alignItems: 'center',
  },
  playAgainText: { fontSize: 16, fontWeight: '700', color: Colors.textDark },
  homeBtn: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.glassBorder,
  },
  homeBtnText: { fontSize: 16, fontWeight: '700', color: Colors.textSecondary },
});
