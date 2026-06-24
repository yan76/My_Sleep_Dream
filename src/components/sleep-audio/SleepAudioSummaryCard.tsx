import { createAudioPlayer } from "expo-audio";
import type { AudioPlayer } from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import { AppCard } from "@/components/common/AppCard";
import { colors } from "@/constants/colors";
import { deleteSleepMonitoringSession } from "@/services/sleepAudioMonitoringService";
import { SleepAudioEvent, SleepAudioSession } from "@/types/app";

type SleepAudioSummaryCardProps = {
  session: SleepAudioSession | null;
  onDeleted?: () => void;
};

const eventLabels: Record<SleepAudioEvent["type"], string> = {
  voice_like: "疑似梦话/人声",
  snore_like: "疑似鼾声",
  cough_like: "疑似咳嗽",
  movement_like: "疑似翻身动静",
  noise_like: "明显环境声",
  unknown: "未知声音"
};

function formatClock(value?: string): string {
  if (!value) {
    return "--:--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatDuration(durationMs: number): string {
  const seconds = Math.max(1, Math.round(durationMs / 1000));
  if (seconds < 60) {
    return `${seconds} 秒`;
  }

  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  return restSeconds ? `${minutes} 分 ${restSeconds} 秒` : `${minutes} 分钟`;
}

function formatDb(value?: number): string {
  return typeof value === "number" ? `${Math.round(value)} dB` : "--";
}

function statusLabel(session: SleepAudioSession | null): string {
  if (!session) {
    return "未开启";
  }

  if (session.status === "permission_denied") {
    return "未授权";
  }

  if (session.status === "failed") {
    return "监听失败";
  }

  if (session.status === "recording") {
    return "监听中";
  }

  return session.eventCount > 0 ? `${session.eventCount} 段线索` : "比较安静";
}

function summaryText(session: SleepAudioSession | null): string {
  if (!session) {
    return "昨晚未开启声音监听。这完全没关系，不影响这次打卡和成长记录。";
  }

  if (session.status === "permission_denied") {
    return "昨晚没有麦克风授权，所以没有记录声音摘要。睡前闭环仍然已经完成。";
  }

  if (session.status === "failed") {
    return "昨晚监听没有完整完成。你仍然可以继续完成打卡，监听失败不会影响成长记录。";
  }

  if (session.eventCount > 0) {
    return "昨晚检测到几段明显声音。它们可能来自梦话、鼾声、翻身或环境声，只作为温和线索，不做医学判断。";
  }

  return "昨晚没有记录到明显声音线索。这个摘要只表示监听期间相对安静，不代表医学结论。";
}

function eventMeta(event: SleepAudioEvent): string {
  return `${formatClock(event.startedAt)} · ${formatDuration(event.durationMs)} · 峰值 ${formatDb(event.peakDb)}`;
}

function normalizeClipUri(uri: string): string {
  if (Platform.OS === "android" && uri.startsWith("file://")) {
    return uri.replace("file://", "");
  }

  return uri;
}

export function SleepAudioSummaryCard({ session, onDeleted }: SleepAudioSummaryCardProps) {
  const playerRef = useRef<AudioPlayer | null>(null);
  const playerSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const webAudioRef = useRef<HTMLAudioElement | null>(null);
  const [playingEventId, setPlayingEventId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const events = session?.events ?? [];
  const playableEventIds = new Set(events.filter((event) => event.localClipUri).map((event) => event.id));
  const summary = session?.summary;

  const stopPlayback = useCallback(() => {
    try {
      playerSubscriptionRef.current?.remove();
    } catch {
      // expo-audio may already have detached the native listener after playback ends.
    }
    playerSubscriptionRef.current = null;
    webAudioRef.current?.pause();
    if (webAudioRef.current) {
      webAudioRef.current.currentTime = 0;
    }
    webAudioRef.current = null;
    const player = playerRef.current;
    playerRef.current = null;
    if (player) {
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

      try {
        player.release();
      } catch {
        // Shared objects throw if release races with another native cleanup path.
      }
    }
    setPlayingEventId(null);
  }, []);

  useEffect(() => stopPlayback, [stopPlayback]);

  const playEvent = (event: SleepAudioEvent) => {
    if (!event.localClipUri) {
      return;
    }

    if (playingEventId === event.id) {
      stopPlayback();
      return;
    }

    stopPlayback();
    setError(null);

    if (Platform.OS === "web") {
      const audio = new Audio(event.localClipUri);
      audio.onended = () => setPlayingEventId(null);
      webAudioRef.current = audio;
      audio.play()
        .then(() => setPlayingEventId(event.id))
        .catch(() => setError("这段声音暂时无法播放。"));
      return;
    }

    try {
      const player = createAudioPlayer({ uri: normalizeClipUri(event.localClipUri) });
      playerRef.current = player;
      playerSubscriptionRef.current = player.addListener("playbackStatusUpdate", (status) => {
        if (playerRef.current !== player) {
          return;
        }

        if (status.didJustFinish || status.playbackState === "ended") {
          setTimeout(() => {
            if (playerRef.current === player) {
              stopPlayback();
            }
          }, 0);
        }
      });
      player.play();
      setPlayingEventId(event.id);
    } catch {
      setError("这段声音暂时无法播放。");
    }
  };

  const removeSession = async () => {
    if (!session || deleting) {
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      stopPlayback();
      await deleteSleepMonitoringSession(session.date);
      onDeleted?.();
    } catch {
      setError("删除监听记录失败，请稍后再试。");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppCard tone="cool">
      <View style={styles.statusRow}>
        <Text style={styles.label}>昨晚声音线索</Text>
        <Text style={styles.statusPill}>{statusLabel(session)}</Text>
      </View>

      <Text style={styles.body}>{summaryText(session)}</Text>

      {session ? (
        <View style={styles.metricsGrid}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>安静分数</Text>
            <Text style={styles.metricValue}>{summary?.quietScore ?? "--"}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>疑似鼾声</Text>
            <Text style={styles.metricValue}>{summary?.snoreLikeCount ?? 0}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>疑似人声</Text>
            <Text style={styles.metricValue}>{summary?.voiceLikeCount ?? 0}</Text>
          </View>
        </View>
      ) : null}

      {events.length > 0 ? (
        <View style={styles.timeline}>
          <Text style={styles.sectionTitle}>声音时间线</Text>
          {events.map((event) => {
            const playable = playableEventIds.has(event.id);
            const playing = playingEventId === event.id;
            return (
              <View key={event.id} style={styles.eventRow}>
                <View style={styles.eventDot} />
                <View style={styles.eventCopy}>
                  <Text style={styles.eventTitle}>{eventLabels[event.type]}</Text>
                  <Text style={styles.eventMeta}>{eventMeta(event)}</Text>
                </View>
                <Pressable
                  disabled={!playable}
                  onPress={() => playEvent(event)}
                  style={({ pressed }) => [
                    styles.playButton,
                    !playable && styles.playButtonDisabled,
                    pressed && playable && styles.pressed
                  ]}
                >
                  <Text style={styles.playText}>{playing ? "停" : "放"}</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {session ? (
        <AppButton
          title={deleting ? "正在删除..." : "删除这晚监听记录"}
          variant="danger"
          size="md"
          onPress={removeSession}
          disabled={deleting}
        />
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  statusRow: {
    minHeight: 26,
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
  body: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "700"
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 10
  },
  metric: {
    flex: 1,
    minHeight: 76,
    borderRadius: 18,
    backgroundColor: colors.surface,
    padding: 12,
    justifyContent: "space-between"
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800"
  },
  metricValue: {
    color: colors.accent,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "900"
  },
  timeline: {
    gap: 10
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900"
  },
  eventRow: {
    minHeight: 66,
    borderRadius: 18,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  eventDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.accent
  },
  eventCopy: {
    flex: 1,
    gap: 3
  },
  eventTitle: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "900"
  },
  eventMeta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700"
  },
  playButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center"
  },
  playButtonDisabled: {
    opacity: 0.35
  },
  playText: {
    color: colors.buttonText,
    fontSize: 14,
    fontWeight: "900"
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800"
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.86
  }
});
