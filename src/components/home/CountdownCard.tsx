import { StyleSheet, Text } from "react-native";
import { AppCard } from "@/components/common/AppCard";
import { colors } from "@/constants/colors";
import { useCountdown } from "@/hooks/useCountdown";

type CountdownCardProps = {
  targetTime: string;
};

export function CountdownCard({ targetTime }: CountdownCardProps) {
  const countdown = useCountdown(targetTime);

  return (
    <AppCard tone="cool">
      <Text style={styles.label}>距离目标睡觉</Text>
      <Text style={styles.value}>{countdown.label}</Text>
      <Text style={styles.note}>不用立刻消失，只要先别再开新的一轮。</Text>
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
    fontSize: 34,
    fontWeight: "800"
  },
  note: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22
  }
});
