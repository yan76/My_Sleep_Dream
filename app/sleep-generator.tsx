import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Image, ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import { Screen } from "@/components/common/Screen";
import { colors } from "@/constants/colors";
import { SleepAidOption } from "@/constants/sleepAidPreferences";
import { completeReadyToSleepAfterRescue } from "@/features/rescue/readyToSleepUseCase";
import {
  getTodayReview,
  getUserConfig,
  markSleepGeneratorUsed,
  markTreeHoleUsed
} from "@/storage/rescueSessionStorage";
import { markSleepAidStarted } from "@/storage/dailyExecutionStorage";
import { generateSleepScript, SleepScriptResult } from "@/services/sleepScriptService";
import { TodayReview, UserConfig } from "@/types/app";
import { getRecommendedSleepAids } from "@/utils/sleepPreferences";

const generatorBackground = require("../assets/ui/sleep-generator-background-alpha.png");
const generatorIcon = require("../assets/ui/sleep-generator-icon-alpha.png");

type AidCardProps = {
  aid: SleepAidOption;
  index: number;
  primary?: boolean;
  disabled: boolean;
  onPress: (aid: SleepAidOption) => void;
};

function AidCard({ aid, index, primary, disabled, onPress }: AidCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => onPress(aid)}
      style={({ pressed }) => [
        styles.aidCard,
        primary && styles.aidCardPrimary,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled
      ]}
    >
      <View style={[styles.aidRank, primary && styles.aidRankPrimary]}>
        <Text style={[styles.aidRankText, primary && styles.aidRankTextPrimary]}>{index + 1}</Text>
      </View>
      <View style={styles.aidCopy}>
        <Text style={styles.aidTitle}>{aid.label}</Text>
        <Text style={styles.aidBody}>{aid.description}</Text>
      </View>
      <Text style={styles.aidAction}>进入</Text>
    </Pressable>
  );
}

