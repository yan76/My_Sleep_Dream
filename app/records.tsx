import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, ImageSourcePropType, Pressable, ScrollView, StyleSheet, Text, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppDialog } from "@/components/common/AppDialog";
import { isDemoMode } from "@/constants/demo";
import { buildGrowthStats, loadGrowthData, seedGrowthTestData } from "@/features/growth/growthData";
import type { GrowthData } from "@/features/growth/growthData";
import type { DailyExecutionRecord, SleepRecord, TodayReview } from "@/types/app";
import {
  getCurrentExecutionStreak,
  getCurrentSleepStreak,
  GrowthDimension,
  GrowthStats,
  TrendBar,
  TrendPoint
} from "@/utils/growth";
import { useResponsiveMetrics } from "@/utils/responsive";

type MetricCardProps = {
  label: string;
  value: string;
  icon?: string;
  valueColor?: string;
};

const periodLabels: Record<GrowthDimension, string> = {
  week: "本周",
  month: "本月",
  all: "全部"
};

const periodOrder: GrowthDimension[] = ["week", "month", "all"];

const streakBadge = require("../assets/badges/streak-badge.png");
const noWhiteNightBadge = require("../assets/badges/no-white-night-badge.png");
const adviceBackground = require("../assets/ui/growth-advice-background.png");
const monthCompareMoonscape = require("../assets/ui/month-compare-moonscape.png");
const monthChangeClock = require("../assets/ui/month-change-clock.png");
const monthChangePhone = require("../assets/ui/month-change-phone.png");
const monthChangeSunrise = require("../assets/ui/month-change-sunrise.png");

function GlassCard({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.glassCard, style]}>{children}</View>;
}

function BackButton() {
  return (
    <Pressable style={styles.backButton} onPress={() => router.back()}>
      <Text style={styles.backText}>‹ 返回</Text>
    </Pressable>
  );
}

