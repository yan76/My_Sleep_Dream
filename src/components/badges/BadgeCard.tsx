import { StyleSheet, Text, View } from "react-native";
import { AppCard } from "@/components/common/AppCard";
import { Badge } from "@/types/app";
import { colors } from "@/constants/colors";

export function BadgeCard({ badge }: { badge: Badge }) {
  return (
    <AppCard tone={badge.unlocked ? "warm" : "plain"} style={!badge.unlocked ? styles.locked : undefined}>
      <View style={styles.header}>
        <View style={[styles.badgeIcon, badge.unlocked && styles.badgeIconActive]}>
          <Text style={styles.badgeEmoji}>
            {badge.unlocked ? "✦" : "☆"}
          </Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{badge.title}</Text>
          <Text style={styles.status}>
            {badge.unlocked ? "已解锁 ✓" : "未解锁"}
          </Text>
        </View>
      </View>
      <Text style={styles.description}>{badge.description}</Text>
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  badgeIconActive: {
    backgroundColor: colors.accent + "40"
  },
  badgeEmoji: {
    fontSize: 22,
    color: colors.accent
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
  date: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700"
  }
});