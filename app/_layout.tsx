import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "@/constants/colors";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar hidden backgroundColor={colors.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: "fade"
        }}
      />
    </SafeAreaProvider>
  );
}
