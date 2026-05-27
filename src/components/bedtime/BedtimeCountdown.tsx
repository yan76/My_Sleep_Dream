import { StyleSheet, Text } from "react-native";
import { AppCard } from "@/components/common/AppCard";
import { colors } from "@/constants/colors";
import { useCountdown } from "@/hooks/useCountdown";

export function BedtimeCountdown({ targetTime }: { targetTime: string }) {
  const countdown = useCountdown(targetTime);
  return (
    <AppCard tone="lavender">
      <Text style={styles.label}>睡前倒计时</Text>
      <Text style={styles.value}>{countdown.label}</Text>
      <Text style={styles.copy}>现在开始收尾。手机不用立刻消失，但先别再开新的一局。</Text>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800"
  },
  value: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: "800"
  },
  copy: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22
  }
});
