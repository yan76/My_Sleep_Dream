import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/colors";

const actions = [
  { title: "呼吸放松", href: "/rescue", tint: colors.primary, icon: "~" },
  { title: "睡前日记", href: "/review", tint: colors.success, icon: "✎" },
  { title: "白噪音", href: "/bedtime", tint: colors.warning, icon: "♪" },
  { title: "下线挑战", href: "/contract", tint: colors.accent, icon: "⚡" },
  { title: "次日打卡", href: "/checkin", tint: colors.success, icon: "☀" }
] as const;

export function QuickActionGrid() {
  return (
    <View style={styles.grid}>
      {actions.map((action) => (
        <Pressable
          key={action.href}
          onPress={() => router.push(action.href)}
          style={({ pressed }) => [styles.item, pressed && styles.pressed]}
        >
          {/* Top accent bar */}
          <View style={[styles.topBar, { backgroundColor: action.tint }]} />
          <View style={styles.itemContent}>
            <View style={[styles.icon, { backgroundColor: action.tint + "30" }]}>
              <Text style={[styles.iconMark, { color: action.tint }]}>{action.icon}</Text>
            </View>
            <Text style={styles.title}>{action.title}</Text>
            <Text style={styles.arrow}>→</Text>
          </View>
        </Pressable>
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
    minHeight: 130,
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden"
  },
  topBar: {
    height: 3,
    opacity: 0.7
  },
  itemContent: {
    flex: 1,
    padding: 20,
    justifyContent: "space-between"
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center"
  },
  iconMark: {
    fontSize: 22,
    fontWeight: "800"
  },
  title: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800"
  },
  arrow: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "700",
    alignSelf: "flex-end"
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }]
  }
});