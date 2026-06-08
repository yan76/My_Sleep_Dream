import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import { AppCard } from "@/components/common/AppCard";
import { Screen } from "@/components/common/Screen";
import { colors } from "@/constants/colors";
import { buildHomeState, PRIMARY_TOOLS } from "@/features/home/homeViewModel";
import type { HomeData } from "@/features/home/homeViewModel";
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
import {
  getDailyExecutionRecordByDate,
  markNeedsCheckin,
  markRitualStarted
} from "@/storage/dailyExecutionStorage";
import { useAppStore } from "@/store/useAppStore";
import { formatMinutes, minutesUntil, nowTime, todayKey } from "@/utils/date";
import { useResponsiveMetrics } from "@/utils/responsive";
import { getSuggestedRescueTime } from "@/utils/sleepPreferences";

const recentChangeBackground = require("../assets/ui/recent-change-nightscape.png");
const dreamIllustration = require("../assets/generated/sleep-generator-ui/assets/illustrations/illustration-sleep-generator-dream-01.png");
const ritualCtaBackground = require("../assets/generated/sleep-generator-ui/assets/images/image-home-ritual-cta-bg-254x76.png");
const ritualPillBackground = require("../assets/generated/sleep-generator-ui/assets/images/image-sleep-generator-top-pill-bg-clean.png");

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function HomeScreen() {
  const metrics = useResponsiveMetrics();
  const homeScale = clampNumber(metrics.contentWidth / 382, 0.82, 1);
  const heroCardPadding = clampNumber(Math.round(metrics.contentWidth * 0.06), 16, 24);
  const heroInnerWidth = Math.max(0, metrics.contentWidth - heroCardPadding * 2);
  const heroImageSize = clampNumber(Math.round(heroInnerWidth * 0.48), 124, 174);
  const heroImageRight = heroInnerWidth < 300 ? -2 : -4;
  const heroImageLeft = heroInnerWidth - heroImageSize - heroImageRight;
  const heroCopyWidth = clampNumber(Math.round(heroImageLeft - 10), 118, 186);
  const heroTitleSize = clampNumber(Math.round(heroCopyWidth / 4.35), 28, 38);
  const heroButtonWidth = clampNumber(Math.round(heroInnerWidth * 0.76), 208, 254);
  const heroButtonHeight = clampNumber(Math.round(heroButtonWidth * 0.3), 62, 76);
  const heroLayout = {
    headerTitleSize: clampNumber(Math.round(38 * homeScale), 31, 38),
    headerTitleLineHeight: clampNumber(Math.round(44 * homeScale), 37, 44),
    headerSubtitleSize: clampNumber(Math.round(17 * homeScale), 15, 17),
    headerSubtitleLineHeight: clampNumber(Math.round(25 * homeScale), 22, 25),
    heroCardPadding,
    heroCardRadius: clampNumber(Math.round(42 * homeScale), 32, 42),
    heroBodyMinHeight: Math.max(heroImageSize + 8, 150),
    heroCopyWidth,
    heroTitleSize,
    heroTitleLineHeight: Math.round(heroTitleSize * 1.15),
    heroBodySize: clampNumber(Math.round(15 * homeScale), 13, 15),
    heroBodyLineHeight: clampNumber(Math.round(23 * homeScale), 20, 23),
    heroImageRight,
    heroImageSize,
    heroImageRadius: Math.round(heroImageSize / 3),
    heroImageInnerWidth: Math.round(heroImageSize * 1.06),
    heroImageInnerHeight: Math.round(heroImageSize * 1.21),
    heroImageInnerLeft: Math.round(-heroImageSize * 0.03),
    heroImageInnerTop: Math.round(-heroImageSize * 0.075),
    heroButtonWidth,
    heroButtonHeight,
    heroButtonRadius: Math.round(heroButtonHeight / 2),
    goalGap: clampNumber(Math.round(14 * homeScale), 10, 14),
    valueSize: clampNumber(Math.round(30 * homeScale), 25, 30)
  };
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

    const todayExecutionRecord = await getDailyExecutionRecordByDate(todayKey());
    const latestSleepExecutionRecord = latestSleepRecord
      ? await getDailyExecutionRecordByDate(latestSleepRecord.date)
      : null;
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

    if (viewModel.action.demoCheckinDate) {
      await markNeedsCheckin(viewModel.action.demoCheckinDate);
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
          <ImageBackground
            source={ritualPillBackground}
            resizeMode="stretch"
            style={[styles.statusPill, metrics.contentWidth < 330 && styles.statusPillCompact]}
            imageStyle={styles.statusPillImage}
          >
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={styles.statusPillText}>{viewModel.statusLabel}</Text>
          </ImageBackground>
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
          <View
            style={[
              styles.dreamFrame,
              {
                right: heroLayout.heroImageRight,
                width: heroLayout.heroImageSize,
                height: heroLayout.heroImageSize,
                borderRadius: heroLayout.heroImageRadius
              }
            ]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Image
              source={dreamIllustration}
              style={[
                styles.dreamImage,
                {
                  left: heroLayout.heroImageInnerLeft,
                  top: heroLayout.heroImageInnerTop,
                  width: heroLayout.heroImageInnerWidth,
                  height: heroLayout.heroImageInnerHeight
                }
              ]}
              resizeMode="stretch"
            />
          </View>
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
          <AppButton
            title={viewModel.secondaryAction.buttonTitle}
            variant="secondary"
            onPress={() => {
              if (viewModel.secondaryAction?.href) {
                router.push(viewModel.secondaryAction.href);
              }
            }}
            style={[styles.secondaryButton, { width: heroLayout.heroButtonWidth }]}
            size="md"
          />
        ) : null}
      </View>

      <View style={[styles.goalRow, { gap: heroLayout.goalGap }]}>
        <View style={styles.mini}>
          <Text style={styles.label}>目标睡觉</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={[styles.value, { fontSize: heroLayout.valueSize }]}>{targetTime}</Text>
        </View>
        <View style={styles.mini}>
          <Text style={styles.label}>建议开始</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={[styles.value, { fontSize: heroLayout.valueSize }]}>{suggestedStart}</Text>
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
  statusLabelText: {
    flex: 1
  },
  statusPill: {
    width: 86,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  statusPillCompact: {
    width: 78,
    height: 34
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
