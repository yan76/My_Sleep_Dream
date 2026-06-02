import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";
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

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      renderToHardwareTextureAndroid={true}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        isGradientButton && gradientBackgroundStyle,
        size === "md" && styles.sizeMd,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style
      ]}
    >
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

const gradientBackgroundStyle = {
  backgroundImage: `linear-gradient(100deg, ${colors.accent} 0%, #F4ECDF 36%, #BFC4FF 68%, ${colors.primary} 100%)`
} as ViewStyle;

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
