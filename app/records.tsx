import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getRescueSessions,
  getSleepRecords,
  getTodayReviews,
  getUserConfig,
  seedGrowthTestData
} from "@/storage/rescueSessionStorage";
import { RescueSession, SleepRecord, TodayReview, UserConfig } from "@/types/app";
import { buildGrowthStats, getCurrentSleepStreak, GrowthDimension, GrowthStats, TrendBar, TrendPoint } from "@/utils/growth";

type GrowthData = {
  records: SleepRecord[];
  sessions: Record<string, RescueSession>;
  reviews: TodayReview[];
  config: UserConfig;
};

type MetricCardProps = {
  label: string;
  value: string;
  icon?: string;
};

const periodLabels: Record<GrowthDimension, string> = {
  week: "本周",
  month: "本月",
  all: "全部"
};

const periodOrder: GrowthDimension[] = ["week", "month", "all"];

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
            <View style={[styles.trendBar, { height: bar.height }, !bar.active && styles.trendBarMuted]}>
              {bar.active ? (
                <>
                  <View style={styles.barGlowTop} />
                  <View style={styles.barGlowBottom} />
                </>
              ) : null}
            </View>
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

function BadgeTile({ icon, title, caption }: { icon: string; title: string; caption: string }) {
  return (
    <GlassCard style={styles.badgeTile}>
      <View style={styles.badgeIcon}>
        <Text style={styles.badgeIconText}>{icon}</Text>
      </View>
      <View style={styles.badgeCopy}>
        <Text style={styles.badgeTitle}>{title}</Text>
        <Text style={styles.metricCaption}>{caption}</Text>
      </View>
    </GlassCard>
  );
}

