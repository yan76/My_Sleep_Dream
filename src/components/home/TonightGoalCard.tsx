import { StyleSheet, Text, View } from "react-native";
import { AppCard } from "@/components/common/AppCard";
import { colors } from "@/constants/colors";

type TonightGoalCardProps = {
  bedtime: string;
  wakeUpTime: string;
};

export function TonightGoalCard({ bedtime, wakeUpTime }: TonightGoalCardProps) {
  return (
    <AppCard style={styles.card} topAccent>
      <Text style={styles.label}>今晚目标：{bedtime} 前放下手机</Text>
      <View style={styles.row}>
        <Text style={styles.time}>42:00</Text>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
      </View>
      <View style={styles.bottomRow}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>就寝</Text>
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
          <Text style={styles.metaValue}>62%</Text>
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
    fontSize: 56,
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
    width: "62%",
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