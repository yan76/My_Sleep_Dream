import {
  createAudioPlayer,
  RecordingPresets,
  setAudioModeAsync,
  setIsAudioActiveAsync,
  useAudioRecorder,
  useAudioRecorderState
} from "expo-audio";
import type { AudioPlayer } from "expo-audio";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import { AppCard } from "@/components/common/AppCard";
import { Screen } from "@/components/common/Screen";
import { colors } from "@/constants/colors";
import { markSleepAudioDeleted, markSleepAudioEnabled } from "@/storage/dailyExecutionStorage";
import { resolveCurrentCycleDate } from "@/storage/demoCycleDateStorage";
import {
  createSleepAudioSession,
  deleteSleepAudioSession,
  markSleepAudioPermissionDenied,
  updateSleepAudioSessionStatus
} from "@/storage/sleepAudioStorage";
import { deleteSleepAudioRecording, requestSleepAudioPermission } from "@/services/sleepAudioRecorder";
import { isNativeSleepAudioMonitoringAvailable } from "@/services/sleepAudioMonitoringNative";
import {
  deleteSleepMonitoringSession,
  getSleepMonitoringStatus,
  startSleepMonitoring,
  stopSleepMonitoring
} from "@/services/sleepAudioMonitoringService";
import { SleepAudioSession } from "@/types/app";

type PreviewClip = {
  id: string;
  uri: string;
  durationMs?: number;
};

const maxStoredWebRecordingBytes = 3 * 1024 * 1024;

