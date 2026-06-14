import { Image, StyleSheet, Text, View } from "react-native";
import { AppCard } from "@/components/common/AppCard";
import { colors } from "@/constants/colors";
import type { AchievementBadge } from "@/features/badges/badgeData";

export function BadgeCard({ badge }: { badge: AchievementBadge }) {
  const progressPercent = `${Math.min(100, Math.round((badge.progressCurrent / badge.progressTarget) * 100))}%` as `${number}%`;

  return (
    <AppCard tone={badge.unlocked ? "warm" : "plain"} style={!badge.unlocked ? styles.locked : undefined}>
      <View style={styles.header}>
        <View style={styles.badgeIcon}>
          <Image source={badge.image} style={styles.badgeImage} resizeMode="contain" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{badge.title}</Text>
          <Text style={styles.status}>
            {badge.unlocked ? "已经做到" : badge.progressLabel}
          </Text>
        </View>
      </View>
      <Text style={styles.description}>{badge.unlocked ? badge.description : badge.lockedDescription}</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: progressPercent }]} />
      </View>
      {badge.unlockedAt ? (
        <Text style={styles.date}>{badge.unlockedAt.slice(0, 10)} 获得</Text>
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  locked: {
    opacity: 0.55
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  badgeIcon: {
    width: 82,
    height: 82,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible"
  },
  badgeImage: {
    width: 82,
    height: 82
  },
  headerText: {
    flex: 1,
    gap: 2
  },
  title: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800"
  },
  status: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700"
  },
  description: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceStrong,
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: colors.accent
  },
  date: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700"
  }
});
