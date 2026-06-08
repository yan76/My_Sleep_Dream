import { ReactNode } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { colors } from "@/constants/colors";
import { useResponsiveMetrics } from "@/utils/responsive";

type AppCardProps = {
  children: ReactNode;
  tone?: "plain" | "warm" | "cool" | "lavender" | "mint" | "rose";
  style?: StyleProp<ViewStyle>;
};

export function AppCard({ children, tone = "plain", style }: AppCardProps) {
  const metrics = useResponsiveMetrics();

  return (
    <View
      style={[styles.card, styles[tone], style]}
      renderToHardwareTextureAndroid={true}
    >
      <View style={[styles.inner, { padding: metrics.cardPadding, gap: metrics.cardGap }]}>{children}</View>
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