export default function SleepMonitorScreen() {
  const fallbackRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const fallbackRecorderState = useAudioRecorderState(fallbackRecorder);
  const [date, setDate] = useState<string | null>(null);
  const [session, setSession] = useState<SleepAudioSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewClipIndex, setPreviewClipIndex] = useState<number | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const playerSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const webAudioRef = useRef<HTMLAudioElement | null>(null);
  const fallbackRecordingRef = useRef(false);
  const previewRunRef = useRef(0);

  const cleanupPlayer = useCallback(() => {
    playerSubscriptionRef.current?.remove();
    playerSubscriptionRef.current = null;

    webAudioRef.current?.pause();
    if (webAudioRef.current) {
      webAudioRef.current.currentTime = 0;
      webAudioRef.current.removeAttribute("src");
      webAudioRef.current.load();
    }
    webAudioRef.current = null;

    const player = playerRef.current;
    playerRef.current = null;
    if (!player) {
      return;
    }

    try {
      player.pause();
    } catch {
      // The player may already have been released by a native completion event.
    }

    try {
      player.remove();
    } catch {
      // The player may already have been released by a native completion event.
    }
  }, []);

  const stopPreview = useCallback(() => {
    previewRunRef.current += 1;
    cleanupPlayer();
    setPreviewing(false);
    setPreviewClipIndex(null);
  }, [cleanupPlayer]);

  const loadSession = useCallback(async () => {
    const cycleDate = await resolveCurrentCycleDate();
    const status = await getSleepMonitoringStatus(cycleDate);
    setDate(cycleDate);
    setSession(status.session);
    setRecordingError(status.lastError ?? null);
    setPreviewError(null);
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        stopPreview();
      };
    }, [stopPreview])
  );

  const playableClips = useMemo(() => createPlayableClips(session), [session]);
  const nativeMonitoringAvailable = isNativeSleepAudioMonitoringAvailable();

  const preparePreviewAudioSession = useCallback(async () => {
    await setIsAudioActiveAsync(true);
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false
    });
  }, []);

  const start = async () => {
    if (busy) {
      return;
    }

    const cycleDate = date ?? (await resolveCurrentCycleDate());
    stopPreview();
    setBusy(true);
    try {
      setRecordingError(null);
      setPreviewError(null);
      if (!nativeMonitoringAvailable) {
        const permission = await requestSleepAudioPermission();
        if (permission !== "granted") {
          setSession(await markSleepAudioPermissionDenied(cycleDate));
          return;
        }

        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: false,
          shouldPlayInBackground: false,
          shouldRouteThroughEarpiece: false
        });
        await fallbackRecorder.prepareToRecordAsync();
        fallbackRecorder.record();
        fallbackRecordingRef.current = true;
        const next = await createSleepAudioSession(cycleDate, {
          localAudioUri: fallbackRecorder.uri ?? fallbackRecorderState.url ?? undefined
        });
        await markSleepAudioEnabled(next.id, cycleDate);
        setSession(next);
        return;
      }

      const status = await startSleepMonitoring(cycleDate);
      setSession(status.session);
      setRecordingError(status.lastError ?? null);
    } catch (error) {
      console.warn("[sleep-audio] Failed to start recorder", error);
      await setIsAudioActiveAsync(false).catch(() => undefined);
      setRecordingError("录音启动失败，请确认没有其他应用占用麦克风后再试。");
      if (!nativeMonitoringAvailable) {
        const failed = await updateSleepAudioSessionStatus(cycleDate, "failed", {
          localAudioUri: fallbackRecorder.uri ?? fallbackRecorderState.url ?? undefined
        }).catch(() => null);
        if (failed) {
          setSession(failed);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    if (busy) {
      return;
    }

    const cycleDate = date ?? (await resolveCurrentCycleDate());
    stopPreview();
    setBusy(true);
    try {
      setRecordingError(null);
      setPreviewError(null);
      if (!nativeMonitoringAvailable) {
        const statusBeforeStop = fallbackRecorder.getStatus();
        const shouldStopFallbackRecorder = fallbackRecordingRef.current || Boolean(statusBeforeStop.isRecording);
        if (!shouldStopFallbackRecorder) {
          await setIsAudioActiveAsync(false).catch(() => undefined);
          setSession(await updateSleepAudioSessionStatus(cycleDate, "completed", {
            localAudioUri: session?.localAudioUri
          }));
          return;
        }

        const startedDuration = Math.max(fallbackRecorderState.durationMillis ?? 0, statusBeforeStop.durationMillis ?? 0);
        await fallbackRecorder.stop();
        fallbackRecordingRef.current = false;
        const status = fallbackRecorder.getStatus();
        const localAudioUri = await normalizeFallbackRecordingUri(fallbackRecorder.uri ?? status.url ?? session?.localAudioUri);
        await setIsAudioActiveAsync(false).catch(() => undefined);
        setSession(await updateSleepAudioSessionStatus(cycleDate, "completed", {
          localAudioUri,
          summary: startedDuration || status.durationMillis
            ? { quietScore: 92, hasVoiceLikeSound: false, hasSnoreLikeSound: false }
            : undefined
        }));
        return;
      }

      const status = await stopSleepMonitoring(cycleDate);
      setSession(status.session);
      setRecordingError(status.lastError ?? null);
    } catch (error) {
      console.warn("[sleep-audio] Failed to stop recorder", error);
      await setIsAudioActiveAsync(false).catch(() => undefined);
      setRecordingError("停止录音失败，你可以删除今晚监听记录后重新开始。");
      if (!nativeMonitoringAvailable) {
        fallbackRecordingRef.current = false;
        const failed = await updateSleepAudioSessionStatus(cycleDate, "failed", {
          localAudioUri: fallbackRecorder.uri ?? fallbackRecorderState.url ?? session?.localAudioUri
        }).catch(() => null);
        if (failed) {
          setSession(failed);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (busy) {
      return;
    }

    const cycleDate = date ?? (await resolveCurrentCycleDate());
    stopPreview();
    setBusy(true);
    try {
      setRecordingError(null);
      setPreviewError(null);
      if (!nativeMonitoringAvailable) {
        const statusBeforeDelete = fallbackRecorder.getStatus();
        if (fallbackRecordingRef.current || statusBeforeDelete.isRecording) {
          await fallbackRecorder.stop().catch(() => undefined);
          fallbackRecordingRef.current = false;
          await setIsAudioActiveAsync(false).catch(() => undefined);
        }
        await deleteSleepAudioRecording(session?.localAudioUri);
        await deleteSleepAudioSession(cycleDate);
        await markSleepAudioDeleted(cycleDate);
        setSession(null);
        return;
      }

      await deleteSleepMonitoringSession(cycleDate);
      setSession(null);
    } catch (error) {
      console.warn("[sleep-audio] Failed to delete recording", error);
      setRecordingError("删除监听记录失败，请稍后再试。");
    } finally {
      setBusy(false);
    }
  };

  const isRecording = session?.status === "recording" || (!nativeMonitoringAvailable && fallbackRecorderState.isRecording);
  const hasFinished = session?.status === "completed" || session?.status === "stopped";
  const denied = session?.status === "permission_denied";
  const failed = session?.status === "failed";
  const hasLocalClips = playableClips.length > 0;
  const canPreview = hasFinished && hasLocalClips && !isRecording;
  const hasFinishedWithoutPreview = hasFinished && !hasLocalClips && !denied && !failed;
  const eventCountLabel = `${session?.eventCount ?? 0} 段`;

  const playClipAt = useCallback(
    async (index: number, runId: number) => {
      if (runId !== previewRunRef.current) {
        return;
      }

      if (index >= playableClips.length) {
        cleanupPlayer();
        setPreviewing(false);
        setPreviewClipIndex(null);
        return;
      }

      const clip = playableClips[index];
      cleanupPlayer();

      try {
        if (Platform.OS === "web") {
          const audio = new Audio(clip.uri);
          audio.muted = false;
          audio.volume = 1;
          audio.onended = () => {
            if (runId === previewRunRef.current) {
              void playClipAt(index + 1, runId);
            }
          };
          audio.onerror = () => {
            if (runId !== previewRunRef.current) {
              return;
            }

            cleanupPlayer();
            setPreviewing(false);
            setPreviewClipIndex(null);
            setPreviewError("音频预览失败，文件可能已被清理或监听记录已删除。");
          };
          webAudioRef.current = audio;
          setPreviewClipIndex(index);
          await audio.play();
          return;
        }

        await preparePreviewAudioSession();
        const player = createAudioPlayer({ uri: normalizePreviewUri(clip.uri) }, 250);
        player.loop = false;
        player.volume = 1;
        playerRef.current = player;
        setPreviewClipIndex(index);
        playerSubscriptionRef.current = player.addListener("playbackStatusUpdate", (status) => {
          if (runId !== previewRunRef.current) {
            return;
          }

          if (status.didJustFinish) {
            void playClipAt(index + 1, runId);
          }
        });
        player.play();
      } catch (error) {
        console.warn("[sleep-audio] Failed to preview recording", error);
        cleanupPlayer();
        setPreviewing(false);
        setPreviewClipIndex(null);
        setPreviewError("音频预览失败，文件可能已被清理或监听记录已删除。");
      }
    },
    [cleanupPlayer, playableClips, preparePreviewAudioSession]
  );

  const togglePreview = () => {
    if (previewing) {
      stopPreview();
      setPreviewError(null);
      return;
    }

    if (!canPreview) {
      return;
    }

    const runId = previewRunRef.current + 1;
    previewRunRef.current = runId;
    setPreviewError(null);
    setPreviewing(true);
    void playClipAt(0, runId);
  };

  useEffect(() => {
    if (previewing && !canPreview) {
      stopPreview();
    }
  }, [canPreview, previewing, stopPreview]);

  return (
    <Screen>
      <View style={styles.top}>
        <Pressable style={styles.ghost} onPress={() => router.replace("/")}>
          <Text style={styles.ghostText}>返回首页</Text>
        </Pressable>
      </View>

      <View style={styles.header}>
        <Text style={styles.eyebrow}>睡眠监听</Text>
        <Text style={styles.title}>只记录今晚的声音摘要</Text>
        <Text style={styles.subtitle}>它只保存在本机，不会上传云端。你可以随时停止，也可以删除。</Text>
      </View>

      <AppCard tone="cool" style={styles.statusCard}>
        <View style={styles.statusRow}>
          <Text style={styles.label}>当前状态</Text>
          <Text style={styles.statusPill}>{statusLabel(session)}</Text>
        </View>
        <Text style={styles.cardTitle}>
          {isRecording ? "正在本机监听" : failed ? "监听启动失败" : hasFinished ? "今晚监听已收好" : "准备开始监听"}
        </Text>
        <Text style={styles.body}>
          {recordingError
            ? recordingError
            : denied
            ? "你没有授权麦克风，所以今晚不会记录声音摘要。这不影响睡前闭环。"
            : failed
              ? "今晚监听没有成功启动。你可以删除这条记录后重新开始。"
            : isRecording
              ? "正在本机监听。第一版只保存声音事件短片段和摘要，不做医学判断。"
              : hasFinished
                ? "明早打卡时，会看到昨晚的声音线索摘要。声音片段仍只留在本机。"
                : "点击开始后，App 会请求麦克风权限并在本机创建一段睡眠监听录音。"}
        </Text>
        {canPreview ? (
          <Text style={styles.uriText}>
            {previewing && previewClipIndex != null
              ? `正在预览第 ${previewClipIndex + 1}/${playableClips.length} 段`
              : `可预览 ${playableClips.length} 段本机音频`}
          </Text>
        ) : hasLocalClips ? (
          <Text style={styles.uriText}>本机短片段已保存</Text>
        ) : hasFinishedWithoutPreview ? (
          <Text style={styles.uriText}>这条监听记录没有可预览音频。重新开始监听后，生成音频时会出现预览按钮。</Text>
        ) : null}
        {previewError ? <Text style={styles.errorText}>{previewError}</Text> : null}
      </AppCard>

      <View style={styles.factGrid}>
        <View style={styles.fact}>
          <Text style={styles.label}>声音线索</Text>
          <Text style={styles.factValue}>{eventCountLabel}</Text>
        </View>
        <View style={styles.fact}>
          <Text style={styles.label}>云端上传</Text>
          <Text style={styles.factValue}>不会上传</Text>
        </View>
      </View>

      {isRecording ? (
        <AppButton title={busy ? "正在停止..." : "停止监听"} variant="secondary" onPress={stop} disabled={busy} />
      ) : (
        <AppButton title={busy ? "正在准备..." : "开始监听"} variant="gradient" onPress={start} disabled={busy} />
      )}
      {canPreview ? (
        <AppButton
          title={previewing ? "停止预览" : "预览当天录音"}
          variant="secondary"
          onPress={togglePreview}
          disabled={busy}
        />
      ) : hasFinishedWithoutPreview ? (
        <AppButton title="暂无可预览音频" variant="ghost" onPress={() => undefined} disabled />
      ) : null}
      {hasFinished || denied || failed ? (
        <AppButton title={busy ? "正在删除..." : "删除今晚监听记录"} variant="danger" onPress={remove} disabled={busy} />
      ) : null}
    </Screen>
  );
}

function statusLabel(session: SleepAudioSession | null): string {
  if (!session) {
    return "未开始";
  }

  if (session.status === "permission_denied") {
    return "未授权";
  }

  if (session.status === "recording") {
    return "监听中";
  }

  if (session.status === "completed" || session.status === "stopped") {
    return "已完成";
  }

  if (session.status === "failed") {
    return "启动失败";
  }

  return "待处理";
}

function createPlayableClips(session: SleepAudioSession | null): PreviewClip[] {
  if (!session) {
    return [];
  }

  const eventClips = session.events
    .filter((event) => Boolean(event.localClipUri))
    .sort((left, right) => left.startedAt.localeCompare(right.startedAt))
    .map((event) => ({
      id: event.id,
      uri: event.localClipUri!,
      durationMs: event.durationMs
    }));

  if (eventClips.length > 0) {
    return eventClips;
  }

  return session.localAudioUri
    ? [
        {
          id: `${session.id}:local-audio`,
          uri: session.localAudioUri
        }
      ]
    : [];
}

function normalizePreviewUri(uri: string): string {
  if (Platform.OS === "android" && uri.startsWith("file://")) {
    return uri.replace("file://", "");
  }

  return uri;
}

async function normalizeFallbackRecordingUri(uri?: string | null): Promise<string | undefined> {
  if (!uri) {
    return undefined;
  }

  if (Platform.OS !== "web" || !uri.startsWith("blob:")) {
    return uri;
  }

  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    if (blob.size > maxStoredWebRecordingBytes) {
      return uri;
    }

    return await blobToDataUri(blob);
  } catch {
    return uri;
  }
}

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("录音数据读取失败。"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("录音数据读取失败。"));
    reader.readAsDataURL(blob);
  });
}

const styles = StyleSheet.create({
  top: {
    minHeight: 42,
    alignItems: "flex-start"
  },
  ghost: {
    minHeight: 34,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 15
  },
  ghostText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800"
  },
  header: {
    gap: 10
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0
  },
  title: {
    color: colors.ink,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "900",
    letterSpacing: 0
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "700"
  },
  statusCard: {
    minHeight: 210
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "900"
  },
  statusPill: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "900",
    borderRadius: 999,
    backgroundColor: "#303143",
    paddingHorizontal: 10,
    paddingVertical: 6,
    overflow: "hidden"
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "900"
  },
  body: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "700"
  },
  uriText: {
    color: colors.accent,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800"
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800"
  },
  factGrid: {
    flexDirection: "row",
    gap: 14
  },
  fact: {
    flex: 1,
    minHeight: 96,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
    justifyContent: "space-between"
  },
  factValue: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: "900"
  }
});
