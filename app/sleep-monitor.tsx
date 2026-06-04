import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import { AppCard } from "@/components/common/AppCard";
import { Screen } from "@/components/common/Screen";
import { colors } from "@/constants/colors";
import { markSleepAudioEnabled } from "@/storage/dailyExecutionStorage";
import {
  createSleepAudioSession,
  getSleepAudioSessionByDate,
  markSleepAudioPermissionDenied,
  updateSleepAudioSessionStatus
} from "@/storage/sleepAudioStorage";
import {
  requestSleepAudioPermission,
  startSleepAudioRecorder,
  stopSleepAudioRecorder
} from "@/services/sleepAudioRecorder";
import { SleepAudioSession } from "@/types/app";
import { todayKey } from "@/utils/date";

export default function SleepMonitorScreen() {
  const date = todayKey();
  const [session, setSession] = useState<SleepAudioSession | null>(null);
  const [busy, setBusy] = useState(false);

  const loadSession = useCallback(async () => {
    setSession(await getSleepAudioSessionByDate(date));
  }, [date]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const start = async () => {
    if (busy) {
      return;
    }

    setBusy(true);
    try {
      const permission = await requestSleepAudioPermission();
      if (permission !== "granted") {
        setSession(await markSleepAudioPermissionDenied(date));
        return;
      }

      await startSleepAudioRecorder();
      const next = await createSleepAudioSession(date);
      await markSleepAudioEnabled(next.id, date);
      setSession(next);
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    if (busy) {
      return;
    }

    setBusy(true);
    try {
      await stopSleepAudioRecorder();
      setSession(await updateSleepAudioSessionStatus(date, "completed"));
    } finally {
      setBusy(false);
    }
  };

  const isRecording = session?.status === "recording";
  const hasFinished = session?.status === "completed" || session?.status === "stopped";
  const denied = session?.status === "permission_denied";

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
        <Text style={styles.subtitle}>它不会上传云端，也不会影响明早打卡。你可以随时停止。</Text>
      </View>

      <AppCard tone="cool" style={styles.statusCard}>
        <View style={styles.statusRow}>
          <Text style={styles.label}>当前状态</Text>
          <Text style={styles.statusPill}>{statusLabel(session)}</Text>
        </View>
        <Text style={styles.cardTitle}>{isRecording ? "正在本机监听" : hasFinished ? "今晚监听已收好" : "准备开始监听"}</Text>
        <Text style={styles.body}>
          {denied
            ? "你没有授权麦克风，所以今晚不会记录声音摘要。这不影响睡前闭环。"
            : isRecording
              ? "第一版先保存监听摘要占位，后续会接入真实梦话/明显声音识别。"
              : hasFinished
                ? "明早打卡时，会看到昨晚的声音线索。"
                : "点击开始后，App 会创建本机声音摘要记录。真实录音分析会在下个迭代接入。"}
        </Text>
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
