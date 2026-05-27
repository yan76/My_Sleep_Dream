import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors } from "@/constants/colors";

type AppButtonProps = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
};

export function AppButton({ title, onPress, variant = "primary", disabled, icon, style }: AppButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style
      ]}
    >
      {variant === "primary" ? <View pointerEvents="none" style={styles.primaryGlow} /> : null}
      {icon}
      <Text style={[styles.text, variant !== "primary" && styles.darkText, disabled && styles.disabledText]}>
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
  primary: {
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
    right: 0,
    top: 0,
    bottom: 0,
    width: "46%",
    backgroundColor: colors.primary,
    opacity: 0.82
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
