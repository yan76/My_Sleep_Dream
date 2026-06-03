import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

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
const inactiveTint = "#9EA3C4";

const navIcons: Record<NavKey, number> = {
  home: require("../../../assets/icons/icon_home_transparent_alpha.png"),
  rescue: require("../../../assets/icons/icon_leaf_transparent_alpha.png"),
  growth: require("../../../assets/icons/icon_chart_transparent_alpha.png"),
  settings: require("../../../assets/icons/icon_user_transparent_alpha.png")
};

function NavIcon({ name }: { name: NavKey; active: boolean }) {
  return <Image source={navIcons[name]} style={styles.icon} resizeMode="contain" />;
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
    height: 104,
    paddingHorizontal: 42,
    paddingTop: 16,
    paddingBottom: 18,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    backgroundColor: "#090B1B",
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between"
  },
  item: {
    width: 58,
    height: 72,
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 4
  },
  iconWrap: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center"
  },
  label: {
    color: inactiveTint,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900"
  },
  activeLabel: {
    color: activeTint
  },
  icon: {
    width: 38,
    height: 38
  }
});
