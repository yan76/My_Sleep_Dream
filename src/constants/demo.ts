import Constants from "expo-constants";

declare const process:
  | {
      env?: Record<string, string | undefined>;
    }
  | undefined;

const extra = Constants.expoConfig?.extra as { demoMode?: boolean } | undefined;
const envDemoMode = typeof process !== "undefined" && process.env?.EXPO_PUBLIC_DEMO_MODE === "true";

export const isDemoMode = envDemoMode || extra?.demoMode === true;
