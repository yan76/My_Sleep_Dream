import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import { Screen } from "@/components/common/Screen";
import { colors } from "@/constants/colors";
import { getDailyExecutionRecords } from "@/storage/dailyExecutionStorage";
import {
  getRescueSessions,
  getSleepRecords,
  getTodayReviews,
  getUserConfig
} from "@/storage/rescueSessionStorage";
import { DailyExecutionRecord, RescueSession, SleepRecord, TodayReview, UserConfig } from "@/types/app";
import {
  createLocalWeeklySummary,
  generateWeeklySummary,
  WeeklySummaryResult
} from "@/services/weeklySummaryService";

type WeeklySummaryData = {
  records: SleepRecord[];
  executionRecords: DailyExecutionRecord[];
  sessions: Record<string, RescueSession>;
  reviews: TodayReview[];
  config: UserConfig;
};

function SourcePill({ result }: { result: WeeklySummaryResult | null }) {
  const label = result?.source === "cloud" ? "云端 AI" : result ? "本地兜底" : "可 AI 生成";

  return <Text style={styles.sourcePill}>{label}</Text>;
}

export default function WeeklySummaryScreen() {
  const [data, setData] = useState<WeeklySummaryData | null>(null);
  const [result, setResult] = useState<WeeklySummaryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setResult(null);
    const [records, executionRecords, sessions, reviews, config] = await Promise.all([
      getSleepRecords(),
      getDailyExecutionRecords(),
      getRescueSessions(),
      getTodayReviews(),
      getUserConfig()
    ]);
    const nextData = { records, executionRecords, sessions, reviews, config };
    setData(nextData);
    setResult(createLocalWeeklySummary(nextData));
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const generateSummary = async () => {
    if (!data || isGenerating) {
      return;
    }

    setIsGenerating(true);
    try {
      setResult(await generateWeeklySummary(data));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Screen>
      <View style={styles.top}>
        <Pressable style={styles.backButton} onPress={() => router.replace("/records")}>
          <Text style={styles.backText}>返回</Text>
        </Pressable>
        <SourcePill result={result} />
      </View>

      <View style={styles.header}>
        <Text style={styles.eyebrow}>本周晚安总结</Text>
        <Text style={styles.title}>把这一周的夜晚轻轻收起来</Text>
        <Text style={styles.subtitle}>总结只看行为和记录，不做医疗判断，也不把偶尔晚睡当成失败。</Text>
      </View>

      {loading || !result ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.loadingText}>正在整理本周记录...</Text>
        </View>
      ) : (
        <>
          <View style={styles.summaryCard}>
            <Text style={styles.label}>{result.title}</Text>
            <Text style={styles.summary}>{result.summary}</Text>
          </View>

          <View style={styles.highlightList}>
            {result.highlights.map((highlight, index) => (
              <View key={`${highlight}-${index}`} style={styles.highlightItem}>
                <View style={styles.highlightIndex}>
                  <Text style={styles.highlightIndexText}>{index + 1}</Text>
                </View>
                <Text style={styles.highlightText}>{highlight}</Text>
              </View>
            ))}
          </View>

          <View style={styles.nextCard}>
            <Text style={styles.label}>下周先做</Text>
            <Text style={styles.nextFocus}>{result.nextFocus}</Text>
          </View>

          {result.safetyLabel !== "normal" ? (
            <View style={styles.boundaryCard}>
              <Text style={styles.boundaryTitle}>安全边界</Text>
              <Text style={styles.boundaryText}>这份总结已启用敏感内容兜底，只提供睡前收束建议，不提供诊断、治疗或药物建议。</Text>
            </View>
          ) : null}
        </>
      )}

      <View style={styles.actions}>
        <AppButton
          title={isGenerating ? "生成中..." : result?.source === "cloud" ? "重新生成 AI 总结" : "AI 生成本周总结"}
          variant="gradient"
          onPress={generateSummary}
          disabled={loading || isGenerating || !data}
        />
        <AppButton title="回到成长页" variant="ghost" onPress={() => router.replace("/records")} disabled={isGenerating} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
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
  sourcePill: {
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
  loading: {
    minHeight: 320,
    alignItems: "center",
    justifyContent: "center",
    gap: 14
  },
  loadingText: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "800"
  },
  summaryCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(230, 213, 184, 0.32)",
    backgroundColor: colors.surfaceWarm,
    padding: 22,
    gap: 14
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "900"
  },
  summary: {
    color: colors.ink,
    fontSize: 23,
    lineHeight: 33,
    fontWeight: "900"
  },
  highlightList: {
    gap: 12
  },
  highlightItem: {
    minHeight: 88,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  highlightIndex: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center"
  },
  highlightIndexText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: "900"
  },
  highlightText: {
    flex: 1,
    color: colors.ink,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "800"
  },
  nextCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(153, 227, 187, 0.28)",
    backgroundColor: colors.surfaceMint,
    padding: 22,
    gap: 12
  },
  nextFocus: {
    color: colors.ink,
    fontSize: 20,
    lineHeight: 30,
    fontWeight: "900"
  },
  boundaryCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 112, 131, 0.28)",
    backgroundColor: colors.surfaceRose,
    padding: 18,
    gap: 8
  },
  boundaryTitle: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: "900"
  },
  boundaryText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700"
  },
  actions: {
    gap: 12
  }
});
