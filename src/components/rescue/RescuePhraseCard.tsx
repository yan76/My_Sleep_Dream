import { StyleSheet, Text } from "react-native";
import { AppCard } from "@/components/common/AppCard";
import { colors } from "@/constants/colors";

export function RescuePhraseCard({ phrase }: { phrase: string }) {
  return (
    <AppCard tone="warm">
      <Text style={styles.label}>先停一下</Text>
      <Text style={styles.phrase}>{phrase}</Text>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "800"
  },
  phrase: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 30
  }
});
