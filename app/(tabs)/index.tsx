import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Typography, GameModeConfig, GameMode } from '../../src/theme/theme';
import { useUserStore } from '../../src/store/userStore';
import { getXPProgress } from '../../src/engine/Scoring';
import { getDailyChallenge } from '../../src/engine/GameEngine';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const { username, xp, level, gamesPlayed, bestScore, dailyPlayedDate } = useUserStore();

  const xpProgress = getXPProgress(xp);
  const daily = getDailyChallenge();
  const today = new Date().toISOString().split('T')[0];
  const dailyPlayed = dailyPlayedDate === today;

  const modes: GameMode[] = ['practice', 'ranked', 'daily', 'relax', 'hardcore'];

  const handlePlay = (mode: GameMode) => {
    if (mode === 'daily' && dailyPlayed) return;
    router.push(`/game/${mode}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>⚡ ALPHA BUCKS</Text>
          <Text style={styles.subtitle}>Word Game Challenge</Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{level}</Text>
            <Text style={styles.statLabel}>Level</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{gamesPlayed}</Text>
            <Text style={styles.statLabel}>Games</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{bestScore}</Text>
            <Text style={styles.statLabel}>Best</Text>
          </View>
        </View>

        {/* XP Bar */}
        <View style={styles.xpContainer}>
          <View style={styles.xpBarBg}>
            <View style={[styles.xpBarFill, { width: `${xpProgress.percentage * 100}%` }]} />
          </View>
          <Text style={styles.xpText}>{xpProgress.current} / {xpProgress.required} XP</Text>
        </View>

        {/* Daily Challenge Banner */}
        <TouchableOpacity
          style={[styles.dailyBanner, dailyPlayed && styles.dailyPlayed]}
          onPress={() => handlePlay('daily')}
          activeOpacity={0.8}
          disabled={dailyPlayed}
        >
          <View style={styles.dailyLeft}>
            <Text style={styles.dailyEmoji}>📅</Text>
            <View>
              <Text style={styles.dailyTitle}>
                {dailyPlayed ? 'Daily Complete ✓' : "Today's Challenge"}
              </Text>
              <Text style={styles.dailyLetter}>Letter: {daily.letter}</Text>
            </View>
          </View>
          {!dailyPlayed && <Text style={styles.dailyPlay}>PLAY →</Text>}
        </TouchableOpacity>

        {/* Game Modes */}
        <Text style={styles.sectionTitle}>Game Modes</Text>
        {modes.filter(m => m !== 'daily').map((mode) => {
          const config = GameModeConfig[mode];
          return (
            <TouchableOpacity
              key={mode}
              style={styles.modeCard}
              onPress={() => handlePlay(mode)}
              activeOpacity={0.7}
            >
              <View style={[styles.modeIconWrap, { backgroundColor: config.color + '20' }]}>
                <Text style={styles.modeEmoji}>{config.icon}</Text>
              </View>
              <View style={styles.modeContent}>
                <Text style={styles.modeName}>{config.label}</Text>
                <Text style={styles.modeDesc}>{config.description}</Text>
              </View>
              <View style={styles.modeTimerBadge}>
                <Text style={styles.modeTimerText}>
                  {config.timer > 0 ? `${config.timer}s` : '∞'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    padding: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  logo: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  xpContainer: {
    marginBottom: Spacing.lg,
  },
  xpBarBg: {
    height: 6,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  xpText: {
    fontSize: 11,
    color: Colors.textTertiary,
    textAlign: 'right',
    marginTop: 4,
  },
  dailyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.accentOrange + '40',
  },
  dailyPlayed: {
    opacity: 0.6,
    borderColor: Colors.accentGreen + '40',
  },
  dailyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dailyEmoji: {
    fontSize: 32,
  },
  dailyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  dailyLetter: {
    fontSize: 13,
    color: Colors.accentOrange,
    fontWeight: '600',
    marginTop: 2,
  },
  dailyPlay: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.accentOrange,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  modeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeEmoji: {
    fontSize: 24,
  },
  modeContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  modeName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modeDesc: {
    fontSize: 13,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  modeTimerBadge: {
    backgroundColor: Colors.backgroundTertiary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.round,
  },
  modeTimerText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
});
