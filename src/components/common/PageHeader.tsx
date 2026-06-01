import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/colors";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
};

export function PageHeader({ eyebrow, title, subtitle }: PageHeaderProps) {
  return (
    <View style={styles.wrap}>
      {eyebrow ? (
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowDot} />
          <Text style={styles.eyebrow}>{eyebrow}</Text>
        </View>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
    paddingTop: 4
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
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 25,
    fontWeight: "600"
  }
});
