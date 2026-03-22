import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../../src/theme/theme';
import {
  getGlobalLeaderboard,
  getWeeklyLeaderboard,
  getDailyLeaderboard,
  LeaderboardEntry,
} from '../../src/api/leaderboardApi';

type Tab = 'global' | 'weekly' | 'daily';

export default function LeaderboardScreen() {
  const [tab, setTab] = useState<Tab>('global');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = async (t: Tab) => {
    setLoading(true);
    setError(null);
    try {
      let data: LeaderboardEntry[];
      switch (t) {
        case 'weekly':
          data = await getWeeklyLeaderboard(50);
          break;
        case 'daily':
          data = await getDailyLeaderboard(50);
          break;
        default:
          data = await getGlobalLeaderboard(50);
      }
      setEntries(data);
    } catch {
      setError('Could not load leaderboard. Check your connection.');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard(tab);
  }, [tab]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Leaderboard</Text>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {(['global', 'weekly', 'daily'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'global' ? 'All Time' : t === 'weekly' ? 'This Week' : 'Daily'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}

        {error && !loading && (
          <View style={styles.center}>
            <Text style={styles.errorEmoji}>🌐</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => fetchLeaderboard(tab)}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && entries.length === 0 && (
          <View style={styles.center}>
            <Text style={styles.emptyEmoji}>🎮</Text>
            <Text style={styles.emptyText}>
              {tab === 'daily'
                ? 'No daily challenge scores yet today!'
                : 'No scores yet. Be the first!'}
            </Text>
          </View>
        )}

        {!loading && !error && entries.map((entry, index) => {
          const isTop3 = index < 3;
          const medals = ['🥇', '🥈', '🥉'];
          return (
            <View key={`${entry.userId}-${index}`} style={[styles.row, isTop3 && styles.rowTop3]}>
              <View style={styles.rankWrap}>
                <Text style={styles.rank}>
                  {isTop3 ? medals[index] : `#${entry.rank}`}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{entry.username}</Text>
                <Text style={styles.meta}>
                  Level {entry.level}  {entry.letter ? `· Letter ${entry.letter}` : ''}
                </Text>
              </View>
              <Text style={styles.score}>{entry.score}</Text>
            </View>
          );
        })}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  title: {
    fontSize: 28, fontWeight: '800', color: Colors.primary,
    textAlign: 'center', marginTop: Spacing.md, marginBottom: Spacing.sm,
  },
  tabBar: {
    flexDirection: 'row', marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: 4, borderWidth: 1, borderColor: Colors.glassBorder,
  },
  tab: {
    flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: BorderRadius.md,
  },
  tabActive: {
    backgroundColor: Colors.primary + '20',
  },
  tabText: {
    fontSize: 14, fontWeight: '600', color: Colors.textTertiary,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  scroll: { paddingHorizontal: Spacing.lg },
  center: { alignItems: 'center', marginTop: 60 },
  errorEmoji: { fontSize: 48, marginBottom: 12 },
  errorText: { fontSize: 16, color: Colors.textTertiary, textAlign: 'center', marginBottom: Spacing.md },
  retryBtn: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    paddingVertical: 10, paddingHorizontal: 24,
    borderWidth: 1, borderColor: Colors.glassBorder,
  },
  retryText: { color: Colors.accent, fontWeight: '600', fontSize: 14 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: Colors.textTertiary, textAlign: 'center' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.glassBorder,
  },
  rowTop3: { borderColor: Colors.primary + '40' },
  rankWrap: { width: 40, alignItems: 'center' },
  rank: { fontSize: 18, fontWeight: '700', color: Colors.textSecondary },
  info: { flex: 1, marginLeft: Spacing.sm },
  name: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  meta: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  score: { fontSize: 20, fontWeight: '800', color: Colors.primary },
});
