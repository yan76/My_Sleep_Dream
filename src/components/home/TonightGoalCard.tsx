import { StyleSheet, Text, View } from "react-native";
import { AppCard } from "@/components/common/AppCard";
import { colors } from "@/constants/colors";

type TonightGoalCardProps = {
  bedtime: string;
  wakeUpTime: string;
};

export function TonightGoalCard({ bedtime, wakeUpTime }: TonightGoalCardProps) {
  return (
    <AppCard style={styles.card}>
      <Text style={styles.label}>{bedtime} 前放下手机</Text>
      <View style={styles.row}>
        <Text style={styles.time}>42:00</Text>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
      </View>
      <Text style={styles.note}>距离今晚自救目标，明早 {wakeUpTime} 起。</Text>
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
    fontSize: 24,
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
  note: {
    color: colors.muted,
    fontSize: 18,
    lineHeight: 26
  }
});
