import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import { AppCard } from "@/components/common/AppCard";
import { Screen } from "@/components/common/Screen";
import { colors } from "@/constants/colors";
import {
  getDailyExecutionRecordByDate,
  markDailyShutdownChallengeCompleted,
  markRescuePause
} from "@/storage/dailyExecutionStorage";
import { resolveCurrentCycleDate } from "@/storage/demoCycleDateStorage";
import { getMorningCheckInDate, getTodaySession, markShutdownChallengeCompleted } from "@/storage/rescueSessionStorage";
import { dailyCycleIsReadyToSleepAfterReview } from "@/utils/dailyCycle";

const TOTAL_SECONDS = 120;

const challengeActions = [
  "把手机屏幕朝下放到够不到的地方。",
  "闭上眼睛，慢慢呼气 6 次。",
  "把明天第一个要做的小事说出来。",
  "喝一口水，然后让手离开屏幕。"
];

function formatTimer(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

type ChallengeCycleTarget = {
  date: string;
  returnHome: boolean;
  updateTodaySession: boolean;
};

function sessionIsReadyToSleepAfterReview(session: Awaited<ReturnType<typeof getTodaySession>>): boolean {
  if (!session?.todayReviewCompleted && !session?.todayReviewCompletedAt) {
    return false;
  }

  if (session.readyToSleepAt) {
    return session.todayReviewCompletedAt ? session.readyToSleepAt >= session.todayReviewCompletedAt : true;
  }

  return session.status === "ready_to_sleep";
}

async function getChallengeCycleTarget(): Promise<ChallengeCycleTarget> {
  const morningCheckInDate = await getMorningCheckInDate();

  if (morningCheckInDate) {
    return {
      date: morningCheckInDate,
      returnHome: true,
      updateTodaySession: false
    };
  }

  const date = await resolveCurrentCycleDate();
  const [todayExecutionRecord, todaySession] = await Promise.all([
    getDailyExecutionRecordByDate(date),
    getTodaySession()
  ]);

  if (
    dailyCycleIsReadyToSleepAfterReview(todayExecutionRecord) ||
    sessionIsReadyToSleepAfterReview(todaySession)
  ) {
    return {
      date,
      returnHome: true,
      updateTodaySession: false
    };
  }

  return {
    date,
    returnHome: false,
    updateTodaySession: true
  };
}

export default function ShutdownChallengeScreen() {
  const [remainingSeconds, setRemainingSeconds] = useState(TOTAL_SECONDS);
  const [paused, setPaused] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (paused || remainingSeconds <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setRemainingSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [paused, remainingSeconds]);

  const actionIndex = useMemo(() => {
    const elapsed = TOTAL_SECONDS - remainingSeconds;
    return Math.min(challengeActions.length - 1, Math.floor(elapsed / 30));
  }, [remainingSeconds]);

  const completeChallenge = async () => {
    if (saving) {
      return;
    }

    setSaving(true);
    try {
      const target = await getChallengeCycleTarget();

      if (target.updateTodaySession) {
        await markShutdownChallengeCompleted();
      }

      await markDailyShutdownChallengeCompleted(target.date);
      router.replace(target.returnHome ? "/" : "/rescue");
    } finally {
      setSaving(false);
    }
  };

  const setBoundaryAndLeave = async () => {
    if (saving) {
      return;
    }

    setSaving(true);
    try {
      const target = await getChallengeCycleTarget();

      await markRescuePause(target.date);
      router.replace(target.returnHome ? "/" : "/rescue");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <View style={styles.top}>
        <Pressable style={styles.ghost} onPress={() => router.replace("/rescue")}>
          <Text style={styles.ghostText}>返回自救</Text>
        </Pressable>
        <Pressable style={styles.ghost} onPress={() => router.replace("/sleep-generator")}>
          <Text style={styles.ghostText}>去睡意生成器</Text>
        </Pressable>
      </View>

      <View style={styles.header}>
        <Text style={styles.eyebrow}>下线挑战</Text>
        <Text style={styles.title}>先撑过这 2 分钟</Text>
        <Text style={styles.subtitle}>不是和手机硬拼，只是把最想继续刷的那一下，轻轻挪过去。</Text>
      </View>

      <AppCard tone="warm" style={styles.timerCard}>
        <Text style={styles.timer}>{formatTimer(remainingSeconds)}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((TOTAL_SECONDS - remainingSeconds) / TOTAL_SECONDS) * 100}%` }]} />
        </View>
        <Text style={styles.timerHint}>
          {remainingSeconds === 0 ? "已经过了最难的一小段。" : paused ? "暂停中，回来时继续。" : "慢一点，先不要打开新的内容。"}
        </Text>
      </AppCard>

      <AppCard tone="cool">
        <Text style={styles.label}>当前动作</Text>
        <Text style={styles.actionText}>{challengeActions[actionIndex]}</Text>
      </AppCard>

      <AppCard>
        <Text style={styles.label}>呼吸提示</Text>
        <View style={styles.breathGrid}>
          <View style={styles.breathStep}>
            <Text style={styles.breathNumber}>4</Text>
            <Text style={styles.breathText}>吸气</Text>
          </View>
          <View style={styles.breathStep}>
            <Text style={styles.breathNumber}>2</Text>
            <Text style={styles.breathText}>停住</Text>
          </View>
          <View style={styles.breathStep}>
            <Text style={styles.breathNumber}>6</Text>
            <Text style={styles.breathText}>呼气</Text>
          </View>
        </View>
      </AppCard>

      <View style={styles.actions}>
        <AppButton
          title={saving ? "正在记录..." : remainingSeconds === 0 ? "完成挑战，回到自救" : "我先放下手机"}
          variant="gradient"
          onPress={completeChallenge}
          disabled={saving}
        />
        <AppButton
          title={paused ? "继续倒计时" : "暂停一下"}
          variant="secondary"
          onPress={() => setPaused((value) => !value)}
          disabled={saving || remainingSeconds === 0}
        />
        <AppButton
          title="我还会刷，但先设边界"
          variant="ghost"
          onPress={setBoundaryAndLeave}
          disabled={saving}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    minHeight: 38,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  ghost: {
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    justifyContent: "center",
    paddingHorizontal: 14
  },
  ghostText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900"
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
    fontSize: 36,
    lineHeight: 42,
    fontWeight: "900",
    letterSpacing: 0
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "700"
  },
  timerCard: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center"
  },
  timer: {
    color: colors.ink,
    fontSize: 72,
    lineHeight: 80,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
    letterSpacing: 0
  },
  progressTrack: {
    width: "100%",
    height: 10,
    borderRadius: 999,
    backgroundColor: "#25232A",
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.accent
  },
  timerHint: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "800",
    textAlign: "center"
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "900"
  },
  actionText: {
    color: colors.ink,
    fontSize: 24,
    lineHeight: 34,
    fontWeight: "900"
  },
  breathGrid: {
    flexDirection: "row",
    gap: 12
  },
  breathStep: {
    flex: 1,
    minHeight: 96,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: 4
  },
  breathNumber: {
    color: colors.accent,
    fontSize: 30,
    fontWeight: "900",
    fontVariant: ["tabular-nums"]
  },
  breathText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "900"
  },
  actions: {
    gap: 12
  }
});
