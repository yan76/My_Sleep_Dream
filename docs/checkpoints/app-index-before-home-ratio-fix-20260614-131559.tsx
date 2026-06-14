import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";
import { AppDialog } from "@/components/common/AppDialog";
import { ReadyToSleepDialog } from "@/components/common/ReadyToSleepDialog";
import { Screen } from "@/components/common/Screen";
import { colors } from "@/constants/colors";
import { buildHomeState, PRIMARY_TOOLS } from "@/features/home/homeViewModel";
import type { HomeData } from "@/features/home/homeViewModel";
import { completeReadyToSleepAfterRescue } from "@/features/rescue/readyToSleepUseCase";
import {
  getAppStats,
  getLatestSleepRecord,
  getMorningCheckInDate,
  getRescueSessions,
  getTodaySession,
  getUserConfig,
  startTodaySessionWithNotice
} from "@/storage/rescueSessionStorage";
import { getSleepAudioSessionByDate } from "@/storage/sleepAudioStorage";
import {
  getDailyExecutionRecordByDate,
  markNeedsCheckin,
  markRitualStarted
} from "@/storage/dailyExecutionStorage";
import { resolveCurrentCycleDate } from "@/storage/demoCycleDateStorage";
import { useAppStore } from "@/store/useAppStore";
import { formatMinutes, minutesUntil, nowTime, todayKey } from "@/utils/date";
import { useResponsiveMetrics } from "@/utils/responsive";
import { getSuggestedRescueTime } from "@/utils/sleepPreferences";

