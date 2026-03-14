import React, { useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, Dimensions
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, GameModeConfig, GameMode } from '../../src/theme/theme';
import { useGameStore } from '../../src/store/gameStore';

const { width } = Dimensions.get('window');

export default function GamePlayScreen() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const router = useRouter();
  const gameMode = (mode || 'practice') as GameMode;

  const {
    session, timeRemaining, isPlaying, isFinished,
    startGame, setAnswer, tick, finishGame, setTimeRemaining,
  } = useGameStore();

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Start game on mount
  useEffect(() => {
    startGame(gameMode);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Timer tick
  useEffect(() => {
    if (!session || session.timerDuration === 0) return;
    if (!isPlaying) return;

    timerRef.current = setInterval(() => {
      tick();
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, session]);

  // Navigate to results when finished
  useEffect(() => {
    if (isFinished && session?.score) {
      router.replace('/game/results');
    }
  }, [isFinished]);

  const handleAnswerChange = useCallback((categoryId: number, text: string) => {
    setAnswer(categoryId, text);
  }, []);

  const handleSubmitAll = () => {
    const score = finishGame();
    // Results navigation handled by isFinished effect
  };

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </SafeAreaView>
    );
  }

  const config = GameModeConfig[gameMode];
  const timerColor = timeRemaining > 15 ? Colors.timerGreen
    : timeRemaining > 7 ? Colors.timerYellow
    : Colors.timerRed;

  const timerProgress = session.timerDuration > 0
    ? timeRemaining / session.timerDuration
    : 1;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header with Letter + Timer */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.modeLabel}>{config.icon} {config.label}</Text>
          </View>
          <View style={styles.letterCircle}>
            <Text style={styles.letterText}>{session.letter}</Text>
          </View>
          <View style={styles.headerRight}>
            {session.timerDuration > 0 ? (
              <View style={styles.timerWrap}>
                <View style={styles.timerBarBg}>
                  <View style={[
                    styles.timerBarFill,
                    { width: `${timerProgress * 100}%`, backgroundColor: timerColor }
                  ]} />
                </View>
                <Text style={[styles.timerText, { color: timerColor }]}>
                  {timeRemaining}s
                </Text>
              </View>
            ) : (
              <Text style={styles.relaxLabel}>∞ No Timer</Text>
            )}
          </View>
        </View>

        {/* Instruction */}
        <Text style={styles.instruction}>
          Answer each category with a word starting with <Text style={styles.highlight}>{session.letter}</Text>
        </Text>

        {/* Category Inputs */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {session.categories.map((cat, index) => {
            const validation = session.validations[cat.id];
            const answer = session.answers[cat.id] || '';
            const hasAnswer = answer.trim().length > 0;
            const isValid = validation?.valid;

            return (
              <View key={cat.id} style={styles.categoryRow}>
                <View style={styles.catLabelRow}>
                  <Text style={styles.catNumber}>{index + 1}</Text>
                  <Text style={styles.catEmoji}>{cat.emoji}</Text>
                  <Text style={styles.catName}>{cat.name}</Text>
                  {hasAnswer && (
                    <Text style={styles.validIcon}>
                      {isValid ? '✅' : '❌'}
                    </Text>
                  )}
                </View>
                <TextInput
                  ref={ref => inputRefs.current[index] = ref}
                  style={[
                    styles.answerInput,
                    hasAnswer && isValid && styles.inputValid,
                    hasAnswer && !isValid && styles.inputInvalid,
                  ]}
                  placeholder={`${cat.name} starting with ${session.letter}...`}
                  placeholderTextColor={Colors.textTertiary}
                  value={answer}
                  onChangeText={text => handleAnswerChange(cat.id, text)}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType={index < 9 ? 'next' : 'done'}
                  onSubmitEditing={() => {
                    if (index < 9) {
                      inputRefs.current[index + 1]?.focus();
                    }
                  }}
                />
              </View>
            );
          })}

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmitAll}
            activeOpacity={0.8}
          >
            <Text style={styles.submitText}>SUBMIT ANSWERS</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { color: Colors.textPrimary, textAlign: 'center', marginTop: 100, fontSize: 18 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
  },
  headerLeft: { width: 80 },
  modeLabel: { fontSize: 12, fontWeight: '600', color: Colors.textTertiary },
  letterCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.primary + '20', borderWidth: 3,
    borderColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  letterText: { fontSize: 32, fontWeight: '800', color: Colors.primary },
  headerRight: { width: 100, alignItems: 'flex-end' },
  timerWrap: { alignItems: 'flex-end' },
  timerBarBg: {
    width: 80, height: 6, backgroundColor: Colors.surfaceLight,
    borderRadius: 3, overflow: 'hidden', marginBottom: 4,
  },
  timerBarFill: { height: '100%', borderRadius: 3 },
  timerText: { fontSize: 20, fontWeight: '800' },
  relaxLabel: { fontSize: 13, color: Colors.accentGreen, fontWeight: '600' },
  instruction: {
    textAlign: 'center', color: Colors.textSecondary, fontSize: 13,
    paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm,
  },
  highlight: { color: Colors.primary, fontWeight: '800', fontSize: 15 },
  scrollArea: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg },
  categoryRow: { marginBottom: Spacing.sm },
  catLabelRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6,
  },
  catNumber: { fontSize: 12, fontWeight: '700', color: Colors.textTertiary, width: 18 },
  catEmoji: { fontSize: 16 },
  catName: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, flex: 1 },
  validIcon: { fontSize: 16 },
  answerInput: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    color: Colors.textPrimary, fontSize: 16, fontWeight: '500',
    borderWidth: 1.5, borderColor: Colors.glassBorder,
  },
  inputValid: { borderColor: Colors.correctAnswer + '60' },
  inputInvalid: { borderColor: Colors.wrongAnswer + '60' },
  submitBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    paddingVertical: 16, alignItems: 'center', marginTop: Spacing.md,
  },
  submitText: {
    fontSize: 18, fontWeight: '800', color: Colors.textDark, letterSpacing: 1,
  },
});
