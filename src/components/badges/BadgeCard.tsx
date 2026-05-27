import { StyleSheet, Text } from "react-native";
import { AppCard } from "@/components/common/AppCard";
import { Badge } from "@/types/app";
import { colors } from "@/constants/colors";

export function BadgeCard({ badge }: { badge: Badge }) {
  return (
    <AppCard tone={badge.unlocked ? "warm" : "plain"} style={!badge.unlocked ? styles.locked : undefined}>
      <Text style={styles.title}>{badge.unlocked ? "已解锁" : "未解锁"} · {badge.title}</Text>
      <Text style={styles.description}>{badge.description}</Text>
      {badge.unlockedAt ? <Text style={styles.date}>{badge.unlockedAt.slice(0, 10)}</Text> : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  locked: {
    opacity: 0.62
  },
  title: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800"
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