function MoonAdvice({ title, body, buttonTitle, onPress }: { title: string; body: string; buttonTitle: string; onPress: () => void }) {
  return (
    <GlassCard style={styles.adviceCard}>
      <View style={styles.adviceMoon}>
        <Text style={styles.adviceMoonText}>☾</Text>
      </View>
      <View style={styles.adviceTextWrap}>
        <Text style={styles.adviceTitle}>{title}</Text>
        <Text style={styles.adviceBody}>{body}</Text>
      </View>
      <GradientButton title={buttonTitle} onPress={onPress} />
    </GlassCard>
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

function MetricCard({ label, value, icon }: MetricCardProps) {
  return (
    <GlassCard style={styles.metricCard}>
      {icon ? (
        <View style={styles.smallIcon}>
          <Text style={styles.smallIconText}>{icon}</Text>
        </View>
      ) : null}
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
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

function LineTrend({ title, range, points, compact = false }: { title: string; range: string; points: TrendPoint[]; compact?: boolean }) {
  const chartWidth = 316;
  const chartHeight = compact ? 170 : 214;
  const maxValue = Math.max(1, ...points.map((point) => point.value));
  const coords = points.map((point, index) => {
    const x = points.length === 1 ? 0 : (index / (points.length - 1)) * chartWidth;
    const y = chartHeight - 34 - (point.value / maxValue) * (chartHeight - 86);
    return { ...point, x, y };
  });

  return (
    <GlassCard style={[styles.lineTrendCard, compact && styles.lineTrendCardCompact]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.goldSmall}>{range}</Text>
      </View>
      <View style={[styles.lineChart, { height: chartHeight }]}>
        <View style={styles.chartBaseLine} />
        {coords.slice(0, -1).map((point, index) => (
          <LineSegment key={`${point.label}-${coords[index + 1].label}`} from={point} to={coords[index + 1]} />
        ))}
        {coords.map((point, index) => (
          <View key={point.label} style={[styles.lineDot, index === coords.length - 1 && styles.lineDotActive, { left: point.x - 6, top: point.y - 6 }]} />
        ))}
        {coords.map((point) => (
          <Text key={`${point.label}-axis`} style={[styles.lineAxisLabel, { left: point.x - 18, top: chartHeight - 24 }]}>
            {point.label}
          </Text>
        ))}
      </View>
    </GlassCard>
  );
}

function ChangeList({ title, rows }: { title: string; rows: Array<{ icon: string; label: string; value: string }> }) {
  return (
    <GlassCard style={styles.changeListCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.changeRows}>
        {rows.map((row) => (
          <View key={row.label} style={styles.changeRow}>
            <View style={styles.changeIcon}>
              <Text style={styles.changeIconText}>{row.icon}</Text>
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
        <CircleMetric label="复盘" value={String(Math.max(stats.reviewCount, streak))} caption="没有恐惧冻结更深夜" />
        <CircleMetric label="暂停" value={String(stats.pauseCount)} caption="想刷手机时停下来" />
        <CircleMetric label="不错" value={String(stats.goodMoodCount)} caption="睡来状态比较期待" />
      </View>
      <View style={styles.badgeGrid}>
        <BadgeTile icon="★" title={`${Math.max(streak, 1)} 天连胜`} caption="连续完成睡前收尾" />
        <BadgeTile icon="☾" title={stats.pauseCount > 0 ? "没白熬徽章" : "正在接近徽章"} caption="你开始把自己带回来了" />
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
        <MetricCard label="平均入睡" value={stats.monthAverageLabel} />
        <MetricCard label="稳定晚数" value={`${stats.stableNightCount} 晚`} />
        <MetricCard label="复盘完成" value={`${stats.cumulativeReviewCount} 次`} />
        <MetricCard label="精神不错" value={`${stats.goodMoodCount} 天`} />
      </View>
      <GlassCard style={styles.compareCard}>
        <View style={styles.moonScene}>
          <Text style={styles.sceneMoon}>●</Text>
        </View>
        <View style={styles.compareCopy}>
          <Text style={styles.cardLabel}>和上个月相比</Text>
          <Text style={styles.compareTitle}>{stats.lessLateCount > 0 ? `少熬了 ${stats.lessLateCount} 晚` : "正在建立基线"}</Text>
          <Text style={styles.cardBody}>固定开始睡前仪式后，晚睡失控的次数明显下降。</Text>
        </View>
        <StatusPill label={stats.monthStatusLabel.replace("正在变好", "更稳")} prefix="+" />
      </GlassCard>
      <LineTrend title="4 周变化趋势" range="W1 → W4" points={stats.monthPoints} />
      <ChangeList
        title="这一月最明显的变化"
        rows={[
          { icon: "☾", label: "更常在 23:30 前开始收尾", value: `${stats.startBeforeTargetCount} 次` },
          { icon: "▯", label: "想刷手机时暂停下来", value: `${stats.pauseCount} 次` },
          { icon: "☼", label: "醒来觉得“还不错”", value: `${stats.goodMoodCount} 天` }
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
        <MetricCard icon="☾" label="稳定晚数" value={`${stats.stableNightCount + stats.longestStreak} 晚`} />
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
          { icon: "◷", label: "更常在 23:30 前开始收尾", value: `${stats.startBeforeTargetCount} 次` },
          { icon: "▯", label: "想刷手机时暂停下来", value: `${stats.pauseCount} 次` },
          { icon: "☼", label: "醒来觉得还不错", value: `${stats.goodMoodCount} 天` }
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

function Content({ dimension, stats, records }: { dimension: GrowthDimension; stats: GrowthStats; records: SleepRecord[] }) {
  if (dimension === "month") {
    return <MonthView stats={stats} />;
  }

  if (dimension === "all") {
    return <AllView stats={stats} />;
  }

  return <WeekView stats={stats} streak={getCurrentSleepStreak(records)} />;
}

export default function RecordsScreen() {
  const [data, setData] = useState<GrowthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dimension, setDimension] = useState<GrowthDimension>("week");
  const [periodExpanded, setPeriodExpanded] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const [records, sessions, reviews, config] = await Promise.all([
        getSleepRecords(),
        getRescueSessions(),
        getTodayReviews(),
        getUserConfig()
      ]);

      if (mounted) {
        setData({ records, sessions, reviews, config });
        setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const reloadData = async () => {
    const [records, sessions, reviews, config] = await Promise.all([
      getSleepRecords(),
      getRescueSessions(),
      getTodayReviews(),
      getUserConfig()
    ]);
    setData({ records, sessions, reviews, config });
    setLoading(false);
  };

  const stats = useMemo(() => {
    if (!data) {
      return null;
    }
    return buildGrowthStats(data.records, data.sessions, data.reviews, data.config);
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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Header
            dimension={dimension}
            expanded={periodExpanded}
            onExpand={() => setPeriodExpanded(true)}
            onChange={changeDimension}
          />
          <TestDataButton busy={seeding} onPress={addTestData} />
          {loading || !stats || !data ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color="#E6D5B8" />
              <Text style={styles.loadingText}>正在整理你的成长记录</Text>
            </View>
          ) : (
            <Content dimension={dimension} stats={stats} records={data.records} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const gradientBackgroundStyle = {
  backgroundImage: "linear-gradient(100deg, #E6D5B8 0%, #F4ECDF 35%, #BFC4FF 68%, #8A97FF 100%)"
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
    paddingBottom: 142
  },
  content: {
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
    paddingHorizontal: 23,
    paddingTop: 18,
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
    minHeight: 292,
    padding: 28,
    gap: 28
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
    height: 202,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between"
  },
  barColumn: {
    width: 34,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 18
  },
  trendBar: {
    width: 24,
    borderRadius: 13,
    overflow: "hidden",
    backgroundColor: "#E7DEC8"
  },
  trendBarMuted: {
    backgroundColor: "rgba(255,255,255,0.09)"
  },
  barGlowTop: {
    flex: 1,
    backgroundColor: "#E6D5B8"
  },
  barGlowBottom: {
    height: "48%",
    backgroundColor: "#7D8EFF"
  },
  axisLabel: {
    color: "#A6ABBF",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900"
  },
  circleGrid: {
    flexDirection: "row",
    gap: 11
  },
  circleMetric: {
    flex: 1,
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
    gap: 12
  },
  badgeTile: {
    flex: 1,
    minHeight: 114,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16
  },
  badgeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E6D5B8",
    alignItems: "center",
    justifyContent: "center"
  },
  badgeIconText: {
    color: "#9B7522",
    fontSize: 30,
    fontWeight: "900"
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
  adviceCard: {
    padding: 26,
    gap: 20,
    borderColor: "rgba(230,213,184,0.32)"
  },
  adviceMoon: {
    position: "absolute",
    left: 28,
    top: 30,
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: "center",
    justifyContent: "center"
  },
  adviceMoonText: {
    color: "#E6D5B8",
    fontSize: 62,
    lineHeight: 70,
    fontWeight: "900"
  },
  adviceTextWrap: {
    paddingLeft: 96,
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
    minHeight: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
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
    width: "48.3%",
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
    minHeight: 164,
    padding: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 20
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
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(138,151,255,0.12)",
    alignItems: "center",
    justifyContent: "center"
  },
  sceneMoon: {
    color: "#E6D5B8",
    fontSize: 44,
    lineHeight: 48
  },
  compareCopy: {
    flex: 1,
    gap: 8
  },
  compareTitle: {
    color: "#E6D5B8",
    fontSize: 34,
    lineHeight: 44,
    fontWeight: "900"
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
