import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, GameModeConfig, GameMode } from '../../src/theme/theme';
import { useUserStore } from '../../src/store/userStore';
import { getXPProgress } from '../../src/engine/Scoring';
import { getDailyApi } from '../../src/api/gameApi';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const {
    xp,
    level,
    gamesPlayed,
    bestScore,
    dailyPlayedDate,
    isLoaded,
    token,
  } = useUserStore();
  const [daily, setDaily] = useState<{ letter: string; date: string } | null>(null);
  const [dailyError, setDailyError] = useState<string | null>(null);
  const [isDailyLoading, setIsDailyLoading] = useState(true);

  const xpProgress = getXPProgress(xp);
  const dailyPlayed = daily ? dailyPlayedDate === daily.date : false;

  const fetchDaily = async () => {
    setIsDailyLoading(true);
    setDailyError(null);
    try {
      const serverDaily = await getDailyApi();
      setDaily({
        letter: serverDaily.letter,
        date: serverDaily.date,
      });
    } catch {
      setDaily(null);
      setDailyError('Daily challenge is unavailable right now.');
    } finally {
      setIsDailyLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded) return;
    void fetchDaily();
  }, [isLoaded, token]);

  const modes: GameMode[] = ['practice', 'ranked', 'daily', 'relax', 'hardcore'];
  const dailyUnavailable = Boolean(dailyError) || !daily;

  const handlePlay = (mode: GameMode) => {
    if (mode === 'daily' && (dailyPlayed || dailyUnavailable)) return;
    router.push(`/game/${mode}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/images/app_banner.png')}
            style={styles.bannerImage}
            resizeMode="contain"
          />
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
          disabled={dailyPlayed || dailyUnavailable || isDailyLoading}
        >
          <View style={styles.dailyLeft}>
            <Text style={styles.dailyEmoji}>📅</Text>
            <View>
              <Text style={styles.dailyTitle}>
                {dailyPlayed
                  ? 'Daily Complete ✓'
                  : dailyUnavailable
                    ? 'Daily Unavailable'
                    : "Today's Challenge"}
              </Text>
              <Text style={styles.dailyLetter}>
                {isDailyLoading
                  ? 'Loading daily challenge...'
                  : daily
                    ? `Letter: ${daily.letter}`
                    : 'Please try again in a moment.'}
              </Text>
            </View>
          </View>
          {!dailyUnavailable && !dailyPlayed && <Text style={styles.dailyPlay}>PLAY →</Text>}
        </TouchableOpacity>
        {dailyUnavailable && !isDailyLoading && (
          <TouchableOpacity
            style={styles.dailyRetryBtn}
            onPress={() => void fetchDaily()}
            activeOpacity={0.8}
          >
            <Text style={styles.dailyRetryText}>Retry Daily</Text>
          </TouchableOpacity>
        )}

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
  bannerImage: {
    width: width - Spacing.lg * 2,
    height: 120,
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
  dailyRetryBtn: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: -Spacing.md,
    marginBottom: Spacing.lg,
  },
  dailyRetryText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
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
