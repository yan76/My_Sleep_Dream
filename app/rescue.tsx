import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import { AppCard } from "@/components/common/AppCard";
import { AppDialog } from "@/components/common/AppDialog";
import { Screen } from "@/components/common/Screen";
import { colors } from "@/constants/colors";
import { buildRescueViewModel } from "@/features/rescue/rescueViewModel";
import type { FlowStep, RescueData } from "@/features/rescue/rescueViewModel";
import {
  getTodaySession,
  getUserConfig,
  markUrgeToScroll,
  startTodaySessionWithNotice,
  updateTodayRitualStep
} from "@/storage/rescueSessionStorage";
import {
  getDailyExecutionRecordByDate,
  markExternalClosed,
  markRescuePause,
  markRitualStarted
} from "@/storage/dailyExecutionStorage";
import { resolveCurrentCycleDate } from "@/storage/demoCycleDateStorage";
import {
  dailyCycleHasClosedExternal,
  dailyCycleHasCompletedReview,
  dailyCycleHasStartedRitual,
  dailyCycleHasStartedSleepAidAfterReview,
  dailyCycleIsReadyToSleepAfterReview
} from "@/utils/dailyCycle";
import { getSuggestedRescueTime } from "@/utils/sleepPreferences";

function isTerminalDailyCycle(record: RescueData["executionRecord"]): boolean {
  return record?.status === "checked_in" || record?.status === "feedback_viewed";
}

function isInactiveSession(session: RescueData["session"]): boolean {
  return Boolean(session && ["completed", "abandoned"].includes(session.status));
}

function sessionHasCompletedReview(session: RescueData["session"]): boolean {
  return Boolean(session?.todayReviewCompleted || session?.todayReviewCompletedAt);
}

function sessionHasStartedSleepAidAfterReview(session: RescueData["session"]): boolean {
  return Boolean(sessionHasCompletedReview(session) && session?.status === "in_relax_mode");
}

function sessionIsReadyToSleepAfterReview(session: RescueData["session"]): boolean {
  if (!sessionHasCompletedReview(session)) {
    return false;
  }

  if (session?.readyToSleepAt) {
    return session.todayReviewCompletedAt ? session.readyToSleepAt >= session.todayReviewCompletedAt : true;
  }

  return session?.status === "ready_to_sleep";
}

function StepCard({ step, index }: { step: FlowStep; index: number }) {
  const isDone = step.state === "done";
  const isActive = step.state === "active";
  const label = isDone ? "已完成" : isActive ? "当前" : "稍后";

  return (
    <View style={[styles.stepCard, isActive && styles.stepActive, isDone && styles.stepDone]}>
      <View style={[styles.stepIndex, isActive && styles.stepIndexActive, isDone && styles.stepIndexDone]}>
        <Text style={[styles.stepIndexText, (isActive || isDone) && styles.stepIndexTextActive]}>{index + 1}</Text>
      </View>
      <View style={styles.stepCopy}>
        <View style={styles.stepTitleRow}>
          <Text style={styles.stepTitle}>{step.title}</Text>
          <Text style={[styles.stepState, isActive && styles.stepStateActive, isDone && styles.stepStateDone]}>{label}</Text>
        </View>
        <Text style={styles.stepBody}>{step.body}</Text>
      </View>
    </View>
  );
}

