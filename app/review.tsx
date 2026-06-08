import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import { AppCard } from "@/components/common/AppCard";
import { Screen } from "@/components/common/Screen";
import { colors } from "@/constants/colors";
import { lateNightReasons } from "@/constants/reasons";
import {
  getLatestSleepRecord,
  getSleepRecordByDate,
  getTodayReviews,
  getUserConfig
} from "@/storage/rescueSessionStorage";
import { getDailyExecutionRecordByDate, markFeedbackViewed } from "@/storage/dailyExecutionStorage";
import { DailyExecutionRecord, LateNightReason, SleepRecord, SleepResult, TodayReview } from "@/types/app";

type ReviewData = {
  date: string;
  executionRecord: DailyExecutionRecord | null;
  sleepRecord: SleepRecord | null;
  todayReview: TodayReview | null;
};

const reasonLabelMap = Object.fromEntries(lateNightReasons.map((reason) => [reason.id, reason.label])) as Record<
  LateNightReason,
  string
>;

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function ReviewScreen() {
  const params = useLocalSearchParams<{ date?: string | string[] }>();
  const requestedDate = firstParam(params.date);
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const latestRecord = await getLatestSleepRecord();
    const fallbackConfig = await getUserConfig();
    const date = requestedDate ?? latestRecord?.date ?? "";

    if (!date) {
      setData({
        date: "",
        executionRecord: null,
        sleepRecord: null,
        todayReview: null
      });
      setLoading(false);
      return;
    }

    const [executionRecord, sleepRecord, reviews] = await Promise.all([
      getDailyExecutionRecordByDate(date),
      getSleepRecordByDate(date),
      getTodayReviews()
    ]);

    const viewedExecutionRecord = executionRecord || sleepRecord ? await markFeedbackViewed(date) : null;

    setData({
      date,
      executionRecord:
        viewedExecutionRecord ??
        ({
          date,
          plannedSleepTime: sleepRecord?.plannedSleepTime ?? fallbackConfig.targetSleepTime,
          wakeUpTime: fallbackConfig.wakeUpTime,
          status: "feedback_viewed",
          usedSoundSpa: false,
          usedTreeHole: false,
          usedSleepGenerator: false,
          shutdownChallengeCount: 0,
          rescuePauseCount: 0,
          actualSleepTime: sleepRecord?.actualSleepTime,
          feedbackViewedAt: new Date().toISOString(),
          createdAt: sleepRecord?.createdAt ?? new Date().toISOString(),
          updatedAt: sleepRecord?.updatedAt ?? new Date().toISOString()
        } satisfies DailyExecutionRecord),
      sleepRecord,
      todayReview: reviews.find((review) => review.date === date) ?? null
    });
    setLoading(false);
  }, [requestedDate]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const viewModel = useMemo(() => (data ? buildReviewViewModel(data) : null), [data]);

  if (loading || !viewModel) {
    return (
      <Screen>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>正在整理昨晚反馈...</Text>
        </View>
      </Screen>
    );
  }

  if (!viewModel.hasRecord) {
    return (
      <Screen>
        <View style={styles.top}>
          <Pressable style={styles.ghost} onPress={() => router.replace("/")}>
            <Text style={styles.ghostText}>返回首页</Text>
          </Pressable>
        </View>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>昨晚反馈</Text>
          <Text style={styles.title}>还没有可展示的昨晚结果</Text>
          <Text style={styles.subtitle}>先完成一次次日打卡，这里就会生成你的反馈和今晚建议。</Text>
        </View>

        <AppButton title="去次日打卡" variant="gradient" onPress={() => router.push("/checkin")} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.top}>
        <Pressable style={styles.ghost} onPress={() => router.replace("/")}>
          <Text style={styles.ghostText}>返回首页</Text>
        </Pressable>
        <Text style={styles.datePill}>{viewModel.date}</Text>
      </View>

      <View style={styles.header}>
        <Text style={styles.eyebrow}>昨晚反馈</Text>
        <Text style={styles.title}>{viewModel.title}</Text>
        <Text style={styles.subtitle}>{viewModel.subtitle}</Text>
      </View>

      <AppCard tone={viewModel.resultTone} style={styles.heroCard}>
        <View style={styles.statusRow}>
          <Text style={styles.label}>昨晚结果</Text>
          <Text style={styles.statusPill}>{viewModel.resultLabel}</Text>
        </View>
        <Text style={styles.heroTitle}>{viewModel.resultHeadline}</Text>
        <Text style={styles.body}>{viewModel.resultBody}</Text>
      </AppCard>

      <View style={styles.factGrid}>
        <View style={styles.fact}>
          <Text style={styles.label}>目标</Text>
          <Text style={styles.factValue}>{viewModel.plannedSleepTime}</Text>
        </View>
        <View style={styles.fact}>
          <Text style={styles.label}>实际</Text>
          <Text style={styles.factValue}>{viewModel.actualSleepTime}</Text>
        </View>
        <View style={styles.fact}>
          <Text style={styles.label}>醒来</Text>
          <Text style={styles.factValue}>{viewModel.moodLabel}</Text>
        </View>
      </View>

      <AppCard tone="mint">
        <Text style={styles.cardTitle}>身体变化回声</Text>
        <Text style={styles.body}>{viewModel.bodyEcho}</Text>
      </AppCard>

      <AppCard tone="cool">
        <Text style={styles.cardTitle}>和过去的自己比</Text>
        <Text style={styles.body}>{viewModel.comparison}</Text>
      </AppCard>

      {viewModel.todayReviewLine ? (
        <AppCard tone="warm">
          <Text style={styles.cardTitle}>昨晚你放下的事</Text>
          <Text style={styles.body}>{viewModel.todayReviewLine}</Text>
        </AppCard>
      ) : null}

      <AppCard tone="lavender">
        <Text style={styles.cardTitle}>今晚建议</Text>
        <Text style={styles.body}>{viewModel.tonightAdvice}</Text>
      </AppCard>

      <View style={styles.actionStack}>
        <AppButton title="查看成长记录" variant="gradient" onPress={() => router.push("/records")} />
        <AppButton title="回到首页" variant="ghost" onPress={() => router.replace("/")} />
      </View>
    </Screen>
  );
}