const homeMoonCloudIllustration = require("../assets/generated/yueban-home-ui/assets/illustrations/illustration-main-moon-cloud-01.png");
const homeFeedbackNightscape = require("../assets/generated/yueban-home-ui/assets/images/image-feedback-nightscape-01.png");
const toolSpaIcon = require("../assets/generated/yueban-home-ui/assets/icons/icon-tool-spa-01.png");
const toolChallengeIcon = require("../assets/generated/yueban-home-ui/assets/icons/icon-tool-challenge-01.png");
const ritualCtaBackground = require("../assets/generated/sleep-generator-ui/assets/images/image-home-ritual-cta-bg-254x76.png");

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function HomeScreen() {
  const metrics = useResponsiveMetrics();
  const homeScale = clampNumber(metrics.contentWidth / 342, 0.86, 1.04);
  const heroCardPadding = clampNumber(Math.round(metrics.contentWidth * 0.07), 20, 28);
  const heroInnerWidth = Math.max(0, metrics.contentWidth - heroCardPadding * 2);
  const heroImageWidth = clampNumber(Math.round(heroInnerWidth * 0.47), 130, 176);
  const heroImageHeight = Math.round(heroImageWidth * (247 / 295));
  const heroImageRight = clampNumber(Math.round(-6 * homeScale), -8, -2);
  const heroImageTop = clampNumber(Math.round(58 * homeScale), 50, 66);
  const heroCopyWidth = clampNumber(Math.round(heroInnerWidth - heroImageWidth - 12), 142, 202);
  const heroTitleSize = clampNumber(Math.round(34 * homeScale), 29, 36);
  const heroButtonWidth = heroInnerWidth;
  const heroButtonHeight = clampNumber(Math.round(64 * homeScale), 56, 68);
  const secondaryButtonHeight = clampNumber(Math.round(52 * homeScale), 48, 56);
  const heroLayout = {
    headerTitleSize: clampNumber(Math.round(40 * homeScale), 34, 42),
    headerTitleLineHeight: clampNumber(Math.round(48 * homeScale), 40, 50),
    headerSubtitleSize: clampNumber(Math.round(17 * homeScale), 15, 17),
    headerSubtitleLineHeight: clampNumber(Math.round(25 * homeScale), 22, 25),
    heroCardPadding,
    heroCardRadius: clampNumber(Math.round(34 * homeScale), 28, 36),
    heroBodyMinHeight: clampNumber(Math.round(154 * homeScale), 138, 164),
    heroCopyWidth,
    heroTitleSize,
    heroTitleLineHeight: Math.round(heroTitleSize * 1.16),
    heroBodySize: clampNumber(Math.round(15 * homeScale), 13, 15),
    heroBodyLineHeight: clampNumber(Math.round(23 * homeScale), 20, 23),
    heroImageRight,
    heroImageTop,
    heroImageWidth,
    heroImageHeight,
    heroButtonWidth,
    heroButtonHeight,
    heroButtonRadius: Math.round(heroButtonHeight / 2),
    secondaryButtonHeight,
    secondaryButtonRadius: Math.round(secondaryButtonHeight / 2),
    valueSize: clampNumber(Math.round(30 * homeScale), 25, 31),
    compactValueSize: clampNumber(Math.round(26 * homeScale), 22, 27),
    toolIconSize: clampNumber(Math.round(72 * homeScale), 58, 74)
  };
  const [data, setData] = useState<HomeData | null>(null);
  const [clock, setClock] = useState(nowTime());
  const [showReadyToSleepDialog, setShowReadyToSleepDialog] = useState(false);
  const [newWeekStartedAction, setNewWeekStartedAction] = useState<(() => void) | null>(null);
  const [isConfirmingReadyToSleep, setIsConfirmingReadyToSleep] = useState(false);
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

    const cycleDate = await resolveCurrentCycleDate();
    const todayExecutionRecord = await getDailyExecutionRecordByDate(cycleDate);
    const latestSleepExecutionRecord = latestSleepRecord
      ? await getDailyExecutionRecordByDate(latestSleepRecord.date)
      : null;
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    const weekStartKey = todayKey(weekStart);
    const weeklyRitualCount = Object.values(sessions).filter((item) => item.date >= weekStartKey).length;
    const [todayAudioSession, morningAudioSession] = await Promise.all([
      getSleepAudioSessionByDate(cycleDate),
      morningCheckInDate ? getSleepAudioSessionByDate(morningCheckInDate) : Promise.resolve(null)
    ]);

    setData({
      userConfig,
      session,
      todayExecutionRecord,
      morningCheckInDate,
      latestSleepRecord,
      latestSleepExecutionRecord,
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
  const countdownMinutes = minutesUntil(targetTime);
  const countdownProgress = Math.max(6, Math.min(100, 100 - (countdownMinutes / (24 * 60)) * 100));
  const suggestedStart = data
    ? reminderEnabled
      ? getSuggestedRescueTime(data.userConfig.targetSleepTime, data.userConfig.reminderMinutesBefore)
      : "手动开始"
    : "23:00";
  const countdownLabel = formatMinutes(countdownMinutes);
  const compactCountdownLabel = countdownLabel.replace(/\s+/g, "").replace("分钟", "分");

  const handlePrimaryAction = async () => {
    if (!viewModel || viewModel.action.disabled) {
      return;
    }

    if (viewModel.action.confirmsReadyToSleep) {
      setShowReadyToSleepDialog(true);
      return;
    }

    let shouldShowNewWeekStartedPrompt = false;

    if (viewModel.action.startsSession) {
      const result = await startTodaySessionWithNotice();
      shouldShowNewWeekStartedPrompt = result.startedNewGrowthWeek;
      await markRitualStarted();
      await loadHomeData();
    }

    if (viewModel.action.demoCheckinDate) {
      await markNeedsCheckin(viewModel.action.demoCheckinDate);
    }

    const actionHref = viewModel.action.href;
    if (actionHref) {
      if (shouldShowNewWeekStartedPrompt) {
        setNewWeekStartedAction(() => () => router.push(actionHref));
        return;
      }

      router.push(actionHref);
      return;
    }

    if (shouldShowNewWeekStartedPrompt) {
      setNewWeekStartedAction(() => () => undefined);
    }
  };

  const confirmNewWeekStarted = () => {
    const action = newWeekStartedAction;
    setNewWeekStartedAction(null);
    action?.();
  };

  const confirmReadyToSleep = async () => {
    if (isConfirmingReadyToSleep) {
      return;
    }

    setIsConfirmingReadyToSleep(true);
    try {
      const completed = await completeReadyToSleepAfterRescue();
      setShowReadyToSleepDialog(false);
      if (!completed) {
        router.push("/rescue");
        return;
      }
      await loadHomeData();
    } finally {
      setIsConfirmingReadyToSleep(false);
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
          <Text style={[styles.timeText, metrics.contentWidth < 330 && styles.timeTextCompact]}>{clock}</Text>
        </View>
        <Pressable style={[styles.ghost, metrics.contentWidth < 330 && styles.ghostCompact]} onPress={() => router.push("/settings")}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.86} style={styles.ghostText}>设置</Text>
        </Pressable>
      </View>

      <View style={[styles.header, metrics.contentWidth < 330 && styles.headerCompact]}>
        <Text style={styles.eyebrow}>今晚</Text>
        <Text style={[styles.title, { fontSize: heroLayout.headerTitleSize, lineHeight: heroLayout.headerTitleLineHeight }]}>{viewModel.title}</Text>
        <Text style={[styles.subtitle, { fontSize: heroLayout.headerSubtitleSize, lineHeight: heroLayout.headerSubtitleLineHeight }]}>{viewModel.subtitle}</Text>
      </View>

      <View
        style={[
          styles.heroCard,
          {
            borderRadius: heroLayout.heroCardRadius,
            paddingHorizontal: heroLayout.heroCardPadding,
            paddingTop: heroLayout.heroCardPadding + 2,
            paddingBottom: heroLayout.heroCardPadding + 4
          }
        ]}
      >
        <View style={styles.statusRow}>
          <Text style={[styles.label, styles.statusLabelText]}>当前最该做的一件事</Text>
          <View style={[styles.statusPill, metrics.contentWidth < 330 && styles.statusPillCompact]}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={styles.statusPillText}>{viewModel.statusLabel}</Text>
          </View>
        </View>
        <View style={[styles.heroBody, { minHeight: heroLayout.heroBodyMinHeight }]}>
          <View style={[styles.heroCopy, { width: heroLayout.heroCopyWidth }]}>
            <Text
              style={[
                styles.actionTitle,
                { fontSize: heroLayout.heroTitleSize, lineHeight: heroLayout.heroTitleLineHeight }
              ]}
            >
              {viewModel.action.title}
            </Text>
            <Text style={[styles.body, { fontSize: heroLayout.heroBodySize, lineHeight: heroLayout.heroBodyLineHeight }]}>
              {viewModel.action.description}
            </Text>
          </View>
          <Image
            source={homeMoonCloudIllustration}
            style={[
              styles.heroIllustration,
              {
                right: heroLayout.heroImageRight,
                top: heroLayout.heroImageTop,
                width: heroLayout.heroImageWidth,
                height: heroLayout.heroImageHeight
              }
            ]}
            resizeMode="contain"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={handlePrimaryAction}
          disabled={viewModel.action.disabled}
          renderToHardwareTextureAndroid={true}
          style={({ pressed }) => [
            styles.heroButton,
            {
              width: heroLayout.heroButtonWidth,
              height: heroLayout.heroButtonHeight,
              borderRadius: heroLayout.heroButtonRadius
            },
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
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.82}
              style={[styles.heroButtonText, viewModel.action.disabled && styles.heroButtonTextDisabled]}
            >
              {viewModel.action.buttonTitle}
            </Text>
          </ImageBackground>
        </Pressable>
        {viewModel.secondaryAction ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (viewModel.secondaryAction?.href) {
                router.push(viewModel.secondaryAction.href);
              }
            }}
            renderToHardwareTextureAndroid={true}
            style={({ pressed }) => [
              styles.secondaryButton,
              {
                width: heroLayout.heroButtonWidth,
                minHeight: heroLayout.secondaryButtonHeight,
                borderRadius: heroLayout.secondaryButtonRadius
              },
              pressed && styles.pressed
            ]}
          >
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={styles.secondaryButtonText}>
              {viewModel.secondaryAction.buttonTitle}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.timeStatusCard}>
        <View style={styles.timeStatsRow}>
          <View style={styles.timeStat}>
            <Text style={styles.timeLabel}>目标</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.timeValue, { fontSize: heroLayout.valueSize }]}>{targetTime}</Text>
          </View>
          <View style={styles.timeDivider} />
          <View style={[styles.timeStat, styles.timeStatSuggest]}>
            <Text style={styles.timeLabel}>建议</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.74} style={[styles.timeValue, { fontSize: heroLayout.valueSize }]}>{suggestedStart}</Text>
          </View>
          <View style={styles.timeDivider} />
          <View style={[styles.timeStat, styles.timeStatWide]}>
            <Text style={styles.timeLabel}>还差</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.68} style={[styles.timeValueStrong, { fontSize: heroLayout.compactValueSize }]}>{compactCountdownLabel}</Text>
          </View>
        </View>
        <View style={styles.timeProgressTrack}>
          <View style={[styles.timeProgressFill, { width: `${countdownProgress}%` }]} />
        </View>
      </View>

      <View style={styles.recentCard}>
        <Image source={homeFeedbackNightscape} style={styles.recentImage} resizeMode="cover" />
        <View style={styles.recentScrim} />
        <View style={styles.recentCopy}>
          <Text style={styles.recentQuote}>{viewModel.changeQuote}</Text>
          <Text style={styles.recentBody}>{viewModel.changeBody}</Text>
        </View>
      </View>

      <View style={styles.toolRow}>
        {PRIMARY_TOOLS.map((tool) => (
          <Pressable
            key={tool.href}
            onPress={() => router.push(tool.href)}
            style={({ pressed }) => [styles.tool, tool.tone === "cool" ? styles.toolCool : styles.toolWarm, pressed && styles.pressed]}
          >
            <View
              style={[
                styles.toolIcon,
                {
                  width: heroLayout.toolIconSize,
                  height: heroLayout.toolIconSize,
                  borderRadius: heroLayout.toolIconSize / 2
                }
              ]}
            >
              <Image
                source={tool.title === "声音 Spa" ? toolSpaIcon : toolChallengeIcon}
                style={styles.toolIconImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.toolText}>{tool.title}</Text>
          </Pressable>
        ))}
      </View>

      <ReadyToSleepDialog
        visible={showReadyToSleepDialog}
        confirming={isConfirmingReadyToSleep}
        onCancel={() => setShowReadyToSleepDialog(false)}
        onConfirm={confirmReadyToSleep}
      />
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
  timeTextCompact: {
    fontSize: 18
  },
  ghost: {
    minHeight: 34,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 15
  },
  ghostCompact: {
    minHeight: 32,
    paddingHorizontal: 12
  },
  ghostText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800"
  },
  header: {
    gap: 10
  },
  headerCompact: {
    gap: 8
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
    minHeight: 304,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: "rgba(235, 218, 189, 0.42)",
    backgroundColor: "#1F202B",
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 24,
    gap: 16,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.24,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5
  },
  heroBody: {
    minHeight: 148,
    justifyContent: "center",
    position: "relative"
  },
  heroCopy: {
    width: 186,
    gap: 10,
    zIndex: 2
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
  statusLabelText: {
    flex: 1
  },
  statusPill: {
    width: 92,
    minHeight: 38,
    borderRadius: 19,
    backgroundColor: "#F3D9AA",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12
  },
  statusPillCompact: {
    width: 82,
    minHeight: 34,
    paddingHorizontal: 9
  },
  statusPillText: {
    color: colors.buttonText,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900"
  },
  actionTitle: {
    color: colors.ink,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "900"
  },
  body: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "700"
  },
  heroIllustration: {
    position: "absolute",
    zIndex: 1
  },
  heroButton: {
    width: 254,
    minHeight: 64,
    borderRadius: 38,
    alignSelf: "center",
    overflow: "hidden"
  },
  heroButtonBg: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  heroButtonImage: {
    borderRadius: 999
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
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.09)",
    backgroundColor: "rgba(19, 20, 34, 0.62)"
  },
  secondaryButtonText: {
    color: "rgba(190, 188, 214, 0.88)",
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900"
  },
  timeStatusCard: {
    minHeight: 118,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: colors.surfaceCool,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    justifyContent: "space-between",
    gap: 16,
    overflow: "hidden"
  },
  timeStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  timeStat: {
    flex: 0.92,
    minWidth: 0,
    gap: 8
  },
  timeStatSuggest: {
    flex: 1.16
  },
  timeStatWide: {
    flex: 1.35
  },
  timeDivider: {
    width: 1,
    height: 58,
    backgroundColor: "rgba(255, 255, 255, 0.18)"
  },
  timeLabel: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900"
  },
  timeValue: {
    color: colors.accent,
    fontSize: 30,
    fontWeight: "900"
  },
  timeValueStrong: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: "900"
  },
  timeProgressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(59, 60, 82, 0.72)",
    overflow: "hidden"
  },
  timeProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.primary
  },
  recentCard: {
    height: 174,
    borderRadius: 28,
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
    position: "absolute",
    right: -2,
    top: 0,
    width: "58%",
    height: "100%",
    borderRadius: 28
  },
  recentScrim: {
    position: "absolute",
    left: -2,
    right: -2,
    top: -2,
    bottom: -2,
    backgroundColor: "rgba(5, 6, 18, 0.12)"
  },
  recentCopy: {
    width: "72%",
    paddingLeft: 22,
    paddingTop: 26,
    paddingBottom: 20,
    gap: 13
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
    minHeight: 104,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    overflow: "hidden"
  },
  toolCool: {
    backgroundColor: colors.surfaceCool
  },
  toolWarm: {
    backgroundColor: colors.surfaceWarm
  },
  toolIcon: {
    alignItems: "center",
    justifyContent: "center"
  },
  toolIconImage: {
    width: "100%",
    height: "100%"
  },
  toolText: {
    color: colors.ink,
    flex: 1,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900"
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.9
  }
});
