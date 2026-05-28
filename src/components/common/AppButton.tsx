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
      {isGradientButton && !usesWebGradient ? (
        <>
          <View pointerEvents="none" style={styles.gradientLeft} />
          <View pointerEvents="none" style={styles.gradientBlend} />
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
    backgroundImage: `linear-gradient(90deg, ${colors.accent} 0%, #F4ECDF 42%, #BFC4FF 70%, ${colors.primary} 100%)`
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
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.36)"
  },
  gradient: {
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.36)"
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
  gradientLeft: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "58%",
    backgroundColor: colors.accent
  },
  gradientBlend: {
    position: "absolute",
    left: "42%",
    top: 0,
    bottom: 0,
    width: "34%",
    backgroundColor: "#F4ECDF",
    opacity: 0.42
  },
  gradientRight: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "42%",
    backgroundColor: colors.primary,
    opacity: 0.86
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
