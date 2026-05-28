import { ReactNode } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { colors } from "@/constants/colors";

type AppCardProps = {
  children: ReactNode;
  tone?: "plain" | "warm" | "cool" | "lavender" | "mint" | "rose";
  style?: ViewStyle;
  topAccent?: boolean;
};

export function AppCard({ children, tone = "plain", style, topAccent }: AppCardProps) {
  return (
    <View style={[styles.card, styles[tone], style]}>
      {topAccent ? <View style={styles.topAccent} /> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 14,
    overflow: "hidden"
  },
  topAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.accent,
    opacity: 0.6
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
  },
  mint: {
    backgroundColor: colors.surfaceMint
  },
  rose: {
    backgroundColor: colors.surfaceRose
  }
});
