import { ReactNode } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { colors } from "@/constants/colors";

type AppCardProps = {
  children: ReactNode;
  tone?: "plain" | "warm" | "cool" | "lavender";
  style?: ViewStyle;
};

export function AppCard({ children, tone = "plain", style }: AppCardProps) {
  return <View style={[styles.card, styles[tone], style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 14
  },
  plain: {
    backgroundColor: colors.surface
  },
  warm: {
    backgroundColor: colors.surfaceWarm
  },
  cool: {
    backgroundColor: colors.surfaceCool
  },
  lavender: {
    backgroundColor: colors.lavender
  }
});
