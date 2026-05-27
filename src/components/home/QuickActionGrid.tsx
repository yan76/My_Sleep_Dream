import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/colors";

const actions = [
  { title: "呼吸放松", href: "/rescue", tint: colors.accent },
  { title: "睡前日记", href: "/review", tint: colors.primary },
  { title: "白噪音", href: "/bedtime", tint: colors.success },
  { title: "下线挑战", href: "/contract", tint: colors.accent }
] as const;

export function QuickActionGrid() {
  return (
    <View style={styles.grid}>
      {actions.map((action) => (
        <Link key={action.href} href={action.href} asChild>
          <Pressable style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
            <View style={[styles.icon, { backgroundColor: action.tint }]}>
              <Text style={styles.iconMark}>-</Text>
            </View>
            <Text style={styles.title}>{action.title}</Text>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14
  },
  item: {
    width: "47.8%",
    minHeight: 120,
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 22,
    justifyContent: "space-between"
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center"
  },
  iconMark: {
    color: colors.buttonText,
    fontSize: 28,
    fontWeight: "800",
    marginTop: -6
  },
  title: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: "800"
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }]
  }
});
