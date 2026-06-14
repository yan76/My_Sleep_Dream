import { requestRecordingPermissionsAsync } from "expo-audio";
import * as FileSystem from "expo-file-system";
import { SleepAudioEvent } from "@/types/app";

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

export async function deleteSleepAudioRecordings(events: SleepAudioEvent[] = []): Promise<void> {
  await Promise.all(events.map((event) => deleteSleepAudioRecording(event.localClipUri)));
}
