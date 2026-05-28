import { StyleSheet, Text, View } from "react-native";
import { AppCard } from "@/components/common/AppCard";
import { colors } from "@/constants/colors";
import { useCountdown } from "@/hooks/useCountdown";

type TonightGoalCardProps = {
  bedtime: string;
  wakeUpTime: string;
};

export function TonightGoalCard({ bedtime, wakeUpTime }: TonightGoalCardProps) {
  const countdown = useCountdown(bedtime);
  const progress = Math.max(0, Math.min(100, 100 - (countdown.minutes / (24 * 60)) * 100));

  return (
    <AppCard style={styles.card} topAccent>
      <Text style={styles.label}>今晚目标：{bedtime} 前放下手机</Text>
      <View style={styles.row}>
        <Text style={styles.time}>{countdown.label}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>
      <View style={styles.bottomRow}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>目标</Text>
          <Text style={styles.metaValue}>{bedtime}</Text>
        </View>
        <View style={styles.metaDivider} />
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>起床</Text>
          <Text style={styles.metaValue}>{wakeUpTime}</Text>
        </View>
        <View style={styles.metaDivider} />
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>进度</Text>
          <Text style={styles.metaValue}>{Math.round(progress)}%</Text>
        </View>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 190,
    justifyContent: "space-between"
  },
  label: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800"
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 18
  },
  time: {
    color: colors.accent,
    fontSize: 32,
    fontWeight: "800"
  },
  progressTrack: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.22)",
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.accent
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8
  },
  metaItem: {
    alignItems: "center",
    gap: 4
  },
  metaLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  metaValue: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800"
  },
  metaDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.line
  }
});
