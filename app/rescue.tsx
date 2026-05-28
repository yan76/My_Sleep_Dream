import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import { AppCard } from "@/components/common/AppCard";
import { BottomNav } from "@/components/common/BottomNav";
import { PageHeader } from "@/components/common/PageHeader";
import { Screen } from "@/components/common/Screen";
import { colors } from "@/constants/colors";
import { RescueSession } from "@/types/app";
import {
  getTodaySession,
  markReadyToSleep,
  markRelaxModeUsed,
  markUrgeToScroll,
  resetTodayRescueFlowProgress,
  startTodaySession,
  updateTodaySessionStatus
} from "@/storage/rescueSessionStorage";

const steps = [
  { title: "放下工作和消息", subtitle: "给自己一个真正休息的信号", icon: "1" },
  { title: "三分钟呼吸放松", subtitle: "跟着引导，让呼吸慢下来", icon: "2" },
  { title: "调暗屏幕和灯光", subtitle: "告诉眼睛和大脑：该收工了", icon: "3" },
  { title: "写下今天放不下的事", subtitle: "清空大脑缓存，释放焦虑", icon: "4" }
];

const stepOrderPrompt = "请按照顺序完成对应的步骤";
const resetSuccessPrompt = "已清空今晚自救流程的四步记录";

function parseCompletedSteps(value?: string) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => Number(item))
    .filter((index) => Number.isInteger(index) && index >= 0 && index < steps.length);
}

