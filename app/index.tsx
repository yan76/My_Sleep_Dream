import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
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
const homeFeedbackNightscape = require("../assets/generated/yueban-home-ui/assets/images/image-feedback-nightscape-card-wide.png");
const toolSpaIcon = require("../assets/generated/yueban-home-ui/assets/icons/icon-tool-spa-01.png");
const toolChallengeIcon = require("../assets/generated/yueban-home-ui/assets/icons/icon-tool-challenge-01.png");
const ritualCtaBackground = require("../assets/generated/sleep-generator-ui/assets/images/image-sleep-generator-cta-bg-clean.png");

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function HomeScreen() {
  const metrics = useResponsiveMetrics();
  const homeScale = clampNumber(metrics.contentWidth / 342, 0.86, 1);
  const designScale = metrics.contentWidth / 665;
  const scaleDesign = (value: number) => Math.round(value * designScale);
  const scaleFont = (value: number, min: number, max: number) =>
    clampNumber(Math.round(value * designScale), min, max);
  const heroLayout = {
    headerTitleSize: clampNumber(Math.round(38 * homeScale), 32, 38),
    headerTitleLineHeight: clampNumber(Math.round(44 * homeScale), 38, 44),
    headerSubtitleSize: clampNumber(Math.round(15 * homeScale), 14, 15),
    headerSubtitleLineHeight: clampNumber(Math.round(22 * homeScale), 20, 22),
    cardInsetX: scaleDesign(37),
    heroCardHeight: scaleDesign(535),
    heroCardRadius: scaleDesign(42),
    heroKickerTop: scaleDesign(39),
    heroKickerSize: scaleFont(25, 12, 16),
    heroKickerLineHeight: scaleDesign(31),
    statusPillTop: scaleDesign(27),
    statusPillRight: scaleDesign(33),
    statusPillWidth: scaleDesign(139),
    statusPillHeight: scaleDesign(45),
    statusPillTextSize: scaleFont(25, 12, 15),
    actionTitleTop: scaleDesign(119),
    actionCopyWidth: scaleDesign(370),
    heroTitleSize: scaleFont(52, 26, 31),
    heroTitleLineHeight: scaleDesign(69),
    heroBodySize: scaleFont(28, 13, 17),
    heroBodyLineHeight: scaleDesign(38),
    heroCopyGap: scaleDesign(14),
    heroImageLeft: scaleDesign(375),
    heroImageTop: scaleDesign(76),
    heroImageWidth: scaleDesign(295),
    heroImageHeight: scaleDesign(247),
    ctaLeft: scaleDesign(37),
    ctaWidth: scaleDesign(587),
    primaryCtaTop: scaleDesign(324),
    primaryCtaHeight: scaleDesign(95),
    singlePrimaryCtaTop: scaleDesign(388),
    secondaryCtaTop: scaleDesign(434),
    secondaryCtaHeight: scaleDesign(78),
    ctaTextSize: scaleFont(32, 15, 20),
    secondaryTextSize: scaleFont(30, 14, 18),
    timeCardHeight: scaleDesign(178),
    timeCardRadius: scaleDesign(37),
    timeLabelTop: scaleDesign(34),
    timeValueTop: scaleDesign(73),
    timeDividerTop: scaleDesign(40),
    timeDividerHeight: scaleDesign(62),
    timeDividerLeft: scaleDesign(212),
    timeDividerRight: scaleDesign(406),
    timeGoalLeft: scaleDesign(37),
    timeSuggestLeft: scaleDesign(253),
    timeLeftLeft: scaleDesign(428),
    timeLabelSize: scaleFont(25, 12, 15),
    valueSize: scaleFont(45, 21, 27),
    compactValueSize: scaleFont(34, 18, 22),
    timeProgressLeft: scaleDesign(37),
    timeProgressTop: scaleDesign(133),
    timeProgressWidth: scaleDesign(588),
    timeProgressHeight: scaleDesign(18),
    recentCardHeight: scaleDesign(202),
    recentCardRadius: scaleDesign(30),
    recentImageWidth: scaleDesign(665),
    recentTitleTop: scaleDesign(37),
    recentBodyTop: scaleDesign(144),
    recentCopyWidth: scaleDesign(330),
    recentTitleSize: scaleFont(31, 15, 20),
    recentTitleLineHeight: scaleDesign(43),
    recentBodySize: scaleFont(24, 12, 15),
    recentBodyLineHeight: scaleDesign(35),
    toolCardHeight: scaleDesign(121),
    toolCardRadius: scaleDesign(28),
    toolPaddingX: scaleDesign(15),
    toolGap: scaleDesign(23),
    toolIconSize: scaleDesign(93),
    toolTextSize: scaleFont(31, 15, 20),
    toolTextLineHeight: scaleDesign(40)
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
  const homeCountdownLabel = countdownLabel
    .replace(/(\d+)\s*小时\s*(\d+)\s*分钟/, "$1小时$2分")
    .replace(/(\d+)\s*分钟/, "$1分");

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

  const hasSecondaryAction = Boolean(viewModel.secondaryAction);

  return (
    <Screen contentStyle={styles.homeContent}>
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
        <Text
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.9}
          style={[styles.title, { fontSize: heroLayout.headerTitleSize, lineHeight: heroLayout.headerTitleLineHeight }]}
        >
          {viewModel.title}
        </Text>
        <Text style={[styles.subtitle, { fontSize: heroLayout.headerSubtitleSize, lineHeight: heroLayout.headerSubtitleLineHeight }]}>{viewModel.subtitle}</Text>
      </View>

      <View
        style={[
          styles.heroCard,
          {
            borderRadius: heroLayout.heroCardRadius,
            minHeight: heroLayout.heroCardHeight,
            height: heroLayout.heroCardHeight
          }
        ]}
      >
        <Text
          style={[
            styles.label,
            styles.heroKicker,
            {
              left: heroLayout.cardInsetX,
              top: heroLayout.heroKickerTop,
              fontSize: heroLayout.heroKickerSize,
              lineHeight: heroLayout.heroKickerLineHeight
            }
          ]}
        >
          当前最该做的一件事
        </Text>
        <View
          style={[
            styles.statusPill,
            {
              right: heroLayout.statusPillRight,
              top: heroLayout.statusPillTop,
              width: heroLayout.statusPillWidth,
              minHeight: heroLayout.statusPillHeight,
              height: heroLayout.statusPillHeight,
              borderRadius: heroLayout.statusPillHeight / 2,
              paddingHorizontal: Math.max(6, scaleDesign(18))
            }
          ]}
        >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.82}
              style={[
                styles.statusPillText,
                { fontSize: heroLayout.statusPillTextSize, lineHeight: Math.round(heroLayout.statusPillTextSize * 1.15) }
              ]}
            >
              {viewModel.statusLabel}
            </Text>
        </View>
        <View
          style={[
            styles.heroCopy,
            {
              left: heroLayout.cardInsetX,
              top: heroLayout.actionTitleTop,
              width: heroLayout.actionCopyWidth,
              gap: heroLayout.heroCopyGap
            }
          ]}
        >
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.86}
            style={[
              styles.actionTitle,
              { fontSize: heroLayout.heroTitleSize, lineHeight: heroLayout.heroTitleLineHeight }
            ]}
          >
            {viewModel.action.title}
          </Text>
          <Text
            numberOfLines={2}
            style={[styles.body, { fontSize: heroLayout.heroBodySize, lineHeight: heroLayout.heroBodyLineHeight }]}
          >
            {viewModel.action.description}
          </Text>
        </View>
        <Image
          source={homeMoonCloudIllustration}
          style={[
            styles.heroIllustration,
            {
              left: heroLayout.heroImageLeft,
              top: heroLayout.heroImageTop,
              width: heroLayout.heroImageWidth,
              height: heroLayout.heroImageHeight
            }
          ]}
          resizeMode="contain"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
        <Pressable
          accessibilityRole="button"
          onPress={handlePrimaryAction}
          disabled={viewModel.action.disabled}
          renderToHardwareTextureAndroid={true}
          style={({ pressed }) => [
            styles.heroButton,
            {
              left: heroLayout.ctaLeft,
              top: hasSecondaryAction ? heroLayout.primaryCtaTop : heroLayout.singlePrimaryCtaTop,
              width: heroLayout.ctaWidth,
              minHeight: heroLayout.primaryCtaHeight,
              height: heroLayout.primaryCtaHeight,
              borderRadius: heroLayout.primaryCtaHeight / 2
            },
            viewModel.action.disabled && styles.heroButtonDisabled,
            pressed && !viewModel.action.disabled && styles.pressed
          ]}
        >
          <Image
            source={ritualCtaBackground}
            resizeMode="stretch"
            style={styles.heroButtonImage}
          />
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
            style={[
              styles.heroButtonText,
              { fontSize: heroLayout.ctaTextSize, lineHeight: Math.round(heroLayout.ctaTextSize * 1.22) },
              viewModel.action.disabled && styles.heroButtonTextDisabled
            ]}
          >
            {viewModel.action.buttonTitle}
          </Text>
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
                left: heroLayout.ctaLeft,
                top: heroLayout.secondaryCtaTop,
                width: heroLayout.ctaWidth,
                height: heroLayout.secondaryCtaHeight,
                borderRadius: heroLayout.secondaryCtaHeight / 2
              },
              pressed && styles.pressed
            ]}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.82}
              style={[
                styles.secondaryButtonText,
                { fontSize: heroLayout.secondaryTextSize, lineHeight: Math.round(heroLayout.secondaryTextSize * 1.18) }
              ]}
            >
              {viewModel.secondaryAction.buttonTitle}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View
        style={[
          styles.timeStatusCard,
          {
            height: heroLayout.timeCardHeight,
            minHeight: heroLayout.timeCardHeight,
            borderRadius: heroLayout.timeCardRadius
          }
        ]}
      >
        <View
          style={[
            styles.timeDivider,
            {
              left: heroLayout.timeDividerLeft,
              top: heroLayout.timeDividerTop,
              height: heroLayout.timeDividerHeight
            }
          ]}
        />
        <View
          style={[
            styles.timeDivider,
            {
              left: heroLayout.timeDividerRight,
              top: heroLayout.timeDividerTop,
              height: heroLayout.timeDividerHeight
            }
          ]}
        />
        <Text
          style={[
            styles.timeLabel,
            { left: heroLayout.timeGoalLeft, top: heroLayout.timeLabelTop, fontSize: heroLayout.timeLabelSize, lineHeight: Math.round(heroLayout.timeLabelSize * 1.12) }
          ]}
        >
          目标
        </Text>
        <Text
          style={[
            styles.timeLabel,
            { left: heroLayout.timeSuggestLeft, top: heroLayout.timeLabelTop, fontSize: heroLayout.timeLabelSize, lineHeight: Math.round(heroLayout.timeLabelSize * 1.12) }
          ]}
        >
          建议
        </Text>
        <Text
          style={[
            styles.timeLabel,
            { left: heroLayout.timeLeftLeft, top: heroLayout.timeLabelTop, fontSize: heroLayout.timeLabelSize, lineHeight: Math.round(heroLayout.timeLabelSize * 1.12) }
          ]}
        >
          还差
        </Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.78}
          style={[
            styles.timeValue,
            {
              left: heroLayout.timeGoalLeft,
              top: heroLayout.timeValueTop,
              width: scaleDesign(160),
              fontSize: heroLayout.valueSize,
              lineHeight: Math.round(heroLayout.valueSize * 1.12)
            }
          ]}
        >
          {targetTime}
        </Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.74}
          style={[
            styles.timeValue,
            {
              left: heroLayout.timeSuggestLeft,
              top: heroLayout.timeValueTop,
              width: scaleDesign(160),
              fontSize: heroLayout.valueSize,
              lineHeight: Math.round(heroLayout.valueSize * 1.12)
            }
          ]}
        >
          {suggestedStart}
        </Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.62}
          style={[
            styles.timeValueStrong,
            {
              left: heroLayout.timeLeftLeft,
              top: heroLayout.timeValueTop,
              width: scaleDesign(220),
              fontSize: heroLayout.compactValueSize,
              lineHeight: Math.round(heroLayout.compactValueSize * 1.12)
            }
          ]}
        >
          {homeCountdownLabel}
        </Text>
        <View
          style={[
            styles.timeProgressTrack,
            {
              left: heroLayout.timeProgressLeft,
              top: heroLayout.timeProgressTop,
              width: heroLayout.timeProgressWidth,
              height: heroLayout.timeProgressHeight,
              borderRadius: heroLayout.timeProgressHeight / 2
            }
          ]}
        >
          <View style={[styles.timeProgressFill, { width: `${countdownProgress}%` }]} />
        </View>
      </View>

      <View
        style={[
          styles.recentCard,
          {
            height: heroLayout.recentCardHeight,
            borderRadius: heroLayout.recentCardRadius
          }
        ]}
      >
        <Image
          source={homeFeedbackNightscape}
          style={[
            styles.recentImage,
            {
              width: heroLayout.recentImageWidth,
              height: heroLayout.recentCardHeight,
              borderRadius: heroLayout.recentCardRadius
            }
          ]}
          resizeMode="cover"
        />
        <View style={styles.recentScrim} />
        <View
          style={[
            styles.recentCopy,
            {
              left: heroLayout.cardInsetX,
              top: heroLayout.recentTitleTop,
              width: heroLayout.recentCopyWidth
            }
          ]}
        >
          <Text
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.88}
            style={[
              styles.recentQuote,
              { fontSize: heroLayout.recentTitleSize, lineHeight: heroLayout.recentTitleLineHeight }
            ]}
          >
            {viewModel.changeQuote}
          </Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.86}
            style={[
              styles.recentBody,
              {
                top: heroLayout.recentBodyTop - heroLayout.recentTitleTop,
                fontSize: heroLayout.recentBodySize,
                lineHeight: heroLayout.recentBodyLineHeight
              }
            ]}
          >
            {viewModel.changeBody}
          </Text>
        </View>
      </View>

      <View style={[styles.toolRow, { gap: scaleDesign(25) }]}>
        {PRIMARY_TOOLS.map((tool) => (
          <Pressable
            key={tool.href}
            onPress={() => router.push(tool.href)}
            style={({ pressed }) => [
              styles.tool,
              tool.tone === "cool" ? styles.toolCool : styles.toolWarm,
              {
                height: heroLayout.toolCardHeight,
                minHeight: heroLayout.toolCardHeight,
                borderRadius: heroLayout.toolCardRadius,
                paddingLeft: heroLayout.toolPaddingX,
                paddingRight: heroLayout.toolPaddingX,
                paddingVertical: 0,
                gap: heroLayout.toolGap
              },
              pressed && styles.pressed
            ]}
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
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.78}
              style={[
                styles.toolText,
                { fontSize: heroLayout.toolTextSize, lineHeight: heroLayout.toolTextLineHeight }
              ]}
            >
              {tool.title}
            </Text>
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
  homeContent: {
    gap: 16
  },
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
    gap: 8
  },
  headerCompact: {
    gap: 6
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
    minHeight: 286,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(235, 218, 189, 0.42)",
    backgroundColor: "#1F202B",
    position: "relative",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.24,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5
  },
  heroBody: {
    minHeight: 140,
    justifyContent: "center",
    position: "relative"
  },
  heroCopy: {
    position: "absolute",
    width: 186,
    gap: 9,
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
  heroKicker: {
    position: "absolute",
    zIndex: 3
  },
  statusPill: {
    position: "absolute",
    width: 100,
    minHeight: 40,
    borderRadius: 20,
    backgroundColor: "#F3D9AA",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12
  },
  statusPillCompact: {
    width: 88,
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
    position: "absolute",
    width: 254,
    minHeight: 64,
    borderRadius: 38,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  heroButtonImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
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
    position: "absolute",
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
    minHeight: 112,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: colors.surfaceCool,
    position: "relative",
    overflow: "hidden"
  },
  timeStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  timeStat: {
    flex: 0.95,
    minWidth: 0,
    gap: 7
  },
  timeStatSuggest: {
    flex: 1.1
  },
  timeStatWide: {
    flex: 1.42
  },
  timeDivider: {
    position: "absolute",
    width: 1,
    height: 52,
    backgroundColor: "rgba(255, 255, 255, 0.18)"
  },
  timeLabel: {
    position: "absolute",
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900"
  },
  timeValue: {
    position: "absolute",
    color: colors.accent,
    fontSize: 26,
    fontWeight: "900"
  },
  timeValueStrong: {
    position: "absolute",
    color: colors.ink,
    fontSize: 23,
    fontWeight: "900"
  },
  timeProgressTrack: {
    position: "absolute",
    height: 9,
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
    height: 164,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(137, 145, 255, 0.24)",
    overflow: "hidden",
    position: "relative",
    justifyContent: "flex-start",
    backgroundColor: "#181B38",
    shadowColor: "#000000",
    shadowOpacity: 0.32,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6
  },
  recentImage: {
    position: "absolute",
    right: 0,
    top: 0,
    width: "100%",
    height: "100%",
    borderRadius: 26
  },
  recentScrim: {
    position: "absolute",
    left: -2,
    right: -2,
    top: -2,
    bottom: -2,
    backgroundColor: "rgba(5, 6, 18, 0.06)"
  },
  recentCopy: {
    position: "absolute",
    width: "66%",
    gap: 12,
    zIndex: 2
  },
  recentQuote: {
    color: "#FFF1CF",
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "900"
  },
  recentBody: {
    position: "absolute",
    left: 0,
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
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
    minWidth: 0,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "900"
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.9
  }
});