export default function SleepGeneratorScreen() {
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null);
  const [todayReview, setTodayReview] = useState<TodayReview | null>(null);
  const [scriptResult, setScriptResult] = useState<SleepScriptResult | null>(null);
  const [isChoosing, setIsChoosing] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);

  const loadConfig = useCallback(async () => {
    const [config, review] = await Promise.all([getUserConfig(), getTodayReview()]);
    setUserConfig(config);
    setTodayReview(review);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadConfig();
    }, [loadConfig])
  );

  const recommendedAids = useMemo(
    () => getRecommendedSleepAids(userConfig?.lateNightReasons ?? [], userConfig?.sleepAidPreferences ?? []),
    [userConfig?.lateNightReasons, userConfig?.sleepAidPreferences]
  );
  const primaryAid = recommendedAids[0];

  const chooseAid = async (aid: SleepAidOption) => {
    if (isChoosing) {
      return;
    }

    setIsChoosing(true);
    try {
      if (aid.route === "/tree-hole") {
        await markTreeHoleUsed();
        await markSleepAidStarted({ aid: "tree_hole" });
      } else {
        await markSleepGeneratorUsed(aid.label);
        await markSleepAidStarted({ aid: aid.id });
      }
      router.push(aid.route);
    } finally {
      setIsChoosing(false);
    }
  };

  const generateNightHint = async () => {
    if (!userConfig || isGeneratingScript) {
      return;
    }

    setIsGeneratingScript(true);
    try {
      const result = await generateSleepScript({
        targetSleepTime: userConfig.targetSleepTime,
        lateNightReasons: userConfig.lateNightReasons,
        sleepAidPreferences: userConfig.sleepAidPreferences,
        review: todayReview
      });
      setScriptResult(result);
      await markSleepGeneratorUsed("AI 睡意暗示");
      await markSleepAidStarted({ aid: "suggestion" });
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const prepareToSleep = async () => {
    if (isChoosing) {
      return;
    }

    setIsChoosing(true);
    try {
      await markSleepGeneratorUsed(primaryAid?.label ?? "睡意生成器");
      await markSleepAidStarted({ aid: primaryAid?.id ?? "sleep_generator" });
      const completed = await completeReadyToSleepAfterRescue();
      if (!completed) {
        router.replace("/rescue");
        return;
      }
      router.replace("/rescue");
    } finally {
      setIsChoosing(false);
    }
  };

  if (!userConfig) {
    return (
      <Screen>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>正在挑一条适合今晚的路...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.top}>
        <Pressable style={styles.backButton} onPress={() => router.push("/rescue")}>
          <Text style={styles.backText}>返回</Text>
        </Pressable>
        <Text style={styles.statusPill}>进入睡意</Text>
      </View>

      <ImageBackground source={generatorBackground} style={styles.heroCard} imageStyle={styles.heroImage}>
        <View style={styles.heroScrim} />
        <View style={styles.heroContent}>
          <Image source={generatorIcon} style={styles.heroIcon} resizeMode="contain" />
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>睡意生成器</Text>
            <Text style={styles.title}>选一种方式，把注意力慢慢带回来</Text>
            <Text style={styles.subtitle}>今晚不需要用力睡着，只要让身体开始降速。</Text>
          </View>
        </View>
      </ImageBackground>

      {primaryAid ? (
        <View style={styles.recommendCard}>
          <Text style={styles.label}>今晚优先推荐</Text>
          <Text style={styles.primaryTitle}>{primaryAid.label}</Text>
          <Text style={styles.body}>{primaryAid.description}</Text>
          <AppButton
            title={`使用${primaryAid.label}`}
            variant="gradient"
            onPress={() => chooseAid(primaryAid)}
            disabled={isChoosing}
            style={styles.primaryButton}
          />
        </View>
      ) : null}

      <View style={styles.scriptCard}>
        <View style={styles.scriptHeader}>
          <Text style={styles.label}>AI 睡意生成</Text>
          <Text style={styles.scriptSource}>{scriptResult ? (scriptResult.source === "cloud" ? "云端生成" : "本地兜底") : "可离线兜底"}</Text>
        </View>
        <Text style={styles.scriptTitle}>生成今晚的晚安暗示</Text>
        <Text style={styles.body}>结合晚睡原因、助眠偏好和今日复盘，生成一段不评判、不讲大道理的睡前收束文案。</Text>
        <AppButton
          title={isGeneratingScript ? "生成中..." : scriptResult ? "重新生成" : "生成今晚暗示"}
          variant="secondary"
          onPress={generateNightHint}
          disabled={isChoosing || isGeneratingScript}
          style={styles.primaryButton}
        />
        {scriptResult ? (
          <View style={styles.scriptResult}>
            <Text style={styles.scriptResultTitle}>{scriptResult.title}</Text>
            <Text style={styles.scriptBody}>{scriptResult.script}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.optionList}>
        {recommendedAids.map((aid, index) => (
          <AidCard
            key={aid.id}
            aid={aid}
            index={index}
            primary={index === 0}
            disabled={isChoosing}
            onPress={chooseAid}
          />
        ))}
      </View>

      <AppButton title="谢谢，我准备睡了" variant="ghost" onPress={prepareToSleep} disabled={isChoosing} />
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
  heroCard: {
    minHeight: 232,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(151, 157, 206, 0.3)",
    overflow: "hidden",
    backgroundColor: colors.surfaceCool,
    justifyContent: "flex-end",
    shadowColor: "#000000",
    shadowOpacity: 0.24,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 7
  },
  heroImage: {
    width: "118%",
    height: "118%",
    left: "-9%",
    top: "-9%"
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(6, 7, 20, 0.1)"
  },
  heroContent: {
    padding: 22,
    gap: 18
  },
  heroIcon: {
    width: 76,
    height: 76,
    marginBottom: 2
  },
  heroCopy: {
    width: "88%",
    gap: 10
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "900"
  },
  title: {
    color: colors.ink,
    fontSize: 31,
    lineHeight: 38,
    fontWeight: "900"
  },
  subtitle: {
    color: "rgba(230, 234, 255, 0.74)",
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "700"
  },
  recommendCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(230, 213, 184, 0.28)",
    backgroundColor: "#2A2834",
    padding: 22,
    gap: 14
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "900"
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
  scriptCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(138, 151, 255, 0.32)",
    backgroundColor: colors.surfaceCool,
    padding: 22,
    gap: 14
  },
  scriptHeader: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  scriptSource: {
    color: colors.success,
    fontSize: 12,
    fontWeight: "900"
  },
  scriptTitle: {
    color: colors.ink,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900"
  },
  scriptResult: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: "#111323",
    padding: 16,
    gap: 10
  },
  scriptResultTitle: {
    color: colors.accent,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "900"
  },
  scriptBody: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "700"
  },
  optionList: {
    gap: 12
  },
  aidCard: {
    minHeight: 92,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  aidCardPrimary: {
    backgroundColor: colors.surfaceCool,
    borderColor: colors.primaryDark
  },
  aidRank: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#262837",
    alignItems: "center",
    justifyContent: "center"
  },
  aidRankPrimary: {
    backgroundColor: colors.accent
  },
  aidRankText: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "900"
  },
  aidRankTextPrimary: {
    color: colors.buttonText
  },
  aidCopy: {
    flex: 1,
    gap: 5
  },
  aidTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900"
  },
  aidBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700"
  },
  aidAction: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "900"
  },
  disabled: {
    opacity: 0.52
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.9
  }
});
