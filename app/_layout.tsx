import { Stack } from "expo-router";
import { usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BottomNav } from "@/components/common/BottomNav";
import { colors } from "@/constants/colors";

const hiddenNavRoutes = new Set(["/onboarding"]);

function getActiveNav(pathname: string) {
  if (pathname === "/") {
    return "home";
  }

  if (pathname.startsWith("/records") || pathname.startsWith("/weekly-summary")) {
    return "growth";
  }

  if (pathname.startsWith("/settings")) {
    return "settings";
  }

  return "rescue";
}

export default function RootLayout() {
  const pathname = usePathname();
  const shouldShowNav = !hiddenNavRoutes.has(pathname);

  return (
    <SafeAreaProvider>
      <StatusBar hidden backgroundColor={colors.background} />
      <View style={styles.root}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: "fade"
          }}
        />
        {shouldShowNav ? (
          <View pointerEvents="box-none" style={styles.navOverlay}>
            <BottomNav active={getActiveNav(pathname)} />
          </View>
        ) : null}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background
  },
  navOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 0,
    paddingBottom: 0
  }
});
