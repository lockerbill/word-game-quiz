import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../../src/theme/theme';
import { useUserStore } from '../../src/store/userStore';

export default function LeaderboardScreen() {
  const { leaderboard, username } = useUserStore();

  // Sort by score descending
  const sorted = [...leaderboard].sort((a, b) => b.score - a.score);
  const top = sorted.slice(0, 30);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>🏆 Leaderboard</Text>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {top.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🎮</Text>
            <Text style={styles.emptyText}>Play some games to see your rankings!</Text>
          </View>
        )}
        {top.map((entry, index) => {
          const isTop3 = index < 3;
          const medals = ['🥇', '🥈', '🥉'];
          return (
            <View key={index} style={[styles.row, isTop3 && styles.rowTop3]}>
              <View style={styles.rankWrap}>
                <Text style={styles.rank}>
                  {isTop3 ? medals[index] : `#${index + 1}`}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{entry.name}</Text>
                <Text style={styles.meta}>Level {entry.level}</Text>
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
    textAlign: 'center', marginTop: Spacing.md, marginBottom: Spacing.md,
  },
  scroll: { paddingHorizontal: Spacing.lg },
  empty: { alignItems: 'center', marginTop: 60 },
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
