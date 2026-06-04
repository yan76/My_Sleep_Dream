import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import { AppCard } from "@/components/common/AppCard";
import { Screen } from "@/components/common/Screen";
import { colors } from "@/constants/colors";
import {
  getAppStats,
  getLatestSleepRecord,
  getMorningCheckInDate,
  getRescueSessions,
  getTodaySession,
  getUserConfig,
  startTodaySession
} from "@/storage/rescueSessionStorage";
import { getSleepAudioSessionByDate } from "@/storage/sleepAudioStorage";
import { markRitualStarted } from "@/storage/dailyExecutionStorage";
import { useAppStore } from "@/store/useAppStore";
import { AppStats, RescueSession, SleepAudioSession, SleepRecord, UserConfig } from "@/types/app";
import { formatMinutes, minutesUntil, nowTime, todayKey } from "@/utils/date";
import { getSuggestedRescueTime } from "@/utils/sleepPreferences";

type RouteTarget = Parameters<typeof router.push>[0];

type HomeAction = {
  title: string;
  description: string;
  buttonTitle: string;
  href?: RouteTarget;
  disabled?: boolean;
  startsSession?: boolean;
};

type HomeViewModel = {
  title: string;
  subtitle: string;
  statusLabel: string;
  action: HomeAction;
  secondaryAction?: HomeAction;
  changeQuote: string;
  changeBody: string;
};

type HomeData = {
  userConfig: UserConfig;
  session: RescueSession | null;
  morningCheckInDate: string | null;
  latestSleepRecord: SleepRecord | null;
  todayAudioSession: SleepAudioSession | null;
  morningAudioSession: SleepAudioSession | null;
  stats: AppStats;
  weeklyRitualCount: number;
};

const PRIMARY_TOOLS = [
  { title: "声音 Spa", href: "/bedtime", tone: "cool", icon: "~" },
  { title: "下线挑战", href: "/shutdown-challenge", tone: "warm", icon: "2" }
] as const;

const recentChangeBackground = require("../assets/ui/recent-change-nightscape.png");
const dreamIllustration = require("../assets/generated/sleep-generator-ui/assets/illustrations/illustration-sleep-generator-dream-01.png");
const ritualCtaBackground = require("../assets/generated/sleep-generator-ui/assets/images/image-home-ritual-cta-bg-254x76.png");
const ritualPillBackground = require("../assets/generated/sleep-generator-ui/assets/images/image-sleep-generator-top-pill-bg-clean.png");

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

