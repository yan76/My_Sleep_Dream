import { ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors } from "@/constants/colors";

type AppButtonProps = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "gradient";
  disabled?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
  size?: "md" | "lg";
};

export function AppButton({ title, onPress, variant = "primary", disabled, icon, style, size = "lg" }: AppButtonProps) {
  const isGradientButton = variant === "primary" || variant === "gradient";
  const usesWebGradient = isGradientButton && Platform.OS === "web";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      renderToHardwareTextureAndroid={true}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        isGradientButton && webGradientStyle,
        size === "md" && styles.sizeMd,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style
      ]}
    >
      {/* 渐变按钮：用不重叠的纯色条模拟渐变，避免多层半透明叠加导致的色带 */}
      {isGradientButton && !usesWebGradient ? (
        <>
          <View pointerEvents="none" style={styles.gradientLeft} />
          <View pointerEvents="none" style={styles.gradientMid} />
          <View pointerEvents="none" style={styles.gradientRight} />
        </>
      ) : null}
      {icon}
      <Text style={[
        styles.text,
        (variant === "ghost" || variant === "secondary" || variant === "danger") && styles.darkText,
        disabled && styles.disabledText
      ]}>
        {title}
      </Text>
    </Pressable>
  );
}

const webGradientStyle = Platform.select({
  web: {
    backgroundImage: `linear-gradient(90deg, ${colors.accent} 0%, #F4ECDF 38%, #BFC4FF 70%, ${colors.primary} 100%)`
  } as ViewStyle
});

const styles = StyleSheet.create({
  base: {
    minHeight: 64,
    borderRadius: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    overflow: "hidden"
  },
  sizeMd: {
    minHeight: 52,
    borderRadius: 26,
    paddingHorizontal: 20
  },
  primary: {
    backgroundColor: colors.primary
  },
  gradient: {
    backgroundColor: colors.primary
  },
  secondary: {
    backgroundColor: colors.surfaceWarm
  },
  ghost: {
    backgroundColor: colors.surface
  },
  danger: {
    backgroundColor: "#2B1828"
  },
  // 渐变三区：accent → blend → primary，全部使用纯色不重叠，无 View 级 opacity
  gradientLeft: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "48%",
    backgroundColor: colors.accent
  },
  gradientMid: {
    position: "absolute",
    left: "44%",
    top: 0,
    bottom: 0,
    width: "34%",
    backgroundColor: "#E9DFC4"
  },
  gradientRight: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "28%",
    backgroundColor: "#96A3ED"
  },
  text: {
    color: colors.buttonText,
    fontSize: 18,
    fontWeight: "800",
    zIndex: 1
  },
  darkText: {
    color: colors.ink
  },
  disabled: {
    opacity: 0.45
  },
  disabledText: {
    color: colors.muted
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.9
  }
});
