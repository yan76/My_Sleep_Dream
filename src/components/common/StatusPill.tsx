import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/colors";

type StatusPillProps = {
  label: string;
  tone?: "neutral" | "success" | "warning";
};

export function StatusPill({ label, tone = "neutral" }: StatusPillProps) {
  return (
    <View style={[styles.pill, styles[tone]]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  neutral: {
    backgroundColor: colors.surfaceCool
  },
  success: {
    backgroundColor: "#DDEEE4"
  },
  warning: {
    backgroundColor: "#F4E2C9"
  },
  text: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700"
  }
});
