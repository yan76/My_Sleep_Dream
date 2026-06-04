import { PermissionsAndroid, Platform } from "react-native";

export type RecorderPermissionStatus = "granted" | "denied" | "unavailable";

export async function requestSleepAudioPermission(): Promise<RecorderPermissionStatus> {
  if (Platform.OS === "android") {
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    return result === PermissionsAndroid.RESULTS.GRANTED ? "granted" : "denied";
  }

  if (Platform.OS === "ios") {
    return "granted";
  }

  return "unavailable";
}

export async function startSleepAudioRecorder(): Promise<void> {
  // Placeholder for the next iteration's expo-av recording implementation.
}

export async function stopSleepAudioRecorder(): Promise<void> {
  // Placeholder for the next iteration's expo-av recording implementation.
}
