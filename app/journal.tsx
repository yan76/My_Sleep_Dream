import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GradientLayer } from "@/components/common/GradientLayer";
import { getTodayReviews } from "@/storage/rescueSessionStorage";
import type { TodayReview } from "@/types/app";
import { useResponsiveMetrics } from "@/utils/responsive";

type ReviewTextSection = {
  label: string;
  value: string;
};

const weekdayLabels = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function formatDateTitle(date: string): string {
  const value = new Date(`${date}T00:00:00`);

  if (Number.isNaN(value.getTime())) {
    return date;
  }

  return `${value.getMonth() + 1}月${value.getDate()}日 ${weekdayLabels[value.getDay()]}`;
}

function formatUpdatedTime(value: string): string | null {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function buildReviewSections(review: TodayReview): ReviewTextSection[] {
  if (review.minimalMode) {
    return [
      {
        label: "一句话记录",
        value: review.happenedToday
      }
    ].filter((section) => section.value.trim());
  }

  return [
    {
      label: "最占脑子的事",
      value: review.happenedToday
    },
    {
      label: "值得肯定的小事",
      value: review.completedToday
    },
    {
      label: "先放下的事",
      value: review.unfinishedToday
    },
    {
      label: "明天的一件小事",
      value: review.tomorrowPlan
    }
  ].filter((section) => section.value.trim());
}

function BackButton() {
  return (
    <Pressable accessibilityRole="button" style={styles.backButton} onPress={() => router.replace("/records")}>
      <Text style={styles.backText}>返回成长</Text>
    </Pressable>
  );
}

function Hero({ count }: { count: number }) {
  return (
    <View style={styles.hero}>
      <View style={styles.eyebrowRow}>
        <View style={styles.eyebrowDot} />
        <Text style={styles.eyebrow}>复盘日记本</Text>
      </View>
      <Text style={styles.heroTitle}>以前的夜晚，也被你好好收起来了</Text>
      <Text style={styles.heroSubtitle}>
        {count > 0
          ? `这里有 ${count} 天睡前写下的话。回头看时，它们更像一串真实的脚印。`
          : "今晚写下第一句后，这里会开始留下你的睡前文字。"}
      </Text>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>还没有睡前日记</Text>
      <Text style={styles.emptyBody}>第一条不用完整，也不用漂亮。能把今天轻轻放下，就已经很好。</Text>
      <Pressable style={styles.gradientButton} onPress={() => router.push("/today-review")}>
        <GradientLayer
          stops={[
            { color: "#E6D5B8", location: 0 },
            { color: "#F4ECDF", location: 0.35 },
            { color: "#BFC4FF", location: 0.68 },
            { color: "#8A97FF", location: 1 }
          ]}
        />
        <Text style={styles.gradientButtonText}>今晚写一句</Text>
      </Pressable>
    </View>
  );
}

function ReviewSection({ label, value }: ReviewTextSection) {
  return (
    <View style={styles.reviewSection}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <Text style={styles.sectionBody}>{value}</Text>
    </View>
  );
}

function ReviewCard({ review }: { review: TodayReview }) {
  const updatedTime = formatUpdatedTime(review.updatedAt);
  const sections = buildReviewSections(review);

  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.dateBlock}>
          <Text style={styles.dateTitle}>{formatDateTitle(review.date)}</Text>
          <Text style={styles.dateKey}>{review.date}</Text>
        </View>
        <View style={[styles.modePill, review.minimalMode ? styles.modePillMinimal : styles.modePillFull]}>
          <Text style={[styles.modeText, review.minimalMode ? styles.modeTextMinimal : styles.modeTextFull]}>
            {review.minimalMode ? "极简" : "完整"}
          </Text>
        </View>
      </View>

      <View style={styles.sectionList}>
        {sections.length > 0 ? (
          sections.map((section) => <ReviewSection key={section.label} label={section.label} value={section.value} />)
        ) : (
          <Text style={styles.fallbackText}>这一天完成了复盘，但没有留下更多文字。</Text>
        )}
      </View>

      {updatedTime ? <Text style={styles.updatedText}>记录于 {updatedTime}</Text> : null}
    </View>
  );
}