function buildHomeState(data: HomeData): HomeViewModel {
  const { userConfig, session, morningCheckInDate, latestSleepRecord, todayAudioSession, morningAudioSession } = data;
  const recentChange = buildRecentChange(data);
  const currentHour = new Date().getHours();
  const hasFreshFeedback =
    latestSleepRecord && isYesterday(latestSleepRecord.date) && currentHour >= 5 && currentHour < 18;
  const countdownMinutes = minutesUntil(userConfig.targetSleepTime);
  const reminderMinutes = userConfig.reminderMinutesBefore;
  const isInBedtimeWindow = countdownMinutes <= reminderMinutes;

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
      ...recentChange
    };
  }

  if (session?.status === "ready_to_sleep") {
    const audioStarted = todayAudioSession?.status === "recording";

    return {
      title: "今晚已经收好了",
      subtitle: "接下来不用再证明什么，睡觉就是今晚最后一步。",
      statusLabel: "等待明早补录",
      action: {
        title: "明早再来补一笔",
        description: "明早醒来后，再记录昨晚的实际结果。补录后会生成昨晚反馈，并计入成长记录。",
        buttonTitle: "明早再来补一笔",
        disabled: true
      },
      secondaryAction: {
        title: audioStarted ? "查看睡眠监听" : "开始睡眠监听",
        description: "只在本机记录声音摘要，不上传云端；不开启也不影响次日打卡。",
        buttonTitle: audioStarted ? "查看睡眠监听" : "开始睡眠监听",
        href: "/sleep-monitor" as RouteTarget
      },
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

  if (!session) {
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

  if (session.status === "in_relax_mode" || session.relaxModeUsed || session.sleepGeneratorUsed) {
    return {
      title: "现在，让身体慢慢睡着",
      subtitle: "不需要努力睡着，只要让自己松下来。",
      statusLabel: "进入睡意",
      action: {
        title: "我准备睡了",
        description: "如果已经放松下来，就把今晚停在这里。",
        buttonTitle: "我准备睡了",
        href: "/bedtime"
      },
      ...recentChange
    };
  }

  if (session.todayReviewCompleted) {
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

  if ((session.ritualStep ?? 0) >= 1 || session.status === "in_rescue_flow") {
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

export default function HomeScreen() {
  const [data, setData] = useState<HomeData | null>(null);
  const [clock, setClock] = useState(nowTime());
  const reminderEnabled = useAppStore((state) => state.reminderSettings.enabled);

  const loadHomeData = useCallback(async () => {
    const [userConfig, session, morningCheckInDate, latestSleepRecord, stats, sessions] = await Promise.all([
      getUserConfig(),
      getTodaySession(),
      getMorningCheckInDate(),
      getLatestSleepRecord(),
      getAppStats(),
      getRescueSessions()
    ]);

    if (!userConfig.hasOnboarded) {
      router.replace("/onboarding");
      return;
    }

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    const weekStartKey = todayKey(weekStart);
    const weeklyRitualCount = Object.values(sessions).filter((item) => item.date >= weekStartKey).length;
    const [todayAudioSession, morningAudioSession] = await Promise.all([
      getSleepAudioSessionByDate(todayKey()),
      morningCheckInDate ? getSleepAudioSessionByDate(morningCheckInDate) : Promise.resolve(null)
    ]);

    setData({
      userConfig,
      session,
      morningCheckInDate,
      latestSleepRecord,
      todayAudioSession,
      morningAudioSession,
      stats,
      weeklyRitualCount
    });
  }, []);

  useEffect(() => {
    loadHomeData();
    const timer = setInterval(() => {
      setClock(nowTime());
      loadHomeData();
    }, 30000);
    return () => clearInterval(timer);
  }, [loadHomeData]);

  const viewModel = useMemo(() => (data ? buildHomeState(data) : null), [data]);
  const targetTime = data?.userConfig.targetSleepTime ?? "23:30";
  const suggestedStart = data
    ? reminderEnabled
      ? getSuggestedRescueTime(data.userConfig.targetSleepTime, data.userConfig.reminderMinutesBefore)
      : "手动开始"
    : "23:00";
  const countdownLabel = formatMinutes(minutesUntil(targetTime));

  const handlePrimaryAction = async () => {
    if (!viewModel || viewModel.action.disabled) {
      return;
    }

    if (viewModel.action.startsSession) {
      await startTodaySession();
      await markRitualStarted();
      await loadHomeData();
    }

    if (viewModel.action.href) {
      router.push(viewModel.action.href);
    }
  };

  if (!viewModel) {
    return (
      <Screen>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>正在把今晚准备好...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.top}>
        <View style={styles.time}>
          <View style={styles.dot} />
          <Text style={styles.timeText}>{clock}</Text>
        </View>
        <Pressable style={styles.ghost} onPress={() => router.push("/settings")}>
          <Text style={styles.ghostText}>设置</Text>
        </Pressable>
      </View>

      <View style={styles.header}>
        <Text style={styles.eyebrow}>今晚</Text>
        <Text style={styles.title}>{viewModel.title}</Text>
        <Text style={styles.subtitle}>{viewModel.subtitle}</Text>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.statusRow}>
          <Text style={styles.label}>当前最该做的一件事</Text>
          <ImageBackground
            source={ritualPillBackground}
            resizeMode="stretch"
            style={styles.statusPill}
            imageStyle={styles.statusPillImage}
          >
            <Text style={styles.statusPillText}>{viewModel.statusLabel}</Text>
          </ImageBackground>
        </View>
        <View style={styles.heroBody}>
          <View style={styles.heroCopy}>
            <Text style={styles.actionTitle}>{viewModel.action.title}</Text>
            <Text style={styles.body}>{viewModel.action.description}</Text>
          </View>
          <View style={styles.dreamFrame} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Image source={dreamIllustration} style={styles.dreamImage} resizeMode="stretch" />
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={handlePrimaryAction}
          disabled={viewModel.action.disabled}
          renderToHardwareTextureAndroid={true}
          style={({ pressed }) => [
            styles.heroButton,
            viewModel.action.disabled && styles.heroButtonDisabled,
            pressed && !viewModel.action.disabled && styles.pressed
          ]}
        >
          <ImageBackground
            source={ritualCtaBackground}
            resizeMode="stretch"
            style={styles.heroButtonBg}
            imageStyle={styles.heroButtonImage}
          >
            <Text style={[styles.heroButtonText, viewModel.action.disabled && styles.heroButtonTextDisabled]}>
              {viewModel.action.buttonTitle}
            </Text>
          </ImageBackground>
        </Pressable>
        {viewModel.secondaryAction ? (
          <AppButton
            title={viewModel.secondaryAction.buttonTitle}
            variant="secondary"
            onPress={() => {
              if (viewModel.secondaryAction?.href) {
                router.push(viewModel.secondaryAction.href);
              }
            }}
            style={styles.secondaryButton}
            size="md"
          />
        ) : null}
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

      <AppCard tone="cool">
        <View style={styles.statusRow}>
          <Text style={styles.label}>距离目标睡觉</Text>
          <Text style={styles.countdown}>{countdownLabel}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.max(6, Math.min(100, 100 - (minutesUntil(targetTime) / (24 * 60)) * 100))}%` }
            ]}
          />
        </View>
      </AppCard>

      <ImageBackground source={recentChangeBackground} style={styles.recentCard} imageStyle={styles.recentImage}>
        <View style={styles.recentScrim} />
        <View style={styles.recentCopy}>
          <Text style={styles.recentQuote}>{viewModel.changeQuote}</Text>
          <Text style={styles.recentBody}>{viewModel.changeBody}</Text>
        </View>
      </ImageBackground>

      <View style={styles.toolRow}>
        {PRIMARY_TOOLS.map((tool) => (
          <Pressable
            key={tool.href}
            onPress={() => router.push(tool.href)}
            style={({ pressed }) => [styles.tool, tool.tone === "cool" ? styles.toolCool : styles.toolWarm, pressed && styles.pressed]}
          >
            <View style={styles.toolIcon}>
              <Text style={styles.toolIconText}>{tool.icon}</Text>
            </View>
            <Text style={styles.toolText}>{tool.title}</Text>
          </Pressable>
        ))}
      </View>

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
    fontWeight: "700"
  },
  top: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  time: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success
  },
  timeText: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800"
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
    fontSize: 38,
    lineHeight: 44,
    fontWeight: "900",
    letterSpacing: 0
  },
  subtitle: {
    color: colors.muted,
    fontSize: 17,
    lineHeight: 25,
    fontWeight: "700"
  },
  heroCard: {
    minHeight: 326,
    borderRadius: 42,
    borderWidth: 1,
    borderColor: "#6D665F",
    backgroundColor: "#2A2834",
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 28,
    gap: 20,
    overflow: "hidden"
  },
  heroBody: {
    minHeight: 150,
    justifyContent: "center",
    position: "relative"
  },
  heroCopy: {
    width: 186,
    gap: 12
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
    width: 86,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  statusPillImage: {
    borderRadius: 18
  },
  statusPillText: {
    color: colors.accent,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900"
  },
  actionTitle: {
    color: colors.ink,
    fontSize: 38,
    lineHeight: 44,
    fontWeight: "900"
  },
  body: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "700"
  },
  dreamFrame: {
    position: "absolute",
    right: -4,
    top: -2,
    width: 174,
    height: 174,
    borderRadius: 58,
    backgroundColor: "#242432",
    borderWidth: 1,
    borderColor: "#3D3B4D",
    overflow: "hidden"
  },
  dreamImage: {
    position: "absolute",
    left: -5,
    top: -13,
    width: 184,
    height: 211
  },
  heroButton: {
    width: 254,
    height: 76,
    borderRadius: 38,
    alignSelf: "flex-start",
    overflow: "hidden"
  },
  heroButtonBg: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  heroButtonImage: {
    borderRadius: 38
  },
  heroButtonText: {
    color: colors.buttonText,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900"
  },
  heroButtonDisabled: {
    opacity: 0.48
  },
  heroButtonTextDisabled: {
    color: colors.ink
  },
  secondaryButton: {
    width: 254,
    alignSelf: "flex-start"
  },
  goalRow: {
    flexDirection: "row",
    gap: 14
  },
  mini: {
    flex: 1,
    minHeight: 104,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
    justifyContent: "space-between"
  },
  value: {
    color: colors.accent,
    fontSize: 30,
    fontWeight: "900"
  },
  countdown: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900"
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.line,
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.primary
  },
  recentCard: {
    height: 178,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(84, 85, 124, 0.42)",
    overflow: "hidden",
    justifyContent: "flex-start",
    backgroundColor: colors.surfaceCool,
    shadowColor: "#000000",
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6
  },
  recentImage: {
    width: "116%",
    height: "138%",
    left: "-8%",
    top: "-19%",
    borderRadius: 24
  },
  recentScrim: {
    position: "absolute",
    left: -2,
    right: -2,
    top: -2,
    bottom: -2,
    backgroundColor: "rgba(5, 6, 18, 0.04)"
  },
  recentCopy: {
    width: "68%",
    paddingLeft: 22,
    paddingTop: 30,
    paddingBottom: 20,
    gap: 14
  },
  recentQuote: {
    color: "#FFF1CF",
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "900"
  },
  recentBody: {
    color: "rgba(230, 234, 255, 0.72)",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700"
  },
  toolRow: {
    flexDirection: "row",
    gap: 14
  },
  tool: {
    flex: 1,
    minHeight: 96,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
    justifyContent: "space-between"
  },
  toolCool: {
    backgroundColor: colors.surfaceCool
  },
  toolWarm: {
    backgroundColor: colors.surfaceWarm
  },
  toolIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#303143",
    alignItems: "center",
    justifyContent: "center"
  },
  toolIconText: {
    color: colors.accent,
    fontSize: 17,
    fontWeight: "900"
  },
  toolText: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "900"
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.9
  }
});
