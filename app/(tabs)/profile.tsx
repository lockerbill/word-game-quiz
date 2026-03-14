import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../../src/theme/theme';
import { useUserStore } from '../../src/store/userStore';
import { getXPProgress } from '../../src/engine/Scoring';
import { ACHIEVEMENTS } from '../../src/gamification/Achievements';

export default function ProfileScreen() {
  const store = useUserStore();
  const xpProgress = getXPProgress(store.xp);
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(store.username);

  const saveName = () => {
    if (name.trim()) {
      store.setUsername(name.trim());
    }
    setEditing(false);
  };

  const avgScore = store.gamesPlayed > 0
    ? Math.round(store.totalScore / store.gamesPlayed)
    : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{store.username.charAt(0).toUpperCase()}</Text>
          </View>
          {editing ? (
            <View style={styles.nameEdit}>
              <TextInput
                style={styles.nameInput}
                value={name}
                onChangeText={setName}
                onSubmitEditing={saveName}
                autoFocus
                maxLength={20}
                placeholderTextColor={Colors.textTertiary}
              />
              <TouchableOpacity onPress={saveName} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => { setName(store.username); setEditing(true); }}>
              <Text style={styles.username}>{store.username} ✏️</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.levelBadge}>Level {store.level}</Text>
          <View style={styles.xpBar}>
            <View style={[styles.xpFill, { width: `${xpProgress.percentage * 100}%` }]} />
          </View>
          <Text style={styles.xpLabel}>{xpProgress.current} / {xpProgress.required} XP</Text>
        </View>

        {/* Stats Grid */}
        <Text style={styles.sectionTitle}>Stats</Text>
        <View style={styles.statsGrid}>
          {[
            { label: 'Games', value: store.gamesPlayed, emoji: '🎮' },
            { label: 'Best Score', value: store.bestScore, emoji: '🏆' },
            { label: 'Avg Score', value: avgScore, emoji: '📊' },
            { label: 'Perfect', value: store.perfectGames, emoji: '💯' },
            { label: 'Best Streak', value: store.longestStreak, emoji: '🔥' },
            { label: 'Total XP', value: store.xp, emoji: '⭐' },
          ].map((stat) => (
            <View key={stat.label} style={styles.statBox}>
              <Text style={styles.statEmoji}>{stat.emoji}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Achievements */}
        <Text style={styles.sectionTitle}>
          Achievements ({store.unlockedAchievements.length}/{ACHIEVEMENTS.length})
        </Text>
        <View style={styles.achieveGrid}>
          {ACHIEVEMENTS.map(ach => {
            const unlocked = store.unlockedAchievements.includes(ach.id);
            return (
              <View key={ach.id} style={[styles.achieveBadge, !unlocked && styles.achieveLocked]}>
                <Text style={styles.achieveEmoji}>{unlocked ? ach.emoji : '🔒'}</Text>
                <Text style={[styles.achieveName, !unlocked && styles.achieveNameLocked]}>
                  {ach.name}
                </Text>
                <Text style={styles.achieveDesc} numberOfLines={2}>{ach.description}</Text>
              </View>
            );
          })}
        </View>

        {/* Recent Games */}
        {store.gameHistory.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent Games</Text>
            {store.gameHistory.slice(0, 10).map((game, i) => (
              <View key={i} style={styles.historyRow}>
                <View style={styles.historyLeft}>
                  <Text style={styles.historyLetter}>{game.letter}</Text>
                  <View>
                    <Text style={styles.historyMode}>{game.mode.toUpperCase()}</Text>
                    <Text style={styles.historyDate}>
                      {new Date(game.date).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.historyScore}>
                  {game.correctCount}/{game.totalQuestions}
                </Text>
              </View>
            ))}
          </>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg },
  profileCard: {
    alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl, padding: Spacing.xl,
    borderWidth: 1, borderColor: Colors.glassBorder, marginBottom: Spacing.lg,
  },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary + '30', justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: Colors.primary },
  username: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  nameEdit: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  nameInput: {
    borderBottomWidth: 2, borderBottomColor: Colors.primary, color: Colors.textPrimary,
    fontSize: 20, fontWeight: '700', paddingVertical: 4, minWidth: 120, textAlign: 'center',
  },
  saveBtn: { backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  saveBtnText: { color: Colors.textDark, fontWeight: '700', fontSize: 13 },
  levelBadge: { fontSize: 14, color: Colors.accent, fontWeight: '600', marginBottom: 8 },
  xpBar: {
    width: '80%', height: 8, backgroundColor: Colors.surfaceLight,
    borderRadius: 4, overflow: 'hidden', marginBottom: 4,
  },
  xpFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
  xpLabel: { fontSize: 12, color: Colors.textTertiary },
  sectionTitle: {
    fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md,
  },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg,
  },
  statBox: {
    width: '31%', backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.glassBorder,
  },
  statEmoji: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  statLabel: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  achieveGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg,
  },
  achieveBadge: {
    width: '47%', backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.glassBorder,
  },
  achieveLocked: { opacity: 0.4 },
  achieveEmoji: { fontSize: 28, marginBottom: 4 },
  achieveName: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  achieveNameLocked: { color: Colors.textTertiary },
  achieveDesc: { fontSize: 11, color: Colors.textTertiary, textAlign: 'center', marginTop: 2 },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.glassBorder,
  },
  historyLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  historyLetter: {
    fontSize: 24, fontWeight: '800', color: Colors.primary,
    width: 36, textAlign: 'center',
  },
  historyMode: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  historyDate: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  historyScore: { fontSize: 20, fontWeight: '800', color: Colors.accent },
});
