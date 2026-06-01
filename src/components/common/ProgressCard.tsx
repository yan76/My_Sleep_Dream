import { StyleSheet, Text, View } from "react-native";
import { AppCard } from "@/components/common/AppCard";
import { colors } from "@/constants/colors";

type ProgressCardProps = {
  label: string;
  current: number;
  total: number;
};

export function ProgressCard({ label, current, total }: ProgressCardProps) {
  const progress = total > 0 ? Math.min(100, Math.max(0, (current / total) * 100)) : 0;

  return (
    <AppCard>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.count}>{current} / {total}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress}%` }]} />
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  label: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "800"
  },
  count: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "900"
  },
  track: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.line,
    overflow: "hidden"
  },
  fill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.accent
  }
});
