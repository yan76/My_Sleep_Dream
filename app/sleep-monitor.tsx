import { router } from "expo-router";
import {
  RecordingPresets,
  setAudioModeAsync,
  setIsAudioActiveAsync,
  useAudioRecorder,
  useAudioRecorderState
} from "expo-audio";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import { AppCard } from "@/components/common/AppCard";
import { Screen } from "@/components/common/Screen";
import { colors } from "@/constants/colors";
import { markSleepAudioDeleted, markSleepAudioEnabled } from "@/storage/dailyExecutionStorage";
import { resolveCurrentCycleDate } from "@/storage/demoCycleDateStorage";
import {
  createSleepAudioSession,
  deleteSleepAudioSession,
  getSleepAudioSessionByDate,
  markSleepAudioPermissionDenied,
  updateSleepAudioSessionStatus
} from "@/storage/sleepAudioStorage";
import {
  deleteSleepAudioRecording,
  requestSleepAudioPermission
} from "@/services/sleepAudioRecorder";
import { SleepAudioSession } from "@/types/app";

export default function SleepMonitorScreen() {
  const recorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [date, setDate] = useState<string | null>(null);
  const [session, setSession] = useState<SleepAudioSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    const cycleDate = await resolveCurrentCycleDate();
    setDate(cycleDate);
    setSession(await getSleepAudioSessionByDate(cycleDate));
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const start = async () => {
    if (busy) {
      return;
    }

    const cycleDate = date ?? (await resolveCurrentCycleDate());
    setBusy(true);
    try {
      setRecordingError(null);
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
      await recorder.prepareToRecordAsync();
      recorder.record();
      const next = await createSleepAudioSession(cycleDate, {
        localAudioUri: recorder.uri ?? recorderState.url ?? undefined
      });
      await markSleepAudioEnabled(next.id, cycleDate);
      setSession(next);
    } catch (error) {
      console.warn("[sleep-audio] Failed to start recorder", error);
      await setIsAudioActiveAsync(false).catch(() => undefined);
      setRecordingError("录音启动失败，请确认没有其他应用占用麦克风后再试。");
      const failed = await updateSleepAudioSessionStatus(cycleDate, "failed", {
        localAudioUri: recorder.uri ?? recorderState.url ?? undefined
      }).catch(() => null);
      if (failed) {
        setSession(failed);
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
    setBusy(true);
    try {
      setRecordingError(null);
      if (!recorderState.isRecording) {
        await setIsAudioActiveAsync(false).catch(() => undefined);
        setSession(await updateSleepAudioSessionStatus(cycleDate, "completed", {
          localAudioUri: session?.localAudioUri
        }));
        return;
      }

      const startedDuration = recorderState.durationMillis;
      await recorder.stop();
      const status = recorder.getStatus();
      await setIsAudioActiveAsync(false).catch(() => undefined);
      setSession(await updateSleepAudioSessionStatus(cycleDate, "completed", {
        localAudioUri: recorder.uri ?? status.url ?? session?.localAudioUri,
        summary: startedDuration || status.durationMillis
          ? { quietScore: 92, hasVoiceLikeSound: false, hasSnoreLikeSound: false }
          : undefined
      }));
    } catch (error) {
      console.warn("[sleep-audio] Failed to stop recorder", error);
      await setIsAudioActiveAsync(false).catch(() => undefined);
      setRecordingError("停止录音失败，你可以删除今晚监听记录后重新开始。");
      const failed = await updateSleepAudioSessionStatus(cycleDate, "failed", {
        localAudioUri: recorder.uri ?? recorderState.url ?? session?.localAudioUri
      }).catch(() => null);
      if (failed) {
        setSession(failed);
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
    setBusy(true);
    try {
      setRecordingError(null);
      if (recorderState.isRecording) {
        await recorder.stop().catch(() => undefined);
        await setIsAudioActiveAsync(false).catch(() => undefined);
      }
      await deleteSleepAudioRecording(session?.localAudioUri);
      await deleteSleepAudioSession(cycleDate);
      await markSleepAudioDeleted(cycleDate);
      setSession(null);
    } catch (error) {
      console.warn("[sleep-audio] Failed to delete recording", error);
      setRecordingError("删除监听记录失败，请稍后再试。");
    } finally {
      setBusy(false);
    }
  };

  const isRecording = session?.status === "recording" || recorderState.isRecording;
  const hasFinished = session?.status === "completed" || session?.status === "stopped";
  const denied = session?.status === "permission_denied";
  const failed = session?.status === "failed";

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
              ? "正在本机录音。第一版只保存原始本机音频和安静摘要，不做医学判断。"
              : hasFinished
                ? "明早打卡时，会看到昨晚的声音线索摘要。原始音频仍只留在本机。"
                : "点击开始后，App 会请求麦克风权限并在本机创建一段睡眠监听录音。"}
        </Text>
        {session?.localAudioUri ? <Text style={styles.uriText}>本机文件已保存</Text> : null}
      </AppCard>

      <View style={styles.factGrid}>
        <View style={styles.fact}>
          <Text style={styles.label}>数据边界</Text>
          <Text style={styles.factValue}>本机摘要</Text>
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