export default function RescueScreen() {
  const [data, setData] = useState<RescueData | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [showExternalCloseDialog, setShowExternalCloseDialog] = useState(false);
  const [newWeekStartedAction, setNewWeekStartedAction] = useState<(() => void) | null>(null);

  const loadData = useCallback(async () => {
    const cycleDate = await resolveCurrentCycleDate();
    const [session, executionRecord, userConfig] = await Promise.all([
      getTodaySession(),
      getDailyExecutionRecordByDate(cycleDate),
      getUserConfig()
    ]);
    setData({ session, executionRecord, userConfig });
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const viewModel = useMemo(
    () => buildRescueViewModel(data?.session ?? null, data?.executionRecord ?? null, data?.userConfig),
    [data?.session, data?.executionRecord, data?.userConfig]
  );
  const targetTime = data?.userConfig.targetSleepTime ?? "23:30";
  const suggestedStart = data
    ? getSuggestedRescueTime(data.userConfig.targetSleepTime, data.userConfig.reminderMinutesBefore)
    : "23:00";

  const handlePrimaryAction = async () => {
    if (isWorking) {
      return;
    }

    setIsWorking(true);
    try {
      const rawSession = data?.session ?? null;
      const rawExecutionRecord = data?.executionRecord ?? null;
      const session = isInactiveSession(rawSession) ? null : rawSession;
      const executionRecord = isTerminalDailyCycle(rawExecutionRecord) ? null : rawExecutionRecord;

      if (dailyCycleIsReadyToSleepAfterReview(executionRecord) || sessionIsReadyToSleepAfterReview(session)) {
        router.push("/");
        return;
      }

      if (
        dailyCycleHasStartedSleepAidAfterReview(executionRecord) ||
        sessionHasStartedSleepAidAfterReview(session)
      ) {
        router.push("/sleep-generator");
        return;
      }

      if (dailyCycleHasCompletedReview(executionRecord) || sessionHasCompletedReview(session)) {
        router.push("/sleep-generator");
        return;
      }

      if (
        dailyCycleHasClosedExternal(executionRecord) ||
        (session?.ritualStep ?? 0) >= 1 ||
        session?.status === "in_rescue_flow"
      ) {
        router.push({ pathname: "/today-review", params: { from: "rescue" } });
        return;
      }

      const startResult = session
        ? { session, startedNewGrowthWeek: false }
        : await startTodaySessionWithNotice();
      const startedSession = startResult.session;
      if (!dailyCycleHasStartedRitual(executionRecord)) {
        await markRitualStarted();
      }

      setData((current) => (current ? { ...current, session: startedSession } : current));
      if (startResult.startedNewGrowthWeek) {
        setNewWeekStartedAction(() => () => setShowExternalCloseDialog(true));
      } else {
        setShowExternalCloseDialog(true);
      }
    } finally {
      setIsWorking(false);
    }
  };

  const handleExternalCloseLater = () => {
    setShowExternalCloseDialog(false);
  };

  const handleExternalCloseComplete = async () => {
    if (isWorking) {
      return;
    }

    setIsWorking(true);
    try {
      await updateTodayRitualStep(1);
      await markExternalClosed();
      setShowExternalCloseDialog(false);
      await loadData();
    } finally {
      setIsWorking(false);
    }
  };

  const handleShutdownBranch = async () => {
    if (isWorking) {
      return;
    }

    setIsWorking(true);
    try {
      const rawSession = data?.session ?? null;
      const rawExecutionRecord = data?.executionRecord ?? null;
      const session = isInactiveSession(rawSession) ? null : rawSession;
      const executionRecord = isTerminalDailyCycle(rawExecutionRecord) ? null : rawExecutionRecord;
      const alreadyReadyToSleep =
        dailyCycleIsReadyToSleepAfterReview(executionRecord) ||
        sessionIsReadyToSleepAfterReview(session);
      let startedNewGrowthWeek = false;

      if (!alreadyReadyToSleep) {
        const startResult = await startTodaySessionWithNotice();
        startedNewGrowthWeek = startResult.startedNewGrowthWeek;
        await markRitualStarted();
        await markRescuePause();
        await markUrgeToScroll();
      }

      if (startedNewGrowthWeek) {
        setNewWeekStartedAction(() => () => router.push("/shutdown-challenge"));
        return;
      }

      router.push("/shutdown-challenge");
    } finally {
      setIsWorking(false);
    }
  };

  const confirmNewWeekStarted = () => {
    const action = newWeekStartedAction;
    setNewWeekStartedAction(null);
    action?.();
  };

  if (!data) {
    return (
      <Screen>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>正在把今晚接回来...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.top}>
        <Pressable style={styles.backButton} onPress={() => router.push("/")}>
          <Text style={styles.backText}>返回</Text>
        </Pressable>
        <Text style={styles.statusPill}>{viewModel.statusLabel}</Text>
      </View>

      <View style={styles.header}>
        <Text style={styles.eyebrow}>自救</Text>
        <Text style={styles.title}>{viewModel.title}</Text>
        <Text style={styles.subtitle}>{viewModel.subtitle}</Text>
      </View>

      <View style={styles.goalRow}>
        <View style={styles.mini}>
          <Text style={styles.label}>目标睡觉</Text>
          <Text style={styles.value}>{targetTime}</Text>
        </View>
        <View style={styles.mini}>
          <Text style={styles.label}>建议开始</Text>
          <Text style={styles.value}>{suggestedStart}</Text>
        </View>
      </View>

      <AppCard tone="warm" style={styles.primaryCard}>
        <Text style={styles.label}>当前只做这一件事</Text>
        <Text style={styles.primaryTitle}>{viewModel.primaryTitle}</Text>
        <Text style={styles.body}>{viewModel.primaryBody}</Text>
        <AppButton
          title={viewModel.primaryButton}
          onPress={handlePrimaryAction}
          disabled={isWorking}
          variant={viewModel.completed ? "secondary" : "gradient"}
          style={styles.primaryButton}
        />
      </AppCard>

      <View style={styles.flowList}>
        {viewModel.steps.map((step, index) => (
          <StepCard key={step.id} step={step} index={index} />
        ))}
      </View>

      {!viewModel.completed ? (
        <Pressable style={({ pressed }) => [styles.branch, pressed && styles.pressed]} onPress={handleShutdownBranch}>
          <View style={styles.branchIcon}>
            <Text style={styles.branchIconText}>!</Text>
          </View>
          <View style={styles.branchCopy}>
            <Text style={styles.branchTitle}>我还是想继续刷</Text>
            <Text style={styles.branchBody}>先做一个 2 分钟下线挑战，不和自己硬扛。</Text>
          </View>
        </Pressable>
      ) : null}

      <Modal
        transparent
        visible={showExternalCloseDialog}
        animationType="fade"
        onRequestClose={handleExternalCloseLater}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>先把外界调暗一点</Text>
            <Text style={styles.dialogBody}>
              今天辛苦啦，可以先清理一下手机里还开着的后台任务，再把屏幕亮度调低一点。为了自己和亲人，请爱惜身体，开始执行早睡计划~
            </Text>
            <Text style={styles.dialogHint}>做完这一步，我们再把今天慢慢放下。</Text>
            <View style={styles.dialogActions}>
              <AppButton
                title="稍后执行"
                variant="ghost"
                onPress={handleExternalCloseLater}
                size="md"
                style={styles.dialogButton}
                disabled={isWorking}
              />
              <AppButton
                title={isWorking ? "正在调整..." : "完成调整"}
                variant="gradient"
                onPress={handleExternalCloseComplete}
                size="md"
                style={styles.dialogButton}
                disabled={isWorking}
              />
            </View>
          </View>
        </View>
      </Modal>
      <AppDialog
        visible={newWeekStartedAction !== null}
        title="新的一周开始了"
        body="请继续加油！"
        onConfirm={confirmNewWeekStarted}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    minHeight: 420,
    alignItems: "center",
    justifyContent: "center"
  },
  loadingText: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "800"
  },
  top: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  backButton: {
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    justifyContent: "center",
    paddingHorizontal: 14
  },
  backText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900"
  },
  statusPill: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "900",
    borderRadius: 999,
    backgroundColor: "#39313A",
    paddingHorizontal: 10,
    paddingVertical: 6,
    overflow: "hidden"
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
  goalRow: {
    flexDirection: "row",
    gap: 14
  },
  mini: {
    flex: 1,
    minHeight: 94,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 17,
    justifyContent: "space-between"
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "900"
  },
  value: {
    color: colors.accent,
    fontSize: 27,
    fontWeight: "900"
  },
  primaryCard: {
    borderColor: "#5B5147",
    backgroundColor: "#2A2834"
  },
  primaryTitle: {
    color: colors.ink,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900"
  },
  body: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "700"
  },
  primaryButton: {
    marginTop: 4
  },
  flowList: {
    gap: 12
  },
  stepCard: {
    minHeight: 108,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: 16,
    flexDirection: "row",
    gap: 14,
    alignItems: "center"
  },
  stepActive: {
    borderColor: "#6F6A56",
    backgroundColor: colors.surfaceWarm
  },
  stepDone: {
    borderColor: "#365345",
    backgroundColor: colors.surfaceMint
  },
  stepIndex: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#262837"
  },
  stepIndexActive: {
    backgroundColor: colors.accent
  },
  stepIndexDone: {
    backgroundColor: colors.success
  },
  stepIndexText: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "900"
  },
  stepIndexTextActive: {
    color: colors.buttonText
  },
  stepCopy: {
    flex: 1,
    gap: 7
  },
  stepTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  stepTitle: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: "900"
  },
  stepState: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  stepStateActive: {
    color: colors.accent
  },
  stepStateDone: {
    color: colors.success
  },
  stepBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700"
  },
  branch: {
    minHeight: 90,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#4B4050",
    backgroundColor: "#1B1D36",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  branchIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: "#3D3442",
    alignItems: "center",
    justifyContent: "center"
  },
  branchIconText: {
    color: colors.buttonText,
    fontSize: 22,
    lineHeight: 24,
    fontWeight: "900"
  },
  branchCopy: {
    flex: 1,
    gap: 5
  },
  branchTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "900"
  },
  branchBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700"
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.9
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(7, 8, 23, 0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  dialog: {
    width: "100%",
    maxWidth: 390,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surfaceStrong,
    padding: 22,
    gap: 16
  },
  dialogTitle: {
    color: colors.ink,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900"
  },
  dialogBody: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "700"
  },
  dialogHint: {
    color: colors.accent,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "800"
  },
  dialogActions: {
    flexDirection: "row",
    gap: 10
  },
  dialogButton: {
    flex: 1
  }
});
