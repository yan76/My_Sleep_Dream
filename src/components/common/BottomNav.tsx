import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/colors";

type BottomNavProps = {
  active: "home" | "review" | "rescue" | "audio" | "growth";
};

const navItems = [
  { key: "home", label: "首页", href: "/" },
  { key: "review", label: "复盘", href: "/review" },
  { key: "rescue", label: "自救", href: "/rescue" },
  { key: "audio", label: "白噪音", href: "/bedtime" },
  { key: "growth", label: "成长", href: "/records" }
] as const;

export function BottomNav({ active }: BottomNavProps) {
  return (
    <View style={styles.bar}>
      {navItems.map((item) => {
        const isActive = item.key === active;
        return (
          <Link key={item.key} href={item.href} asChild>
            <Pressable style={[styles.item, isActive && styles.activeItem]}>
              <View style={[styles.dot, isActive && styles.activeDot]} />
              <Text style={[styles.label, isActive && styles.activeLabel]}>{item.label}</Text>
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 86,
    marginHorizontal: -32,
    marginBottom: -24,
    paddingHorizontal: 28,
    paddingTop: 10,
    backgroundColor: colors.tabBar,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  item: {
    width: 66,
    height: 66,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 7
  },
  activeItem: {
    backgroundColor: colors.surfaceStrong
  },
  dot: {
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: "#777A90"
  },
  activeDot: {
    backgroundColor: colors.accent
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800"
  },
  activeLabel: {
    color: colors.accent
  }
});
