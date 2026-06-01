import { ReactNode } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { colors } from "@/constants/colors";

type AppCardProps = {
  children: ReactNode;
  tone?: "plain" | "warm" | "cool" | "lavender" | "mint" | "rose";
  style?: ViewStyle;
};

export function AppCard({ children, tone = "plain", style }: AppCardProps) {
  return (
    <View
      style={[styles.card, styles[tone], style]}
      renderToHardwareTextureAndroid={true}
    >
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden"
  },
  inner: {
    padding: 22,
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
  },
  mint: {
    backgroundColor: colors.surfaceMint
  },
  rose: {
    backgroundColor: colors.surfaceRose
  }
});
