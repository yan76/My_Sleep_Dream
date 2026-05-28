import { StyleSheet, Text, View } from "react-native";
import { AppCard } from "@/components/common/AppCard";
import { colors } from "@/constants/colors";
import { useCountdown } from "@/hooks/useCountdown";

type CountdownCardProps = {
  targetTime: string;
};

export function CountdownCard({ targetTime }: CountdownCardProps) {
  const countdown = useCountdown(targetTime);

  return (
    <AppCard tone="cool" style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.glowDot} />
        <Text style={styles.label}>距离目标睡觉还有</Text>
      </View>
      <View style={styles.valueRow}>
        <Text style={styles.value}>{countdown.label}</Text>
      </View>
      <Text style={styles.note}>不用立刻消失，只要先别再开新的一轮。</Text>
      <View style={styles.decorBar}>
        <View style={styles.decorFill} />
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 180
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  glowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4
  },
  label: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8
  },
  value: {
    color: colors.ink,
    fontSize: 42,
    fontWeight: "800"
  },
  note: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22
  },
  decorBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden"
  },
  decorFill: {
    width: "35%",
    height: "100%",
    borderRadius: 2,
    backgroundColor: colors.primary
  }
});
