import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/colors";

type BottomNavProps = {
  active: "home" | "rescue" | "growth" | "settings" | "review" | "audio" | "checkin";
};

const navItems = [
  { key: "home", label: "首页", href: "/" },
  { key: "rescue", label: "自救", href: "/rescue" },
  { key: "growth", label: "成长", href: "/records" },
  { key: "settings", label: "设置", href: "/settings" }
] as const;

type NavKey = (typeof navItems)[number]["key"];

const activeTint = "#F0DDB9";
const inactiveTint = "#777A98";

function NavIcon({ name, active }: { name: NavKey; active: boolean }) {
  const tint = active ? activeTint : inactiveTint;

  if (name === "home") {
    return (
      <View style={styles.homeIcon}>
        <View style={[styles.homeRoof, { backgroundColor: tint }]} />
        <View style={[styles.homeBody, { backgroundColor: tint }]} />
      </View>
    );
  }

  if (name === "rescue") {
    return (
      <View style={styles.leafIcon}>
        <View style={[styles.leafBlade, { backgroundColor: tint }]} />
        <View style={[styles.leafVein, { backgroundColor: active ? colors.tabBar : colors.backgroundNight }]} />
      </View>
    );
  }

  if (name === "growth") {
    return (
      <View style={styles.barsIcon}>
        <View style={[styles.barSmall, { backgroundColor: tint }]} />
        <View style={[styles.barMedium, { backgroundColor: tint }]} />
        <View style={[styles.barTall, { backgroundColor: tint }]} />
      </View>
    );
  }

  return (
    <View style={styles.personIcon}>
      <View style={[styles.personHead, { backgroundColor: tint }]} />
      <View style={[styles.personBody, { backgroundColor: tint }]} />
    </View>
  );
}

export function BottomNav({ active }: BottomNavProps) {
  return (
    <View style={styles.bar}>
      {navItems.map((item) => {
        const isActive = item.key === active;
        return (
          <Pressable key={item.key} onPress={() => router.push(item.href)} style={styles.item}>
            <View style={styles.iconWrap}>
              <NavIcon name={item.key} active={isActive} />
            </View>
            <Text style={[styles.label, isActive && styles.activeLabel]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: "100%",
    height: 92,
    paddingHorizontal: 42,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderColor: "#242638",
    backgroundColor: "#090A19",
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between"
  },
  item: {
    width: 58,
    height: 66,
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 3
  },
  iconWrap: {
    width: 38,
    height: 36,
    alignItems: "center",
    justifyContent: "center"
  },
  label: {
    color: inactiveTint,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900"
  },
  activeLabel: {
    color: activeTint
  },
  homeIcon: {
    width: 31,
    height: 31,
    alignItems: "center"
  },
  homeRoof: {
    position: "absolute",
    width: 21,
    height: 21,
    top: 1,
    borderRadius: 5,
    transform: [{ rotate: "45deg" }]
  },
  homeBody: {
    position: "absolute",
    width: 24,
    height: 18,
    bottom: 3,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3
  },
  leafIcon: {
    width: 31,
    height: 31,
    alignItems: "center",
    justifyContent: "center"
  },
  leafBlade: {
    width: 18,
    height: 26,
    borderTopLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    transform: [{ rotate: "45deg" }]
  },
  leafVein: {
    position: "absolute",
    width: 2,
    height: 17,
    borderRadius: 2,
    opacity: 0.45,
    transform: [{ rotate: "45deg" }]
  },
  barsIcon: {
    width: 31,
    height: 31,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 4
  },
  barSmall: {
    width: 7,
    height: 13,
    borderRadius: 4
  },
  barMedium: {
    width: 7,
    height: 22,
    borderRadius: 4
  },
  barTall: {
    width: 7,
    height: 29,
    borderRadius: 4
  },
  personIcon: {
    width: 31,
    height: 31,
    alignItems: "center",
    justifyContent: "flex-end"
  },
  personHead: {
    width: 13,
    height: 13,
    borderRadius: 7,
    marginBottom: 3
  },
  personBody: {
    width: 25,
    height: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6
  }
});
