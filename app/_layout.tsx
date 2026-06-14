import { QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { router, Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BottomNav } from "@/components/common/BottomNav";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { colors } from "@/constants/colors";
import { configureQueryNetworkSync, queryClient } from "@/api/queryClient";
import { ensureAnonymousSession } from "@/services/authService";
import {
  configureLocalNotificationHandling,
  refreshBedtimeReminderFromSettings
} from "@/services/notificationService";
import { initializeLocalDataLayer } from "@/storage/sqlite/bootstrap";
import { useAppStore } from "@/store/useAppStore";

const hiddenNavRoutes = new Set(["/onboarding"]);

function getActiveNav(pathname: string) {
  if (pathname === "/") {
    return "home";
  }

  if (
    pathname.startsWith("/records") ||
    pathname.startsWith("/weekly-summary") ||
    pathname.startsWith("/journal") ||
    pathname.startsWith("/badges")
  ) {
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

  useEffect(() => {
    configureLocalNotificationHandling();
    configureQueryNetworkSync();
    initializeLocalDataLayer().catch((error) => {
      console.warn("[sqlite] Failed to initialize local data layer", error);
    });
    ensureAnonymousSession().catch((error) => {
      console.warn("[auth] Failed to initialize anonymous session", error);
    });

    const syncReminder = () => {
      const { userConfig, reminderSettings } = useAppStore.getState();
      if (!userConfig.hasOnboarded) {
        return;
      }

      refreshBedtimeReminderFromSettings(userConfig, reminderSettings).catch((error) => {
        console.warn("[notifications] Failed to refresh bedtime reminder", error);
      });
    };

    const hydrationCleanup = useAppStore.persist.onFinishHydration(syncReminder);
    if (useAppStore.persist.hasHydrated()) {
      syncReminder();
    }

    const notificationResponseCleanup = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = response.notification.request.content.data?.route;
      if (route === "/rescue") {
        router.push("/rescue");
      }
    });

    return () => {
      hydrationCleanup();
      notificationResponseCleanup.remove();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ErrorBoundary>
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
        </ErrorBoundary>
      </SafeAreaProvider>
    </QueryClientProvider>
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
