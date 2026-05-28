import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
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
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        size === "md" && styles.sizeMd,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style
      ]}
    >
      {/* Gradient glow overlay for primary/gradient buttons */}
      {(variant === "primary" || variant === "gradient") ? (
        <View pointerEvents="none" style={styles.primaryGlow} />
      ) : null}
      {/* Secondary glow for gradient variant */}
      {variant === "gradient" ? (
        <View pointerEvents="none" style={styles.secondaryGlow} />
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
    backgroundColor: colors.accent
  },
  gradient: {
    backgroundColor: colors.accent
  },
  secondary: {
    backgroundColor: colors.surfaceWarm,
    borderWidth: 1,
    borderColor: colors.lineStrong
  },
  ghost: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line
  },
  danger: {
    backgroundColor: "rgba(255,112,131,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,112,131,0.34)"
  },
  primaryGlow: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "48%",
    backgroundColor: colors.primary,
    opacity: 0.82,
    borderTopLeftRadius: 32,
    borderBottomLeftRadius: 32
  },
  secondaryGlow: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "22%",
    backgroundColor: colors.success,
    opacity: 0.30,
    borderTopRightRadius: 32,
    borderBottomRightRadius: 32
  },
  text: {
    color: colors.buttonText,
    fontSize: 18,
    fontWeight: "800"
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
