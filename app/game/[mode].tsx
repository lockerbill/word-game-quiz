import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BorderRadius,
  Colors,
  GameMode,
  GameModeConfig,
  Spacing,
} from '../../src/theme/theme';
import { useGameStore } from '../../src/store/gameStore';
import { useVoiceStore } from '../../src/store/voiceStore';
import { startGameApi } from '../../src/api/gameApi';
import { voiceService } from '../../src/voice';

export default function GamePlayScreen() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const router = useRouter();
  const gameMode = (mode || 'practice') as GameMode;

  const {
    session,
    timeRemaining,
    isPlaying,
    isFinished,
    submissionStatus,
    startGameFromServer,
    setAnswer,
    tick,
    finishGame,
  } = useGameStore();

  const {
    voiceModeEnabled,
    autoSpeakQuestion,
    ttsProviderId,
    sttProviderId,
    locale,
    speechRate,
    speechPitch,
    isListening,
    lastError,
    setVoiceModeEnabled,
    setListening,
    setLastError,
    clearError,
  } = useVoiceStore();

  const ttsProvider = voiceService.getTtsProvider(ttsProviderId);
  const sttProvider = voiceService.getSttProvider(sttProviderId);

  const inputRef = useRef<TextInput | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [localAnswer, setLocalAnswer] = useState('');
  const [isStarting, setIsStarting] = useState(true);
  const [startError, setStartError] = useState<string | null>(null);

  const stopVoiceOutput = useCallback(async () => {
    try {
      await ttsProvider.stop();
    } catch {
      // Keep gameplay uninterrupted if voice stop fails.
    }
  }, [ttsProvider]);

  const stopVoiceInput = useCallback(async () => {
    try {
      await sttProvider.stopListening();
    } catch {
      // Keep gameplay uninterrupted if voice stop fails.
    } finally {
      setListening(false);
    }
  }, [setListening, sttProvider]);

  const abortVoiceInput = useCallback(async () => {
    try {
      await sttProvider.abortListening();
    } catch {
      // Keep gameplay uninterrupted if voice stop fails.
    } finally {
      setListening(false);
    }
  }, [setListening, sttProvider]);

  const loadSession = useCallback(async () => {
    setIsStarting(true);
    setStartError(null);
    try {
      const res = await startGameApi(gameMode);
      startGameFromServer(gameMode, res);
    } catch {
      setStartError(
        'We could not reach the game server. Check your connection and try again.',
      );
    } finally {
      setIsStarting(false);
    }
  }, [gameMode, startGameFromServer]);

  // Start game on mount — server only
  useEffect(() => {
    void loadSession();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      void stopVoiceOutput();
      void abortVoiceInput();
    };
  }, [abortVoiceInput, loadSession, stopVoiceOutput]);

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
  }, [isPlaying, session, tick]);

  // Navigate to results when finished
  useEffect(() => {
    if (isFinished) {
      void stopVoiceOutput();
      void abortVoiceInput();
      router.replace('/game/results');
    }
  }, [abortVoiceInput, isFinished, router, stopVoiceOutput]);

  // Auto-focus the input when question changes
  useEffect(() => {
    if (session && isPlaying) {
      const category = session.categories[currentIndex];
      if (category) {
        setLocalAnswer(session.answers[category.id] || '');
      }
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [currentIndex, isPlaying, session]);

  // Auto-read question prompt in voice mode
  useEffect(() => {
    if (!session || !isPlaying || !voiceModeEnabled || !autoSpeakQuestion) {
      return;
    }

    const category = session.categories[currentIndex];
    if (!category) {
      return;
    }

    const prompt = `Question ${currentIndex + 1}. Name a ${category.name} starting with ${session.letter}.`;
    let cancelled = false;

    const speakPrompt = async () => {
      try {
        const available = await Promise.resolve(ttsProvider.isAvailable());
        if (!available) {
          if (!cancelled) {
            setLastError('Voice playback is unavailable on this device.');
          }
          return;
        }

        await ttsProvider.speak({
          text: prompt,
          locale,
          rate: speechRate,
          pitch: speechPitch,
        });
      } catch {
        if (!cancelled) {
          setLastError('Could not play voice prompt right now.');
        }
      }
    };

    void speakPrompt();

    return () => {
      cancelled = true;
      void ttsProvider.stop();
    };
  }, [
    autoSpeakQuestion,
    currentIndex,
    isPlaying,
    locale,
    session,
    setLastError,
    speechPitch,
    speechRate,
    ttsProvider,
    voiceModeEnabled,
  ]);

  const goToNext = useCallback(() => {
    if (!session) return;
    const total = session.categories.length;
    void stopVoiceInput();
    void stopVoiceOutput();
    setLocalAnswer('');
    setCurrentIndex(prev => (prev + 1) % total);
  }, [session, stopVoiceInput, stopVoiceOutput]);

  const goToPrev = useCallback(() => {
    if (!session) return;
    const category = session.categories[currentIndex];
    if (category && localAnswer.trim()) {
      setAnswer(category.id, localAnswer.trim());
    }
    const total = session.categories.length;
    void stopVoiceInput();
    void stopVoiceOutput();
    setLocalAnswer('');
    setCurrentIndex(prev => (prev - 1 + total) % total);
  }, [
    currentIndex,
    localAnswer,
    session,
    setAnswer,
    stopVoiceInput,
    stopVoiceOutput,
  ]);

  const submitAndNext = useCallback(() => {
    if (!session) return;
    const category = session.categories[currentIndex];
    if (category && localAnswer.trim()) {
      setAnswer(category.id, localAnswer.trim());
    }
    goToNext();
  }, [currentIndex, goToNext, localAnswer, session, setAnswer]);

  const skipQuestion = useCallback(() => {
    if (!session) return;
    const category = session.categories[currentIndex];
    if (category && localAnswer.trim()) {
      setAnswer(category.id, localAnswer.trim());
    }
    goToNext();
  }, [currentIndex, goToNext, localAnswer, session, setAnswer]);

  const handleVoiceModeToggle = async () => {
    const nextEnabled = !voiceModeEnabled;
    setVoiceModeEnabled(nextEnabled);
    clearError();

    if (!nextEnabled) {
      await stopVoiceOutput();
      await abortVoiceInput();
    }
  };

  const handleToggleListening = async () => {
    if (!voiceModeEnabled || !session) {
      return;
    }

    if (isListening || sttProvider.isListening()) {
      await stopVoiceInput();
      return;
    }

    clearError();
    const available = await Promise.resolve(sttProvider.isAvailable());
    if (!available) {
      setLastError('Voice input is unavailable on this device.');
      return;
    }

    const category = session.categories[currentIndex];
    const contextWord = category?.name || 'this question';

    try {
      await sttProvider.startListening(
        {
          locale,
          interimResults: true,
          maxAlternatives: 1,
          continuous: false,
        },
        {
          onStart: () => {
            setListening(true);
          },
          onResult: result => {
            setLocalAnswer(result.transcript.trim());
          },
          onError: error => {
            setListening(false);
            setLastError(error.message || 'Could not capture voice input.');
          },
          onEnd: () => {
            setListening(false);
          },
        },
      );
    } catch {
      setListening(false);
      setLastError(`Could not start voice input for ${contextWord}.`);
    }
  };

  const handleFinish = async () => {
    if (!session) return;
    await stopVoiceOutput();
    await abortVoiceInput();

    const category = session.categories[currentIndex];
    if (category && localAnswer.trim()) {
      setAnswer(category.id, localAnswer.trim());
    }
    await finishGame();
  };

  if (isStarting) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!session || startError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.unavailableCard}>
          <Text style={styles.unavailableTitle}>Server unavailable</Text>
          <Text style={styles.unavailableMessage}>
            {startError || 'Unable to start a round right now. Please try again.'}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => void loadSession()}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => router.replace('/')}
            activeOpacity={0.8}
          >
            <Text style={styles.homeButtonText}>Back Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const config = GameModeConfig[gameMode];
  const timerColor =
    timeRemaining > 15
      ? Colors.timerGreen
      : timeRemaining > 7
        ? Colors.timerYellow
        : Colors.timerRed;
  const timerProgress =
    session.timerDuration > 0 ? timeRemaining / session.timerDuration : 1;

  const category = session.categories[currentIndex];
  const answeredCount = Object.keys(session.answers).length;
  const totalAnswered = Object.keys(session.answers).length;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.modeLabel}>
              {config.icon} {config.label}
            </Text>
            <Text style={styles.scorePreview}>
              {answeredCount}/{session.categories.length} ✓
            </Text>
          </View>
          <View style={styles.letterCircle}>
            <Text style={styles.letterText}>{session.letter}</Text>
          </View>
          <View style={styles.headerRight}>
            {session.timerDuration > 0 ? (
              <View style={styles.timerWrap}>
                <View style={styles.timerBarBg}>
                  <View
                    style={[
                      styles.timerBarFill,
                      {
                        width: `${timerProgress * 100}%`,
                        backgroundColor: timerColor,
                      },
                    ]}
                  />
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

        <View style={styles.dotsRow}>
          {session.categories.map((item, i) => {
            const hasAnswer = !!session.answers[item.id];
            const validation = session.validations[item.id];
            const isValid = validation?.valid;
            const isCurrent = i === currentIndex;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => {
                  if (category && localAnswer.trim()) {
                    setAnswer(category.id, localAnswer.trim());
                  }
                  void stopVoiceInput();
                  void stopVoiceOutput();
                  setLocalAnswer(session.answers[item.id] || '');
                  setCurrentIndex(i);
                }}
                style={[
                  styles.dot,
                  isCurrent && styles.dotCurrent,
                  hasAnswer && styles.dotAnswered,
                  validation && isValid && styles.dotCorrect,
                  validation && !isValid && styles.dotWrong,
                ]}
              >
                <Text style={styles.dotText}>{i + 1}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.questionArea}>
          <View style={styles.questionCard}>
            <Text style={styles.questionNumber}>
              Question {currentIndex + 1} of {session.categories.length}
            </Text>
            <Text style={styles.catEmoji}>{category.emoji}</Text>
            <Text style={styles.catName}>{category.name}</Text>
            <Text style={styles.catPrompt}>
              Name a <Text style={styles.catNameBold}>{category.name}</Text>{' '}
              starting with <Text style={styles.letterHighlight}>{session.letter}</Text>
            </Text>

            <View style={styles.voiceControlRow}>
              <TouchableOpacity
                style={[
                  styles.voiceToggleBtn,
                  voiceModeEnabled
                    ? styles.voiceToggleBtnOn
                    : styles.voiceToggleBtnOff,
                ]}
                onPress={() => void handleVoiceModeToggle()}
                activeOpacity={0.8}
              >
                <Text style={styles.voiceToggleText}>
                  {voiceModeEnabled ? '🔊 Voice ON' : '🔈 Voice OFF'}
                </Text>
              </TouchableOpacity>

              {voiceModeEnabled && (
                <TouchableOpacity
                  style={[
                    styles.micBtn,
                    isListening ? styles.micBtnActive : styles.micBtnIdle,
                  ]}
                  onPress={() => void handleToggleListening()}
                  activeOpacity={0.8}
                >
                  <Text style={styles.micBtnText}>
                    {isListening ? '🎙️ Stop Mic' : '🎤 Speak Answer'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {voiceModeEnabled && isListening && (
              <Text style={styles.voiceStatusText}>
                Listening... latest transcript replaces the input.
              </Text>
            )}

            {voiceModeEnabled && lastError && (
              <View style={styles.voiceErrorCard}>
                <Text style={styles.voiceErrorText}>{lastError}</Text>
              </View>
            )}

            <TextInput
              ref={inputRef}
              style={styles.answerInput}
              placeholder="Type your answer..."
              placeholderTextColor={Colors.textTertiary}
              value={localAnswer}
              onChangeText={setLocalAnswer}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={submitAndNext}
            />
          </View>

          <View style={styles.navRow}>
            <TouchableOpacity style={styles.prevBtn} onPress={goToPrev} activeOpacity={0.7}>
              <Text style={styles.prevBtnText}>← Prev</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipBtn}
              onPress={skipQuestion}
              activeOpacity={0.7}
            >
              <Text style={styles.skipBtnText}>Skip →</Text>
            </TouchableOpacity>
          </View>

          {localAnswer.trim().length > 0 && (
            <TouchableOpacity
              style={styles.nextBtn}
              onPress={submitAndNext}
              activeOpacity={0.8}
            >
              <Text style={styles.nextBtnText}>Submit & Next →</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.finishBtn}
            onPress={handleFinish}
            disabled={submissionStatus === 'submitting'}
            activeOpacity={0.8}
          >
            <Text style={styles.finishBtnText}>
              {submissionStatus === 'submitting'
                ? 'Submitting...'
                : totalAnswered >= session.categories.length
                  ? '🏁 FINISH'
                  : `🏁 FINISH (${totalAnswered}/${session.categories.length} answered)`}
            </Text>
          </TouchableOpacity>

          {submissionStatus === 'failed' && (
            <View style={styles.submitErrorCard}>
              <Text style={styles.submitErrorText}>
                We could not submit your game yet. Please retry.
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleFinish}
                activeOpacity={0.8}
              >
                <Text style={styles.retryButtonText}>Retry Submit</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: {
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: 100,
    fontSize: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  headerLeft: { width: 90 },
  modeLabel: { fontSize: 12, fontWeight: '600', color: Colors.textTertiary },
  scorePreview: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.accentGreen,
    marginTop: 2,
  },
  letterCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${Colors.primary}20`,
    borderWidth: 3,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  letterText: { fontSize: 28, fontWeight: '800', color: Colors.primary },
  headerRight: { width: 100, alignItems: 'flex-end' },
  timerWrap: { alignItems: 'flex-end' },
  timerBarBg: {
    width: 80,
    height: 6,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  timerBarFill: { height: '100%', borderRadius: 3 },
  timerText: { fontSize: 20, fontWeight: '800' },
  relaxLabel: { fontSize: 13, color: Colors.accentGreen, fontWeight: '600' },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.glassBorder,
  },
  dotCurrent: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}20`,
  },
  dotAnswered: {
    borderColor: `${Colors.accentOrange}70`,
  },
  dotCorrect: {
    borderColor: Colors.correctAnswer,
    backgroundColor: `${Colors.correctAnswer}20`,
  },
  dotWrong: {
    borderColor: Colors.wrongAnswer,
    backgroundColor: `${Colors.wrongAnswer}20`,
  },
  dotText: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary },
  questionArea: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  questionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  questionNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textTertiary,
    marginBottom: Spacing.sm,
  },
  catEmoji: { fontSize: 48, marginBottom: Spacing.sm },
  catName: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  catPrompt: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  catNameBold: { fontWeight: '700', color: Colors.textPrimary },
  letterHighlight: {
    fontWeight: '800',
    color: Colors.primary,
    fontSize: 17,
  },
  voiceControlRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  voiceToggleBtn: {
    flex: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  voiceToggleBtnOn: {
    backgroundColor: `${Colors.accentGreen}30`,
    borderColor: `${Colors.accentGreen}80`,
  },
  voiceToggleBtnOff: {
    backgroundColor: Colors.surfaceLight,
    borderColor: Colors.glassBorder,
  },
  voiceToggleText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  micBtn: {
    flex: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  micBtnIdle: {
    backgroundColor: Colors.surfaceLight,
    borderColor: Colors.glassBorder,
  },
  micBtnActive: {
    backgroundColor: `${Colors.primary}30`,
    borderColor: `${Colors.primary}90`,
  },
  micBtnText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  voiceStatusText: {
    width: '100%',
    color: Colors.textTertiary,
    fontSize: 12,
    textAlign: 'left',
    marginBottom: Spacing.sm,
  },
  voiceErrorCard: {
    width: '100%',
    borderRadius: BorderRadius.md,
    paddingVertical: 8,
    paddingHorizontal: Spacing.sm,
    backgroundColor: `${Colors.accentOrange}18`,
    borderWidth: 1,
    borderColor: `${Colors.accentOrange}55`,
    marginBottom: Spacing.sm,
  },
  voiceErrorText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  answerInput: {
    width: '100%',
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 16,
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    borderWidth: 2,
    borderColor: Colors.glassBorder,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  prevBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  prevBtnText: { fontSize: 15, fontWeight: '700', color: Colors.textSecondary },
  skipBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${Colors.accentOrange}40`,
  },
  skipBtnText: { fontSize: 15, fontWeight: '700', color: Colors.accentOrange },
  nextBtn: {
    backgroundColor: Colors.accentGreen,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: Colors.textDark },
  finishBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  finishBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textDark,
    letterSpacing: 0.5,
  },
  unavailableCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  unavailableTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  unavailableMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  retryButtonText: {
    color: Colors.textDark,
    fontSize: 15,
    fontWeight: '700',
  },
  homeButton: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  homeButtonText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },
  submitErrorCard: {
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: `${Colors.accentOrange}60`,
    gap: Spacing.sm,
  },
  submitErrorText: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
});
