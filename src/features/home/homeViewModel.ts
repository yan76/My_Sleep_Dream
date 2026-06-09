import { router } from "expo-router";
import { isDemoMode } from "@/constants/demo";
import { AppStats, DailyExecutionRecord, RescueSession, SleepAudioSession, SleepRecord, UserConfig } from "@/types/app";
import { dailyCycleAtLeast } from "@/utils/dailyCycle";
import { minutesUntil, todayKey } from "@/utils/date";

export type HomeRouteTarget = Parameters<typeof router.push>[0];

export type HomeAction = {
  title: string;
  description: string;
  buttonTitle: string;
  href?: HomeRouteTarget;
  disabled?: boolean;
  startsSession?: boolean;
  demoCheckinDate?: string;
  confirmsReadyToSleep?: boolean;
};

export type HomeViewModel = {
  title: string;
  subtitle: string;
  statusLabel: string;
  action: HomeAction;
  secondaryAction?: HomeAction;
  changeQuote: string;
  changeBody: string;
};

export type HomeData = {
  userConfig: UserConfig;
  session: RescueSession | null;
  todayExecutionRecord: DailyExecutionRecord | null;
  morningCheckInDate: string | null;
  latestSleepRecord: SleepRecord | null;
  latestSleepExecutionRecord: DailyExecutionRecord | null;
  todayAudioSession: SleepAudioSession | null;
  morningAudioSession: SleepAudioSession | null;
  stats: AppStats;
  weeklyRitualCount: number;
};

export const PRIMARY_TOOLS = [
  { title: "声音 Spa", href: "/bedtime", tone: "cool", icon: "~" },
  { title: "下线挑战", href: "/shutdown-challenge", tone: "warm", icon: "2" }
] as const;

function isTerminalDailyCycle(record: DailyExecutionRecord | null): boolean {
  return record?.status === "checked_in" || record?.status === "feedback_viewed";
}

function isActiveSession(session: RescueSession | null): boolean {
  return Boolean(session && !["completed", "abandoned"].includes(session.status));
}

function isYesterday(dateKey: string): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return dateKey === todayKey(yesterday);
}

function buildRecentChange(data: Pick<HomeData, "stats" | "weeklyRitualCount">): Pick<HomeViewModel, "changeQuote" | "changeBody"> {
  const { stats, weeklyRitualCount } = data;

  if (weeklyRitualCount > 0) {
    return {
      changeQuote: `这周你已经 ${weeklyRitualCount} 次主动开始睡前仪式。`,
      changeBody: "你正在把夜晚一点点拿回来。"
    };
  }

  if (stats.weeklyReviewCount > 0) {
    return {
      changeQuote: `这周你写下了 ${stats.weeklyReviewCount} 次今日复盘。`,
      changeBody: "那些在脑子里打转的事，已经开始有地方安放。"
    };
  }

  if (stats.weeklyChallengeCount > 0) {
    return {
      changeQuote: `这周你有 ${stats.weeklyChallengeCount} 次在想继续刷时暂停下来。`,
      changeBody: "能停一下，就已经是在把自己往回带。"
    };
  }

  if (typeof stats.averageSleepDeltaMinutes === "number" && stats.averageSleepDeltaMinutes < 0) {
    return {
      changeQuote: `本周平均入睡提前 ${Math.abs(stats.averageSleepDeltaMinutes)} 分钟。`,
      changeBody: "变化不需要很大，稳定一点就会被身体记住。"
    };
  }

  return {
    changeQuote: "今晚先完成一次温柔收尾。",
    changeBody: "不用立刻变好，只要给今晚一个能做到的边界。"
  };
}

function buildSleepMonitorAction(audioSession?: SleepAudioSession | null): HomeAction {
  const audioStarted = audioSession?.status === "recording";

  return {
    title: audioStarted ? "查看睡眠监听" : "开始睡眠监听",
    description: "只在本机记录声音摘要，不上传云端；不开启也不影响次日打卡。",
    buttonTitle: audioStarted ? "查看睡眠监听" : "开始睡眠监听",
    href: "/sleep-monitor"
  };
}