function PeriodControl({
  active,
  expanded,
  onExpand,
  onChange
}: {
  active: GrowthDimension;
  expanded: boolean;
  onExpand: () => void;
  onChange: (next: GrowthDimension) => void;
}) {
  if (!expanded) {
    return (
      <Pressable style={styles.singlePeriod} onPress={onExpand}>
        <Text style={styles.singlePeriodText}>{periodLabels[active]}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.periodGroup}>
      {periodOrder.map((item) => {
        const selected = item === active;
        return (
          <Pressable key={item} style={[styles.periodItem, selected && styles.periodItemActive]} onPress={() => onChange(item)}>
            <Text style={[styles.periodText, selected && styles.periodTextActive]}>{periodLabels[item]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Header({
  dimension,
  expanded,
  onExpand,
  onChange
}: {
  dimension: GrowthDimension;
  expanded: boolean;
  onExpand: () => void;
  onChange: (next: GrowthDimension) => void;
}) {
  return (
    <View style={styles.topRow}>
      <BackButton />
      <PeriodControl active={dimension} expanded={expanded} onExpand={onExpand} onChange={onChange} />
    </View>
  );
}

function TestDataButton({ busy, onPress }: { busy: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.testDataButton, busy && styles.testDataButtonDisabled]} onPress={onPress} disabled={busy}>
      <Text style={styles.testDataButtonText}>{busy ? "生成中..." : "新增测试数据"}</Text>
    </Pressable>
  );
}

function StatusPill({ label, prefix = "↑" }: { label: string; prefix?: string }) {
  return (
    <View style={styles.statusPill}>
      <Text style={styles.statusPillText}>{prefix} {label}</Text>
    </View>
  );
}

function HeroCopy({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <View style={styles.hero}>
      <View style={styles.eyebrowRow}>
        <View style={styles.eyebrowDot} />
        <Text style={styles.eyebrow}>{eyebrow}</Text>
      </View>
      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.heroSubtitle}>{subtitle}</Text>
    </View>
  );
}

function ProgressCard({ stats }: { stats: GrowthStats }) {
  return (
    <GlassCard style={styles.progressCard}>
      <View style={styles.progressHeader}>
        <Text style={styles.cardLabel}>本周最明显的进步</Text>
        <StatusPill label={stats.statusLabel} />
      </View>
      <Text style={styles.bigGold}>{stats.averageLabel}</Text>
      <Text style={styles.cardBody}>{stats.averageCaption}</Text>
    </GlassCard>
  );
}

function WeekTrend({ bars }: { bars: TrendBar[] }) {
  return (
    <GlassCard style={styles.weekTrendCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>一周入睡趋势</Text>
        <Text style={styles.goldSmall}>越低越早睡</Text>
      </View>
      <View style={styles.barChart}>
        {bars.map((bar, index) => (
          <View key={`${bar.label}-${index}`} style={styles.barColumn}>
            <View
              style={[
                styles.trendBar,
                bar.active ? styles.trendBarActive : styles.trendBarMuted,
                bar.active ? trendBarGradientStyle : trendBarMutedGradientStyle,
                { height: bar.height }
              ]}
            />
            <Text style={styles.axisLabel}>{bar.label}</Text>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

function CircleMetric({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <GlassCard style={styles.circleMetric}>
      <View style={styles.ring}>
        <View style={styles.ringCutout}>
          <Text style={styles.ringValue}>{value}</Text>
        </View>
      </View>
      <Text style={styles.metricTitle}>{label}</Text>
      <Text style={styles.metricCaption}>{caption}</Text>
    </GlassCard>
  );
}

function BadgeTile({ image, title, caption }: { image: ImageSourcePropType; title: string; caption: string }) {
  return (
    <GlassCard style={styles.badgeTile}>
      <Image source={image} style={styles.badgeIcon} resizeMode="contain" />
      <View style={styles.badgeCopy}>
        <Text style={styles.badgeTitle}>{title}</Text>
        <Text style={styles.metricCaption}>{caption}</Text>
      </View>
    </GlassCard>
  );
}

function MoonAdvice({ title, body, buttonTitle, onPress }: { title: string; body: string; buttonTitle: string; onPress: () => void }) {
  return (
    <View style={styles.adviceBlock}>
      <View style={[styles.glassCard, styles.adviceCard]}>
        <Image source={adviceBackground} style={styles.adviceBackgroundImage} resizeMode="cover" />
        <View style={styles.adviceScrim} />
        <View style={styles.adviceForeground}>
          <View style={styles.adviceMoonIcon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={styles.moonBase} />
            <View style={styles.moonCutout} />
            <Text style={[styles.moonStar, styles.moonStarOne]}>✦</Text>
            <Text style={[styles.moonStar, styles.moonStarTwo]}>✦</Text>
            <Text style={[styles.moonStar, styles.moonStarThree]}>✦</Text>
          </View>
          <View style={styles.adviceTextWrap}>
            <Text style={styles.adviceTitle}>{title}</Text>
            <Text style={styles.adviceBody}>{body}</Text>
          </View>
        </View>
      </View>
      <GradientButton title={buttonTitle} onPress={onPress} />
    </View>
  );
}

function GradientButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable style={[styles.gradientButton, gradientBackgroundStyle]} onPress={onPress}>
      <Text style={styles.gradientButtonText}>{title}</Text>
      {title.includes("故事") || title.includes("记录") ? <Text style={styles.gradientArrow}>›</Text> : null}
    </Pressable>
  );
}

function MetricCard({ label, value, icon, valueColor }: MetricCardProps) {
  return (
    <GlassCard style={styles.metricCard}>
      {icon ? (
        <View style={styles.smallIcon}>
          <Text style={styles.smallIconText}>{icon}</Text>
        </View>
      ) : null}
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </GlassCard>
  );
}

function LineSegment({ from, to }: { from: { x: number; y: number }; to: { x: number; y: number } }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  return (
    <View
      style={[
        styles.lineSegment,
        {
          left: from.x,
          top: from.y,
          width: length,
          transform: [{ rotate: `${angle}deg` }]
        }
      ]}
    />
  );
}

function clampChartValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function LineTrend({ title, range, points, compact = false }: { title: string; range: string; points: TrendPoint[]; compact?: boolean }) {
  const [chartWidth, setChartWidth] = useState(0);
  const chartHeight = compact ? 170 : 214;
  const horizontalInset = compact ? 18 : 22;
  const axisLabelWidth = 42;
  const drawableWidth = Math.max(1, chartWidth - horizontalInset * 2);
  const maxAxisLabelLeft = Math.max(0, chartWidth - axisLabelWidth);
  const maxValue = Math.max(1, ...points.map((point) => point.value));
  const coords = points.map((point, index) => {
    const x = points.length === 1 ? chartWidth / 2 : horizontalInset + (index / (points.length - 1)) * drawableWidth;
    const y = chartHeight - 34 - (point.value / maxValue) * (chartHeight - 86);
    return { ...point, x, y };
  });

  return (
    <GlassCard style={[styles.lineTrendCard, compact && styles.lineTrendCardCompact]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.goldSmall}>{range}</Text>
      </View>
      <View
        style={[styles.lineChart, { height: chartHeight }]}
        onLayout={({ nativeEvent }) => {
          const nextWidth = Math.round(nativeEvent.layout.width);
          if (nextWidth > 0 && nextWidth !== chartWidth) {
            setChartWidth(nextWidth);
          }
        }}
      >
        <View style={[styles.chartBaseLine, { left: horizontalInset, right: horizontalInset }]} />
        {chartWidth > 0 ? (
          <>
            {coords.slice(0, -1).map((point, index) => (
              <LineSegment key={`${point.label}-${coords[index + 1].label}`} from={point} to={coords[index + 1]} />
            ))}
            {coords.map((point, index) => (
              <View
                key={point.label}
                style={[
                  styles.lineDot,
                  index === coords.length - 1 && styles.lineDotActive,
                  { left: point.x - 6, top: point.y - 6 }
                ]}
              />
            ))}
            {coords.map((point) => (
              <Text
                key={`${point.label}-axis`}
                style={[
                  styles.lineAxisLabel,
                  {
                    left: clampChartValue(point.x - axisLabelWidth / 2, 0, maxAxisLabelLeft),
                    top: chartHeight - 24
                  }
                ]}
              >
                {point.label}
              </Text>
            ))}
          </>
        ) : null}
      </View>
    </GlassCard>
  );
}

function ChangeList({ title, rows }: { title: string; rows: { icon?: string; image?: ImageSourcePropType; label: string; value: string }[] }) {
  return (
    <GlassCard style={styles.changeListCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.changeRows}>
        {rows.map((row) => (
          <View key={row.label} style={styles.changeRow}>
            <View style={styles.changeIcon}>
              {row.image ? (
                <Image source={row.image} style={styles.changeIconImage} resizeMode="contain" />
              ) : (
                <Text style={styles.changeIconText}>{row.icon}</Text>
              )}
            </View>
            <Text style={styles.changeLabel}>{row.label}</Text>
            <Text style={styles.changeValue}>{row.value}</Text>
            <Text style={styles.chevron}>›</Text>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

function isMeaningfulExecution(record: DailyExecutionRecord): boolean {
  return record.status !== "not_started" || Boolean(record.readyToSleepAt || record.checkinCompletedAt || record.feedbackViewedAt);
}

function countGrowthSignals(
  records: SleepRecord[],
  executionRecords: DailyExecutionRecord[],
  reviews: TodayReview[]
): number {
  return new Set([
    ...records.map((record) => record.date),
    ...executionRecords.filter(isMeaningfulExecution).map((record) => record.date),
    ...reviews.map((review) => review.date)
  ]).size;
}

function EmptyGrowthState() {
  return (
    <>
      <HeroCopy
        eyebrow="成长记录"
        title="先留下第一个夜晚"
        subtitle="完成一次睡前收尾或次日打卡后，这里就会开始生成属于你的变化。"
      />
      <GlassCard style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>现在还不用看数据</Text>
        <Text style={styles.emptyBody}>第一条记录只负责建立基线。哪怕今晚只是写一句复盘、选一个助眠入口，也已经足够开始。</Text>
      </GlassCard>
      <GradientButton title="开始今晚自救" onPress={() => router.push("/rescue")} />
    </>
  );
}

function GrowthReadinessCard({
  signalCount,
  streak
}: {
  signalCount: number;
  streak: number;
}) {
  const title = streak >= 3
    ? `你已经连续 ${streak} 晚把自己带回来了`
    : signalCount < 3
      ? "正在建立你的夜晚基线"
      : "你的变化已经开始有轮廓";
  const body = streak >= 3
    ? "连续性比单晚完美更重要。后面几张卡片会优先看见这个长期变化。"
    : signalCount < 3
      ? "现在数据还少，所以这里会少做判断，多保留事实。再积累几晚，趋势会更清楚。"
      : "这里会把复盘、打卡和自救记录放在一起看，不再只看徽章或单次成败。";

  return (
    <GlassCard style={styles.readinessCard}>
      <Text style={styles.readinessTitle}>{title}</Text>
      <Text style={styles.readinessBody}>{body}</Text>
    </GlassCard>
  );
}

function WeekView({ stats, streak }: { stats: GrowthStats; streak: number }) {
  return (
    <>
      <HeroCopy
        eyebrow="你在慢慢变好"
        title="这周，你开始让自己变得更好了"
        subtitle="不需要完美，能看见变化就已经很好。"
      />
      <ProgressCard stats={stats} />
      <WeekTrend bars={stats.weekBars} />
      <View style={styles.circleGrid}>
        <CircleMetric label="复盘" value={String(stats.reviewCount)} caption="没有恐惧冻结更深夜" />
        <CircleMetric label="暂停" value={String(stats.pauseCount)} caption="想刷手机时停下来" />
        <CircleMetric label="不错" value={String(stats.goodMoodCount)} caption="睡来状态比较期待" />
      </View>
      <View style={styles.badgeGrid}>
        <BadgeTile image={streakBadge} title={`${Math.max(streak, 1)} 天连胜`} caption="连续完成睡前收尾" />
        <BadgeTile image={noWhiteNightBadge} title={stats.pauseCount > 0 ? "没白熬徽章" : "正在接近徽章"} caption="你开始把自己带回来了" />
      </View>
      <MoonAdvice
        title="这不是自律奇迹，是你真的开始学会爱惜自己了。"
        body="今晚建议：睡前 10 分钟先写下“没完成的事”。"
        buttonTitle="生成本周晚安总结"
        onPress={() => router.push("/weekly-summary")}
      />
    </>
  );
}

function MonthView({ stats }: { stats: GrowthStats }) {
  return (
    <>
      <HeroCopy
        eyebrow="变化正在累积"
        title="过去一个月，你比之前更会照顾自己了"
        subtitle="把每周的小进步放在一起，你会更清楚地看见变化。"
      />
      <View style={styles.metricGrid}>
        <MetricCard label="平均入睡" value={stats.monthAverageLabel} valueColor="#F1DDAA" />
        <MetricCard label="稳定晚数" value={`${stats.stableNightCount} 晚`} />
        <MetricCard label="复盘完成" value={`${stats.cumulativeReviewCount} 次`} />
        <MetricCard label="精神不错" value={`${stats.goodMoodCount} 天`} />
      </View>
      <GlassCard style={styles.compareCard}>
        <View style={styles.moonScene}>
          <Image source={monthCompareMoonscape} style={styles.monthCompareImage} resizeMode="contain" />
        </View>
        <View style={styles.compareCopy}>
          <View style={styles.compareHeader}>
            <Text style={[styles.cardLabel, styles.compareLabel]}>和上个月相比</Text>
            <StatusPill label={stats.monthStatusLabel.replace("正在变好", "更稳")} prefix="+" />
          </View>
          <Text style={styles.compareTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.76}>
            {stats.lessLateCount > 0 ? `少熬了 ${stats.lessLateCount} 晚` : "正在建立基线"}
          </Text>
          <Text style={[styles.cardBody, styles.compareBody]}>固定开始睡前仪式后，晚睡失控的次数明显下降。</Text>
        </View>
      </GlassCard>
      <LineTrend title="4 周变化趋势" range="W1 → W4" points={stats.monthPoints} />
      <ChangeList
        title="这一月最明显的变化"
        rows={[
          { image: monthChangeClock, label: "更常在 23:30 前开始收尾", value: `${stats.startBeforeTargetCount} 次` },
          { image: monthChangePhone, label: "想刷手机时暂停下来", value: `${stats.pauseCount} 次` },
          { image: monthChangeSunrise, label: "醒来觉得“还不错”", value: `${stats.goodMoodCount} 天` }
        ]}
      />
      <MoonAdvice
        title="你不是偶尔做对一次，而是在慢慢建立新的夜晚习惯。"
        body="继续坚持，距离助你改进睡 10 分钟，会更容易稳定下来。"
        buttonTitle="保存这个月的成长记录"
        onPress={() => undefined}
      />
    </>
  );
}

function AllView({ stats }: { stats: GrowthStats }) {
  return (
    <>
      <HeroCopy
        eyebrow="一路走来"
        title="从开始到现在，你越来越懂得爱惜自己了"
        subtitle="把更长时间的变化放在一起，你会更清楚地看见自己真的在变好。"
      />
      <View style={styles.metricGrid}>
        <MetricCard icon="▣" label="累计复盘" value={`${stats.cumulativeReviewCount} 次`} />
        <MetricCard icon="☾" label="稳定晚数" value={`${stats.allStableNightCount} 晚`} />
        <MetricCard icon="☺" label="精神不错" value={`${stats.goodMoodCount} 天`} />
        <MetricCard icon="♜" label="最长连胜" value={`${stats.longestStreak} 晚`} />
      </View>
      <LineTrend title="近 6 个月变化趋势" range="整体在变稳" points={stats.allPoints} compact />
      <GlassCard style={styles.compareLargeCard}>
        <View>
          <Text style={styles.cardLabel}>和最初相比</Text>
          <Text style={styles.compareTitle}>{stats.lessLateCount > 0 ? `少熬了 ${stats.lessLateCount} 晚` : "正在建立基线"}</Text>
          <Text style={styles.cardBody}>固定开始睡前仪式后，晚睡失控的次数明显下降。</Text>
        </View>
        <StatusPill label="更稳" prefix="+" />
      </GlassCard>
      <ChangeList
        title="这些变化已经越来越稳定"
        rows={[
          { image: monthChangeClock, label: "更常在 23:30 前开始收尾", value: `${stats.startBeforeTargetCount} 次` },
          { image: monthChangePhone, label: "想刷手机时暂停下来", value: `${stats.pauseCount} 次` },
          { image: monthChangeSunrise, label: "醒来觉得还不错", value: `${stats.goodMoodCount} 天` }
        ]}
      />
      <MoonAdvice
        title="你不是偶尔做对一次，而是在慢慢建立新的夜晚习惯。"
        body="这不是自律奇迹，是你真的开始学会爱惜自己了。"
        buttonTitle="生成我的成长故事"
        onPress={() => router.push("/weekly-summary")}
      />
    </>
  );
}

function Content({
  dimension,
  stats,
  records,
  executionRecords,
  reviews,
  currentDate
}: {
  dimension: GrowthDimension;
  stats: GrowthStats;
  records: SleepRecord[];
  executionRecords: DailyExecutionRecord[];
  reviews: TodayReview[];
  currentDate: string;
}) {
  const streak = getCurrentExecutionStreak(executionRecords, currentDate) || getCurrentSleepStreak(records, currentDate);
  const signalCount = countGrowthSignals(records, executionRecords, reviews);

  if (signalCount === 0) {
    return <EmptyGrowthState />;
  }

  const body = dimension === "month"
    ? <MonthView stats={stats} />
    : dimension === "all"
      ? <AllView stats={stats} />
      : <WeekView stats={stats} streak={streak} />;

  return (
    <>
      <GrowthReadinessCard signalCount={signalCount} streak={streak} />
      {body}
    </>
  );
}

export default function RecordsScreen() {
  const metrics = useResponsiveMetrics();
  const [data, setData] = useState<GrowthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dimension, setDimension] = useState<GrowthDimension>("week");
  const [periodExpanded, setPeriodExpanded] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [showPendingWeekRolloverDialog, setShowPendingWeekRolloverDialog] = useState(false);
  const pendingWeekRolloverPrompted = useRef(false);

  const showPendingWeekRolloverPrompt = useCallback((nextData: GrowthData) => {
    if (!nextData.hasPendingWeekRollover || pendingWeekRolloverPrompted.current) {
      return;
    }

    pendingWeekRolloverPrompted.current = true;
    setShowPendingWeekRolloverDialog(true);
  }, []);

  const reloadData = useCallback(async () => {
    const nextData = await loadGrowthData();
    setData(nextData);
    setLoading(false);
    showPendingWeekRolloverPrompt(nextData);
  }, [showPendingWeekRolloverPrompt]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      pendingWeekRolloverPrompted.current = false;

      async function load() {
        const nextData = await loadGrowthData();

        if (active) {
          setData(nextData);
          setLoading(false);
          showPendingWeekRolloverPrompt(nextData);
        }
      }

      load();
      return () => {
        active = false;
      };
    }, [showPendingWeekRolloverPrompt])
  );

  const stats = useMemo(() => {
    if (!data) {
      return null;
    }
    return buildGrowthStats(data);
  }, [data]);

  const changeDimension = (next: GrowthDimension) => {
    setDimension(next);
    setPeriodExpanded(true);
  };

  const addTestData = async () => {
    setSeeding(true);
    try {
      await seedGrowthTestData();
      await reloadData();
    } finally {
      setSeeding(false);
    }
  };

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
          <Header
            dimension={dimension}
            expanded={periodExpanded}
            onExpand={() => setPeriodExpanded(true)}
            onChange={changeDimension}
          />
          {isDemoMode ? <TestDataButton busy={seeding} onPress={addTestData} /> : null}
          {loading || !stats || !data ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color="#E6D5B8" />
              <Text style={styles.loadingText}>正在整理你的成长记录</Text>
            </View>
          ) : (
            <Content
              dimension={dimension}
              stats={stats}
              records={data.records}
              executionRecords={data.executionRecords}
              reviews={data.reviews}
              currentDate={data.currentDate}
            />
          )}
        </View>
      </ScrollView>
      <AppDialog
        visible={showPendingWeekRolloverDialog}
        title="这一周已经完成啦~"
        body={"请查收这一周的成果。\n当你开始新一周计划后，成长模块 - 本周页面会切换到新的周期哦"}
        onConfirm={() => setShowPendingWeekRolloverDialog(false)}
      />
    </SafeAreaView>
  );
}

const gradientBackgroundStyle = {
  backgroundImage: "linear-gradient(100deg, #E6D5B8 0%, #F4ECDF 35%, #BFC4FF 68%, #8A97FF 100%)"
} as ViewStyle;

const trendBarGradientStyle = {
  backgroundImage: "linear-gradient(180deg, #F4E1B9 0%, #ECE7DC 22%, #A8B1FF 58%, #627AFF 100%)",
  boxShadow: "0 0 18px rgba(132,148,255,0.28)"
} as ViewStyle;

const trendBarMutedGradientStyle = {
  backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.055) 100%)"
} as ViewStyle;

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
    alignSelf: "center",
    gap: 14
  },
  topRow: {
    minHeight: 52,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2
  },
  backButton: {
    height: 52,
    width: 78,
    paddingHorizontal: 12,
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
  singlePeriod: {
    height: 52,
    width: 78,
    paddingHorizontal: 12,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.055)",
    alignItems: "center",
    justifyContent: "center"
  },
  singlePeriodText: {
    color: "#A6ABBF",
    fontSize: 18,
    fontWeight: "900"
  },
  periodGroup: {
    height: 48,
    padding: 4,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.055)",
    flexDirection: "row",
    gap: 5
  },
  periodItem: {
    minWidth: 64,
    paddingHorizontal: 13,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    backgroundColor: "rgba(255,255,255,0.045)"
  },
  periodItemActive: {
    backgroundColor: "#D9D4E6",
    borderColor: "#F1E1BB"
  },
  periodText: {
    color: "#A6ABBF",
    fontSize: 15,
    fontWeight: "900"
  },
  periodTextActive: {
    color: "#10101B"
  },
  hero: {
    gap: 16,
    marginBottom: 10
  },
  testDataButton: {
    alignSelf: "flex-end",
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(230,213,184,0.28)",
    backgroundColor: "rgba(230,213,184,0.1)",
    alignItems: "center",
    justifyContent: "center"
  },
  testDataButtonDisabled: {
    opacity: 0.55
  },
  testDataButtonText: {
    color: "#E6D5B8",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900"
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
    fontSize: 42,
    lineHeight: 54,
    fontWeight: "900"
  },
  heroSubtitle: {
    color: "#A6ABBF",
    fontSize: 19,
    lineHeight: 30,
    fontWeight: "600"
  },
  glassCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    backgroundColor: "rgba(255,255,255,0.055)",
    overflow: "hidden"
  },
  emptyCard: {
    minHeight: 162,
    padding: 24,
    gap: 12,
    borderColor: "rgba(230,213,184,0.28)",
    backgroundColor: "rgba(230,213,184,0.08)"
  },
  emptyTitle: {
    color: "#F5F6FF",
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "900"
  },
  emptyBody: {
    color: "#A6ABBF",
    fontSize: 16,
    lineHeight: 25,
    fontWeight: "700"
  },
  readinessCard: {
    minHeight: 112,
    padding: 20,
    gap: 8,
    borderRadius: 24,
    borderColor: "rgba(153,227,187,0.18)",
    backgroundColor: "rgba(153,227,187,0.07)"
  },
  readinessTitle: {
    color: "#DFF6E8",
    fontSize: 19,
    lineHeight: 26,
    fontWeight: "900"
  },
  readinessBody: {
    color: "#A6ABBF",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700"
  },
  progressCard: {
    minHeight: 154,
    padding: 28,
    gap: 13
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16
  },
  cardLabel: {
    color: "#A6ABBF",
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "900"
  },
  statusPill: {
    minHeight: 38,
    paddingHorizontal: 15,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "rgba(153,227,187,0.28)",
    backgroundColor: "rgba(153,227,187,0.13)",
    alignItems: "center",
    justifyContent: "center"
  },
  statusPillText: {
    color: "#99E3BB",
    fontSize: 16,
    fontWeight: "900"
  },
  bigGold: {
    color: "#F1DDAA",
    fontSize: 48,
    lineHeight: 58,
    fontWeight: "900"
  },
  cardBody: {
    color: "#A6ABBF",
    fontSize: 17,
    lineHeight: 27,
    fontWeight: "600"
  },
  weekTrendCard: {
    minHeight: 306,
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 24,
    gap: 24
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  sectionTitle: {
    color: "#D7DAEA",
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "900"
  },
  goldSmall: {
    color: "#E6D5B8",
    fontSize: 18,
    fontWeight: "900"
  },
  barChart: {
    height: 188,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 4
  },
  barColumn: {
    width: 34,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 16
  },
  trendBar: {
    width: 28,
    borderRadius: 14,
    overflow: "hidden"
  },
  trendBarActive: {
    backgroundColor: "#A9B2FF"
  },
  trendBarMuted: {
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  axisLabel: {
    color: "#A6ABBF",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900"
  },
  circleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 11
  },
  circleMetric: {
    flex: 1,
    minWidth: 130,
    minHeight: 136,
    paddingVertical: 22,
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 8
  },
  ring: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 8,
    borderColor: "#E6D5B8",
    alignItems: "center",
    justifyContent: "center"
  },
  ringCutout: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center"
  },
  ringValue: {
    color: "#F1DDAA",
    fontSize: 24,
    fontWeight: "900"
  },
  metricTitle: {
    color: "#F5F6FF",
    fontSize: 18,
    fontWeight: "900"
  },
  metricCaption: {
    color: "#A6ABBF",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600",
    textAlign: "center"
  },
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  badgeTile: {
    flex: 1,
    minWidth: 150,
    minHeight: 114,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  badgeIcon: {
    width: 74,
    height: 74
  },
  badgeCopy: {
    flex: 1,
    gap: 5
  },
  badgeTitle: {
    color: "#F5F6FF",
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "900"
  },
  adviceBlock: {
    gap: 14
  },
  adviceCard: {
    minHeight: 160,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 22,
    borderColor: "rgba(230,213,184,0.32)",
    justifyContent: "center"
  },
  adviceBackgroundImage: {
    position: "absolute",
    left: -8,
    top: -20,
    width: "106%",
    height: "130%"
  },
  adviceScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(7,8,23,0.1)"
  },
  adviceForeground: {
    zIndex: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 22
  },
  adviceMoonIcon: {
    width: 62,
    height: 72,
    position: "relative"
  },
  moonBase: {
    position: "absolute",
    left: 8,
    top: 10,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F0DCA9"
  },
  moonCutout: {
    position: "absolute",
    left: 27,
    top: 4,
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: "#37303A"
  },
  moonStar: {
    position: "absolute",
    color: "#F0DCA9",
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "900"
  },
  moonStarOne: {
    right: 6,
    top: 6
  },
  moonStarTwo: {
    left: 0,
    bottom: 8,
    opacity: 0.78
  },
  moonStarThree: {
    right: 10,
    bottom: 0,
    opacity: 0.72
  },
  adviceTextWrap: {
    flex: 1,
    gap: 14
  },
  adviceTitle: {
    color: "#E6D5B8",
    fontSize: 25,
    lineHeight: 36,
    fontWeight: "900"
  },
  adviceBody: {
    color: "#A6ABBF",
    fontSize: 16,
    lineHeight: 26,
    fontWeight: "600"
  },
  gradientButton: {
    minHeight: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    zIndex: 2
  },
  gradientButtonText: {
    color: "#10101B",
    fontSize: 19,
    lineHeight: 26,
    fontWeight: "900",
    zIndex: 2
  },
  gradientArrow: {
    position: "absolute",
    right: 34,
    color: "#10101B",
    fontSize: 40,
    lineHeight: 44,
    fontWeight: "500",
    zIndex: 2
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  metricCard: {
    flexGrow: 1,
    flexBasis: "47%",
    minWidth: 138,
    minHeight: 138,
    padding: 22,
    justifyContent: "space-between"
  },
  smallIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10
  },
  smallIconText: {
    color: "#E6D5B8",
    fontSize: 24,
    fontWeight: "900"
  },
  metricLabel: {
    color: "#A6ABBF",
    fontSize: 18,
    lineHeight: 25,
    fontWeight: "900"
  },
  metricValue: {
    color: "#F5F6FF",
    fontSize: 33,
    lineHeight: 42,
    fontWeight: "900"
  },
  compareCard: {
    minHeight: 132,
    paddingLeft: 12,
    paddingRight: 18,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.07)"
  },
  compareLargeCard: {
    minHeight: 176,
    padding: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 18
  },
  moonScene: {
    width: 116,
    height: 92,
    marginLeft: -10,
    alignItems: "center",
    justifyContent: "center"
  },
  monthCompareImage: {
    width: 132,
    height: 104
  },
  compareCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3
  },
  compareHeader: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  compareLabel: {
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 20
  },
  compareTitle: {
    color: "#E6D5B8",
    fontSize: 28,
    lineHeight: 35,
    fontWeight: "900"
  },
  compareBody: {
    fontSize: 14,
    lineHeight: 21
  },
  lineTrendCard: {
    minHeight: 288,
    padding: 28,
    gap: 18
  },
  lineTrendCardCompact: {
    minHeight: 302
  },
  lineChart: {
    position: "relative",
    marginTop: 8
  },
  chartBaseLine: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 38,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  lineSegment: {
    position: "absolute",
    height: 5,
    borderRadius: 3,
    backgroundColor: "#A5AEFF",
    transformOrigin: "left center"
  },
  lineDot: {
    position: "absolute",
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: "#DCDCEC"
  },
  lineDotActive: {
    backgroundColor: "#8A97FF"
  },
  lineAxisLabel: {
    position: "absolute",
    width: 42,
    color: "#A6ABBF",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center"
  },
  changeListCard: {
    padding: 26,
    gap: 18
  },
  changeRows: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden"
  },
  changeRow: {
    minHeight: 64,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)"
  },
  changeIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    justifyContent: "center"
  },
  changeIconText: {
    color: "#E6D5B8",
    fontSize: 22,
    fontWeight: "900"
  },
  changeIconImage: {
    width: 34,
    height: 34
  },
  changeLabel: {
    flex: 1,
    color: "#C8CBE0",
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "800"
  },
  changeValue: {
    color: "#F5F6FF",
    fontSize: 20,
    fontWeight: "900"
  },
  chevron: {
    color: "#A6ABBF",
    fontSize: 34,
    lineHeight: 36
  },
  loadingWrap: {
    minHeight: 480,
    alignItems: "center",
    justifyContent: "center",
    gap: 14
  },
  loadingText: {
    color: "#A6ABBF",
    fontSize: 16,
    fontWeight: "700"
  }
});
