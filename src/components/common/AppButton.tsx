import { ReactNode } from "react";
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";
import { GradientLayer } from "@/components/common/GradientLayer";
import { colors } from "@/constants/colors";
import { useResponsiveMetrics } from "@/utils/responsive";

type AppButtonProps = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "gradient";
  disabled?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  size?: "md" | "lg";
};

export function AppButton({ title, onPress, variant = "primary", disabled, icon, style, size = "lg" }: AppButtonProps) {
  const isGradientButton = variant === "gradient";
  const metrics = useResponsiveMetrics();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      renderToHardwareTextureAndroid={true}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        size === "md" && styles.sizeMd,
        metrics.isCompactWidth && styles.compact,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style
      ]}
    >
      {isGradientButton ? (
        <GradientLayer
          stops={[
            { color: colors.accent, location: 0 },
            { color: "#F4ECDF", location: 0.36 },
            { color: "#BFC4FF", location: 0.68 },
            { color: colors.primary, location: 1 }
          ]}
        />
      ) : null}
      {icon}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.82}
        style={[
          styles.text,
          (variant === "ghost" || variant === "secondary" || variant === "danger") && styles.darkText,
          disabled && styles.disabledText
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

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
  compact: {
    minHeight: 56,
    paddingHorizontal: 18
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
