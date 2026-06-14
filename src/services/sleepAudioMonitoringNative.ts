import { NativeModules, Platform } from "react-native";
import { SleepAudioEvent, SleepAudioSession } from "@/types/app";

export type NativeSleepMonitoringEvent = {
  id?: string;
  startedAt?: string;
  durationMs?: number;
  type?: SleepAudioEvent["type"];
  confidence?: number;
  localClipUri?: string;
  peakDb?: number;
  averageDb?: number;
};

export type NativeSleepMonitoringSummary = NonNullable<SleepAudioSession["summary"]>;

export type NativeSleepMonitoringStatus = {
  isRunning: boolean;
  sessionId?: string;
  date?: string;
  startedAt?: string;
  stoppedAt?: string;
  eventCount?: number;
  events?: NativeSleepMonitoringEvent[];
  summary?: NativeSleepMonitoringSummary;
  lastError?: string;
};

type NativeSleepAudioMonitoringModule = {
  startSleepMonitoring: (input: { date: string; sessionId: string }) => Promise<NativeSleepMonitoringStatus>;
  stopSleepMonitoring: (input: { date?: string }) => Promise<NativeSleepMonitoringStatus>;
  getSleepMonitoringStatus: () => Promise<NativeSleepMonitoringStatus>;
  getSleepMonitoringStatusForDate?: (input: { date: string }) => Promise<NativeSleepMonitoringStatus>;
  deleteSleepMonitoringSession: (input: { date: string }) => Promise<void>;
};

const nativeModule = NativeModules.SleepAudioMonitoring as NativeSleepAudioMonitoringModule | undefined;

export function isNativeSleepAudioMonitoringAvailable(): boolean {
  return Platform.OS === "android" && Boolean(nativeModule);
}

export async function nativeStartSleepMonitoring(input: {
  date: string;
  sessionId: string;
}): Promise<NativeSleepMonitoringStatus> {
  if (!nativeModule) {
    throw new Error("SleepAudioMonitoring native module is unavailable.");
  }

  return nativeModule.startSleepMonitoring(input);
}

export async function nativeStopSleepMonitoring(date?: string): Promise<NativeSleepMonitoringStatus> {
  if (!nativeModule) {
    throw new Error("SleepAudioMonitoring native module is unavailable.");
  }

  return nativeModule.stopSleepMonitoring({ date });
}

export async function nativeGetSleepMonitoringStatus(date?: string): Promise<NativeSleepMonitoringStatus> {
  if (!nativeModule) {
    throw new Error("SleepAudioMonitoring native module is unavailable.");
  }

  if (date && nativeModule.getSleepMonitoringStatusForDate) {
    return nativeModule.getSleepMonitoringStatusForDate({ date });
  }

  return nativeModule.getSleepMonitoringStatus();
}

export async function nativeDeleteSleepMonitoringSession(date: string): Promise<void> {
  if (!nativeModule) {
    return;
  }

  await nativeModule.deleteSleepMonitoringSession({ date });
}
