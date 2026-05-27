import { StyleSheet, Text } from "react-native";
import { AppCard } from "@/components/common/AppCard";
import { colors } from "@/constants/colors";
import { DailyRecord } from "@/types/app";
import { getCurrentStreak } from "@/utils/sleep";

export function StreakCard({ records }: { records: Record<string, DailyRecord> }) {
  const streak = getCurrentStreak(records);
  return (
    <AppCard tone="cool">
      <Text style={styles.label}>连续早睡</Text>
      <Text style={styles.value}>{streak} 天</Text>
      <Text style={styles.copy}>不用补考昨天，今晚少拖一点就很好。</Text>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "800"
  },
  value: {
    color: colors.ink,
    fontSize: 36,
    fontWeight: "800"
  },
  copy: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22
  }
});