export default function JournalScreen() {
  const metrics = useResponsiveMetrics();
  const [reviews, setReviews] = useState<TodayReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function load() {
        setLoading(true);
        setLoadError(null);

        try {
          const nextReviews = await getTodayReviews();

          if (active) {
            setReviews(nextReviews);
          }
        } catch (error) {
          console.warn("[journal] Failed to load today reviews", error);

          if (active) {
            setLoadError("日记本暂时没有打开，请稍后再试。");
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      }

      load();

      return () => {
        active = false;
      };
    }, [])
  );

  const sortedReviews = useMemo(
    () => [...reviews].sort((left, right) => right.date.localeCompare(left.date)),
    [reviews]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View pointerEvents="none" style={styles.backgroundLayer}>
        <View style={styles.topGlow} />
        <View style={styles.sideGlow} />
      </View>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.scrollContent, { paddingBottom: metrics.bottomNavReservedSpace }]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.content,
            {
              maxWidth: metrics.contentMaxWidth,
              paddingHorizontal: metrics.contentHorizontalPadding,
              paddingTop: metrics.contentTopPadding,
              gap: metrics.contentGap
            }
          ]}
        >
          <View style={styles.topRow}>
            <BackButton />
          </View>

          <Hero count={sortedReviews.length} />

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color="#E6D5B8" />
              <Text style={styles.loadingText}>正在翻开你的睡前文字</Text>
            </View>
          ) : loadError ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>没有读到日记</Text>
              <Text style={styles.emptyBody}>{loadError}</Text>
            </View>
          ) : sortedReviews.length === 0 ? (
            <EmptyState />
          ) : (
            <View style={styles.list}>
              {sortedReviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#070817"
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden"
  },
  topGlow: {
    position: "absolute",
    width: 480,
    height: 320,
    borderRadius: 240,
    left: -150,
    top: -120,
    backgroundColor: "#242142"
  },
  sideGlow: {
    position: "absolute",
    width: 360,
    height: 520,
    borderRadius: 180,
    right: -230,
    top: 120,
    backgroundColor: "#151833"
  },
  scrollContent: {
    flexGrow: 1
  },
  content: {
    width: "100%",
    alignSelf: "center"
  },
  topRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2
  },
  backButton: {
    height: 52,
    minWidth: 88,
    paddingHorizontal: 14,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    justifyContent: "center"
  },
  backText: {
    color: "#F5F6FF",
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900"
  },
  hero: {
    gap: 16,
    marginBottom: 2
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11
  },
  eyebrowDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E6D5B8"
  },
  eyebrow: {
    color: "#E6D5B8",
    fontSize: 20,
    fontWeight: "900"
  },
  heroTitle: {
    color: "#F5F6FF",
    fontSize: 38,
    lineHeight: 49,
    fontWeight: "900"
  },
  heroSubtitle: {
    color: "#A6ABBF",
    fontSize: 18,
    lineHeight: 29,
    fontWeight: "600"
  },
  loadingWrap: {
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
    gap: 14
  },
  loadingText: {
    color: "#A6ABBF",
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "800"
  },
  emptyCard: {
    minHeight: 240,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(230,213,184,0.28)",
    backgroundColor: "rgba(230,213,184,0.08)",
    padding: 24,
    justifyContent: "center",
    gap: 16,
    overflow: "hidden"
  },
  emptyTitle: {
    color: "#F5F6FF",
    fontSize: 25,
    lineHeight: 33,
    fontWeight: "900"
  },
  emptyBody: {
    color: "#A6ABBF",
    fontSize: 16,
    lineHeight: 25,
    fontWeight: "700"
  },
  gradientButton: {
    minHeight: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginTop: 6
  },
  gradientButtonText: {
    color: "#10101B",
    fontSize: 19,
    lineHeight: 26,
    fontWeight: "900"
  },
  list: {
    gap: 14
  },
  reviewCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    backgroundColor: "rgba(255,255,255,0.055)",
    padding: 20,
    gap: 18,
    overflow: "hidden"
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14
  },
  dateBlock: {
    flex: 1,
    minWidth: 0,
    gap: 5
  },
  dateTitle: {
    color: "#F5F6FF",
    fontSize: 23,
    lineHeight: 31,
    fontWeight: "900"
  },
  dateKey: {
    color: "#A6ABBF",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800"
  },
  modePill: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  modePillFull: {
    borderColor: "rgba(153,227,187,0.28)",
    backgroundColor: "rgba(153,227,187,0.13)"
  },
  modePillMinimal: {
    borderColor: "rgba(230,213,184,0.28)",
    backgroundColor: "rgba(230,213,184,0.12)"
  },
  modeText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900"
  },
  modeTextFull: {
    color: "#99E3BB"
  },
  modeTextMinimal: {
    color: "#E6D5B8"
  },
  sectionList: {
    gap: 12
  },
  reviewSection: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(7,8,23,0.28)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8
  },
  sectionLabel: {
    color: "#E6D5B8",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "900"
  },
  sectionBody: {
    color: "#D7DAEA",
    fontSize: 17,
    lineHeight: 27,
    fontWeight: "700"
  },
  fallbackText: {
    color: "#A6ABBF",
    fontSize: 16,
    lineHeight: 25,
    fontWeight: "700"
  },
  updatedText: {
    color: "#7E849E",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
    textAlign: "right"
  }
});