function buildReviewViewModel(data: ReviewData) {
  const { executionRecord, sleepRecord, todayReview } = data;
  const result = getResult(executionRecord, sleepRecord);
  const actualSleepTime = executionRecord?.actualSleepTime ?? sleepRecord?.actualSleepTime ?? "未记录";
  const plannedSleepTime = executionRecord?.plannedSleepTime ?? sleepRecord?.plannedSleepTime ?? "未记录";
  const moodLabel = getMoodLabel(executionRecord, sleepRecord);
  const reasonLabel = executionRecord?.lateReason ? reasonLabelMap[executionRecord.lateReason] : sleepRecord?.reasonIfFailed;
  const completedWindDown = Boolean(executionRecord?.readyToSleepAt || executionRecord?.checkinCompletedAt);
  const pauseCount = (executionRecord?.rescuePauseCount ?? 0) + (executionRecord?.shutdownChallengeCount ?? 0);

  return {
    date: data.date,
    hasRecord: Boolean(executionRecord || sleepRecord),
    title: result === "near_target" ? "昨晚，你离目标很近" : "昨晚已经被你认真记录了",
    subtitle:
      result === "near_target"
        ? "不是每晚都要完美，但昨晚你的身体确实更早收到了休息信号。"
        : "即使昨晚不完美，只要完成收尾和记录，也是在把自己带回来。",
    resultLabel: getResultLabel(result),
    resultHeadline: getResultHeadline(result),
    resultBody: getResultBody(result, reasonLabel),
    resultTone: result === "near_target" ? ("mint" as const) : result === "slightly_late" ? ("warm" as const) : ("rose" as const),
    plannedSleepTime,
    actualSleepTime,
    moodLabel,
    bodyEcho: getBodyEcho(result, moodLabel),
    comparison: getComparison(completedWindDown, pauseCount),
    todayReviewLine: todayReview
      ? todayReview.minimalMode
        ? `昨晚你写下了：“${todayReview.happenedToday}”。能用一句话给今天收尾，就已经很好。`
        : `昨晚你把“${todayReview.unfinishedToday || todayReview.happenedToday}”先放下了，并给明天留了“${todayReview.tomorrowPlan || "一件小事"}”。`
      : "",
    tonightAdvice: getTonightAdvice(result, executionRecord?.lateReason)
  };
}