export default function RescueScreen() {
  const { todayReviewCompleted, completedSteps, stepsReset } = useLocalSearchParams<{
    todayReviewCompleted?: string;
    completedSteps?: string;
    stepsReset?: string;
  }>();
  const [session, setSession] = useState<RescueSession | null>(null);
  const [done, setDone] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [orderNotice, setOrderNotice] = useState("");
  const nextStepIndex = steps.findIndex((_, index) => !done[index]);
  const completed = nextStepIndex === -1 ? steps.length : nextStepIndex;
  const progress = (completed / steps.length) * 100;

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadSession() {
        const current = (await getTodaySession()) ?? (await startTodaySession());
        const next = current.status === "started" ? await updateTodaySessionStatus("in_rescue_flow") : current;

        if (active) {
          const restoredStepIndexes = parseCompletedSteps(completedSteps);
          const hasCompletedReview = todayReviewCompleted === "1" || next.todayReviewCompleted;

          setSession(next);
          setOrderNotice(stepsReset === "1" ? resetSuccessPrompt : "");
          setDone((value) => {
            const nextDone = { ...value };

            restoredStepIndexes.forEach((index) => {
              nextDone[index] = true;
            });

            if (hasCompletedReview) {
              steps.forEach((_, index) => {
                nextDone[index] = true;
              });
            }

            return nextDone;
          });
        }
      }

      loadSession();

      return () => {
        active = false;
      };
    }, [completedSteps, stepsReset, todayReviewCompleted])
  );

  const toggleStep = (index: number) => {
    if (done[index]) {
      return;
    }

    if (index !== completed) {
      setOrderNotice(stepOrderPrompt);
      Alert.alert(stepOrderPrompt);
      return;
    }

    setOrderNotice("");

    if (index === 3) {
      const completedStepParam = steps
        .map((_, stepIndex) => stepIndex)
        .filter((stepIndex) => stepIndex < index)
        .join(",");

      router.push(`/today-review?from=rescue&completedSteps=${completedStepParam}` as never);
      return;
    }

    setDone((value) => ({ ...value, [index]: true }));
  };

  const goShutdownChallenge = async () => {
    setSaving(true);
    try {
      await markUrgeToScroll();
      router.push("/shutdown-challenge");
    } finally {
      setSaving(false);
    }
  };

  const goRelaxMode = async () => {
    setSaving(true);
    try {
      await markRelaxModeUsed();
      router.push("/bedtime");
    } finally {
      setSaving(false);
    }
  };

  const readyToSleep = async () => {
    setSaving(true);
    try {
      await markReadyToSleep();
      router.replace("/");
    } finally {
      setSaving(false);
    }
  };

  const resetFlowSteps = async () => {
    setSaving(true);
    try {
      const next = await resetTodayRescueFlowProgress();
      setSession(next);
      setDone({});
      setOrderNotice(resetSuccessPrompt);
      router.replace("/rescue?stepsReset=1" as never);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <PageHeader title="今晚自救流程" subtitle="一步一步把夜晚的主动权拿回来。" />

      <AppCard topAccent>
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>完成进度</Text>
          <Text style={styles.progressCount}>{completed}/{steps.length}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.sessionStatus}>Session：{session?.status ?? "读取中"}</Text>
      </AppCard>

      {orderNotice ? (
        <Pressable onPress={() => setOrderNotice("")} style={styles.orderNotice}>
          <Text style={styles.orderNoticeText}>{orderNotice}</Text>
        </Pressable>
      ) : null}

      <View style={styles.list}>
        {steps.map((step, index) => {
          const checked = Boolean(done[index]);
          const isActive = index === completed && !checked;
          const isLocked = index > completed && !checked;
          return (
            <Pressable
              key={step.title}
              onPress={() => toggleStep(index)}
              style={[
                styles.step,
                isActive && styles.activeStep,
                checked && styles.checkedStep,
                isLocked && styles.lockedStep
              ]}
            >
              <View style={[
                styles.stepIndicator,
                checked && styles.indicatorChecked,
                isActive && styles.indicatorActive
              ]}>
                <Text style={[styles.stepNum, checked && styles.checkMark]}>{checked ? "✓" : step.icon}</Text>
              </View>

              <View style={styles.stepCopy}>
                <Text style={[
                  styles.stepTitle,
                  checked && styles.checkedTitle,
                  isLocked && styles.lockedTitle
                ]}>
                  {step.title}
                </Text>
                <Text style={[
                  styles.stepMeta,
                  isLocked && styles.lockedMeta
                ]}>
                  {isActive ? "进行中" : step.subtitle}
                </Text>
              </View>

              {isActive ? (
                <View style={styles.actionPill}>
                  <Text style={styles.actionPillText}>去完成</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.actions}>
        <AppButton
          title="我准备睡了"
          variant="gradient"
          disabled={saving}
          onPress={readyToSleep}
        />
        <AppButton
          title="我还想再刷一会儿"
          variant="secondary"
          disabled={saving}
          onPress={goShutdownChallenge}
        />
        <AppButton
          title="白噪音 / 放松一下"
          variant="ghost"
          disabled={saving}
          onPress={goRelaxMode}
        />
        <AppButton
          title={saving ? "正在清空..." : "测试：清空四步记录"}
          variant="danger"
          size="md"
          disabled={saving}
          onPress={resetFlowSteps}
        />
      </View>

      <BottomNav active="rescue" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  progressText: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800"
  },
  progressCount: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: "800"
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.accent
  },
  sessionStatus: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700"
  },
  orderNotice: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.warning + "80",
    backgroundColor: "rgba(240,201,120,0.14)",
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  orderNoticeText: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center" as const
  },
  list: {
    gap: 12
  },
  step: {
    minHeight: 96,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  activeStep: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.lineStrong
  },
  checkedStep: {
    backgroundColor: colors.surface,
    opacity: 0.7
  },
  lockedStep: {
    backgroundColor: colors.surface,
    borderColor: colors.line
  },
  stepIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceStrong
  },
  indicatorChecked: {
    backgroundColor: colors.accent + "50"
  },
  indicatorActive: {
    backgroundColor: colors.surfaceCool
  },
  checkMark: {
    color: colors.accent
  },
  stepNum: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "800"
  },
  stepCopy: {
    flex: 1,
    gap: 4
  },
  stepTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800"
  },
  checkedTitle: {
    color: colors.muted
  },
  lockedTitle: {
    color: colors.muted,
    opacity: 0.5
  },
  stepMeta: {
    color: colors.muted,
    fontSize: 14
  },
  lockedMeta: {
    opacity: 0.5
  },
  actionPill: {
    backgroundColor: colors.primary + "30",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.primary + "50"
  },
  actionPillText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "800"
  },
  actions: {
    gap: 10
  }
});
