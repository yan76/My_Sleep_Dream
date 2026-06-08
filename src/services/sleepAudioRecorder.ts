import { requestRecordingPermissionsAsync } from "expo-audio";
import * as FileSystem from "expo-file-system";

export type RecorderPermissionStatus = "granted" | "denied" | "unavailable";

export async function requestSleepAudioPermission(): Promise<RecorderPermissionStatus> {
  try {
    const permission = await requestRecordingPermissionsAsync();
    return permission.granted || permission.status === "granted" ? "granted" : "denied";
  } catch {
    return "unavailable";
  }
}

export async function deleteSleepAudioRecording(localAudioUri?: string): Promise<void> {
  if (!localAudioUri) {
    return;
  }

  await FileSystem.deleteAsync(localAudioUri, { idempotent: true }).catch(() => undefined);
}