function getResult(executionRecord: DailyExecutionRecord | null, sleepRecord: SleepRecord | null): SleepResult {
  if (executionRecord?.sleepResult) {
    return executionRecord.sleepResult;
  }

  return sleepRecord?.success ? "near_target" : "very_late";
}

function getResultLabel(result: SleepResult): string {
  if (result === "near_target") {
    return "接近目标";
  }

  if (result === "slightly_late") {
    return "晚了一点";
  }

  return "晚了很多";
}

function getResultHeadline(result: SleepResult): string {
  if (result === "near_target") {
    return "昨晚的收尾已经起作用了";
  }

  if (result === "slightly_late") {
    return "只是晚了一点，不需要重来";
  }

  return "昨晚很难，但你没有把它丢掉";
}

function getResultBody(result: SleepResult, reasonLabel?: string): string {
  if (result === "near_target") {
    return "你让夜晚有了一个结束点。这样的结束点重复几次，身体会慢慢记住。";
  }

  if (result === "slightly_late") {
    return reasonLabel
      ? `主要原因是“${reasonLabel}”。先看见它，今晚就可以提前给它留一个边界。`
      : "只是比目标晚了一点。记录下来，比假装没发生更有用。";
  }

  return reasonLabel
    ? `昨晚主要被“${reasonLabel}”带走了。今天不用批评自己，只要把这个入口提前挡一下。`
    : "昨晚确实比较难。能补录下来，就已经把这件事从模糊的自责里拿出来了。";
}

function getMoodLabel(executionRecord: DailyExecutionRecord | null, sleepRecord: SleepRecord | null): string {
  if (executionRecord?.morningMood === "good") {
    return "精神不错";
  }

  if (executionRecord?.morningMood === "okay") {
    return "还可以";
  }

  if (executionRecord?.morningMood === "tired") {
    return "有点累";
  }

  return sleepRecord?.moodNextMorning ?? "未记录";
}

function getBodyEcho(result: SleepResult, moodLabel: string): string {
  if (result === "near_target") {
    return `醒来感觉是“${moodLabel}”。这说明昨晚的收尾不是白做的，它给身体留出了一点恢复空间。`;
  }

  if (result === "slightly_late") {
    return `醒来感觉是“${moodLabel}”。晚了一点并不等于失败，身体只是提醒你今晚可以更早一点开始降速。`;
  }

  return `醒来感觉是“${moodLabel}”。如果身体还有点沉，今天先把要求放低，今晚从更小的一步开始。`;
}

function getComparison(completedWindDown: boolean, pauseCount: number): string {
  if (pauseCount > 0) {
    return `昨晚你有 ${pauseCount} 次在想继续刷时停了下来。能停一下，就已经和过去的惯性不一样。`;
  }

  if (completedWindDown) {
    return "昨晚你完成了睡前收尾。它不一定立刻改变入睡时间，但会先改变你对夜晚的掌控感。";
  }

  return "昨晚留下了一条真实记录。真实记录会让下一次调整更容易，而不是只剩下模糊的后悔。";
}

function getTonightAdvice(result: SleepResult, lateReason?: LateNightReason): string {
  if (lateReason === "short_video" || lateReason === "social_media") {
    return "今晚建议在开始自救前，先把最容易打开的内容入口退出，再进入今日复盘。";
  }

  if (lateReason === "work_study") {
    return "今晚建议把“明天第一件小事”写得更小一点，让脑子知道不用今晚继续处理。";
  }

  if (lateReason === "anxiety") {
    return "今晚建议优先使用心理暗示或树洞，把最占脑子的事先放出来。";
  }

  if (result === "near_target") {
    return "今晚继续沿用昨晚的节奏，睡前窗口一到就开始收尾，不需要加码。";
  }

  return "今晚建议提前 10 分钟开始自救，只完成一个最小闭环：收住外界、写一句、选一个助眠入口。";
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
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
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
  datePill: {
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "#303143",
    color: colors.accent,
    fontSize: 12,
    fontWeight: "900",
    paddingHorizontal: 10,
    paddingVertical: 6
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
  heroCard: {
    minHeight: 214
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
  heroTitle: {
    color: colors.ink,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900"
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 22,
    lineHeight: 29,
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
    gap: 10
  },
  fact: {
    flex: 1,
    minHeight: 92,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 15,
    justifyContent: "space-between"
  },
  factValue: {
    color: colors.accent,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "900"
  },
  actionStack: {
    gap: 12
  }
});
