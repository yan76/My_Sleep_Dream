import { router } from "expo-router";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import { AppCard } from "@/components/common/AppCard";
import { PageHeader } from "@/components/common/PageHeader";
import { Screen } from "@/components/common/Screen";
import { BadgeGrid } from "@/components/badges/BadgeGrid";
import { colors } from "@/constants/colors";
import { AchievementBadge, loadBadgeData } from "@/features/badges/badgeData";

export default function BadgesScreen() {
  const [badges, setBadges] = useState<AchievementBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function load() {
        setLoading(true);
        const nextBadges = await loadBadgeData();

        if (active) {
          setBadges(nextBadges.sort((left, right) => left.sortOrder - right.sortOrder));
          setLoading(false);
        }
      }

      load().catch((error) => {
        console.warn("[badges] Failed to load badge data", error);

        if (active) {
          setLoading(false);
        }
      });

      return () => {
        active = false;
      };
    }, [])
  );

  const unlockedCount = useMemo(() => badges.filter((badge) => badge.unlocked).length, [badges]);
  const nextBadge = useMemo(() => badges.find((badge) => !badge.unlocked), [badges]);
  const totalBadgeCount = badges.length || 10;

  return (
    <Screen>
      <PageHeader title="这些小进展都算数" subtitle="不用攒成很大的改变，能在某个晚上拉回来一点，也值得被记下。" />
      <AppCard tone="warm">
        <View style={styles.summaryRow}>
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryLabel}>已经做到</Text>
            <Text style={styles.summaryValue}>{unlockedCount}/{totalBadgeCount}</Text>
          </View>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryPillText}>{loading ? "整理中" : nextBadge ? nextBadge.progressLabel : "都收好了"}</Text>
          </View>
        </View>
        <Text style={styles.summaryBody}>
          {loading
            ? "正在把这些小进展整理出来。"
            : nextBadge
            ? `下一枚接近的是「${nextBadge.title}」。不用赶进度，今晚能往回拉一点就算数。`
            : "这些夜晚都留下了证据：你不是突然变自律，而是在慢慢学会停下来。"}
        </Text>
      </AppCard>
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.loadingText}>正在整理你的徽章</Text>
        </View>
      ) : (
        <BadgeGrid badges={badges} />
      )}
      <AppButton title="回到成长页" variant="ghost" onPress={() => router.push("/records")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14
  },
  summaryCopy: {
    flex: 1,
    gap: 6
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "900"
  },
  summaryValue: {
    color: colors.accent,
    fontSize: 42,
    lineHeight: 48,
    fontWeight: "900"
  },
  summaryPill: {
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceStrong,
    justifyContent: "center",
    paddingHorizontal: 13
  },
  summaryPillText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900"
  },
  summaryBody: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "700"
  },
  loadingWrap: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: 12
  },
  loadingText: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "800"
  }
});
