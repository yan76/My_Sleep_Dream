import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/colors";
import { useResponsiveMetrics } from "@/utils/responsive";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
};

export function PageHeader({ eyebrow, title, subtitle }: PageHeaderProps) {
  const metrics = useResponsiveMetrics();

  return (
    <View style={[styles.wrap, metrics.isCompactWidth && styles.wrapCompact]}>
      {eyebrow ? (
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowDot} />
          <Text style={styles.eyebrow}>{eyebrow}</Text>
        </View>
      ) : null}
      <Text style={[styles.title, metrics.isCompactWidth && styles.titleCompact]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, metrics.isCompactWidth && styles.subtitleCompact]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
    paddingTop: 4
  },
  wrapCompact: {
    gap: 8,
    paddingTop: 0
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase" as const
  },
  title: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 42
  },
  titleCompact: {
    fontSize: 30,
    lineHeight: 37
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 25,
    fontWeight: "600"
  },
  subtitleCompact: {
    fontSize: 15,
    lineHeight: 23
  }
});
