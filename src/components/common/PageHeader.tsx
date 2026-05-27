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
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
    paddingTop: 52
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0
  },
  title: {
    color: colors.ink,
    fontSize: 38,
    fontWeight: "800",
    lineHeight: 46
  },
  subtitle: {
    color: colors.muted,
    fontSize: 20,
    lineHeight: 28
  }
});
