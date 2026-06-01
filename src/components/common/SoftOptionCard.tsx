import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors } from "@/constants/colors";

type SoftOptionCardProps = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  tone?: "plain" | "warm" | "cool" | "mint" | "rose";
  featured?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
};

export function SoftOptionCard({ title, subtitle, icon, tone = "plain", featured, onPress, style }: SoftOptionCardProps) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        styles[tone],
        featured && styles.featured,
        pressed && styles.pressed,
        style
      ]}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 96,
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: 16,
    justifyContent: "space-between",
    gap: 10
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
  mint: {
    backgroundColor: colors.surfaceMint
  },
  rose: {
    backgroundColor: colors.surfaceRose
  },
  featured: {
    borderWidth: 1,
    borderColor: colors.lineStrong
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  copy: {
    gap: 4
  },
  title: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600"
  },
  pressed: {
    transform: [{ scale: 0.99 }]
  }
});
