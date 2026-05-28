import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppCard } from "@/components/common/AppCard";
import { BottomNav } from "@/components/common/BottomNav";
import { PageHeader } from "@/components/common/PageHeader";
import { Screen } from "@/components/common/Screen";
import { colors } from "@/constants/colors";
import { getAppStats } from "@/storage/rescueSessionStorage";
import { AppStats } from "@/types/app";

const segments = ["本周", "本月", "全部"] as const;

function hasAnyData(stats: AppStats | null) {
  if (!stats) {
    return false;
  }

  return stats.totalRescueSessions > 0 || stats.totalSuccessDays > 0 || stats.totalChallengeCompleted > 0;
}

export default function RecordsScreen() {
  const [stats, setStats] = useState<AppStats | null>(null);
  const [activeSegment, setActiveSegment] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadStats() {
        const next = await getAppStats();
        if (active) {
          setStats(next);
        }
      }

      loadStats();

      return () => {
        active = false;
      };
    }, [])
  );

  const hasData = hasAnyData(stats);

  return (
    <Screen>
      <PageHeader title="数据成就" subtitle="这些小进展都算数，只展示真实发生过的记录。" />

      <View style={styles.segment}>
        {segments.map((label, index) => (
          <Pressable
            key={label}
            onPress={() => setActiveSegment(index)}
            style={[styles.segmentItem, activeSegment === index && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, activeSegment === index && styles.segmentTextActive]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {!hasData ? (
        <AppCard topAccent>
          <Text style={styles.emptyTitle}>还没有真实数据</Text>
          <Text style={styles.emptyText}>
            从首页开始今晚自救，完成次日打卡后，这里会显示连续天数、本周和本月成功次数。
          </Text>
        </AppCard>
      ) : (
        <>
          <AppCard tone="warm" topAccent>
            <Text style={styles.cardTitle}>连续早睡</Text>
            <View style={styles.streakRow}>
              <View style={styles.streakNum}>
                <Text style={styles.streakValue}>{stats?.currentStreak ?? 0}</Text>
                <Text style={styles.streakUnit}>天</Text>
              </View>
              <Text style={styles.streakMsg}>最长连续 {stats?.longestStreak ?? 0} 天。继续保持，每一次停下都算数。</Text>
            </View>
          </AppCard>

          <View style={styles.statGrid}>
            <AppCard style={styles.statCard}>
              <Text style={styles.statValue}>{stats?.weeklySuccessCount ?? 0}</Text>
              <Text style={styles.statLabel}>本周成功次数</Text>
            </AppCard>
            <AppCard style={styles.statCard}>
              <Text style={styles.statValue}>{stats?.monthlySuccessCount ?? 0}</Text>
              <Text style={styles.statLabel}>本月成功次数</Text>
            </AppCard>
            <AppCard style={styles.statCard}>
              <Text style={styles.statValue}>{stats?.totalRescueSessions ?? 0}</Text>
              <Text style={styles.statLabel}>总自救次数</Text>
            </AppCard>
            <AppCard style={styles.statCard}>
              <Text style={styles.statValue}>{stats?.totalChallengeCompleted ?? 0}</Text>
              <Text style={styles.statLabel}>下线挑战完成</Text>
            </AppCard>
          </View>

          <AppCard tone="cool">
            <Text style={styles.summary}>
              已记录 {stats?.totalSuccessDays ?? 0} 个按时睡觉的夜晚。数据只负责提醒你：改变已经开始留下痕迹。
            </Text>
          </AppCard>
        </>
      )}

      <BottomNav active="growth" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: {
    minHeight: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    padding: 6
  },
  segmentItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 24
  },
  segmentActive: {
    backgroundColor: colors.surfaceWarm,
    borderWidth: 1,
    borderColor: colors.lineStrong
  },
  segmentText: {
    color: colors.muted,
    fontSize: 17,
    fontWeight: "800"
  },
  segmentTextActive: {
    color: colors.accent
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800"
  },
  emptyText: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16
  },
  streakNum: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4
  },
  streakValue: {
    color: colors.accent,
    fontSize: 48,
    fontWeight: "800"
  },
  streakUnit: {
    color: colors.muted,
    fontSize: 18,
    fontWeight: "700"
  },
  streakMsg: {
    flex: 1,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  statCard: {
    width: "48%",
    minHeight: 126,
    alignItems: "center",
    justifyContent: "center"
  },
  statValue: {
    color: colors.ink,
    fontSize: 38,
    fontWeight: "800"
  },
  statLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center" as const
  },
  summary: {
    color: colors.ink,
    fontSize: 18,
    lineHeight: 28,
    textAlign: "center" as const
  }
});