export function buildHomeState(data: HomeData): HomeViewModel {
  const {
    userConfig,
    session,
    todayExecutionRecord,
    morningCheckInDate,
    latestSleepRecord,
    latestSleepExecutionRecord,
    todayAudioSession,
    morningAudioSession
  } = data;
  const activeTodayExecutionRecord = isTerminalDailyCycle(todayExecutionRecord) ? null : todayExecutionRecord;
  const activeSession = isActiveSession(session) ? session : null;
  const recentChange = buildRecentChange(data);
  const currentHour = new Date().getHours();
  const hasFreshFeedback =
    latestSleepRecord &&
    isYesterday(latestSleepRecord.date) &&
    currentHour >= 5 &&
    currentHour < 18 &&
    latestSleepExecutionRecord?.status !== "feedback_viewed";
  const countdownMinutes = minutesUntil(userConfig.targetSleepTime);
  const reminderMinutes = userConfig.reminderMinutesBefore;
  const isInBedtimeWindow = countdownMinutes <= reminderMinutes;
  const hasStartedCycle = Boolean(activeSession) || dailyCycleAtLeast(activeTodayExecutionRecord, "ritual_started");
  const hasClosedExternal = dailyCycleAtLeast(activeTodayExecutionRecord, "external_closed");
  const hasCompletedReview =
    dailyCycleAtLeast(activeTodayExecutionRecord, "review_completed") || Boolean(activeSession?.todayReviewCompleted);
  const hasStartedSleepAid =
    dailyCycleAtLeast(activeTodayExecutionRecord, "sleep_aid_started") ||
    Boolean(activeSession?.status === "in_relax_mode" || activeSession?.relaxModeUsed || activeSession?.sleepGeneratorUsed);
  const isReadyToSleep =
    activeTodayExecutionRecord?.status === "ready_to_sleep" ||
    activeTodayExecutionRecord?.status === "needs_checkin" ||
    activeSession?.status === "ready_to_sleep";

  if (morningCheckInDate) {
    const audioHint = morningAudioSession?.status
      ? "昨晚有声音线索，打卡后可以一起看看。"
      : "记录醒来的感觉，也是在把昨晚温柔收好。";

    return {
      title: "补录一下昨晚结果",
      subtitle: "几十秒就好，这会帮你看见自己正在变好。",
      statusLabel: "次日打卡",
      action: {
        title: "开始次日打卡",
        description: audioHint,
        buttonTitle: "开始次日打卡",
        href: "/checkin"
      },
      secondaryAction: isDemoMode && isReadyToSleep ? buildSleepMonitorAction(todayAudioSession ?? morningAudioSession) : undefined,
      ...recentChange
    };
  }

  if (isReadyToSleep) {
    const demoAction: HomeAction = isDemoMode
      ? {
          title: "体验次日打卡",
          description: "Demo 模式可以直接进入次日打卡，不用等到明早。打卡后会生成昨晚反馈，并计入成长记录。",
          buttonTitle: "体验次日打卡",
          href: { pathname: "/checkin", params: { date: activeTodayExecutionRecord?.date ?? activeSession?.date ?? todayKey(), demo: "1" } },
          demoCheckinDate: activeTodayExecutionRecord?.date ?? activeSession?.date ?? todayKey()
        }
      : {
          title: "明早再来补一笔",
          description: "明早醒来后，再记录昨晚的实际结果。补录后会生成昨晚反馈，并计入成长记录。",
          buttonTitle: "明早再来补一笔",
          disabled: true
        };

    return {
      title: "今晚已经收好了",
      subtitle: "接下来不用再证明什么，睡觉就是今晚最后一步。",
      statusLabel: isDemoMode ? "Demo 快进" : "等待明早补录",
      action: demoAction,
      secondaryAction: buildSleepMonitorAction(todayAudioSession),
      ...recentChange
    };
  }

  if (hasFreshFeedback) {
    return {
      title: "昨晚已经有结果了",
      subtitle: "先看看昨晚留给你的反馈，再开始新的夜晚。",
      statusLabel: "昨晚反馈",
      action: {
        title: "查看昨晚反馈",
        description: "不是复盘得多完美，而是看见你确实有把自己往回带。",
        buttonTitle: "查看昨晚反馈",
        href: "/review"
      },
      ...recentChange
    };
  }

  if (!hasStartedCycle) {
    return {
      title: isInBedtimeWindow ? "现在适合开始收尾了" : "今晚先留一个边界",
      subtitle: isInBedtimeWindow
        ? "不用立刻睡，只要先把今天慢慢放下。"
        : "还没到睡前窗口，也可以提前把今晚扶稳一点。",
      statusLabel: isInBedtimeWindow ? "睡前窗口" : "还没开始",
      action: {
        title: isInBedtimeWindow ? "开始今晚仪式" : "提前开始今晚仪式",
        description: "大约 6 分钟，先收住外界，再把今天放在这里。",
        buttonTitle: isInBedtimeWindow ? "开始今晚仪式" : "提前开始",
        href: "/rescue",
        startsSession: true
      },
      ...recentChange
    };
  }

  if (hasStartedSleepAid) {
    return {
      title: "现在，让身体慢慢睡着",
      subtitle: "不需要努力睡着，只要让自己松下来。",
      statusLabel: "进入睡意",
      action: {
        title: "我准备睡了",
        description: "如果已经放松下来，就把今晚停在这里。",
        buttonTitle: "我准备睡了",
        confirmsReadyToSleep: true
      },
      ...recentChange
    };
  }

  if (hasCompletedReview) {
    return {
      title: "今天已经被放下了一点",
      subtitle: "现在可以选一种方式，让睡意慢慢靠近。",
      statusLabel: "进入睡意",
      action: {
        title: "进入睡意生成器",
        description: "选择声音 Spa、心理暗示或树洞预设，把注意力从脑子里带出来。",
        buttonTitle: "进入睡意生成器",
        href: "/sleep-generator"
      },
      ...recentChange
    };
  }

  if (hasClosedExternal || (activeSession?.ritualStep ?? 0) >= 1 || activeSession?.status === "in_rescue_flow") {
    return {
      title: "把今天放在这里",
      subtitle: "写一句就好，不用漂亮，也不用完整。",
      statusLabel: "今晚仪式",
      action: {
        title: "把今天放下",
        description: "写下今天的故事、遗憾和明天一件事。",
        buttonTitle: "把今天放下",
        href: { pathname: "/today-review", params: { from: "home" } }
      },
      ...recentChange
    };
  }

  return {
    title: "继续今晚仪式",
    subtitle: "今天不用再接收那么多东西了，我们一步一步来。",
    statusLabel: "今晚仪式",
    action: {
      title: "继续今晚仪式",
      description: "先收住外界，再把今天慢慢放下。",
      buttonTitle: "继续今晚仪式",
      href: "/rescue"
    },
    ...recentChange
  };
}
